import { api } from '@/services/api';

/** ¿Está libre este @usuario? */
export type Disponibilidad = { usuario: string; disponible: boolean };

// Rutas provisionales (docs/api/auth-borrador-frontend.md) hasta el contrato de B33.
export function consultarUsuario(usuario: string) {
  return api.peticion<Disponibilidad>(`/usuarios/disponible?usuario=${encodeURIComponent(usuario)}`);
}

/** Hasta 3 @usuarios libres y distintos, armados por el servidor con el nombre escrito. */
export function sugerirUsuarios(nombre: string) {
  return api.peticion<{ sugerencias: string[] }>(`/usuarios/sugerencias?nombre=${encodeURIComponent(nombre)}`);
}

export const claveDisponibilidad = (usuario: string) => ['usuarios', 'disponible', usuario] as const;
export const claveSugerencias = (nombre: string) => ['usuarios', 'sugerencias', nombre] as const;
