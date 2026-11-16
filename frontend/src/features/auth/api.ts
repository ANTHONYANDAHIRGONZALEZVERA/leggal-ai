import { api } from '@/services/api';
import type { Tokens } from '@/services/api/cliente';
import type { Usuario } from '@/services/sesion';

import type { DatosInicioSesion, DatosRegistro } from './esquemas';

/** Lo que devuelven el login y el registro: quién es y sus tokens. */
export type RespuestaSesion = { usuario: Usuario; tokens: Tokens };

// Peticiones de acceso. Rutas y nombres de campos siguen el contrato
// provisional (docs/api/auth-borrador-frontend.md) hasta tener el de Joel (B03).
export function iniciarSesion(datos: DatosInicioSesion) {
  return api.peticion<RespuestaSesion>('/auth/login', { metodo: 'POST', cuerpo: datos, publica: true });
}

export function registrarse(datos: DatosRegistro) {
  return api.peticion<RespuestaSesion>('/auth/registro', { metodo: 'POST', cuerpo: datos, publica: true });
}
