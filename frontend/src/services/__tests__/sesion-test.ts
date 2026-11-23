import { renderHook } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { sesionDePrueba, usuarioDePrueba } from '@/pruebas/sesion';

import { CLAVE_SESION, useAcceso, useSesion } from '../sesion';

// Sesión guardada (F10). El almacén cifrado es el simulado de jest.setup.ts.

const USUARIO = usuarioDePrueba();
const SESION = sesionDePrueba();
/** Así quedan guardados los tokens de SESION en el teléfono. */
const TOKENS = { acceso: 'acceso-1', renovacion: 'renovacion-1' };
const SESION_SIN_ONBOARDING = sesionDePrueba({ usuario: { onboardingCompleto: false } });

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
    useSesion.getState().iniciar(SESION);
    await guardado();

    const guardadoEnTelefono = JSON.parse((await SecureStore.getItemAsync(CLAVE_SESION)) ?? '{}');
    expect(guardadoEnTelefono.state).toEqual({ usuario: USUARIO, tokens: TOKENS });
  });

  test('al cerrar sesión borra los datos guardados', async () => {
    useSesion.getState().iniciar(SESION);
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

  test('al renovar guarda los tokens nuevos y el usuario al día que trae el refresh', async () => {
    useSesion.getState().iniciar(SESION);
    useSesion.getState().iniciar(
      sesionDePrueba({ tokenAcceso: 'acceso-2', tokenRefresco: 'renovacion-2', usuario: { nombreVisible: 'Ana' } }),
    );
    await guardado();

    const guardadoEnTelefono = JSON.parse((await SecureStore.getItemAsync(CLAVE_SESION)) ?? '{}');
    expect(guardadoEnTelefono.state.tokens).toEqual({ acceso: 'acceso-2', renovacion: 'renovacion-2' });
    expect(guardadoEnTelefono.state.usuario.nombreVisible).toBe('Ana');
  });
});

describe('useAcceso', () => {
  test('sin sesión es "invitado"', async () => {
    const { result } = await renderHook(() => useAcceso());
    expect(result.current).toBe('invitado');
  });

  test('con sesión y onboarding pendiente es "onboarding"', async () => {
    useSesion.getState().iniciar(SESION_SIN_ONBOARDING);
    const { result } = await renderHook(() => useAcceso());
    expect(result.current).toBe('onboarding');
  });

  test('con sesión y onboarding hecho es "app"', async () => {
    useSesion.getState().iniciar(SESION);
    const { result } = await renderHook(() => useAcceso());
    expect(result.current).toBe('app');
  });

  test('completar el onboarding pasa de "onboarding" a "app" sin perder la sesión', () => {
    useSesion.getState().iniciar(SESION_SIN_ONBOARDING);

    useSesion.getState().completarOnboarding();

    expect(useSesion.getState()).toMatchObject({ usuario: USUARIO, tokens: TOKENS });
  });
});
