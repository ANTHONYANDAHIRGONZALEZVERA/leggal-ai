import { colors } from '@/theme';

import { medirContrasena } from '../seguridad-contrasena';

// Medidor de seguridad del Registro (F08). Es una pista visual: estas pruebas
// fijan qué nivel y qué palabra ve la persona para cada tipo de contraseña.
describe('medirContrasena', () => {
  test('una contraseña vacía no llena barras ni muestra texto', () => {
    expect(medirContrasena('')).toEqual({ nivel: 0, etiqueta: '', color: colors.textoSecundario });
  });

  test('con menos de 8 caracteres es "Débil" y en rojo, aunque mezcle tipos', () => {
    // Aunque tenga mayúscula, número y símbolo, no cumple el mínimo del esquema.
    expect(medirContrasena('Ab1!')).toMatchObject({ nivel: 1, etiqueta: 'Débil', color: colors.error });
  });

  test('8 letras minúsculas cumplen el mínimo pero solo llegan a "Regular"', () => {
    expect(medirContrasena('abcdefgh')).toMatchObject({ nivel: 2, etiqueta: 'Regular' });
  });

  test('sumar un número o mezclar mayúsculas sube a "Buena"', () => {
    expect(medirContrasena('abcdefg1')).toMatchObject({ nivel: 3, etiqueta: 'Buena', color: colors.exito });
    expect(medirContrasena('abcdEFGH')).toMatchObject({ nivel: 3, etiqueta: 'Buena' });
  });

  test('largo de 12 o más, mayúsculas, números y símbolos dan "Fuerte"', () => {
    expect(medirContrasena('Leggal2026!')).toMatchObject({ nivel: 4, etiqueta: 'Fuerte' });
    expect(medirContrasena('abcdefghijk1')).toMatchObject({ nivel: 3, etiqueta: 'Buena' });
    expect(medirContrasena('abcdefghijK1')).toMatchObject({ nivel: 4, etiqueta: 'Fuerte' });
  });

  test('cuenta los espacios y símbolos como caracteres especiales', () => {
    // Frases de paso como "mi casa azul" son válidas y se premian.
    expect(medirContrasena('mi casa azul')).toMatchObject({ nivel: 3, etiqueta: 'Buena' });
  });
});
