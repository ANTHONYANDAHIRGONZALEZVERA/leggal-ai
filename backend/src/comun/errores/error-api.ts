import { HttpException, HttpStatus } from '@nestjs/common';

// Códigos estables del contrato (docs/api/auth.md). La app decide qué hacer
// según el código, nunca según el texto del mensaje: por eso son una lista
// cerrada y no texto libre.
export type CodigoError =
  | 'VALIDACION'
  | 'NO_AUTENTICADO'
  | 'CREDENCIALES_INVALIDAS'
  | 'REFRESCO_INVALIDO'
  | 'SESION_REVOCADA'
  | 'USUARIO_INACTIVO'
  | 'SIN_PERMISO'
  | 'NO_ENCONTRADO'
  | 'CORREO_EN_USO'
  | 'DEMASIADOS_INTENTOS'
  | 'SOLICITUD_INVALIDA'
  | 'ERROR_INTERNO';

/** Errores por campo del formulario: nombre del campo → mensaje. */
export type CamposConError = Record<string, string>;

/** Cuerpo de toda respuesta con error, igual en todas las rutas. */
export interface CuerpoError {
  codigo: CodigoError;
  mensaje: string;
  campos: CamposConError | null;
}

/**
 * Error con el formato del contrato. Los servicios lanzan este error y el
 * filtro global lo convierte en la respuesta { codigo, mensaje, campos }.
 */
export class ErrorApi extends HttpException {
  constructor(
    estado: HttpStatus,
    readonly codigo: CodigoError,
    mensaje: string,
    readonly campos: CamposConError | null = null,
  ) {
    super(mensaje, estado);
  }

  static validacion(campos: CamposConError): ErrorApi {
    return new ErrorApi(
      HttpStatus.BAD_REQUEST,
      'VALIDACION',
      'Revisa los datos marcados.',
      campos,
    );
  }
}
