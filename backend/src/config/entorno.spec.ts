import { validarEntorno } from './entorno';

const minimo = {
  DATABASE_URL: 'postgresql://u:c@localhost:5432/bd',
  JWT_SECRETO: 'x'.repeat(32),
  VERSION_TERMINOS: '1.0',
  VERSION_PRIVACIDAD: '1.0',
};

describe('validarEntorno', () => {
  it('aplica los valores por defecto del contrato de autenticación', () => {
    const entorno = validarEntorno(minimo);
    expect(entorno).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      JWT_ACCESO_SEGUNDOS: 900,
      REFRESCO_DIAS: 30,
      REFRESCO_GRACIA_SEGUNDOS: 30,
    });
  });

  it('convierte a número las variables numéricas', () => {
    const entorno = validarEntorno({
      ...minimo,
      PORT: '8080',
      REFRESCO_DIAS: '7',
    });
    expect(entorno.PORT).toBe(8080);
    expect(entorno.REFRESCO_DIAS).toBe(7);
  });

  it('rechaza un JWT_SECRETO corto', () => {
    expect(() => validarEntorno({ ...minimo, JWT_SECRETO: 'corto' })).toThrow(
      /JWT_SECRETO: debe tener al menos 32 caracteres/,
    );
  });

  it('lista todas las variables que faltan sin mostrar valores', () => {
    let mensaje = '';
    try {
      validarEntorno({ JWT_SECRETO: 'secreto-que-no-debe-aparecer' });
    } catch (error) {
      mensaje = (error as Error).message;
    }
    expect(mensaje).toContain('DATABASE_URL');
    expect(mensaje).toContain('VERSION_TERMINOS');
    expect(mensaje).toContain('VERSION_PRIVACIDAD');
    expect(mensaje).not.toContain('secreto-que-no-debe-aparecer');
  });

  it('rechaza una DATABASE_URL que no es de PostgreSQL', () => {
    expect(() =>
      validarEntorno({ ...minimo, DATABASE_URL: 'mysql://u:c@localhost/bd' }),
    ).toThrow(/DATABASE_URL/);
  });
});
