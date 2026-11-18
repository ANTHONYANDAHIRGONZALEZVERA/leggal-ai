import { ErrorApi, MENSAJE_GENERICO } from '../errores';
import { aplicarErrorApi } from '../errores-formulario';

// Paso de un error de la API al formulario (F09): qué va debajo de un campo y
// qué se muestra como aviso general.
type Datos = { nombre: string; correo: string };

describe('aplicarErrorApi', () => {
  test('un error con campo lo pone debajo de ese campo y no deja aviso general', () => {
    const setError = jest.fn();
    const error = new ErrorApi('CORREO_EN_USO', 409, undefined, { correo: 'Ya existe una cuenta con este correo' });

    const general = aplicarErrorApi<Datos>(error, setError, ['nombre', 'correo']);

    expect(setError).toHaveBeenCalledWith(
      'correo',
      { type: 'servidor', message: 'Ya existe una cuenta con este correo' },
      { shouldFocus: true },
    );
    expect(general).toBeUndefined();
  });

  test('con varios campos con error, solo enfoca el primero', () => {
    const setError = jest.fn();
    const error = new ErrorApi('DATOS_INVALIDOS', 400, undefined, { nombre: 'Muy corto', correo: 'No válido' });

    aplicarErrorApi<Datos>(error, setError, ['nombre', 'correo']);

    expect(setError.mock.calls.map(([campo, , opciones]) => [campo, opciones.shouldFocus])).toEqual([
      ['nombre', true],
      ['correo', false],
    ]);
  });

  test('un campo que el formulario no tiene se ignora y el error pasa a aviso general', () => {
    const setError = jest.fn();
    const error = new ErrorApi('DATOS_INVALIDOS', 400, 'Revisa los datos.', { telefono: 'No válido' });

    const general = aplicarErrorApi<Datos>(error, setError, ['nombre', 'correo']);

    expect(setError).not.toHaveBeenCalled();
    expect(general).toBe('Revisa los datos.');
  });

  test('un error sin campos (credenciales, sin conexión) se devuelve como aviso general', () => {
    const general = aplicarErrorApi<Datos>(new ErrorApi('SIN_CONEXION', 0), jest.fn(), ['correo']);

    expect(general).toBe('No hay conexión. Revisa tu internet e inténtalo de nuevo.');
  });

  test('un error inesperado (no de la API) muestra el mensaje genérico', () => {
    const general = aplicarErrorApi<Datos>(new TypeError('x is undefined'), jest.fn(), ['correo']);

    expect(general).toBe(MENSAJE_GENERICO);
  });
});
