import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ErrorApi } from '../comun/errores/error-api';
import type { ContextoPeticion } from '../comun/peticion/contexto-peticion';
import { type Entorno, ENTORNO } from '../config/entorno';
import { Prisma, type Sesion, type Usuario } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  DatosLogin,
  DatosRefresco,
  DatosRegistro,
  RespuestaSesion,
} from './esquemas';
import { hashRefresco, TokensService } from './tokens.service';
import { aUsuarioApi } from './usuario-api';

type ClienteBd = PrismaService | Prisma.TransactionClient;
type SesionConUsuario = Sesion & { usuario: Usuario };

// Errores del contrato que se repiten en varios flujos.
const credencialesInvalidas = () =>
  new ErrorApi(
    HttpStatus.UNAUTHORIZED,
    'CREDENCIALES_INVALIDAS',
    'El correo o la contraseña no son correctos.',
  );
const refrescoInvalido = () =>
  new ErrorApi(
    HttpStatus.UNAUTHORIZED,
    'REFRESCO_INVALIDO',
    'Tu sesión expiró. Vuelve a iniciar sesión.',
  );
const sesionRevocada = () =>
  new ErrorApi(
    HttpStatus.UNAUTHORIZED,
    'SESION_REVOCADA',
    'Tu sesión se cerró por seguridad. Vuelve a iniciar sesión.',
  );

@Injectable()
export class AuthService {
  /**
   * Hash de una contraseña que nadie tiene. Se verifica contra él cuando el
   * correo no existe, para que esa respuesta tarde lo mismo que una contraseña
   * equivocada y el tiempo no revele qué correos tienen cuenta.
   */
  private hashFalso?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    @Inject(ENTORNO) private readonly entorno: Entorno,
  ) {}

  /** B05: crea la cuenta, guarda la aceptación legal y abre la primera sesión. */
  async registrar(
    datos: DatosRegistro,
    contexto: ContextoPeticion,
  ): Promise<RespuestaSesion> {
    const hashContrasena = await argon2.hash(datos.contrasena, {
      type: argon2.argon2id,
    });
    try {
      // Todo o nada: no puede quedar una cuenta sin su aceptación legal.
      return await this.prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.create({
          data: { nombre: datos.nombre, correo: datos.correo, hashContrasena },
        });
        // La versión la pone el servidor: la app solo dice que aceptó.
        await tx.aceptacionLegal.createMany({
          data: (
            [
              { documento: 'terminos', version: this.entorno.VERSION_TERMINOS },
              {
                documento: 'privacidad',
                version: this.entorno.VERSION_PRIVACIDAD,
              },
            ] as const
          ).map((aceptacion) => ({
            ...aceptacion,
            usuarioId: usuario.id,
            ip: contexto.ip,
          })),
        });
        return this.abrirSesion(tx, usuario, contexto);
      });
    } catch (error) {
      // El índice único de correo resuelve también dos registros simultáneos.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ErrorApi(
          HttpStatus.CONFLICT,
          'CORREO_EN_USO',
          'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.',
        );
      }
      throw error;
    }
  }

  /** B05: valida la contraseña y abre una sesión nueva. */
  async iniciarSesion(
    datos: DatosLogin,
    contexto: ContextoPeticion,
  ): Promise<RespuestaSesion> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { correo: datos.correo },
    });
    // Sin cuenta o solo con Google: se verifica igual contra un hash falso,
    // y la respuesta es la misma que con una contraseña equivocada.
    const hash = usuario?.hashContrasena ?? (await this.obtenerHashFalso());
    const coincide = await argon2.verify(hash, datos.contrasena);
    if (!usuario?.hashContrasena || !coincide) {
      throw credencialesInvalidas();
    }
    // Recién aquí, con la contraseña correcta: así "suspendida" no sirve para
    // averiguar qué correos existen.
    if (usuario.estado !== 'activo') {
      throw new ErrorApi(
        HttpStatus.FORBIDDEN,
        'USUARIO_INACTIVO',
        'Tu cuenta está suspendida. Escríbenos si crees que es un error.',
      );
    }
    // Semana 1: sin empresa (tid nulo). Recuperar la última empresa activa
    // llega con las empresas (B35/B45).
    return this.abrirSesion(this.prisma, usuario, contexto);
  }

  /**
   * B07: rota el refresh dentro de su familia. Un refresh ya usado es señal de
   * robo y cierra todas las sesiones de la persona, salvo dentro de la
   * ventana de gracia (la respuesta anterior se pudo perder en la red móvil).
   */
  async renovar(
    datos: DatosRefresco,
    contexto: ContextoPeticion,
  ): Promise<RespuestaSesion> {
    const ahora = new Date();
    const sesion = await this.prisma.sesion.findUnique({
      where: { hashRefresco: hashRefresco(datos.tokenRefresco) },
      include: { usuario: true },
    });
    if (!sesion) {
      throw refrescoInvalido();
    }
    // Sesión cerrada (logout, robo detectado antes): no se revoca nada más.
    if (sesion.revocadoEn) {
      throw sesionRevocada();
    }
    if (sesion.usadoEn) {
      return this.renovarReutilizado(sesion, contexto, ahora);
    }
    if (sesion.venceEn <= ahora) {
      throw refrescoInvalido();
    }
    // Cuenta suspendida con la sesión abierta: se cierra la sesión y la app
    // vuelve al login, que le explica el motivo (403 USUARIO_INACTIVO).
    if (sesion.usuario.estado !== 'activo') {
      await this.revocarFamilia(sesion.familiaId, ahora);
      throw sesionRevocada();
    }

    const respuesta = await this.prisma.$transaction(async (tx) => {
      // Condicional: si otra petición lo usó en este mismo instante, no lo
      // marca y se trata como reutilizado (abajo).
      const { count } = await tx.sesion.updateMany({
        where: { id: sesion.id, usadoEn: null, revocadoEn: null },
        data: { usadoEn: ahora },
      });
      return count === 1
        ? this.abrirSesion(tx, sesion.usuario, contexto, sesion)
        : null;
    });
    if (respuesta) {
      return respuesta;
    }
    const actual = await this.prisma.sesion.findUniqueOrThrow({
      where: { id: sesion.id },
      include: { usuario: true },
    });
    if (actual.revocadoEn || !actual.usadoEn) {
      throw sesionRevocada();
    }
    return this.renovarReutilizado(actual, contexto, ahora);
  }

  /** Un refresh que ya se usó: ventana de gracia o robo. */
  private async renovarReutilizado(
    sesion: SesionConUsuario,
    contexto: ContextoPeticion,
    ahora: Date,
  ): Promise<RespuestaSesion> {
    const usadoHaceMs = ahora.getTime() - sesion.usadoEn!.getTime();
    const dentroDeGracia =
      usadoHaceMs <= this.tokens.msGracia &&
      sesion.venceEn > ahora &&
      sesion.usuario.estado === 'activo';

    if (!dentroDeGracia) {
      // Robo: alguien tiene un refresh viejo. Se cierran todas las sesiones
      // de la persona, no solo esta familia.
      await this.prisma.sesion.updateMany({
        where: { usuarioId: sesion.usuarioId, revocadoEn: null },
        data: { revocadoEn: ahora },
      });
      throw sesionRevocada();
    }

    // Gracia: el par que se emitió en la rotación anterior nunca llegó a la
    // app. Se deja sin efecto (marcado como usado) y se emite uno nuevo en la
    // misma familia, sin exigir el mismo X-Dispositivo.
    return this.prisma.$transaction(async (tx) => {
      await tx.sesion.updateMany({
        where: {
          familiaId: sesion.familiaId,
          usadoEn: null,
          revocadoEn: null,
        },
        data: { usadoEn: ahora },
      });
      return this.abrirSesion(tx, sesion.usuario, contexto, sesion);
    });
  }

  /**
   * Crea una fila en `sesiones` y arma la respuesta del contrato. Sin
   * `familia`, empieza un inicio de sesión nuevo; con ella, es una rotación y
   * conserva el sid y la empresa activa.
   */
  private async abrirSesion(
    bd: ClienteBd,
    usuario: Usuario,
    contexto: ContextoPeticion,
    familia?: Pick<Sesion, 'familiaId' | 'empresaActivaId'>,
  ): Promise<RespuestaSesion> {
    const refresco = this.tokens.nuevoRefresco();
    const fila = await bd.sesion.create({
      data: {
        familiaId: familia?.familiaId ?? randomUUID(),
        usuarioId: usuario.id,
        hashRefresco: refresco.hash,
        empresaActivaId: familia?.empresaActivaId ?? null,
        dispositivo: contexto.dispositivo,
        ip: contexto.ip,
        venceEn: this.tokens.vencimientoRefresco(new Date()),
      },
    });
    return {
      tokenAcceso: this.tokens.firmarAcceso({
        sub: usuario.id,
        tid: fila.empresaActivaId,
        sid: fila.familiaId,
      }),
      tokenRefresco: refresco.token,
      venceEn: this.tokens.segundosAcceso,
      usuario: aUsuarioApi(usuario),
    };
  }

  private async revocarFamilia(familiaId: string, ahora: Date): Promise<void> {
    await this.prisma.sesion.updateMany({
      where: { familiaId, revocadoEn: null },
      data: { revocadoEn: ahora },
    });
  }

  private obtenerHashFalso(): Promise<string> {
    this.hashFalso ??= argon2.hash(randomUUID(), { type: argon2.argon2id });
    return this.hashFalso;
  }
}
