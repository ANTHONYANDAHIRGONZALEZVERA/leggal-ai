import { z } from 'zod';

// Mensajes por defecto de Zod en español, para la validación de peticiones y
// para la del entorno al arrancar. Cada archivo que usa Zod importa este
// módulo una vez; los esquemas pueden poner mensajes propios encima.
z.config(z.locales.es());

export { z };
