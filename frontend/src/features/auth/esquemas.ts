import { z } from 'zod';

// Reglas de los formularios de acceso. Los mensajes van en español porque
// se muestran tal cual debajo de cada campo.
export const esquemaInicioSesion = z.object({
  // Se limpia antes de validar para aceptar espacios o mayúsculas sin querer.
  correo: z.string().trim().toLowerCase().pipe(z.email('Ingresa un correo válido')),
  contrasena: z.string().min(1, 'Ingresa tu contraseña'),
});

export type DatosInicioSesion = z.infer<typeof esquemaInicioSesion>;

export const MINIMO_CONTRASENA = 8;

export const esquemaRegistro = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, 'Ingresa tu nombre completo')
    .max(80, 'Máximo 80 caracteres'),
  correo: z.string().trim().toLowerCase().pipe(z.email('Ingresa un correo válido')),
  contrasena: z
    .string()
    .min(MINIMO_CONTRASENA, `Mínimo ${MINIMO_CONTRASENA} caracteres`)
    .max(72, 'Máximo 72 caracteres'),
  // Consentimiento expreso (protección de datos): empieza sin marcar y es obligatorio.
  aceptaTerminos: z.boolean().refine((v) => v, 'Debes aceptar los Términos y la Política para continuar'),
});

export type DatosRegistro = z.infer<typeof esquemaRegistro>;
