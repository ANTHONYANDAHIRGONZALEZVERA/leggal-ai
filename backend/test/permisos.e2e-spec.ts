import { randomUUID } from 'node:crypto';
import {
  Controller,
  Get,
  INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import {
  type SesionActual,
  UsuarioActual,
} from './../src/auth/guardia/sesion-actual';
import type { EstadoMembresia } from './../src/generated/prisma/enums';
import {
  type ClaveRolBase,
  MODULOS,
  ROLES_BASE,
} from './../src/permisos/catalogo';
import { RequierePermiso } from './../src/permisos/permisos.guard';
import { PermisosModule } from './../src/permisos/permisos.module';
import {
  aplicarRolesBase,
  sincronizarModulos,
} from './../src/permisos/roles-base';
import { PrismaService } from './../src/prisma/prisma.service';

// B08 y B09 contra PostgreSQL real (docker compose up -d): el seed de roles
// sobre empresas de prueba y el guard de permisos con rutas de prueba (los
// módulos reales, como casos, llegan en fases posteriores).
const DOMINIO = '@pruebas-b08.leggal.test';
const PREFIJO_EMPRESA = 'Empresa de prueba B08';

@Controller('prueba-permisos')
class RutasDePrueba {
  @Get('casos')
  @RequierePermiso('casos', 'ver')
  verCasos(@UsuarioActual() sesion: SesionActual) {
    return { rol: sesion.membresia?.rolClave, empresa: sesion.empresaId };
  }

  @Post('casos')
  @RequierePermiso('casos', 'editar')
  editarCasos() {
    return { ok: true };
  }

  @Post('aprobar-ia')
  @RequierePermiso('aprobar_ia', 'editar')
  aprobarIa() {
    return { ok: true };
  }

  @Get('auditoria')
  @RequierePermiso('auditoria', 'ver')
  verAuditoria() {
    return { ok: true };
  }
}

// Igual que lo hará un módulo real: importa PermisosModule.
@Module({ imports: [PermisosModule], controllers: [RutasDePrueba] })
class ModuloDePrueba {}

describe('Roles y permisos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;

  const http = () => request(app.getHttpServer());

  async function empresaConRoles() {
    const empresa = await prisma.empresa.create({
      data: { nombre: `${PREFIJO_EMPRESA} ${randomUUID()}` },
    });
    await prisma.$transaction((tx) => aplicarRolesBase(tx, empresa.id));
    return empresa;
  }

  async function rolId(tenantId: string, clave: ClaveRolBase) {
    const rol = await prisma.rol.findUniqueOrThrow({
      where: { tenantId_clave: { tenantId, clave } },
    });
    return rol.id;
  }

  /** Registra a una persona y devuelve su token con la empresa indicada en el tid. */
  async function personaCon(
    empresaId: string | null,
    clave?: ClaveRolBase,
    estado: EstadoMembresia = 'activa',
  ) {
    const { body } = await http()
      .post('/auth/register')
      .send({
        nombre: 'Andrea Ruiz Mora',
        correo: `persona.${randomUUID()}${DOMINIO}`,
        contrasena: 'Lunes.Claro.2026',
        aceptaTerminos: true,
      })
      .expect(201);
    const usuarioId = (body as { usuario: { id: string } }).usuario.id;
    if (empresaId && clave) {
      await prisma.membresia.create({
        data: {
          tenantId: empresaId,
          usuarioId,
          rolId: await rolId(empresaId, clave),
          estado,
          origen: 'codigo',
        },
      });
    }
    // Hasta que exista POST /auth/switch-tenant (B45), el token con empresa
    // se firma aquí con el mismo secreto de la API y la sesión real.
    const { sub, sid } = jwt.decode<{ sub: string; sid: string }>(
      (body as { tokenAcceso: string }).tokenAcceso,
    );
    return { usuarioId, token: jwt.sign({ sub, tid: empresaId, sid }) };
  }

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule, ModuloDePrueba],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    await sincronizarModulos(prisma);
  });

  afterAll(async () => {
    // Las empresas borran en cascada roles, permisos y membresías.
    await prisma.empresa.deleteMany({
      where: { nombre: { startsWith: PREFIJO_EMPRESA } },
    });
    await prisma.usuario.deleteMany({
      where: { correo: { endsWith: DOMINIO } },
    });
    await app.close();
  });

  describe('Seed de roles base (B08)', () => {
    it('el catálogo de módulos queda con los 8 de la app, en orden', async () => {
      const modulos = await prisma.modulo.findMany({
        orderBy: { orden: 'asc' },
      });
      expect(modulos.map((m) => m.clave)).toEqual(MODULOS.map((m) => m.clave));
      expect(modulos.map((m) => m.nombre)).toEqual(
        MODULOS.map((m) => m.nombre),
      );
    });

    it('crea los 5 roles base con la matriz completa (5 × 8 permisos)', async () => {
      const empresa = await empresaConRoles();
      const roles = await prisma.rol.findMany({
        where: { tenantId: empresa.id },
        include: { permisos: true },
        orderBy: { creadoEn: 'asc' },
      });
      expect(roles.map((r) => [r.clave, r.nombre, r.esSistema])).toEqual(
        ROLES_BASE.map((r) => [r.clave, r.nombre, true]),
      );
      for (const rol of roles) {
        const base = ROLES_BASE.find((r) => r.clave === rol.clave)!;
        const niveles = Object.fromEntries(
          rol.permisos.map((p) => [p.moduloClave, p.nivel]),
        );
        expect(niveles).toEqual(base.permisos);
      }
    });

    it('es idempotente: correrlo otra vez no crea ni cambia nada', async () => {
      const empresa = await empresaConRoles();
      const antes = await prisma.rolPermiso.findMany({
        where: { tenantId: empresa.id },
        orderBy: [{ rolId: 'asc' }, { moduloClave: 'asc' }],
      });

      const resultado = await prisma.$transaction((tx) =>
        aplicarRolesBase(tx, empresa.id),
      );

      expect(resultado).toEqual({
        rolesCreados: 0,
        permisosCreados: 0,
        permisosCorregidos: 0,
      });
      const despues = await prisma.rolPermiso.findMany({
        where: { tenantId: empresa.id },
        orderBy: [{ rolId: 'asc' }, { moduloClave: 'asc' }],
      });
      expect(despues).toEqual(antes);
      expect(await prisma.rol.count({ where: { tenantId: empresa.id } })).toBe(
        5,
      );
    });

    it('no pisa lo que el administrador personalizó (nivel y nombre)', async () => {
      const empresa = await empresaConRoles();
      const contador = await rolId(empresa.id, 'contador');
      await prisma.rolPermiso.update({
        where: {
          tenantId_rolId_moduloClave: {
            tenantId: empresa.id,
            rolId: contador,
            moduloClave: 'casos',
          },
        },
        data: { nivel: 'ninguno' },
      });
      await prisma.rol.update({
        where: { id: contador },
        data: { nombre: 'Contabilidad' },
      });

      await prisma.$transaction((tx) => aplicarRolesBase(tx, empresa.id));

      const rol = await prisma.rol.findUniqueOrThrow({
        where: { id: contador },
        include: { permisos: { where: { moduloClave: 'casos' } } },
      });
      expect(rol.nombre).toBe('Contabilidad');
      expect(rol.permisos[0].nivel).toBe('ninguno');
    });

    it('impone las reglas duras aunque se hayan cambiado a mano en la base', async () => {
      const empresa = await empresaConRoles();
      const contador = await rolId(empresa.id, 'contador');
      const admin = await rolId(empresa.id, 'administrador');
      const propio = await prisma.rol.create({
        data: { tenantId: empresa.id, nombre: 'Practicante' },
      });
      await prisma.rolPermiso.createMany({
        data: MODULOS.map(({ clave }) => ({
          tenantId: empresa.id,
          rolId: propio.id,
          moduloClave: clave,
          nivel: 'editar' as const,
        })),
      });
      const fijar = (
        rol: string,
        moduloClave: string,
        nivel: 'ver' | 'editar',
      ) =>
        prisma.rolPermiso.update({
          where: {
            tenantId_rolId_moduloClave: {
              tenantId: empresa.id,
              rolId: rol,
              moduloClave,
            },
          },
          data: { nivel },
        });
      await fijar(contador, 'aprobar_ia', 'editar');
      await fijar(admin, 'administracion', 'ver');

      const resultado = await prisma.$transaction((tx) =>
        aplicarRolesBase(tx, empresa.id),
      );

      // Contador y el rol propio pierden aprobar_ia; Administrador recupera
      // "editar" en Administración.
      expect(resultado.permisosCorregidos).toBe(3);
      const nivel = async (rol: string, moduloClave: string) =>
        (
          await prisma.rolPermiso.findUniqueOrThrow({
            where: {
              tenantId_rolId_moduloClave: {
                tenantId: empresa.id,
                rolId: rol,
                moduloClave,
              },
            },
          })
        ).nivel;
      expect(await nivel(contador, 'aprobar_ia')).toBe('ninguno');
      expect(await nivel(propio.id, 'aprobar_ia')).toBe('ninguno');
      expect(await nivel(propio.id, 'casos')).toBe('editar'); // lo demás no se toca
      expect(await nivel(admin, 'administracion')).toBe('editar');
    });

    it('adopta un rol creado antes del seed con el mismo nombre, sin duplicarlo', async () => {
      const empresa = await prisma.empresa.create({
        data: { nombre: `${PREFIJO_EMPRESA} ${randomUUID()}` },
      });
      const previo = await prisma.rol.create({
        data: { tenantId: empresa.id, nombre: 'Administrador' },
      });

      const resultado = await prisma.$transaction((tx) =>
        aplicarRolesBase(tx, empresa.id),
      );

      expect(resultado.rolesCreados).toBe(4);
      const admin = await prisma.rol.findUniqueOrThrow({
        where: { id: previo.id },
      });
      expect(admin).toMatchObject({ clave: 'administrador', esSistema: true });
    });

    it('aislamiento: aplicar los roles en una empresa no toca los de otra', async () => {
      const a = await empresaConRoles();
      const b = await empresaConRoles();
      const contadorA = await rolId(a.id, 'contador');
      await prisma.rolPermiso.update({
        where: {
          tenantId_rolId_moduloClave: {
            tenantId: a.id,
            rolId: contadorA,
            moduloClave: 'aprobar_ia',
          },
        },
        data: { nivel: 'editar' },
      });

      await prisma.$transaction((tx) => aplicarRolesBase(tx, b.id));

      const sinCorregir = await prisma.rolPermiso.findUniqueOrThrow({
        where: {
          tenantId_rolId_moduloClave: {
            tenantId: a.id,
            rolId: contadorA,
            moduloClave: 'aprobar_ia',
          },
        },
      });
      expect(sinCorregir.nivel).toBe('editar');
    });
  });

  describe('Guard de permisos (B09)', () => {
    let empresaId: string;
    const tokens = {} as Record<ClaveRolBase, string>;

    beforeAll(async () => {
      empresaId = (await empresaConRoles()).id;
      for (const { clave } of ROLES_BASE) {
        tokens[clave] = (await personaCon(empresaId, clave)).token;
      }
    });

    // Lo que cada rol base puede hacer según la matriz del plan, escrito aparte.
    it.each([
      //  rol                ver casos  editar casos  aprobar IA  ver auditoría
      ['administrador', 200, 201, 201, 200],
      ['abogado', 200, 201, 201, 403],
      ['asistente_legal', 200, 201, 403, 403],
      ['contador', 200, 403, 403, 403],
      ['solo_lectura', 200, 403, 403, 403],
    ] as const)(
      '%s: ver casos %i, editar casos %i, aprobar IA %i, ver auditoría %i',
      async (clave, verCasos, editarCasos, aprobar, auditoria) => {
        const token = tokens[clave];
        const con = (peticion: request.Test) =>
          peticion.set('Authorization', `Bearer ${token}`);

        await con(http().get('/prueba-permisos/casos')).expect(verCasos);
        await con(http().post('/prueba-permisos/casos')).expect(editarCasos);
        await con(http().post('/prueba-permisos/aprobar-ia')).expect(aprobar);
        await con(http().get('/prueba-permisos/auditoria')).expect(auditoria);
      },
    );

    it('el 403 tiene el formato del contrato', async () => {
      const { body } = await http()
        .post('/prueba-permisos/aprobar-ia')
        .set('Authorization', `Bearer ${tokens.solo_lectura}`)
        .expect(403);
      expect(body).toEqual({
        codigo: 'SIN_PERMISO',
        mensaje: 'No tienes permiso para hacer esto.',
        campos: null,
      });
    });

    it('la ruta recibe la membresía y la empresa del token', async () => {
      const { body } = await http()
        .get('/prueba-permisos/casos')
        .set('Authorization', `Bearer ${tokens.abogado}`)
        .expect(200);
      expect(body).toEqual({ rol: 'abogado', empresa: empresaId });
    });

    it.each(['en_espera', 'suspendida', 'rechazada'] as const)(
      '403 SIN_PERMISO con la membresía %s, aunque sea Administrador',
      async (estado) => {
        const { token } = await personaCon(empresaId, 'administrador', estado);
        const { body } = await http()
          .get('/prueba-permisos/casos')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
        expect(body).toEqual({
          codigo: 'SIN_PERMISO',
          mensaje: 'No tienes acceso a esta empresa.',
          campos: null,
        });
      },
    );

    it('403 SIN_PERMISO si el token no trae empresa (tid null)', async () => {
      const { token } = await personaCon(null);
      const { body } = await http()
        .get('/prueba-permisos/casos')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(body).toEqual({
        codigo: 'SIN_PERMISO',
        mensaje: 'Elige una empresa para continuar.',
        campos: null,
      });
    });

    it('aislamiento: el Administrador de una empresa no entra a otra con el tid cambiado', async () => {
      const otra = await empresaConRoles();
      const { usuarioId } = await personaCon(empresaId, 'administrador');
      // Mismo usuario y sesión real, pero el token apunta a la otra empresa.
      const sesion = await prisma.sesion.findFirstOrThrow({
        where: { usuarioId },
      });
      const token = jwt.sign({
        sub: usuarioId,
        tid: otra.id,
        sid: sesion.familiaId,
      });
      const { body } = await http()
        .get('/prueba-permisos/casos')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(body.codigo).toBe('SIN_PERMISO');
    });

    it('un rol creado por la empresa con aprobar_ia en "editar" igual no aprueba', async () => {
      const propio = await prisma.rol.create({
        data: { tenantId: empresaId, nombre: `Socio ${randomUUID()}` },
      });
      await prisma.rolPermiso.create({
        data: {
          tenantId: empresaId,
          rolId: propio.id,
          moduloClave: 'aprobar_ia',
          nivel: 'editar',
        },
      });
      const { usuarioId } = await personaCon(null);
      await prisma.membresia.create({
        data: {
          tenantId: empresaId,
          usuarioId,
          rolId: propio.id,
          estado: 'activa',
          origen: 'codigo',
        },
      });
      const sesion = await prisma.sesion.findFirstOrThrow({
        where: { usuarioId },
      });
      const conEmpresa = jwt.sign({
        sub: usuarioId,
        tid: empresaId,
        sid: sesion.familiaId,
      });
      const { body } = await http()
        .post('/prueba-permisos/aprobar-ia')
        .set('Authorization', `Bearer ${conEmpresa}`)
        .expect(403);
      expect(body.codigo).toBe('SIN_PERMISO');
    });

    it('JwtAuthGuard va primero: sin token 401, con la sesión cerrada 401 SESION_REVOCADA', async () => {
      await http().get('/prueba-permisos/casos').expect(401);

      const { token } = await personaCon(empresaId, 'administrador');
      await http()
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
      const { body } = await http()
        .get('/prueba-permisos/casos')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      expect(body.codigo).toBe('SESION_REVOCADA');
    });
  });
});
