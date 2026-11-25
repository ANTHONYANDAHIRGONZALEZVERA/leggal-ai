import type { Prisma } from '../generated/prisma/client';
import {
  MODULOS,
  ROLES_BASE,
  ROLES_QUE_APRUEBAN_IA,
  type RolBase,
} from './catalogo';

/** Sirve tanto el cliente normal como el de una transacción. */
type Bd = Prisma.TransactionClient;

export interface ResultadoRolesBase {
  rolesCreados: number;
  permisosCreados: number;
  permisosCorregidos: number;
}

/**
 * Deja el catálogo `modulos` igual al de la app. Es global (no lleva
 * tenant_id) y nadie lo edita desde la API, así que aquí sí se sobrescribe.
 */
export async function sincronizarModulos(bd: Bd): Promise<void> {
  for (const [indice, { clave, nombre }] of MODULOS.entries()) {
    await bd.modulo.upsert({
      where: { clave },
      create: { clave, nombre, orden: indice + 1 },
      update: { nombre, orden: indice + 1 },
    });
  }
}

/**
 * Crea en la empresa los cinco roles base y su matriz de permisos. Se puede
 * correr las veces que sea (seed, creación de empresa, migraciones futuras):
 *
 * - Crea solo lo que falta: un rol o un módulo nuevo. No pisa los niveles ni
 *   los nombres que el administrador haya cambiado en "Permisos por rol".
 * - Sí impone siempre las dos reglas duras, aunque alguien las haya cambiado
 *   a mano en la base: "Aprobar respuestas IA" solo para Administrador y
 *   Abogado/a, y Administrador nunca baja de "editar" en Administración (si
 *   no, la empresa podría quedarse sin nadie que la administre).
 *
 * Conviene llamarla dentro de una transacción.
 */
export async function aplicarRolesBase(
  bd: Bd,
  tenantId: string,
): Promise<ResultadoRolesBase> {
  let rolesCreados = 0;
  const idsPorClave = new Map<string, string>();
  for (const rolBase of ROLES_BASE) {
    const { id, creado } = await asegurarRol(bd, tenantId, rolBase);
    idsPorClave.set(rolBase.clave, id);
    if (creado) rolesCreados++;
  }

  // Todos los roles de la empresa (también los que creó el administrador)
  // terminan con una fila por módulo; los que no son base empiezan en
  // "ninguno". Las filas que ya existen no se tocan (skipDuplicates).
  const roles = await bd.rol.findMany({
    where: { tenantId },
    select: { id: true, clave: true },
  });
  const filas = roles.flatMap((rol) => {
    const base = ROLES_BASE.find((r) => r.clave === rol.clave);
    return MODULOS.map(({ clave }) => ({
      tenantId,
      rolId: rol.id,
      moduloClave: clave,
      nivel: base ? base.permisos[clave] : ('ninguno' as const),
    }));
  });
  const { count: permisosCreados } = await bd.rolPermiso.createMany({
    data: filas,
    skipDuplicates: true,
  });

  const { count: iaCorregidos } = await bd.rolPermiso.updateMany({
    where: {
      tenantId,
      moduloClave: 'aprobar_ia',
      nivel: { not: 'ninguno' },
      rol: {
        OR: [{ clave: null }, { clave: { notIn: [...ROLES_QUE_APRUEBAN_IA] } }],
      },
    },
    data: { nivel: 'ninguno' },
  });
  const { count: adminCorregidos } = await bd.rolPermiso.updateMany({
    where: {
      tenantId,
      rolId: idsPorClave.get('administrador'),
      moduloClave: 'administracion',
      nivel: { not: 'editar' },
    },
    data: { nivel: 'editar' },
  });

  return {
    rolesCreados,
    permisosCreados,
    permisosCorregidos: iaCorregidos + adminCorregidos,
  };
}

/**
 * Busca el rol base por su clave; si no está, adopta un rol con el mismo
 * nombre que todavía no tenga clave (por ejemplo, creado a mano antes del
 * seed), y si tampoco existe lo crea.
 */
async function asegurarRol(
  bd: Bd,
  tenantId: string,
  { clave, nombre }: RolBase,
): Promise<{ id: string; creado: boolean }> {
  const porClave = await bd.rol.findUnique({
    where: { tenantId_clave: { tenantId, clave } },
    select: { id: true, esSistema: true },
  });
  if (porClave) {
    if (!porClave.esSistema) {
      await bd.rol.update({
        where: { id: porClave.id },
        data: { esSistema: true },
      });
    }
    return { id: porClave.id, creado: false };
  }

  const porNombre = await bd.rol.findUnique({
    where: { tenantId_nombre: { tenantId, nombre } },
    select: { id: true, clave: true },
  });
  if (porNombre) {
    if (porNombre.clave !== null) {
      // Otro rol base ya usa este nombre: un dato inconsistente que no se
      // arregla adivinando.
      throw new Error(
        `La empresa ${tenantId} tiene el rol "${nombre}" con la clave "${porNombre.clave}" en lugar de "${clave}"`,
      );
    }
    await bd.rol.update({
      where: { id: porNombre.id },
      data: { clave, esSistema: true },
    });
    return { id: porNombre.id, creado: false };
  }

  const creado = await bd.rol.create({
    data: { tenantId, clave, nombre, esSistema: true },
    select: { id: true },
  });
  return { id: creado.id, creado: true };
}
