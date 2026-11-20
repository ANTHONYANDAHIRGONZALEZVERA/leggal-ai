import { renderHook } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { CLAVE_SESION, useAcceso, useSesion } from '../sesion';

// Sesión guardada (F10). El almacén cifrado es el simulado de jest.setup.ts.

const USUARIO = { id: 'u1', nombre: 'Ana Pérez', correo: 'ana@empresa.com', onboardingCompleto: true };
const TOKENS = { acceso: 'acceso-1', renovacion: 'renovacion-1' };

// Espera a que zustand termine de escribir en el almacén (es asíncrono).
const guardado = () => new Promise((resolver) => setTimeout(resolver, 0));

beforeEach(async () => {
  useSesion.getState().cerrar();
  await guardado();
  (SecureStore as unknown as { __vaciar: () => void }).__vaciar();
  jest.clearAllMocks();
});

describe('useSesion: guardado', () => {
  test('al iniciar sesión guarda usuario y tokens cifrados en el teléfono', async () => {
    useSesion.getState().iniciar({ usuario: USUARIO, tokens: TOKENS });
    await guardado();

    const guardadoEnTelefono = JSON.parse((await SecureStore.getItemAsync(CLAVE_SESION)) ?? '{}');
    expect(guardadoEnTelefono.state).toEqual({ usuario: USUARIO, tokens: TOKENS });
  });

  test('al cerrar sesión borra los datos guardados', async () => {
    useSesion.getState().iniciar({ usuario: USUARIO, tokens: TOKENS });
    await guardado();

    useSesion.getState().cerrar();
    await guardado();

    const guardadoEnTelefono = JSON.parse((await SecureStore.getItemAsync(CLAVE_SESION)) ?? '{}');
    expect(guardadoEnTelefono.state).toEqual({ usuario: null, tokens: null });
  });

  test('al abrir la app recupera la sesión guardada', async () => {
    // Simula una sesión que quedó guardada la vez anterior.
    await SecureStore.setItemAsync(CLAVE_SESION, JSON.stringify({ state: { usuario: USUARIO, tokens: TOKENS }, version: 0 }));

    await useSesion.persist.rehydrate();

    expect(useSesion.getState()).toMatchObject({ usuario: USUARIO, tokens: TOKENS });
  });

  test('al renovar el token guarda el nuevo', async () => {
    useSesion.getState().iniciar({ usuario: USUARIO, tokens: TOKENS });
    useSesion.getState().actualizarTokens({ acceso: 'acceso-2', renovacion: 'renovacion-2' });
    await guardado();

    const guardadoEnTelefono = JSON.parse((await SecureStore.getItemAsync(CLAVE_SESION)) ?? '{}');
    expect(guardadoEnTelefono.state.tokens).toEqual({ acceso: 'acceso-2', renovacion: 'renovacion-2' });
  });
});

describe('useAcceso', () => {
  test('sin sesión es "invitado"', async () => {
    const { result } = await renderHook(() => useAcceso());
    expect(result.current).toBe('invitado');
  });

  test('con sesión y onboarding pendiente es "onboarding"', async () => {
    useSesion.getState().iniciar({ usuario: { ...USUARIO, onboardingCompleto: false }, tokens: TOKENS });
    const { result } = await renderHook(() => useAcceso());
    expect(result.current).toBe('onboarding');
  });

  test('con sesión y onboarding hecho es "app"', async () => {
    useSesion.getState().iniciar({ usuario: USUARIO, tokens: TOKENS });
    const { result } = await renderHook(() => useAcceso());
    expect(result.current).toBe('app');
  });

  test('completar el onboarding pasa de "onboarding" a "app" sin perder la sesión', () => {
    useSesion.getState().iniciar({ usuario: { ...USUARIO, onboardingCompleto: false }, tokens: TOKENS });

    useSesion.getState().completarOnboarding();

    expect(useSesion.getState()).toMatchObject({ usuario: USUARIO, tokens: TOKENS });
  });
});
