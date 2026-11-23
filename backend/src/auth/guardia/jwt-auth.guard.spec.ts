import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Entorno } from '../../config/entorno';
import type { PrismaService } from '../../prisma/prisma.service';
import { TokensService } from '../tokens.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { SesionActual } from './sesion-actual';

// El guard con un JWT real y una base falsa: así corre en CI sin PostgreSQL.
// Las e2e (test/auth-sesion.e2e-spec.ts) lo prueban contra la base real.
const entorno = { JWT_ACCESO_SEGUNDOS: 900 } as Entorno;
const jwt = new JwtService({
  secret: 'x'.repeat(32),
  signOptions: { algorithm: 'HS256', expiresIn: 900 },
  verifyOptions: { algorithms: ['HS256'] },
});
const tokens = new TokensService(jwt, entorno);

const SUB = '8f1c2d7a-3b4e-4f6a-9c1d-2e3f4a5b6c7d';
const SID = 'b2a4c6e8-1d3f-4a5b-8c7d-9e0f1a2b3c4d';
const tokenValido = () =>
  tokens.firmarAcceso({ sub: SUB, tid: null, sid: SID });

function armar(sesionEnBd: unknown, permitirCerrada = false) {
  const findFirst = jest.fn().mockResolvedValue(sesionEnBd);
  const prisma = { sesion: { findFirst } } as unknown as PrismaService;
  const reflector = {
    getAllAndOverride: () => permitirCerrada,
  } as unknown as Reflector;
  return { guard: new JwtAuthGuard(tokens, prisma, reflector), findFirst };
}

function contextoCon(authorization?: string) {
  const peticion: {
    headers: Record<string, string>;
    sesionActual?: SesionActual;
  } = { headers: authorization ? { authorization } : {} };
  const contexto = {
    switchToHttp: () => ({ getRequest: () => peticion }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
  return { contexto, peticion };
}

const codigoDe = (promesa: Promise<unknown>) =>
  promesa.then(
    () => 'sin error',
    (error: { codigo?: string; getStatus?: () => number }) =>
      `${error.getStatus?.()} ${error.codigo}`,
  );

const usuarioActivo = { id: SUB, estado: 'activo' };

describe('JwtAuthGuard', () => {
  it.each([
    ['sin cabecera', undefined],
    ['otro esquema', `Basic ${tokenValido()}`],
    ['Bearer sin token', 'Bearer'],
    ['con partes de más', `Bearer ${tokenValido()} extra`],
  ])('401 NO_AUTENTICADO: %s', async (_caso, cabecera) => {
    const { guard, findFirst } = armar(null);
    const { contexto } = contextoCon(cabecera);
    expect(await codigoDe(guard.canActivate(contexto))).toBe(
      '401 NO_AUTENTICADO',
    );
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('401 TOKEN_INVALIDO con una firma falsa, sin consultar la base', async () => {
    const { guard, findFirst } = armar(null);
    const falso = new JwtService({ secret: 'y'.repeat(32) }).sign({
      sub: SUB,
      tid: null,
      sid: SID,
    });
    const { contexto } = contextoCon(`Bearer ${falso}`);
    expect(await codigoDe(guard.canActivate(contexto))).toBe(
      '401 TOKEN_INVALIDO',
    );
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('401 TOKEN_EXPIRADO con un token vencido', async () => {
    const { guard } = armar(null);
    const vencido = jwt.sign(
      { sub: SUB, tid: null, sid: SID },
      { expiresIn: -1 },
    );
    const { contexto } = contextoCon(`Bearer ${vencido}`);
    expect(await codigoDe(guard.canActivate(contexto))).toBe(
      '401 TOKEN_EXPIRADO',
    );
  });

  it('401 SESION_REVOCADA si la sesión no sigue abierta en la base', async () => {
    const { guard, findFirst } = armar(null);
    const { contexto } = contextoCon(`Bearer ${tokenValido()}`);
    expect(await codigoDe(guard.canActivate(contexto))).toBe(
      '401 SESION_REVOCADA',
    );
    // Busca por el sid Y el usuario del token, y solo filas sin revocar.
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { familiaId: SID, usuarioId: SUB, revocadoEn: null },
      }),
    );
  });

  it('403 USUARIO_INACTIVO si la cuenta está suspendida', async () => {
    const { guard } = armar({
      usuario: { ...usuarioActivo, estado: 'suspendido' },
    });
    const { contexto } = contextoCon(`Bearer ${tokenValido()}`);
    expect(await codigoDe(guard.canActivate(contexto))).toBe(
      '403 USUARIO_INACTIVO',
    );
  });

  it('deja pasar y guarda la sesión actual para @UsuarioActual()', async () => {
    const { guard } = armar({ usuario: usuarioActivo });
    const { contexto, peticion } = contextoCon(`bearer ${tokenValido()}`);
    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(peticion.sesionActual).toEqual({
      usuarioId: SUB,
      sesionId: SID,
      empresaId: null,
      usuario: usuarioActivo,
    });
  });

  it('con @PermitirSesionCerrada(): exige token válido pero no consulta la sesión', async () => {
    const { guard, findFirst } = armar(null, true);
    const { contexto, peticion } = contextoCon(`Bearer ${tokenValido()}`);
    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
    expect(peticion.sesionActual).toEqual({
      usuarioId: SUB,
      sesionId: SID,
      empresaId: null,
    });

    const { guard: otro } = armar(null, true);
    const { contexto: sinToken } = contextoCon();
    expect(await codigoDe(otro.canActivate(sinToken))).toBe(
      '401 NO_AUTENTICADO',
    );
  });
});
