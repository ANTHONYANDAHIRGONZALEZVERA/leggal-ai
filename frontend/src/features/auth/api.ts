import { api } from '@/services/api';
import { RUTAS_AUTH, type RespuestaSesionApi, type RespuestaYoApi } from '@/services/api/contrato';
import { useSesion } from '@/services/sesion';

import type { DatosInicioSesion, DatosRegistro } from './esquemas';

// Peticiones de acceso según el contrato del backend (B03, docs/api/auth.md).
export function iniciarSesion(datos: DatosInicioSesion) {
  return api.peticion<RespuestaSesionApi>(RUTAS_AUTH.login, { metodo: 'POST', cuerpo: datos, publica: true });
}

export function registrarse(datos: DatosRegistro) {
  return api.peticion<RespuestaSesionApi>(RUTAS_AUTH.registro, { metodo: 'POST', cuerpo: datos, publica: true });
}

/** Datos de la persona y sus empresas; también comprueba que la sesión sigue vigente. */
export function consultarYo() {
  return api.peticion<RespuestaYoApi>(RUTAS_AUTH.yo);
}

/**
 * Cierra la sesión en el teléfono y avisa al servidor para que la revoque. Si
 * el aviso falla (sin red, token vencido), la sesión local se cierra igual: la
 * persona pidió salir y no debe quedar dentro.
 */
export async function cerrarSesion() {
  const { tokens, cerrar } = useSesion.getState();
  try {
    if (tokens) await api.peticion(RUTAS_AUTH.logout, { metodo: 'POST', sinRenovar: true });
  } catch {
    // Ver arriba: el cierre local no depende del servidor.
  } finally {
    cerrar();
  }
}
