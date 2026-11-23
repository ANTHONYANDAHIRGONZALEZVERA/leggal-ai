import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type Entorno, ENTORNO } from '../config/entorno';

/** Lo que lleva el token de acceso (contrato B03). Sin permisos a propósito. */
export interface ContenidoAcceso {
  /** Id del usuario. */
  sub: string;
  /** Empresa activa; null hasta crear o elegir una (semana 2). */
  tid: string | null;
  /** Sesión (familia de refresh): permite revocarla antes de que venza. */
  sid: string;
}

/** Refresh recién creado: el token va a la app, el hash a la base. */
export interface RefrescoNuevo {
  token: string;
  hash: string;
}

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(ENTORNO) private readonly entorno: Entorno,
  ) {}

  /** Segundos de vida del token de acceso (el "venceEn" de la respuesta). */
  get segundosAcceso(): number {
    return this.entorno.JWT_ACCESO_SEGUNDOS;
  }

  firmarAcceso(contenido: ContenidoAcceso): string {
    return this.jwt.sign(contenido);
  }

  /**
   * 32 bytes aleatorios: imposible de adivinar, así que basta SHA-256 para
   * guardarlo (argon2 es lento a propósito y solo hace falta en contraseñas,
   * que sí se pueden adivinar). Si alguien roba la base, no tiene los tokens.
   */
  nuevoRefresco(): RefrescoNuevo {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: hashRefresco(token) };
  }

  /** Cada refresh vale 30 días desde que se emite: rotarlo extiende la sesión. */
  vencimientoRefresco(desde: Date): Date {
    const msPorDia = 24 * 60 * 60 * 1000;
    return new Date(desde.getTime() + this.entorno.REFRESCO_DIAS * msPorDia);
  }

  /** Margen para reenviar un refresh recién rotado sin que cuente como robo. */
  get msGracia(): number {
    return this.entorno.REFRESCO_GRACIA_SEGUNDOS * 1000;
  }
}

export function hashRefresco(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
