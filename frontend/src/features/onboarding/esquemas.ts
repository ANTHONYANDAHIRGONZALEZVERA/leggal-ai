import { z } from 'zod';

import { esquemaUsuario } from './usuario';

// Paso 1/5 "¿Cómo te llamamos?".
export const esquemaPerfil = z.object({
  nombre: z.string().trim().min(3, 'Ingresa tu nombre').max(80, 'Máximo 80 caracteres'),
  usuario: esquemaUsuario,
});

export type DatosPerfil = z.input<typeof esquemaPerfil>;
export type PerfilValidado = z.output<typeof esquemaPerfil>;
