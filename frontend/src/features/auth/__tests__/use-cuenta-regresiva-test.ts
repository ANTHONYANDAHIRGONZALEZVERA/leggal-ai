import { act, renderHook } from '@testing-library/react-native';

import { comoReloj, useCuentaRegresiva } from '../use-cuenta-regresiva';

// Contador "Reenviar código en 0:45" (F23 y F24).
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useCuentaRegresiva', () => {
  test('baja un segundo por segundo y se detiene en 0', async () => {
    const { result } = await renderHook(() => useCuentaRegresiva(3));
    expect(result.current.restante).toBe(3);
    const apagar = jest.spyOn(globalThis, 'clearInterval');

    await act(() => jest.advanceTimersByTime(1000));
    expect(result.current.restante).toBe(2);

    await act(() => jest.advanceTimersByTime(5000));
    expect(result.current.restante).toBe(0);
    expect(apagar).toHaveBeenCalled(); // en 0 apaga su intervalo: no sigue corriendo
    apagar.mockRestore();
  });

  test('"reiniciar" vuelve a empezar después de reenviar', async () => {
    const { result } = await renderHook(() => useCuentaRegresiva(45));
    await act(() => jest.advanceTimersByTime(45_000));

    await act(() => result.current.reiniciar());

    expect(result.current.restante).toBe(45);
    await act(() => jest.advanceTimersByTime(1000));
    expect(result.current.restante).toBe(44);
  });
});

describe('comoReloj', () => {
  test.each([
    [45, '0:45'],
    [5, '0:05'],
    [90, '1:30'],
    [0, '0:00'],
  ])('%i → %s', (segundos, esperado) => {
    expect(comoReloj(segundos)).toBe(esperado);
  });
});
