// Formas exactas que define el contrato de autenticación del backend (B03,
// docs/api/auth.md). Si el contrato cambia, se cambia primero allá y después aquí.

/** Objeto usuario: igual en register, login, refresh y me. */
export type UsuarioApi = {
  id: string;
  /** Nombres y apellidos, como se escribieron al registrarse. */
  nombre: string;
  /** Se llenan en el onboarding; null hasta entonces. */
  nombreVisible: string | null;
  nombreUsuario: string | null;
  correo: string;
  /** false hasta verificar el correo con el código (B27/F23). */
  correoVerificado: boolean;
  /** false hasta terminar el paso 5/5. Decide si se muestra el onboarding. */
  onboardingCompleto: boolean;
  /** Fecha ISO 8601 en UTC. */
  creadoEn: string;
};

/** Respuesta de register, login y refresh. */
export type RespuestaSesionApi = {
  /** JWT de 15 minutos con sub, tid, sid, iat y exp. */
  tokenAcceso: string;
  /** Cadena opaca de 30 días que rota en cada uso. */
  tokenRefresco: string;
  /** Segundos de vida del token de acceso. */
  venceEn: number;
  usuario: UsuarioApi;
};

/** Empresa en la que está la persona (semana 2). */
export type EmpresaApi = {
  id: string;
  nombre: string;
  tipo: 'empresa' | 'personal';
  rol: string;
  estadoMembresia: 'activa' | 'en_espera';
};

/** Respuesta de GET /auth/me. */
export type RespuestaYoApi = {
  usuario: UsuarioApi;
  /** Igual al tid del token; null hasta tener empresa. */
  empresaActivaId: string | null;
  empresas: EmpresaApi[];
};

export const RUTAS_AUTH = {
  registro: '/auth/register',
  login: '/auth/login',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  yo: '/auth/me',
  // Propuesta del frontend hasta el contrato de B27 y B28
  // (docs/api/codigos-borrador-frontend.md).
  verificarCorreo: '/auth/verify-email',
  reenviarCodigo: '/auth/verify-email/resend',
  cambiarCorreo: '/auth/email',
  olvideContrasena: '/auth/password/forgot',
  restablecerContrasena: '/auth/password/reset',
} as const;
