import { api } from '@/services/api';

/** Respuesta de la consulta de disponibilidad del @usuario. */
export type Disponibilidad = {
  usuario: string;
  disponible: boolean;
  /** Alternativas libres, armadas por el servidor a partir del nombre de la persona. */
  sugerencias: string[];
};

// Ruta provisional (docs/api/auth-borrador-frontend.md) hasta el contrato de B33.
export function consultarUsuario(usuario: string) {
  return api.peticion<Disponibilidad>(`/usuarios/disponible?usuario=${encodeURIComponent(usuario)}`);
}

export const claveDisponibilidad = (usuario: string) => ['usuarios', 'disponible', usuario] as const;
