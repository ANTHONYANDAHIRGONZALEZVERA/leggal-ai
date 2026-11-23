import type { Usuario } from '../generated/prisma/client';
import type { UsuarioApi } from './esquemas';

/**
 * Convierte la fila de `usuarios` en el objeto usuario del contrato. Nunca
 * incluye el hash de la contraseña ni el estado interno.
 *
 * En la base se guardan fechas (cuándo se verificó el correo, cuándo terminó
 * el onboarding) porque sirven de evidencia; la app solo necesita saber si ya
 * pasó, así que se envían como booleanos.
 */
export function aUsuarioApi(usuario: Usuario): UsuarioApi {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    nombreVisible: usuario.nombreVisible,
    nombreUsuario: usuario.nombreUsuario,
    correo: usuario.correo,
    correoVerificado: usuario.correoVerificadoEn !== null,
    onboardingCompleto: usuario.onboardingCompletoEn !== null,
    creadoEn: usuario.creadoEn.toISOString(),
  };
}
