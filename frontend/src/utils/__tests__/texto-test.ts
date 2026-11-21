import { conPunto, iniciales, primerNombre, quitarAcentos } from '../texto';

// Utilidades de texto compartidas (F30).
describe('quitarAcentos', () => {
  test('quita tildes, diéresis y la virgulilla de la ñ', () => {
    expect(quitarAcentos('Pérez Núñez Güemes')).toBe('Perez Nunez Guemes');
  });

  test('deja igual un texto sin acentos', () => {
    expect(quitarAcentos('Andrea Ruiz')).toBe('Andrea Ruiz');
  });
});

describe('iniciales', () => {
  test('toma la primera letra del primer y del último nombre', () => {
    expect(iniciales('Andrea Ruiz')).toBe('AR');
    expect(iniciales('María José López Vera')).toBe('MV');
  });

  test('con un solo nombre usa una letra', () => {
    expect(iniciales('Andrea')).toBe('A');
  });

  test('ignora espacios de más y pasa a mayúsculas', () => {
    expect(iniciales('  andrea   ruiz ')).toBe('AR');
  });

  test('sin nombre devuelve vacío', () => {
    expect(iniciales('   ')).toBe('');
  });
});

describe('primerNombre', () => {
  test.each([
    ['Andrea Ruiz', 'Andrea'],
    ['  María José López ', 'María'],
    ['Ana', 'Ana'],
    ['   ', ''],
  ])('"%s" → "%s"', (nombre, esperado) => {
    expect(primerNombre(nombre)).toBe(esperado);
  });
});

describe('conPunto', () => {
  test.each([
    ['Ya eres parte de ACCONS S.A.S.', 'Ya eres parte de ACCONS S.A.S.'],
    ['Ya eres parte de Estudio Ruiz', 'Ya eres parte de Estudio Ruiz.'],
    ['¿Listo?', '¿Listo?'],
  ])('"%s" → "%s"', (frase, esperada) => {
    expect(conPunto(frase)).toBe(esperada);
  });
});
