import { act, renderHook } from '@testing-library/react-native';

import { api } from '../api';
import { ESPERA_MAX_MS, useSesionAlDia } from '../sesion-al-abrir';

// Espera del splash mientras se confirma la sesión al abrir la app.

const renovarAlAbrir = jest.spyOn(api, 'renovarAlAbrir');

beforeEach(() => {
  jest.useFakeTimers();
  renovarAlAbrir.mockReset();
});
afterEach(() => jest.useRealTimers());

describe('useSesionAlDia', () => {
  test('no pregunta al servidor hasta haber leído la sesión guardada', async () => {
    renovarAlAbrir.mockResolvedValue('renovada');

    const { result } = await renderHook(() => useSesionAlDia(false));

    expect(renovarAlAbrir).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  test('queda lista apenas responde el refresh', async () => {
    renovarAlAbrir.mockResolvedValue('renovada');

    const { result } = await renderHook(() => useSesionAlDia(true));
    await act(async () => {});

    expect(result.current).toBe(true);
  });

  test('si la red está lenta, no deja el splash más de ESPERA_MAX_MS', async () => {
    renovarAlAbrir.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useSesionAlDia(true));
    await act(() => jest.advanceTimersByTime(ESPERA_MAX_MS - 1));
    expect(result.current).toBe(false);

    await act(() => jest.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });
});
