import { z } from 'zod';

import { TAMANOS_EQUIPO } from './contrato';

/** Largo del código de invitación sin el guion (ACC-7K2 → 6). */
export const LARGO_CODIGO = 6;

/**
 * Deja solo letras y números en mayúsculas, hasta 6. Sirve para lo que se
 * escribe y lo que se pega ("acc-7k2 " → "ACC7K2").
 */
export function normalizarCodigo(texto: string) {
  return texto
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, LARGO_CODIGO);
}

/** "ACC7K2" → "ACC-7K2", como lo genera el backend (B38). */
export const codigoConGuion = (codigo: string) => `${codigo.slice(0, 3)}-${codigo.slice(3)}`;

/** Largo del RUC de Ecuador. */
export const LARGO_RUC = 13;

/**
 * ¿Cumple la cédula (10 dígitos) su dígito verificador? Módulo 10 del Registro
 * Civil: los 9 primeros por 2,1,2,1…; si un producto pasa de 9 se le resta 9;
 * el verificador es lo que le falta a la suma para llegar a la decena.
 */
export function cedulaValida(cedula: string) {
  if (!/^\d{10}$/.test(cedula)) return false;
  const digitos = [...cedula].map(Number);
  const suma = digitos.slice(0, 9).reduce((total, d, i) => {
    const producto = d * (i % 2 === 0 ? 2 : 1);
    return total + (producto > 9 ? producto - 9 : producto);
  }, 0);
  return (10 - (suma % 10)) % 10 === digitos[9];
}

/**
 * Revisa el RUC de Ecuador sin internet (el SRI no tiene API pública; el
 * backend puede verificarlo después).
 * - 13 dígitos.
 * - Provincia (2 primeros): 01 a 24, o 30 (ecuatorianos en el exterior).
 * - Tercer dígito: 0 a 5 (persona natural), 6 (pública) o 9 (sociedad privada).
 * - Persona natural: sus 10 primeros dígitos son su cédula y deben cumplir el
 *   dígito verificador.
 * - Sociedades y públicas: **sin** dígito verificador, porque el SRI asigna RUC
 *   que no siempre cumplen el cálculo antiguo y rechazar uno válido dejaría a
 *   la empresa fuera.
 * - Termina en el número de establecimiento: 001 o más (0001 si es pública).
 */
export function problemaRuc(ruc: string): string | null {
  if (!/^\d{13}$/.test(ruc)) return 'El RUC tiene 13 dígitos';
  const provincia = Number(ruc.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return 'Revisa los dos primeros dígitos (provincia)';
  const tercero = Number(ruc[2]);
  if (tercero === 7 || tercero === 8) return 'Revisa el tercer dígito del RUC';
  if (tercero <= 5 && !cedulaValida(ruc.slice(0, 10))) return 'Los 10 primeros dígitos no son una cédula válida';
  const establecimiento = tercero === 6 ? ruc.slice(9) : ruc.slice(10);
  if (Number(establecimiento) < 1) return 'El RUC no puede terminar en 000';
  return null;
}

// Pestaña "Crear empresa" del 4/5 (B35). El creador queda como Administrador.
export const esquemaEmpresa = z.object({
  razonSocial: z
    .string()
    .trim()
    .min(3, 'Ingresa la razón social')
    .max(120, 'Máximo 120 caracteres')
    .regex(/[\p{L}\d]/u, 'Ingresa la razón social'),
  ruc: z
    .string()
    .trim()
    .superRefine((ruc, ctx) => {
      const problema = problemaRuc(ruc);
      if (problema) ctx.addIssue({ code: 'custom', message: problema });
    }),
  tamanoEquipo: z.enum(TAMANOS_EQUIPO, {
    error: 'Elige el tamaño de tu equipo',
  }),
});

export type DatosEmpresa = z.input<typeof esquemaEmpresa>;
export type EmpresaValidada = z.output<typeof esquemaEmpresa>;
