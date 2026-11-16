import { z } from 'zod';

import { quitarAcentos } from '@/utils/texto';

// Reglas del nombre de usuario (@usuario). Identifica a la persona dentro de
// cada empresa y en la trazabilidad de los casos, por eso es corto, sin
// espacios ni tildes, y no se confunde con otro.
export const MINIMO_USUARIO = 3;
export const MAXIMO_USUARIO = 30;

/** Lo que escribe la persona, en la forma que se guarda: minúsculas y sin "@" ni espacios. */
export function normalizarUsuario(texto: string) {
  return quitarAcentos(texto).trim().toLowerCase().replace(/^@+/, '').replace(/\s+/g, '');
}

export const esquemaUsuario = z
  .string()
  .transform(normalizarUsuario)
  .pipe(
    z
      .string()
      .min(MINIMO_USUARIO, `Mínimo ${MINIMO_USUARIO} caracteres`)
      .max(MAXIMO_USUARIO, `Máximo ${MAXIMO_USUARIO} caracteres`)
      .regex(/^[a-z]/, 'Debe empezar con una letra')
      .regex(/^[a-z0-9._]+$/, 'Solo letras, números, punto y guion bajo')
      .refine((u) => !/[._]{2}/.test(u), 'No uses dos símbolos seguidos')
      .refine((u) => !/[._]$/.test(u), 'No puede terminar en punto ni guion bajo'),
  );

/** Primera propuesta a partir del nombre: "Andrea Ruiz" → "andrea.ruiz". */
export function sugerirUsuario(nombre: string) {
  const palabras = normalizarUsuario(nombre.replace(/\s+/g, '.'))
    .replace(/[^a-z0-9.]/g, '')
    .split('.')
    .filter(Boolean);
  if (palabras.length === 0) return '';
  const base = palabras.length > 1 ? `${palabras[0]}.${palabras[palabras.length - 1]}` : palabras[0];
  return base.slice(0, MAXIMO_USUARIO);
}
