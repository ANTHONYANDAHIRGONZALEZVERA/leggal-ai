import { tiempoRestante } from '../animacion';

// Reanudar una animación pausada sin salto (Inicio, F12).
describe('tiempoRestante', () => {
  test.each([
    ['al empezar, una vuelta entera', 0, 34_000],
    ['a la mitad, media vuelta', 0.5, 17_000],
    ['casi al final, casi nada', 0.9, 3_400],
    ['pasada una vuelta, cuenta solo lo que falta de la actual', 1.25, 25_500],
  ])('%s', (_caso, actual, esperado) => {
    expect(tiempoRestante(actual, 1, 34_000)).toBeCloseTo(esperado);
  });

  test('sirve para vueltas que no miden 1 (el giro de la esfera, 2π)', () => {
    expect(tiempoRestante(Math.PI, 2 * Math.PI, 4000)).toBeCloseTo(2000);
  });
});
