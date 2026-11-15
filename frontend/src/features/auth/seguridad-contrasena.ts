import { colors } from '@/theme';

import { MINIMO_CONTRASENA } from './esquemas';

export type SeguridadContrasena = {
  /** De 0 (vacía) a 4 (fuerte): cuántas barras del medidor se llenan. */
  nivel: 0 | 1 | 2 | 3 | 4;
  etiqueta: string;
  color: string;
};

// Pista para la persona, no una regla: la única exigencia real es el mínimo
// de caracteres del esquema. Suma puntos por largo y por mezclar tipos.
export function medirContrasena(contrasena: string): SeguridadContrasena {
  if (contrasena.length === 0) return { nivel: 0, etiqueta: '', color: colors.textoSecundario };
  if (contrasena.length < MINIMO_CONTRASENA) return { nivel: 1, etiqueta: 'Débil', color: colors.error };

  const puntos = [
    contrasena.length >= 12,
    /[a-z]/.test(contrasena) && /[A-Z]/.test(contrasena),
    /\d/.test(contrasena),
    /[^A-Za-z0-9]/.test(contrasena),
  ].filter(Boolean).length;

  if (puntos === 0) return { nivel: 2, etiqueta: 'Regular', color: colors.etiqueta };
  if (puntos <= 2) return { nivel: 3, etiqueta: 'Buena', color: colors.exito };
  return { nivel: 4, etiqueta: 'Fuerte', color: colors.exito };
}
