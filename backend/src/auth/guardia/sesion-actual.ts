import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Usuario } from '../../generated/prisma/client';

/** Quién hace la petición, según el token de acceso ya verificado. */
export interface SesionActual {
  usuarioId: string;
  /** sid del token = familia_id en `sesiones`. */
  sesionId: string;
  /** tid del token: la empresa activa, o null. Nunca sale del cuerpo. */
  empresaId: string | null;
  /** Fila de `usuarios`. No está en las rutas con @PermitirSesionCerrada(). */
  usuario?: Usuario;
}

/**
 * Uso: `@UsuarioActual() sesion: SesionActual` en una ruta protegida con
 * JwtAuthGuard. Si la ruta no tiene el guard, falla con 500: es un error de
 * programación y no debe responder como si nadie hubiera iniciado sesión.
 */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): SesionActual => {
    const { sesionActual } = contexto
      .switchToHttp()
      .getRequest<Request & { sesionActual?: SesionActual }>();
    if (!sesionActual) {
      throw new InternalServerErrorException(
        '@UsuarioActual() se usó en una ruta sin JwtAuthGuard',
      );
    }
    return sesionActual;
  },
);
