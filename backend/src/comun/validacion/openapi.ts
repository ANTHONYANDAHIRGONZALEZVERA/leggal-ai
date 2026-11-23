import type { ApiBodyOptions } from '@nestjs/swagger';
import { z } from './zod-es';

// El tipo de esquema que aceptan @ApiBody y @ApiResponse. @nestjs/swagger no
// lo exporta, así que se toma del propio decorador.
type EsquemaSwagger = Extract<ApiBodyOptions, { schema: unknown }>['schema'];

/**
 * Convierte un esquema de Zod en el formato de Swagger. Así el mismo esquema
 * valida la petición y la documenta en /docs: no hay una clase DTO aparte que
 * pueda quedar desactualizada.
 *
 * `entrada` describe lo que manda la app (antes de recortar o pasar a
 * minúsculas); `salida`, lo que devuelve la API.
 */
export function esquemaOpenApi(
  esquema: z.ZodType,
  lado: 'entrada' | 'salida' = 'entrada',
): EsquemaSwagger {
  return z.toJSONSchema(esquema, {
    target: 'openapi-3.0',
    io: lado === 'entrada' ? 'input' : 'output',
  }) as EsquemaSwagger;
}

/** Cuerpo de error del contrato, para documentar las respuestas 4xx y 5xx. */
export const ESQUEMA_ERROR = esquemaOpenApi(
  z.object({
    codigo: z.string().meta({ example: 'VALIDACION' }),
    mensaje: z.string().meta({ example: 'Revisa los datos marcados.' }),
    campos: z.record(z.string(), z.string()).nullable(),
  }),
  'salida',
);
