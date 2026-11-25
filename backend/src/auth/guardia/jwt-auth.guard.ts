import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ErrorApi } from '../../comun/errores/error-api';
import { PrismaService } from '../../prisma/prisma.service';
import { TokensService } from '../tokens.service';
import type { SesionActual } from './sesion-actual';

const PERMITIR_SESION_CERRADA = 'auth:permitirSesionCerrada';

/**
 * Para rutas que deben funcionar aunque la sesión ya esté cerrada, la cuenta
 * suspendida o el token vencido, como /auth/logout (el contrato lo pide
 * idempotente y la app puede cerrar sesión con un token de hace horas). Igual
 * se exige un token con firma HS256 válida y con la forma esperada.
 */
export const PermitirSesionCerrada = () =>
  SetMetadata(PERMITIR_SESION_CERRADA, true);

/**
 * Protege una ruta con el token de acceso. Revisa, en este orden, y se detiene
 * en el primer fallo:
 * 1. Que llegue `Authorization: Bearer <token>`  → 401 NO_AUTENTICADO
 * 2. Firma HS256, vencimiento y forma del token  → 401 TOKEN_INVALIDO / TOKEN_EXPIRADO
 * 3. Que la sesión (sid) siga abierta en la base → 401 SESION_REVOCADA
 * 4. Que la cuenta esté activa                    → 403 USUARIO_INACTIVO
 *
 * El paso 3 consulta la base en cada petición: un JWT sigue siendo válido 15
 * minutos aunque se haga logout, y así un token robado deja de servir apenas
 * se cierra la sesión. La caché corta en Redis llega con los permisos (B43).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokensService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto
      .switchToHttp()
      .getRequest<Request & { sesionActual?: SesionActual }>();

    const token = extraerBearer(peticion.headers.authorization);
    if (!token) {
      throw new ErrorApi(
        HttpStatus.UNAUTHORIZED,
        'NO_AUTENTICADO',
        'Inicia sesión para continuar.',
      );
    }
    // Se lee antes de verificar: en logout también se acepta un token vencido.
    const permitirCerrada =
      this.reflector.getAllAndOverride<boolean>(PERMITIR_SESION_CERRADA, [
        contexto.getHandler(),
        contexto.getClass(),
      ]) ?? false;
    const { sub, tid, sid } = await this.tokens.verificarAcceso(token, {
      permitirVencido: permitirCerrada,
    });

    if (permitirCerrada) {
      peticion.sesionActual = { usuarioId: sub, sesionId: sid, empresaId: tid };
      return true;
    }

    // Una fila abierta de la familia basta: al revocar (logout o robo) se
    // marcan todas, y al rotar las usadas siguen sin revocar.
    const sesion = await this.prisma.sesion.findFirst({
      where: { familiaId: sid, usuarioId: sub, revocadoEn: null },
      include: { usuario: true },
    });
    if (!sesion) {
      throw new ErrorApi(
        HttpStatus.UNAUTHORIZED,
        'SESION_REVOCADA',
        'Tu sesión se cerró por seguridad. Vuelve a iniciar sesión.',
      );
    }
    if (sesion.usuario.estado !== 'activo') {
      throw new ErrorApi(
        HttpStatus.FORBIDDEN,
        'USUARIO_INACTIVO',
        'Tu cuenta está suspendida. Escríbenos si crees que es un error.',
      );
    }

    peticion.sesionActual = {
      usuarioId: sub,
      sesionId: sid,
      empresaId: tid,
      usuario: sesion.usuario,
    };
    return true;
  }
}

/** "Bearer abc" → "abc". Cualquier otro formato cuenta como que no hay token. */
function extraerBearer(cabecera: string | undefined): string | null {
  const [esquema, token, ...resto] = (cabecera ?? '').trim().split(/\s+/);
  if (esquema?.toLowerCase() !== 'bearer' || !token || resto.length > 0) {
    return null;
  }
  return token;
}
