import { esquemaInicioSesion, MINIMO_CONTRASENA } from '@/features/auth/esquemas';

import type { RespuestaTransporte } from './cliente';
import type { UsuarioApi } from './contrato';

// Códigos de 6 dígitos de la API simulada: verificar el correo (B27) y
// recuperar la contraseña (B28), según la propuesta de
// docs/api/codigos-borrador-frontend.md. La usa mock.ts.

type Cuerpo = Record<string, unknown>;
type Persona = { id: string; correo: string; correoVerificado: boolean };

/** En la API simulada todos los códigos son este, para poder probar sin correo. */
export const CODIGO_DE_PRUEBA = '123456';
/** Vida de un código (plan B27). */
export const VIGENCIA_CODIGO_MS = 10 * 60 * 1000;
/** Intentos por código antes de bloquearlo (plan B27). */
export const INTENTOS_POR_CODIGO = 5;
/** Espera mínima entre dos envíos (el contador "Reenviar código en 0:45"). */
export const ESPERA_REENVIO_MS = 45 * 1000;

type Codigo = { emitido: number; intentos: number };

/** Código de verificación pendiente de cada persona (por id). */
let verificaciones = new Map<string, Codigo>();
/** Código de recuperación pendiente (por correo). */
let recuperaciones = new Map<string, Codigo>();

export function reiniciarCodigos() {
  verificaciones = new Map();
  recuperaciones = new Map();
}

/** "Envía" un código de verificación nuevo (al registrarse o al cambiar el correo). */
export function emitirVerificacion(usuarioId: string) {
  verificaciones.set(usuarioId, { emitido: Date.now(), intentos: 0 });
}

/** Solo pruebas: hace que el código pendiente venza. */
export function vencerCodigos() {
  for (const mapa of [verificaciones, recuperaciones]) {
    for (const codigo of mapa.values()) codigo.emitido -= VIGENCIA_CODIGO_MS + 1;
  }
}

/** Lo que mock.ts le presta para leer y cambiar cuentas y sesiones. */
export type HerramientasCodigos = {
  responder: (estado: number, cuerpo?: unknown) => RespuestaTransporte;
  fallar: (estado: number, codigo: string, mensaje: string, campos?: Record<string, string> | null) => RespuestaTransporte;
  publico: (persona: Persona) => UsuarioApi;
  buscarPorCorreo: (correo: string) => (Persona & { contrasena: string }) | undefined;
  cambiarCorreo: (persona: Persona, correo: string) => void;
  /** Cierra todas las sesiones de la persona (al cambiar la contraseña). */
  cerrarSesionesDe: (usuarioId: string) => void;
};

const texto = (v: unknown) => (typeof v === 'string' ? v : '');

export function crearRutasCodigos({ responder, fallar, publico, buscarPorCorreo, cambiarCorreo, cerrarSesionesDe }: HerramientasCodigos) {
  /** Revisa un código: null si es correcto; si no, la respuesta de error. Cuenta el intento. */
  function revisar(pendiente: Codigo | undefined, escrito: string): RespuestaTransporte | null {
    if (!pendiente || Date.now() - pendiente.emitido > VIGENCIA_CODIGO_MS) {
      return fallar(410, 'CODIGO_EXPIRADO', 'El código venció. Pide uno nuevo.');
    }
    if (pendiente.intentos >= INTENTOS_POR_CODIGO) {
      return fallar(429, 'DEMASIADOS_INTENTOS', 'Hiciste demasiados intentos. Pide un código nuevo.');
    }
    if (escrito !== CODIGO_DE_PRUEBA) {
      pendiente.intentos += 1;
      return fallar(400, 'CODIGO_INCORRECTO', 'El código no es correcto.', { codigo: 'El código no es correcto' });
    }
    return null;
  }

  const muyPronto = (pendiente: Codigo | undefined) => pendiente !== undefined && Date.now() - pendiente.emitido < ESPERA_REENVIO_MS;

  const privadas = {
    // B27: confirma el correo. Idempotente si ya estaba verificado.
    'POST /auth/verify-email': (cuerpo: Cuerpo, persona: Persona) => {
      if (persona.correoVerificado) return responder(200, { usuario: publico(persona) });
      const error = revisar(verificaciones.get(persona.id), texto(cuerpo.codigo));
      if (error) return error;
      persona.correoVerificado = true;
      verificaciones.delete(persona.id);
      return responder(200, { usuario: publico(persona) });
    },

    // B27: otro código, como mínimo cada 45 s.
    'POST /auth/verify-email/resend': (_cuerpo: Cuerpo, persona: Persona) => {
      if (persona.correoVerificado) return responder(204);
      if (muyPronto(verificaciones.get(persona.id))) {
        return fallar(429, 'ESPERA_REENVIO', 'Espera unos segundos antes de pedir otro código.');
      }
      emitirVerificacion(persona.id);
      return responder(204);
    },

    // "Cambiar correo" de "Revisa tu correo": solo mientras no esté verificado.
    'PATCH /auth/email': (cuerpo: Cuerpo, persona: Persona) => {
      if (persona.correoVerificado) return fallar(409, 'CORREO_YA_VERIFICADO', 'Tu correo ya está verificado.');
      const correo = esquemaInicioSesion.shape.correo.safeParse(cuerpo.correo);
      if (!correo.success) return fallar(400, 'VALIDACION', 'Revisa los datos.', { correo: 'Ingresa un correo válido' });
      const dueno = buscarPorCorreo(correo.data);
      if (dueno && dueno.id !== persona.id) {
        return fallar(409, 'CORREO_EN_USO', 'Ya existe una cuenta con este correo.', { correo: 'Ya existe una cuenta con este correo' });
      }
      cambiarCorreo(persona, correo.data);
      emitirVerificacion(persona.id);
      return responder(200, { usuario: publico(persona) });
    },
  };

  const publicas = {
    // B28: siempre 204, exista o no la cuenta: así no se revela qué correos
    // tienen cuenta. Si se pide muy seguido, no se envía otro (pero igual 204).
    'POST /auth/password/forgot': (cuerpo: Cuerpo) => {
      const correo = esquemaInicioSesion.shape.correo.safeParse(cuerpo.correo);
      if (!correo.success) return fallar(400, 'VALIDACION', 'Revisa los datos.', { correo: 'Ingresa un correo válido' });
      if (buscarPorCorreo(correo.data) && !muyPronto(recuperaciones.get(correo.data))) {
        recuperaciones.set(correo.data, { emitido: Date.now(), intentos: 0 });
      }
      return responder(204);
    },

    // B28: código + contraseña nueva. Cierra todas las sesiones de la cuenta.
    'POST /auth/password/reset': (cuerpo: Cuerpo) => {
      const correo = texto(cuerpo.correo).trim().toLowerCase();
      const contrasena = texto(cuerpo.contrasena);
      if (contrasena.length < MINIMO_CONTRASENA || contrasena.length > 72) {
        return fallar(400, 'VALIDACION', 'Revisa los datos.', { contrasena: `Mínimo ${MINIMO_CONTRASENA} caracteres` });
      }
      const error = revisar(recuperaciones.get(correo), texto(cuerpo.codigo));
      if (error) return error;
      const persona = buscarPorCorreo(correo);
      if (!persona) return fallar(410, 'CODIGO_EXPIRADO', 'El código venció. Pide uno nuevo.');
      persona.contrasena = contrasena;
      recuperaciones.delete(correo);
      cerrarSesionesDe(persona.id);
      return responder(204);
    },
  };

  return { privadas, publicas };
}
