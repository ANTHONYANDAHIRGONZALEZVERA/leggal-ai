import { z } from '../comun/validacion/zod-es';

// Esquemas del contrato de autenticación (docs/api/auth.md). Son estrictos:
// un campo de más (por ejemplo un tenantId) responde 400 VALIDACION, porque
// la empresa activa sale siempre del token y nunca del cuerpo.

/** Igual que el formulario de la app: recortado y en minúsculas. */
const correo = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Ingresa un correo válido').max(254));

export const esquemaRegistro = z.strictObject({
  nombre: z
    .string()
    .trim()
    .min(3, 'Ingresa tu nombre completo')
    .max(80, 'Máximo 80 caracteres'),
  correo,
  contrasena: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(72, 'Máximo 72 caracteres'),
  aceptaTerminos: z.literal(true, {
    error: 'Debes aceptar los Términos y la Política para continuar',
  }),
});

export const esquemaLogin = z.strictObject({
  correo,
  // Sin mínimo propio: una contraseña corta simplemente no coincide. El
  // máximo evita gastar el cifrado en textos enormes.
  contrasena: z
    .string()
    .min(1, 'Ingresa tu contraseña')
    .max(72, 'Máximo 72 caracteres'),
});

export const esquemaRefresco = z.strictObject({
  tokenRefresco: z.string().min(1).max(128),
});

export type DatosRegistro = z.output<typeof esquemaRegistro>;
export type DatosLogin = z.output<typeof esquemaLogin>;
export type DatosRefresco = z.output<typeof esquemaRefresco>;

// Respuestas: sirven de tipo y de documentación en Swagger.

/** Objeto usuario: igual en register, login, refresh y me. */
export const esquemaUsuarioApi = z.object({
  id: z.uuid(),
  nombre: z.string(),
  nombreVisible: z.string().nullable(),
  nombreUsuario: z.string().nullable(),
  correo: z.email(),
  correoVerificado: z.boolean(),
  onboardingCompleto: z.boolean(),
  creadoEn: z.iso.datetime(),
});

export const esquemaRespuestaSesion = z.object({
  tokenAcceso: z.string().meta({ description: 'JWT de 15 minutos' }),
  tokenRefresco: z
    .string()
    .meta({ description: 'Cadena opaca de 30 días; rota en cada uso' }),
  venceEn: z.number().meta({
    description: 'Segundos de vida del token de acceso',
    example: 900,
  }),
  usuario: esquemaUsuarioApi,
});

export type UsuarioApi = z.infer<typeof esquemaUsuarioApi>;
export type RespuestaSesion = z.infer<typeof esquemaRespuestaSesion>;

/** Empresa de la persona en GET /auth/me (membresías activas o en espera). */
export const esquemaEmpresaYo = z.object({
  id: z.uuid(),
  nombre: z.string(),
  tipo: z.enum(['empresa', 'personal']),
  rol: z.string().meta({ example: 'Administrador' }),
  estadoMembresia: z.enum(['activa', 'en_espera']),
});

export const esquemaRespuestaYo = z.object({
  usuario: esquemaUsuarioApi,
  empresaActivaId: z
    .uuid()
    .nullable()
    .meta({ description: 'Igual al tid del token' }),
  empresas: z.array(esquemaEmpresaYo),
});

export type RespuestaYo = z.infer<typeof esquemaRespuestaYo>;
