import { PipeTransform } from '@nestjs/common';
import { z } from './zod-es';
import { type CamposConError, ErrorApi } from '../errores/error-api';

/**
 * Valida el cuerpo (o un parámetro) con un esquema de Zod. Si falla, responde
 * 400 VALIDACION con un mensaje por campo, que la app muestra debajo de cada
 * campo del formulario.
 *
 * Uso: `@Body(new ValidacionZodPipe(esquemaRegistro)) datos: DatosRegistro`
 */
export class ValidacionZodPipe<
  Esquema extends z.ZodType,
> implements PipeTransform<unknown, z.output<Esquema>> {
  constructor(private readonly esquema: Esquema) {}

  transform(valor: unknown): z.output<Esquema> {
    const resultado = this.esquema.safeParse(valor);
    if (resultado.success) {
      return resultado.data;
    }
    throw ErrorApi.validacion(camposConError(resultado.error));
  }
}

/** Un mensaje por campo: el primero que falló, que es el más útil de mostrar. */
export function camposConError(error: z.ZodError): CamposConError {
  const campos: CamposConError = {};
  for (const problema of error.issues) {
    // Campos que sobran (esquemas estrictos): se marca cada uno por su nombre.
    if (problema.code === 'unrecognized_keys') {
      for (const clave of problema.keys) {
        campos[clave] ??= 'Este campo no está permitido';
      }
      continue;
    }
    // Sin ruta = el cuerpo entero es inválido (por ejemplo, no es un objeto).
    const campo = problema.path.join('.') || '_cuerpo';
    campos[campo] ??= problema.message;
  }
  return campos;
}
