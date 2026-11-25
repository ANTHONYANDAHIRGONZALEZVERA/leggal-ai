import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guardia/jwt-auth.guard';
import type { SesionActual } from '../auth/guardia/sesion-actual';
import { ErrorApi } from '../comun/errores/error-api';
import type { NivelPermiso } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ESQUEMA_JWT } from '../swagger';
import { alcanzaNivel, type ModuloClave, puedeAprobarIa } from './catalogo';

const PERMISO_REQUERIDO = 'permisos:requerido';

export interface PermisoRequerido {
  modulo: ModuloClave;
  nivel: Exclude<NivelPermiso, 'ninguno'>;
}

/**
 * Protege una ruta con un permiso de "Permisos por rol", por ejemplo
 * `@RequierePermiso('casos', 'editar')`. Aplica primero JwtAuthGuard (token,
 * sesión y usuario activo) y después PermisosGuard, así ninguna ruta puede
 * pedir un permiso olvidándose de exigir la sesión.
 */
export const RequierePermiso = (
  modulo: ModuloClave,
  nivel: PermisoRequerido['nivel'],
) =>
  applyDecorators(
    SetMetadata(PERMISO_REQUERIDO, {
      modulo,
      nivel,
    } satisfies PermisoRequerido),
    UseGuards(JwtAuthGuard, PermisosGuard),
    ApiBearerAuth(ESQUEMA_JWT),
  );

/**
 * Pasos 3 y 4 del guard de permisos (los pasos 1 y 2 son de JwtAuthGuard):
 * 3. El token trae una empresa (tid) y la persona tiene una membresía
 *    activa en ella.
 * 4. El rol de esa membresía tiene, en el módulo, al menos el nivel pedido
 *    ("editar" incluye "ver").
 * Cualquier fallo es 403 SIN_PERMISO: la persona sí inició sesión.
 *
 * La empresa sale siempre del token y nunca de la petición. La caché corta en
 * Redis de esta consulta llega con B43.
 */
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const requerido = this.reflector.getAllAndOverride<PermisoRequerido>(
      PERMISO_REQUERIDO,
      [contexto.getHandler(), contexto.getClass()],
    );
    const peticion = contexto
      .switchToHttp()
      .getRequest<Request & { sesionActual?: SesionActual }>();
    const sesion = peticion.sesionActual;
    // Errores de programación: el guard se usó sin @RequierePermiso() o sin
    // JwtAuthGuard delante. Mejor un 500 que dejar pasar o negar en silencio.
    if (!requerido || !sesion?.usuario) {
      throw new InternalServerErrorException(
        'PermisosGuard necesita @RequierePermiso() y JwtAuthGuard antes',
      );
    }

    if (!sesion.empresaId) {
      throw sinPermiso('Elige una empresa para continuar.');
    }

    const membresia = await this.prisma.membresia.findUnique({
      where: {
        tenantId_usuarioId: {
          tenantId: sesion.empresaId,
          usuarioId: sesion.usuarioId,
        },
      },
      select: {
        id: true,
        estado: true,
        rol: {
          select: {
            id: true,
            clave: true,
            permisos: {
              where: { moduloClave: requerido.modulo },
              select: { nivel: true },
            },
          },
        },
      },
    });
    if (membresia?.estado !== 'activa') {
      throw sinPermiso('No tienes acceso a esta empresa.');
    }

    // Sin fila para el módulo cuenta como "ninguno".
    const nivel = membresia.rol.permisos[0]?.nivel ?? 'ninguno';
    // Aprobar respuestas de la IA: además del nivel, el rol tiene que ser
    // Administrador o Abogado/a. Así la regla se cumple aunque alguien suba
    // el nivel a mano en la base o en un rol creado por la empresa.
    const rolHabilitado =
      requerido.modulo !== 'aprobar_ia' || puedeAprobarIa(membresia.rol.clave);
    if (!rolHabilitado || !alcanzaNivel(nivel, requerido.nivel)) {
      throw sinPermiso('No tienes permiso para hacer esto.');
    }

    sesion.membresia = {
      id: membresia.id,
      rolId: membresia.rol.id,
      rolClave: membresia.rol.clave,
    };
    return true;
  }
}

const sinPermiso = (mensaje: string) =>
  new ErrorApi(HttpStatus.FORBIDDEN, 'SIN_PERMISO', mensaje);
