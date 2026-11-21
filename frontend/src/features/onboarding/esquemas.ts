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

// El rol es obligatorio; las materias no (un estudiante puede no tener). La
// matrícula es opcional y solo se guarda si el rol es abogado.
export const esquemaArea = z
  .object({
    rol: z.enum(valores(ROLES), { error: 'Elige tu rol' }),
    materias: z.array(z.enum(valores(MATERIAS))),
    matricula: z
      .string()
      .trim()
      .max(30, 'Máximo 30 caracteres')
      .regex(/^[A-Za-z0-9 ./-]*$/, 'Usa solo letras, números, puntos, guiones o barras'),
  })
  .transform(({ rol, materias, matricula }) => ({
    rol,
    materias,
    matricula: rol === 'abogado' && matricula ? matricula : null,
  }));

export type DatosArea = z.input<typeof esquemaArea>;
export type AreaValidada = z.output<typeof esquemaArea>;
