import { iniciales, quitarAcentos } from '../texto';

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
