import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { Dispositivo } from '../../generated/prisma/enums';

/** Datos de la petición que se guardan en sesiones y auditoría. */
export interface ContextoPeticion {
  dispositivo: Dispositivo;
  /** Versión de la app (X-Version-App), o null si falta o no tiene forma 1.2.3. */
  versionApp: string | null;
  ip: string | null;
}

const VERSION_VALIDA = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
const DISPOSITIVOS_DE_LA_APP = new Set<string>([
  Dispositivo.android,
  Dispositivo.ios,
  Dispositivo.web,
]);

function primeraCabecera(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? '';
}

/**
 * Lee X-Dispositivo, X-Version-App y la IP. Nunca rechaza la petición: según
 * el contrato, una cabecera que falta o viene mal solo se guarda como
 * "desconocido" o se ignora.
 *
 * La IP sale de req.ip. Detrás del proxy del VPS (B16) hay que activar
 * "trust proxy" para que sea la del teléfono y no la del proxy.
 */
export function extraerContexto(peticion: Request): ContextoPeticion {
  const dispositivo = primeraCabecera(
    peticion.headers['x-dispositivo'],
  ).toLowerCase();
  const version = primeraCabecera(peticion.headers['x-version-app']);
  return {
    dispositivo: DISPOSITIVOS_DE_LA_APP.has(dispositivo)
      ? (dispositivo as Dispositivo)
      : Dispositivo.desconocido,
    versionApp: VERSION_VALIDA.test(version) ? version : null,
    ip: peticion.ip ?? null,
  };
}

/** Uso en un controlador: `@Contexto() contexto: ContextoPeticion`. */
export const Contexto = createParamDecorator(
  (_dato: unknown, ctx: ExecutionContext): ContextoPeticion =>
    extraerContexto(ctx.switchToHttp().getRequest<Request>()),
);
