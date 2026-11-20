import { esquemaUsuario, normalizarUsuario } from '../usuario';

// Reglas del @usuario del paso 1/5 (F30).

/** Mensaje de error del esquema, o undefined si el @usuario es válido. */
const errorDe = (texto: string) => esquemaUsuario.safeParse(texto).error?.issues[0]?.message;

describe('normalizarUsuario', () => {
  test('quita la "@", los espacios, las tildes y pasa a minúsculas', () => {
    expect(normalizarUsuario('  @Andrea.Ruíz ')).toBe('andrea.ruiz');
    expect(normalizarUsuario('ana maria')).toBe('anamaria');
  });
});

describe('esquemaUsuario', () => {
  test('acepta letras, números, punto y guion bajo', () => {
    expect(esquemaUsuario.safeParse('andrea.ruiz_2').success).toBe(true);
  });

  test('guarda la forma normalizada de lo escrito', () => {
    expect(esquemaUsuario.parse('@Andrea.Ruiz')).toBe('andrea.ruiz');
  });

  test('exige entre 3 y 30 caracteres', () => {
    expect(errorDe('ab')).toBe('Mínimo 3 caracteres');
    expect(errorDe('a'.repeat(31))).toBe('Máximo 30 caracteres');
    expect(errorDe('abc')).toBeUndefined();
  });

  test('debe empezar con una letra', () => {
    expect(errorDe('2andrea')).toBe('Debe empezar con una letra');
    expect(errorDe('.andrea')).toBe('Debe empezar con una letra');
  });

  test('no admite otros símbolos', () => {
    expect(errorDe('andrea-ruiz')).toBe('Solo letras, números, punto y guion bajo');
    expect(errorDe('andrea!')).toBe('Solo letras, números, punto y guion bajo');
  });

  test('no admite dos símbolos seguidos ni terminar en uno', () => {
    expect(errorDe('andrea..ruiz')).toBe('No uses dos símbolos seguidos');
    expect(errorDe('andrea._ruiz')).toBe('No uses dos símbolos seguidos');
    expect(errorDe('andrea.')).toBe('No puede terminar en punto ni guion bajo');
  });
});
