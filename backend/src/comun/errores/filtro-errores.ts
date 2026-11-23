import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { type CodigoError, type CuerpoError, ErrorApi } from './error-api';

// Errores de Nest o de Express (ruta inexistente, JSON mal formado, límite de
// peticiones...) que no pasan por ErrorApi: se traducen a un código estable.
// Un 400 genérico (por ejemplo, el JSON mal formado que rechaza el lector del
// cuerpo) es SOLICITUD_INVALIDA y no VALIDACION: el contrato reserva
// VALIDACION para cuando hay campos que marcar en el formulario.
const CODIGO_POR_ESTADO: Partial<Record<number, [CodigoError, string]>> = {
  [HttpStatus.BAD_REQUEST]: [
    'SOLICITUD_INVALIDA',
    'La petición no tiene un formato válido.',
  ],
  [HttpStatus.UNAUTHORIZED]: [
    'NO_AUTENTICADO',
    'Inicia sesión para continuar.',
  ],
  [HttpStatus.FORBIDDEN]: [
    'SIN_PERMISO',
    'No tienes permiso para esta acción.',
  ],
  [HttpStatus.NOT_FOUND]: ['NO_ENCONTRADO', 'No encontramos lo que buscas.'],
  [HttpStatus.TOO_MANY_REQUESTS]: [
    'DEMASIADOS_INTENTOS',
    'Hiciste demasiados intentos. Espera un momento y vuelve a probar.',
  ],
};

/**
 * Convierte cualquier error en { codigo, mensaje, campos }. Los errores
 * inesperados salen como 500 con un mensaje genérico: el detalle se queda en
 * el log del servidor y no viaja al cliente, para no dar pistas a un atacante.
 */
@Catch()
export class FiltroErrores implements ExceptionFilter {
  private readonly logger = new Logger(FiltroErrores.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<Response>();
    const [estado, cuerpo] = this.traducir(error);
    respuesta.status(estado).json(cuerpo);
  }

  private traducir(error: unknown): [number, CuerpoError] {
    if (error instanceof ErrorApi) {
      return [
        error.getStatus(),
        { codigo: error.codigo, mensaje: error.message, campos: error.campos },
      ];
    }

    if (error instanceof HttpException) {
      const estado = error.getStatus();
      const conocido = CODIGO_POR_ESTADO[estado];
      if (conocido) {
        return [
          estado,
          { codigo: conocido[0], mensaje: conocido[1], campos: null },
        ];
      }
      if (estado < 500) {
        return [
          estado,
          {
            codigo: 'SOLICITUD_INVALIDA',
            mensaje: 'No pudimos procesar la petición.',
            campos: null,
          },
        ];
      }
    }

    // Solo el error y su traza: nunca el cuerpo de la petición, que puede
    // traer contraseñas o tokens.
    this.logger.error(
      error instanceof Error ? (error.stack ?? error.message) : error,
    );
    return [
      HttpStatus.INTERNAL_SERVER_ERROR,
      {
        codigo: 'ERROR_INTERNO',
        mensaje: 'Algo salió mal. Intenta de nuevo en unos minutos.',
        campos: null,
      },
    ];
  }
}
