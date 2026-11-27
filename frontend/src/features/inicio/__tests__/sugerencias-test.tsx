import { act, fireEvent, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { getAnimatedStyle } from 'react-native-reanimated';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { renderizar } from '@/pruebas/renderizar';

import {
  avanceArrastrado,
  desplazamiento,
  enVuelta,
  FRENADO,
  impulsoAlSoltar,
  SugerenciasAsistente,
  UMBRAL_ARRASTRE,
} from '../sugerencias-asistente';

jest.mock('@/components/icono', () => ({ Icono: () => null }));

const COPIA = 400;
/** Un cuadro: Reanimated recalcula los estilos animados en el siguiente. */
const unCuadro = () => act(() => jest.advanceTimersByTime(16));
// Los tipos de Reanimated publican la versión de web (sin parámetros); Jest
// usa la nativa, que recibe el componente y devuelve su estilo animado.
const estiloAnimado = getAnimatedStyle as unknown as (componente: unknown) => { transform?: { translateX: number }[] };
const translateX = (testID: string) => estiloAnimado(screen.getByTestId(testID)).transform?.[0]?.translateX ?? NaN;

// Arrastrar las filas de sugerencias del Inicio con el dedo (F12).
describe('Arrastrar las sugerencias', () => {
  test('la fila sigue al dedo punto por punto, vaya hacia donde vaya sola', () => {
    // Hacia la derecha: +50 pt de dedo = +50 pt de fila.
    expect(desplazamiento(avanceArrastrado(0.5, 50, COPIA, true), COPIA, true) - desplazamiento(0.5, COPIA, true)).toBeCloseTo(50);
    // Hacia la izquierda también: el dedo manda, no la dirección de la fila.
    expect(desplazamiento(avanceArrastrado(0.5, 50, COPIA, false), COPIA, false) - desplazamiento(0.5, COPIA, false)).toBeCloseTo(50);
    expect(desplazamiento(avanceArrastrado(0.5, -80, COPIA, false), COPIA, false) - desplazamiento(0.5, COPIA, false)).toBeCloseTo(-80);
  });

  test('arrastrar más de una vuelta no deja huecos: se ve igual que dentro de la vuelta', () => {
    expect(enVuelta(1.25)).toBeCloseTo(0.25);
    expect(enVuelta(-0.25)).toBeCloseTo(0.75);
    expect(desplazamiento(2.3, COPIA, true)).toBeCloseTo(desplazamiento(0.3, COPIA, true));
    expect(desplazamiento(-0.7, COPIA, false)).toBeCloseTo(desplazamiento(0.3, COPIA, false));
    // Nunca se sale de la franja de una copia (si no, se vería el borde vacío).
    for (const avance of [-3.1, -0.5, 0, 0.5, 1, 4.9]) {
      expect(desplazamiento(avance, COPIA, true)).toBeLessThanOrEqual(0);
      expect(desplazamiento(avance, COPIA, true)).toBeGreaterThanOrEqual(-COPIA);
    }
  });

  test('el impulso al soltar va en puntos por segundo, con el sentido del dedo', () => {
    // En puntos: Reanimated termina el frenado bajo 1 unidad/s; en vueltas
    // (copias de 400 pt) eso cortaba la fila de golpe a 400 pt/s.
    expect(impulsoAlSoltar(-300, COPIA, true)).toEqual({ velocity: -300, velocityFactor: 1 / COPIA, deceleration: FRENADO });
    expect(impulsoAlSoltar(-300, COPIA, false).velocity).toBe(300);
  });

  test('antes de medir la fila, arrastrar no la mueve', () => {
    expect(avanceArrastrado(0.4, 120, 0, true)).toBe(0.4);
  });

  test('el gesto se activa en horizontal y en vertical cede el scroll a la página', async () => {
    await renderizar(<SugerenciasAsistente />);

    for (const fila of [0, 1, 2]) {
      const { config } = getByGestureTestId(`arrastre-fila-${fila}`) as unknown as { config: Record<string, unknown> };
      expect(config).toMatchObject({
        activeOffsetXStart: -UMBRAL_ARRASTRE,
        activeOffsetXEnd: UMBRAL_ARRASTRE,
        failOffsetYStart: -UMBRAL_ARRASTRE,
        failOffsetYEnd: UMBRAL_ARRASTRE,
      });
    }
  });

  test('con el dedo, cada fila se mueve en vivo hacia donde la lleve', async () => {
    jest.useFakeTimers();
    try {
      await renderizar(<SugerenciasAsistente />);
      for (const fila of [0, 1]) {
        await fireEvent(screen.getByTestId(`fila-${fila}`), 'layout', { nativeEvent: { layout: { width: COPIA * 2 } } });
      }
      await unCuadro();
      const antes = [translateX('fila-0'), translateX('fila-1')];
      // Medidas: la fila 0 (hacia la derecha) empieza corrida una copia.
      expect(antes[0]).toBeCloseTo(-COPIA, 0);

      // Fila 0 (va sola a la derecha) arrastrada a la izquierda; fila 1 (va a
      // la izquierda) arrastrada a la derecha.
      await act(async () => {
        fireGestureHandler(getByGestureTestId('arrastre-fila-0'), [
          { state: State.BEGAN },
          { state: State.ACTIVE, translationX: -UMBRAL_ARRASTRE },
          { state: State.ACTIVE, translationX: -90 },
        ]);
        fireGestureHandler(getByGestureTestId('arrastre-fila-1'), [
          { state: State.BEGAN },
          { state: State.ACTIVE, translationX: UMBRAL_ARRASTRE },
          { state: State.ACTIVE, translationX: 70 },
        ]);
      });

      await unCuadro();
      // Se compara dentro de una copia: correrse una copia entera se ve igual.
      const movido = (fila: number) => enVuelta((translateX(`fila-${fila}`) - antes[fila]) / COPIA) * COPIA;
      expect(movido(0)).toBeCloseTo(COPIA - 90, 0); // −90
      expect(movido(1)).toBeCloseTo(70, 0);
    } finally {
      jest.useRealTimers();
    }
  });

  test('al soltarla despacio sigue deslizándose suave, sin cortarse de golpe', async () => {
    jest.useFakeTimers();
    try {
      await renderizar(<SugerenciasAsistente />);
      await fireEvent(screen.getByTestId('fila-0'), 'layout', { nativeEvent: { layout: { width: COPIA * 2 } } });
      await unCuadro();

      await act(async () => {
        fireGestureHandler(getByGestureTestId('arrastre-fila-0'), [
          { state: State.BEGAN },
          { state: State.ACTIVE, translationX: -UMBRAL_ARRASTRE },
          { state: State.ACTIVE, translationX: -40 },
          { state: State.END, translationX: -40, velocityX: -300 },
        ]);
      });
      await unCuadro();
      const alSoltar = translateX('fila-0');
      await act(() => jest.advanceTimersByTime(100));

      // A 300 pt/s hacia la izquierda, en 0,1 s sigue ~19 pt más mientras
      // frena (antes se cortaba y volvía de inmediato a ir sola a la derecha).
      const siguio = enVuelta((translateX('fila-0') - alSoltar) / COPIA) * COPIA - COPIA;
      expect(siguio).toBeLessThan(-10);
      expect(siguio).toBeGreaterThan(-32);
    } finally {
      jest.useRealTimers();
    }
  });

  test('al soltar frena y vuelve a moverse sola desde donde quedó', async () => {
    jest.useFakeTimers();
    try {
      await renderizar(<SugerenciasAsistente />);
      await fireEvent(screen.getByTestId('fila-0'), 'layout', { nativeEvent: { layout: { width: COPIA * 2 } } });
      await unCuadro();

      await act(async () => {
        fireGestureHandler(getByGestureTestId('arrastre-fila-0'), [
          { state: State.BEGAN },
          { state: State.ACTIVE, translationX: -UMBRAL_ARRASTRE },
          { state: State.ACTIVE, translationX: -60 },
          { state: State.END, translationX: -60, velocityX: 0 },
        ]);
      });
      await act(() => jest.advanceTimersByTime(100));
      const alSoltar = translateX('fila-0');
      await act(() => jest.advanceTimersByTime(1000));

      // Sola va hacia la derecha: en 1 s avanza una copia / 34 s ≈ 11,8 pt,
      // empezando donde quedó (sin saltar).
      const avanzo = translateX('fila-0') - alSoltar;
      expect(avanzo).toBeGreaterThan(8);
      expect(avanzo).toBeLessThan(16);
    } finally {
      jest.useRealTimers();
    }
  });
});
