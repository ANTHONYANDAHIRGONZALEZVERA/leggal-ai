import { api } from '@/services/api';

import {
  RUTAS_EMPRESAS,
  type NuevaEmpresa,
  type RespuestaEmpresaCreada,
  type SolicitudAcceso,
  type VistaPreviaCodigo,
} from './contrato';

/** Empresa, rol y si requiere aprobación, sin canjear el código todavía. */
export function consultarCodigo(codigo: string) {
  return api.peticion<VistaPreviaCodigo>(RUTAS_EMPRESAS.vistaPrevia, {
    metodo: 'POST',
    cuerpo: { codigo },
  });
}

/** Canjea el código: crea la solicitud de acceso (o entra directo si no requiere aprobación). */
export async function solicitarAcceso(codigo: string) {
  const { solicitud } = await api.peticion<{ solicitud: SolicitudAcceso }>(RUTAS_EMPRESAS.canjear, {
    metodo: 'POST',
    cuerpo: { codigo },
  });
  return solicitud;
}

export async function consultarMisSolicitudes() {
  const { solicitudes } = await api.peticion<{
    solicitudes: SolicitudAcceso[];
  }>(RUTAS_EMPRESAS.misSolicitudes);
  return solicitudes;
}

export function cancelarSolicitud(id: string) {
  return api.peticion<void>(RUTAS_EMPRESAS.solicitud(id), { metodo: 'DELETE' });
}

export function crearEmpresa(datos: Omit<NuevaEmpresa, 'tipo'>) {
  return api.peticion<RespuestaEmpresaCreada>(RUTAS_EMPRESAS.crearEmpresa, {
    metodo: 'POST',
    cuerpo: { tipo: 'empresa', ...datos } satisfies NuevaEmpresa,
  });
}

export const claveVistaPrevia = (codigo: string) => ['invitaciones', 'vista-previa', codigo] as const;
export const claveMisSolicitudes = ['solicitudes', 'mias'] as const;
