import { z } from 'zod';

// Reglas de los formularios de acceso. Los mensajes van en español porque
// se muestran tal cual debajo de cada campo.
export const esquemaInicioSesion = z.object({
  // Se limpia antes de validar para aceptar espacios o mayúsculas sin querer.
  correo: z.string().trim().toLowerCase().pipe(z.email('Ingresa un correo válido')),
  contrasena: z.string().min(1, 'Ingresa tu contraseña'),
});

export type DatosInicioSesion = z.infer<typeof esquemaInicioSesion>;
