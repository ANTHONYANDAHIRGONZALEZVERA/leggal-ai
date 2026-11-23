import { esquemaLogin, esquemaRefresco, esquemaRegistro } from './esquemas';

const registroValido = {
  nombre: 'Andrea Ruiz Mora',
  correo: 'andrea.ruiz@ejemplo.com',
  contrasena: 'Lunes.Claro.2026',
  aceptaTerminos: true,
};

describe('esquemaRegistro', () => {
  it('acepta un registro válido', () => {
    expect(esquemaRegistro.parse(registroValido)).toEqual(registroValido);
  });

  it('recorta el nombre y deja el correo recortado y en minúsculas', () => {
    const datos = esquemaRegistro.parse({
      ...registroValido,
      nombre: '  Andrea Ruiz  ',
      correo: '  Andrea.Ruiz@Ejemplo.COM ',
    });
    expect(datos.nombre).toBe('Andrea Ruiz');
    expect(datos.correo).toBe('andrea.ruiz@ejemplo.com');
  });

  it.each([
    ['nombre', 'An', 'Ingresa tu nombre completo'],
    ['nombre', 'a'.repeat(81), 'Máximo 80 caracteres'],
    ['correo', 'no-es-correo', 'Ingresa un correo válido'],
    ['contrasena', '1234567', 'Mínimo 8 caracteres'],
    ['contrasena', 'a'.repeat(73), 'Máximo 72 caracteres'],
  ])('rechaza %s = "%s"', (campo, valor, mensaje) => {
    const resultado = esquemaRegistro.safeParse({
      ...registroValido,
      [campo]: valor,
    });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]).toMatchObject({
      path: [campo],
      message: mensaje,
    });
  });

  it.each([false, undefined, 'true'])(
    'exige aceptaTerminos = true (rechaza %p)',
    (valor) => {
      const resultado = esquemaRegistro.safeParse({
        ...registroValido,
        aceptaTerminos: valor,
      });
      expect(resultado.error?.issues[0]).toMatchObject({
        path: ['aceptaTerminos'],
        message: 'Debes aceptar los Términos y la Política para continuar',
      });
    },
  );

  it('rechaza un tenantId en el cuerpo: la empresa sale del token', () => {
    const resultado = esquemaRegistro.safeParse({
      ...registroValido,
      tenantId: 'otra-empresa',
    });
    expect(resultado.error?.issues[0].code).toBe('unrecognized_keys');
  });
});

describe('esquemaLogin', () => {
  it('normaliza el correo igual que el registro', () => {
    expect(
      esquemaLogin.parse({ correo: ' ANA@Ejemplo.com', contrasena: 'x' })
        .correo,
    ).toBe('ana@ejemplo.com');
  });

  it('exige una contraseña no vacía', () => {
    const resultado = esquemaLogin.safeParse({
      correo: 'ana@ejemplo.com',
      contrasena: '',
    });
    expect(resultado.error?.issues[0].message).toBe('Ingresa tu contraseña');
  });
});

describe('esquemaRefresco', () => {
  it.each(['', 'a'.repeat(129)])('rechaza un token de largo inválido', (t) => {
    expect(esquemaRefresco.safeParse({ tokenRefresco: t }).success).toBe(false);
  });
});
