import { api } from '@/services/api';
import type { RespuestaSesionApi, UsuarioApi } from '@/services/api/contrato';
import { useSesion } from '@/services/sesion';

import { useBorradorOnboarding } from './borrador';
import type { AreaValidada, Modo, PreferenciasValidadas } from './esquemas';

// Envío final del onboarding (F31): todo lo de los 5 pasos en una sola
// petición (B34). Rutas del plan; los campos son una propuesta del frontend
// (docs/api/onboarding-borrador-frontend.md) hasta el contrato del backend.

export const RUTA_ONBOARDING = '/users/me/onboarding';
export const RUTA_ESPACIO_PERSONAL = '/tenants';

/** Cuerpo de PATCH /users/me/onboarding. */
export type DatosOnboarding = {
  nombreVisible: string;
  nombreUsuario: string;
  perfilProfesional: AreaValidada;
  modo: Modo;
  preferencias: PreferenciasValidadas;
};

/**
 * ¿Hace falta el espacio personal? Siempre en modo Personal (plan, B35); y en
 * Colaborativo si todavía no tiene empresa (no creó una ni lo aprobaron), para
 * que tenga dónde trabajar mientras espera.
 */
export function necesitaEspacioPersonal({
  modo,
  empresaCreada,
  solicitudAprobada,
}: {
  modo: Modo;
  empresaCreada: boolean;
  solicitudAprobada: boolean;
}) {
  return modo === 'personal' || (!empresaCreada && !solicitudAprobada);
}

/**
 * Crea el espacio personal si hace falta y envía el onboarding. Al terminar,
 * la sesión trae el usuario con el onboarding hecho y la navegación lleva sola
 * a Inicio. Si algo falla, lanza el ErrorApi y no se pierde el borrador.
 */
export async function enviarOnboarding(preferencias: PreferenciasValidadas) {
  const { perfil, area, modo, empresa, solicitud, vaciar } = useBorradorOnboarding.getState();
  if (!perfil || !area || !modo) throw new Error('Faltan pasos del onboarding');

  if (necesitaEspacioPersonal({ modo, empresaCreada: Boolean(empresa), solicitudAprobada: solicitud?.estado === 'aprobada' })) {
    // Idempotente en el servidor: si ya existe, devuelve el mismo espacio.
    const sesion = await api.peticion<RespuestaSesionApi>(RUTA_ESPACIO_PERSONAL, { metodo: 'POST', cuerpo: { tipo: 'personal' } });
    useSesion.getState().iniciar(sesion);
  }

  const datos: DatosOnboarding = {
    nombreVisible: perfil.nombre,
    nombreUsuario: perfil.usuario,
    perfilProfesional: area,
    modo,
    preferencias,
  };
  const { usuario } = await api.peticion<{ usuario: UsuarioApi }>(RUTA_ONBOARDING, { metodo: 'PATCH', cuerpo: datos });

  useSesion.getState().actualizarUsuario(usuario);
  vaciar();
}
