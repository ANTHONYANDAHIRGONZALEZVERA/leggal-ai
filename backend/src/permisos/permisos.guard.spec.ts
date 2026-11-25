import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { SesionActual } from '../auth/guardia/sesion-actual';
import type { PrismaService } from '../prisma/prisma.service';
import { type PermisoRequerido, PermisosGuard } from './permisos.guard';

// El guard con una base falsa, para que corra en CI sin PostgreSQL. Las e2e
// (test/permisos.e2e-spec.ts) lo prueban con la base real y los roles del seed.
const USUARIO = '8f1c2d7a-3b4e-4f6a-9c1d-2e3f4a5b6c7d';
const EMPRESA = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

interface MembresiaFalsa {
  estado: string;
  clave: string | null;
  nivel?: string;
}

function armar(
  requerido: PermisoRequerido | undefined,
  membresia: MembresiaFalsa | null,
  sesion: Partial<SesionActual> | null = {},
) {
  const findUnique = jest.fn().mockResolvedValue(
    membresia && {
      id: 'm-1',
      estado: membresia.estado,
      rol: {
        id: 'r-1',
        clave: membresia.clave,
        permisos: membresia.nivel ? [{ nivel: membresia.nivel }] : [],
      },
    },
  );
  const prisma = { membresia: { findUnique } } as unknown as PrismaService;
  const reflector = {
    getAllAndOverride: () => requerido,
  } as unknown as Reflector;
  const peticion = {
    sesionActual: sesion
      ? {
          usuarioId: USUARIO,
          sesionId: 's-1',
          empresaId: EMPRESA,
          usuario: { id: USUARIO },
          ...sesion,
        }
      : undefined,
  };
  const contexto = {
    switchToHttp: () => ({ getRequest: () => peticion }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
  return {
    pasa: () => new PermisosGuard(prisma, reflector).canActivate(contexto),
    findUnique,
    peticion,
  };
}

const resultado = (promesa: Promise<unknown>) =>
  promesa.then(
    () => 'pasa',
    (error: { codigo?: string; getStatus?: () => number }) =>
      `${error.getStatus?.()} ${error.codigo ?? ''}`.trim(),
  );

const casosEditar: PermisoRequerido = { modulo: 'casos', nivel: 'editar' };
const casosVer: PermisoRequerido = { modulo: 'casos', nivel: 'ver' };
const aprobarIa: PermisoRequerido = { modulo: 'aprobar_ia', nivel: 'editar' };

describe('PermisosGuard', () => {
  it('pasa con membresía activa y el nivel justo, y guarda la membresía', async () => {
    const { pasa, findUnique, peticion } = armar(casosEditar, {
      estado: 'activa',
      clave: 'abogado',
      nivel: 'editar',
    });
    expect(await resultado(pasa())).toBe('pasa');
    expect(peticion.sesionActual?.membresia).toEqual({
      id: 'm-1',
      rolId: 'r-1',
      rolClave: 'abogado',
    });
    // Busca por la empresa del token y la persona del token, y solo el módulo pedido.
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_usuarioId: { tenantId: EMPRESA, usuarioId: USUARIO },
        },
      }),
    );
    const consulta = findUnique.mock.calls[0][0] as {
      select: { rol: { select: { permisos: { where: unknown } } } };
    };
    expect(consulta.select.rol.select.permisos.where).toEqual({
      moduloClave: 'casos',
    });
  });

  it('"editar" incluye "ver"', async () => {
    const { pasa } = armar(casosVer, {
      estado: 'activa',
      clave: 'abogado',
      nivel: 'editar',
    });
    expect(await resultado(pasa())).toBe('pasa');
  });

  it.each([
    ['"ver" no alcanza para "editar"', casosEditar, 'ver'],
    ['"ninguno" no alcanza para "ver"', casosVer, 'ninguno'],
    ['sin fila para el módulo cuenta como "ninguno"', casosVer, undefined],
  ])('403 SIN_PERMISO: %s', async (_caso, requerido, nivel) => {
    const { pasa } = armar(requerido, {
      estado: 'activa',
      clave: 'contador',
      nivel,
    });
    expect(await resultado(pasa())).toBe('403 SIN_PERMISO');
  });

  it.each(['en_espera', 'suspendida', 'rechazada'])(
    '403 SIN_PERMISO con la membresía %s, aunque el rol tenga el permiso',
    async (estado) => {
      const { pasa } = armar(casosVer, {
        estado,
        clave: 'administrador',
        nivel: 'editar',
      });
      expect(await resultado(pasa())).toBe('403 SIN_PERMISO');
    },
  );

  it('403 SIN_PERMISO si no es miembro de la empresa del token', async () => {
    const { pasa } = armar(casosVer, null);
    expect(await resultado(pasa())).toBe('403 SIN_PERMISO');
  });

  it('403 SIN_PERMISO si el token no trae empresa (tid null), sin consultar la base', async () => {
    const { pasa, findUnique } = armar(
      casosVer,
      { estado: 'activa', clave: 'administrador', nivel: 'editar' },
      { empresaId: null },
    );
    expect(await resultado(pasa())).toBe('403 SIN_PERMISO');
    expect(findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['administrador', 'pasa'],
    ['abogado', 'pasa'],
    ['asistente_legal', '403 SIN_PERMISO'],
    ['contador', '403 SIN_PERMISO'],
    ['solo_lectura', '403 SIN_PERMISO'],
    [null, '403 SIN_PERMISO'],
  ])(
    'aprobar IA con nivel "editar" en la base: rol %s → %s',
    async (clave, esperado) => {
      // El nivel está en "editar" para todos a propósito: la regla de negocio
      // no depende solo de la matriz, que se puede editar.
      const { pasa } = armar(aprobarIa, {
        estado: 'activa',
        clave,
        nivel: 'editar',
      });
      expect(await resultado(pasa())).toBe(esperado);
    },
  );

  it('500 si se usa sin @RequierePermiso() o sin JwtAuthGuard delante', async () => {
    const membresia = { estado: 'activa', clave: 'abogado', nivel: 'editar' };
    expect(await resultado(armar(undefined, membresia).pasa())).toBe('500');
    expect(await resultado(armar(casosVer, membresia, null).pasa())).toBe(
      '500',
    );
  });
});
