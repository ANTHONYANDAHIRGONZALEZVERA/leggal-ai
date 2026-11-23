import type { NivelPermiso } from '../generated/prisma/enums';

// Única fuente de los módulos y de los roles base: la usan el seed (B08), el
// guard de permisos (B09) y las pruebas. Viene de la tabla "Roles y permisos"
// del plan de las semanas 1 y 2 y de la pantalla "Permisos por rol".

/** Los 8 módulos de "Permisos por rol", en el orden en que se muestran. */
export const MODULOS = [
  { clave: 'casos', nombre: 'Casos' },
  { clave: 'clientes', nombre: 'Clientes' },
  { clave: 'documentos', nombre: 'Documentos' },
  { clave: 'actividades', nombre: 'Actividades' },
  { clave: 'asistente_ia', nombre: 'Asistente IA' },
  { clave: 'aprobar_ia', nombre: 'Aprobar respuestas IA' },
  { clave: 'administracion', nombre: 'Administración' },
  { clave: 'auditoria', nombre: 'Auditoría' },
] as const;

export type ModuloClave = (typeof MODULOS)[number]['clave'];

export type ClaveRolBase =
  'administrador' | 'abogado' | 'asistente_legal' | 'contador' | 'solo_lectura';

export interface RolBase {
  clave: ClaveRolBase;
  nombre: string;
  permisos: Record<ModuloClave, NivelPermiso>;
}

/**
 * Los cinco roles que recibe cada empresa al crearse. Después el
 * administrador puede ajustar los niveles (B44), salvo las dos reglas duras
 * de abajo.
 */
export const ROLES_BASE: readonly RolBase[] = [
  {
    clave: 'administrador',
    nombre: 'Administrador',
    permisos: {
      casos: 'editar',
      clientes: 'editar',
      documentos: 'editar',
      actividades: 'editar',
      asistente_ia: 'editar',
      aprobar_ia: 'editar',
      administracion: 'editar',
      auditoria: 'ver',
    },
  },
  {
    clave: 'abogado',
    nombre: 'Abogado/a',
    permisos: {
      casos: 'editar',
      clientes: 'editar',
      documentos: 'editar',
      actividades: 'editar',
      asistente_ia: 'editar',
      aprobar_ia: 'editar',
      administracion: 'ninguno',
      auditoria: 'ninguno',
    },
  },
  {
    clave: 'asistente_legal',
    nombre: 'Asistente legal',
    permisos: {
      casos: 'editar',
      clientes: 'editar',
      documentos: 'editar',
      actividades: 'editar',
      asistente_ia: 'editar',
      aprobar_ia: 'ninguno',
      administracion: 'ninguno',
      auditoria: 'ninguno',
    },
  },
  {
    clave: 'contador',
    nombre: 'Contador/a',
    permisos: {
      casos: 'ver',
      clientes: 'ver',
      documentos: 'ver',
      actividades: 'ver',
      asistente_ia: 'ninguno',
      aprobar_ia: 'ninguno',
      administracion: 'ninguno',
      auditoria: 'ninguno',
    },
  },
  {
    clave: 'solo_lectura',
    nombre: 'Solo lectura',
    permisos: {
      casos: 'ver',
      clientes: 'ver',
      documentos: 'ver',
      actividades: 'ver',
      asistente_ia: 'ninguno',
      aprobar_ia: 'ninguno',
      administracion: 'ninguno',
      auditoria: 'ninguno',
    },
  },
];

/**
 * Regla de negocio: solo un abogado o un administrador revisa y aprueba lo
 * que responde la IA, porque firma con su responsabilidad profesional. Para
 * cualquier otro rol (también los que cree la empresa) queda bloqueado.
 */
export const ROLES_QUE_APRUEBAN_IA: readonly ClaveRolBase[] = [
  'administrador',
  'abogado',
];

export const puedeAprobarIa = (claveRol: string | null): boolean =>
  ROLES_QUE_APRUEBAN_IA.some((clave) => clave === claveRol);

/** "editar" incluye "ver"; "ninguno" no alcanza para nada. */
const RANGO: Record<NivelPermiso, number> = { ninguno: 0, ver: 1, editar: 2 };

export const alcanzaNivel = (
  tiene: NivelPermiso,
  exige: Exclude<NivelPermiso, 'ninguno'>,
): boolean => RANGO[tiene] >= RANGO[exige];
