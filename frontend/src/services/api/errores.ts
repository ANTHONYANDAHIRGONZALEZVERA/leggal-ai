// Errores de la API en un solo formato, con mensajes en español listos para
// mostrar. Las pantallas nunca leen respuestas crudas del servidor.

/** Cuerpo de error del backend (contrato provisional: docs/api/auth-borrador-frontend.md). */
export type CuerpoError = {
  codigo?: string;
  mensaje?: string;
  /** Errores de campos concretos del formulario, por nombre de campo. */
  campos?: Record<string, string>;
};

export const MENSAJE_GENERICO = 'Algo salió mal. Inténtalo de nuevo.';

// Mensajes propios para los códigos conocidos: el texto que ve la persona no
// depende de cómo lo redacte el servidor.
const mensajes: Record<string, string> = {
  SIN_CONEXION: 'No hay conexión. Revisa tu internet e inténtalo de nuevo.',
  TIEMPO_AGOTADO: 'El servidor tardó demasiado en responder. Inténtalo de nuevo.',
  SESION_EXPIRADA: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  CREDENCIALES_INVALIDAS: 'Correo o contraseña incorrectos.',
  CORREO_EN_USO: 'Ya existe una cuenta con este correo.',
  ERROR_SERVIDOR: 'El servidor tuvo un problema. Inténtalo en unos minutos.',
};

export class ErrorApi extends Error {
  readonly codigo: string;
  /** Estado HTTP; 0 si la petición ni siquiera llegó al servidor. */
  readonly estado: number;
  readonly campos?: Record<string, string>;

  constructor(codigo: string, estado: number, mensajeServidor?: string, campos?: Record<string, string>) {
    super(mensajes[codigo] ?? mensajeServidor ?? MENSAJE_GENERICO);
    this.name = 'ErrorApi';
    this.codigo = codigo;
    this.estado = estado;
    this.campos = campos;
  }

  static desdeRespuesta(estado: number, cuerpo: unknown): ErrorApi {
    const datos: CuerpoError = typeof cuerpo === 'object' && cuerpo !== null ? cuerpo : {};
    const codigo = datos.codigo ?? (estado >= 500 ? 'ERROR_SERVIDOR' : 'DESCONOCIDO');
    return new ErrorApi(codigo, estado, datos.mensaje, datos.campos);
  }
}
