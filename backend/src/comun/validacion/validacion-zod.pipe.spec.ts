import { z } from 'zod';
import { ErrorApi } from '../errores/error-api';
import { ValidacionZodPipe } from './validacion-zod.pipe';

const esquema = z.strictObject({
  correo: z.email('Ingresa un correo válido'),
  contrasena: z.string().min(8, 'Mínimo 8 caracteres'),
});

function errorDe(valor: unknown): ErrorApi {
  try {
    new ValidacionZodPipe(esquema).transform(valor);
  } catch (error) {
    return error as ErrorApi;
  }
  throw new Error('se esperaba un error de validación');
}

describe('ValidacionZodPipe', () => {
  it('devuelve los datos ya validados', () => {
    const datos = { correo: 'ana@ejemplo.com', contrasena: '12345678' };
    expect(new ValidacionZodPipe(esquema).transform(datos)).toEqual(datos);
  });

  it('responde 400 VALIDACION con un mensaje por campo', () => {
    const error = errorDe({ correo: 'no-es-correo', contrasena: '123' });
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error.getStatus()).toBe(400);
    expect(error.codigo).toBe('VALIDACION');
    expect(error.campos).toEqual({
      correo: 'Ingresa un correo válido',
      contrasena: 'Mínimo 8 caracteres',
    });
  });

  it('marca los campos que sobran', () => {
    const error = errorDe({
      correo: 'ana@ejemplo.com',
      contrasena: '12345678',
      tenantId: 'otra-empresa',
    });
    expect(error.campos).toEqual({ tenantId: 'Este campo no está permitido' });
  });

  it('usa mensajes en español cuando el esquema no trae uno', () => {
    const error = errorDe({ contrasena: '12345678' });
    expect(error.campos?.correo).toMatch(/[a-záéíóúñ]/i);
    expect(error.campos?.correo).not.toMatch(/expected|required/i);
  });

  it('si el cuerpo no es un objeto, lo marca en _cuerpo', () => {
    expect(errorDe('texto').campos).toHaveProperty('_cuerpo');
  });
});
