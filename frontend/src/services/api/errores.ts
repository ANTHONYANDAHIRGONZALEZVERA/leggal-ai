// Errores de la API en un solo formato, con mensajes en español listos para
// mostrar. Las pantallas nunca leen respuestas crudas del servidor.

/** Cuerpo de error del backend (contrato B03: docs/api/auth.md). */
export type CuerpoError = {
  codigo?: string;
  mensaje?: string;
  /** Solo en errores de validación: campo → mensaje. En los demás llega null. */
  campos?: Record<string, string> | null;
};

export const MENSAJE_GENERICO = 'Algo salió mal. Inténtalo de nuevo.';

// Mensajes propios para los códigos conocidos: el texto que ve la persona no
// depende de cómo lo redacte el servidor.
// Los que llevan "app" los crea la propia app; los demás vienen del backend.
const mensajes: Record<string, string> = {
  SIN_CONEXION: 'No hay conexión. Revisa tu internet e inténtalo de nuevo.', // app
  TIEMPO_AGOTADO: 'El servidor tardó demasiado en responder. Inténtalo de nuevo.', // app
  SESION_EXPIRADA: 'Tu sesión expiró. Vuelve a iniciar sesión.', // app
  ERROR_SERVIDOR: 'El servidor tuvo un problema. Inténtalo en unos minutos.', // app: 5xx sin cuerpo
  CREDENCIALES_INVALIDAS: 'Correo o contraseña incorrectos.',
  CORREO_EN_USO: 'Ya existe una cuenta con este correo.',
  SESION_REVOCADA: 'Tu sesión se cerró por seguridad. Vuelve a iniciar sesión.',
  USUARIO_INACTIVO: 'Tu cuenta está suspendida. Escríbenos si crees que es un error.',
  DEMASIADOS_INTENTOS: 'Hiciste demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  ERROR_INTERNO: 'El servidor tuvo un problema. Inténtalo en unos minutos.',
};

export class ErrorApi extends Error {
  readonly codigo: string;
  /** Estado HTTP; 0 si la petición ni siquiera llegó al servidor. */
  readonly estado: number;
  readonly campos?: Record<string, string>;

  constructor(codigo: string, estado: number, mensajeServidor?: string, campos?: Record<string, string> | null) {
    super(mensajes[codigo] ?? mensajeServidor ?? MENSAJE_GENERICO);
    this.name = 'ErrorApi';
    this.codigo = codigo;
    this.estado = estado;
    this.campos = campos ?? undefined;
  }

  static desdeRespuesta(estado: number, cuerpo: unknown): ErrorApi {
    const datos: CuerpoError = typeof cuerpo === 'object' && cuerpo !== null ? cuerpo : {};
    const codigo = datos.codigo ?? (estado >= 500 ? 'ERROR_SERVIDOR' : 'DESCONOCIDO');
    return new ErrorApi(codigo, estado, datos.mensaje, datos.campos);
  }
}
