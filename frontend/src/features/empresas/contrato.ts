import type { RespuestaSesionApi } from '@/services/api/contrato';

// Empresas, códigos de invitación y solicitudes de acceso (B35 y B39).
// Propuesta del frontend hasta que el backend escriba su contrato:
// docs/api/empresas-borrador-frontend.md.

export const RUTAS_EMPRESAS = {
  vistaPrevia: '/invitations/preview',
  canjear: '/invitations/redeem',
  misSolicitudes: '/join-requests/me',
  solicitud: (id: string) => `/join-requests/me/${encodeURIComponent(id)}`,
  crearEmpresa: '/tenants',
} as const;

export type EmpresaResumen = {
  id: string;
  nombre: string;
  verificada: boolean;
};
export type RolAsignado = { codigo: string; nombre: string };

/** POST /invitations/preview: qué empresa y rol hay detrás de un código, sin canjearlo. */
export type VistaPreviaCodigo = {
  empresa: EmpresaResumen;
  rol: RolAsignado;
  requiereAprobacion: boolean;
};

export type EstadoSolicitud = 'en_espera' | 'aprobada' | 'rechazada' | 'cancelada';

/** Solicitud para unirse a una empresa con un código. */
export type SolicitudAcceso = {
  id: string;
  estado: EstadoSolicitud;
  empresa: EmpresaResumen;
  rol: RolAsignado;
  codigo: string;
  creadaEn: string;
};

export const TAMANOS_EQUIPO = ['1-5', '6-20', '21-50', '50+'] as const;
export type TamanoEquipo = (typeof TAMANOS_EQUIPO)[number];

/** POST /tenants con tipo "empresa": el creador queda como Administrador. */
export type NuevaEmpresa = {
  tipo: 'empresa';
  razonSocial: string;
  ruc: string;
  tamanoEquipo: TamanoEquipo;
};

/** Respuesta de POST /tenants: la empresa y una sesión nueva cuyo token ya trae su tid. */
export type RespuestaEmpresaCreada = RespuestaSesionApi & {
  empresa: EmpresaResumen & { tipo: 'empresa' | 'personal' };
};
