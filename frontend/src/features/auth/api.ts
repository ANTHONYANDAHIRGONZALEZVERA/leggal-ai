import { api } from '@/services/api';
import { RUTAS_AUTH, type RespuestaSesionApi, type RespuestaYoApi, type UsuarioApi } from '@/services/api/contrato';
import { useSesion } from '@/services/sesion';

import type { DatosInicioSesion, DatosRegistro } from './esquemas';

// Peticiones de acceso según el contrato del backend (B03, docs/api/auth.md).
export function iniciarSesion(datos: DatosInicioSesion) {
  return api.peticion<RespuestaSesionApi>(RUTAS_AUTH.login, { metodo: 'POST', cuerpo: datos, publica: true });
}

export function registrarse(datos: DatosRegistro) {
  return api.peticion<RespuestaSesionApi>(RUTAS_AUTH.registro, { metodo: 'POST', cuerpo: datos, publica: true });
}

/** "Revisa tu correo" (B27): confirma el correo con el código de 6 dígitos. */
export function verificarCorreo(codigo: string) {
  return api.peticion<{ usuario: UsuarioApi }>(RUTAS_AUTH.verificarCorreo, { metodo: 'POST', cuerpo: { codigo } });
}

/** Pide otro código de verificación (como mínimo cada 45 s). */
export function reenviarCodigo() {
  return api.peticion<void>(RUTAS_AUTH.reenviarCodigo, { metodo: 'POST' });
}

/** "Cambiar correo" mientras no esté verificado: envía un código al correo nuevo. */
export function cambiarCorreo(correo: string) {
  return api.peticion<{ usuario: UsuarioApi }>(RUTAS_AUTH.cambiarCorreo, { metodo: 'PATCH', cuerpo: { correo } });
}

/** "¿Olvidaste tu contraseña?" paso 1 (B28): siempre responde bien, exista o no la cuenta. */
export function pedirCodigoContrasena(correo: string) {
  return api.peticion<void>(RUTAS_AUTH.olvideContrasena, { metodo: 'POST', cuerpo: { correo }, publica: true });
}

/** Paso 2: código y contraseña nueva. Cierra todas las sesiones de la cuenta. */
export function restablecerContrasena(datos: { correo: string; codigo: string; contrasena: string }) {
  return api.peticion<void>(RUTAS_AUTH.restablecerContrasena, { metodo: 'POST', cuerpo: datos, publica: true });
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
