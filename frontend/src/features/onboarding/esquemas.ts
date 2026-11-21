import { z } from 'zod';

import { esquemaUsuario } from './usuario';

// Paso 1/5 "¿Cómo te llamamos?".
export const esquemaPerfil = z.object({
  nombre: z.string().trim().min(3, 'Ingresa tu nombre').max(80, 'Máximo 80 caracteres'),
  usuario: esquemaUsuario,
});

export type DatosPerfil = z.input<typeof esquemaPerfil>;
export type PerfilValidado = z.output<typeof esquemaPerfil>;

// Paso 2/5 "¿En qué área te desempeñas?". Los valores son los que se envían
// al servidor al final del onboarding (F31); los títulos son lo que se ve.
export const ROLES = [
  { valor: 'abogado', titulo: 'Abogado/a' },
  { valor: 'asistente_legal', titulo: 'Asistente legal' },
  { valor: 'contador', titulo: 'Contador/a' },
  { valor: 'gerente', titulo: 'Gerente / Admin.' },
  { valor: 'estudiante', titulo: 'Estudiante' },
  { valor: 'otro', titulo: 'Otro' },
] as const;

export const MATERIAS = [
  { valor: 'laboral', titulo: 'Laboral' },
  { valor: 'civil', titulo: 'Civil' },
  { valor: 'penal', titulo: 'Penal' },
  { valor: 'tributario', titulo: 'Tributario' },
  { valor: 'societario', titulo: 'Societario' },
  { valor: 'familia', titulo: 'Familia' },
  { valor: 'administrativo', titulo: 'Administrativo' },
  { valor: 'constitucional', titulo: 'Constitucional' },
  { valor: 'propiedad_intelectual', titulo: 'Propiedad intelectual' },
] as const;

export type Rol = (typeof ROLES)[number]['valor'];
export type Materia = (typeof MATERIAS)[number]['valor'];

const valores = <T extends readonly { valor: string }[]>(lista: T) =>
  lista.map(({ valor }) => valor) as [T[number]['valor'], ...T[number]['valor'][]];

/** Largo máximo de la matrícula (también limita lo que se puede escribir). */
export const LARGO_MAX_MATRICULA = 30;

/**
 * Revisa la matrícula escrita. Vacía es válida (es opcional). El formato del
 * Foro de Abogados varía por provincia y año, así que no se exige uno exacto:
 * letras, números, espacios, puntos, guiones o barras, y al menos un número.
 */
function problemaMatricula(matricula: string): string | null {
  if (!matricula) return null;
  if (matricula.length > LARGO_MAX_MATRICULA) return `Máximo ${LARGO_MAX_MATRICULA} caracteres`;
  if (!/^[A-Za-z0-9 ./-]+$/.test(matricula)) return 'Usa solo letras, números, puntos, guiones o barras';
  if (matricula.length < 3 || !/[0-9]/.test(matricula)) return 'Revisa tu matrícula: debe tener al menos 3 caracteres y un número';
  return null;
}

// El rol es obligatorio; las materias no (un estudiante puede no tener). La
// matrícula solo se revisa y se guarda si el rol es abogado: si la persona la
// escribió y luego cambió de rol, el campo se oculta y no debe bloquearla.
export const esquemaArea = z
  .object({
    rol: z.enum(valores(ROLES), { error: 'Elige tu rol' }),
    materias: z.array(z.enum(valores(MATERIAS))),
    matricula: z.string().trim(),
  })
  .superRefine(({ rol, matricula }, ctx) => {
    const problema = rol === 'abogado' ? problemaMatricula(matricula) : null;
    if (problema) ctx.addIssue({ code: 'custom', path: ['matricula'], message: problema });
  })
  .transform(({ rol, materias, matricula }) => ({
    rol,
    // Sin repetidas y en el orden de la lista, para enviar siempre lo mismo.
    materias: MATERIAS.map(({ valor }) => valor).filter((valor) => materias.includes(valor)),
    matricula: rol === 'abogado' && matricula ? matricula.toUpperCase() : null,
  }));

export type DatosArea = z.input<typeof esquemaArea>;
export type AreaValidada = z.output<typeof esquemaArea>;

// Paso 3/5 "¿Cómo vas a trabajar?". El valor se envía al final (B34). Con
// "personal" el backend crea una empresa de un solo miembro (B35) y se salta
// el 4/5; con "colaborativo" sigue al 4/5 para unirse o crear una empresa.
export const MODOS = ['personal', 'colaborativo'] as const;
export type Modo = (typeof MODOS)[number];

export const esquemaModo = z.object({
  modo: z.enum(MODOS, { error: 'Elige cómo vas a trabajar' }),
});

export type DatosModo = z.input<typeof esquemaModo>;
export type ModoValidado = z.output<typeof esquemaModo>;
