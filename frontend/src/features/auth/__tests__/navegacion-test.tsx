import { Stack } from 'expo-router/stack';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RootLayout from '@/app/_layout';
import Entrada from '@/app/index';
import { sesionDePrueba } from '@/pruebas/sesion';
import { useSesion } from '@/services/sesion';

// Navegación según la sesión (F10), con el enrutador real de Expo Router y el
// _layout e index reales de la app. Las pantallas se reemplazan por un texto
// con su nombre: aquí importa a cuál se llega, no cómo se ve.
const pantalla = (nombre: string) =>
  function Pantalla() {
    return <Text>{nombre}</Text>;
  };

// Cada grupo con su propio layout, como en la app: así la raíz ve los grupos
// "(auth)", "(onboarding)" y "(tabs)" que protege app/_layout.tsx.
const grupo = () =>
  function Grupo() {
    return <Stack screenOptions={{ headerShown: false }} />;
  };

const rutas = {
  _layout: RootLayout,
  index: Entrada,
  '(auth)/_layout': grupo(),
  '(onboarding)/_layout': grupo(),
  '(tabs)/_layout': grupo(),
  '(auth)/splash': pantalla('Splash'),
  '(auth)/iniciar-sesion': pantalla('Login'),
  '(onboarding)/perfil': pantalla('Perfil'),
  '(tabs)/inicio': pantalla('Inicio'),
};

const sesion = (onboardingCompleto: boolean) => sesionDePrueba({ usuario: { onboardingCompleto } });

beforeEach(() => useSesion.getState().cerrar());

describe('Navegación según la sesión', () => {
  test('sin sesión, la app abre en el Splash', async () => {
    await renderRouter(rutas);

    expect(await screen.findByText('Splash')).toBeOnTheScreen();
    expect(screen).toHavePathname('/splash');
  });

  test('con la sesión guardada, abre directo en Inicio (sin pasar por el Login)', async () => {
    useSesion.getState().iniciar(sesion(true));

    await renderRouter(rutas);

    expect(await screen.findByText('Inicio')).toBeOnTheScreen();
    expect(screen).toHavePathname('/inicio');
  });

  test('con sesión pero sin terminar el onboarding, abre en el paso 1/5', async () => {
    useSesion.getState().iniciar(sesion(false));

    await renderRouter(rutas);

    expect(await screen.findByText('Perfil')).toBeOnTheScreen();
  });

  test('al iniciar sesión desde el Login, lleva sola a Inicio', async () => {
    await renderRouter(rutas, { initialUrl: '/iniciar-sesion' });
    expect(await screen.findByText('Login')).toBeOnTheScreen();

    await act(() => useSesion.getState().iniciar(sesion(true)));

    expect(await screen.findByText('Inicio')).toBeOnTheScreen();
    expect(screen).toHavePathname('/inicio');
  });

  test('una cuenta nueva va al onboarding y, al terminarlo, a Inicio', async () => {
    await renderRouter(rutas, { initialUrl: '/iniciar-sesion' });
    await screen.findByText('Login');

    await act(() => useSesion.getState().iniciar(sesion(false)));
    expect(await screen.findByText('Perfil')).toBeOnTheScreen();

    await act(() => useSesion.getState().completarOnboarding());
    expect(await screen.findByText('Inicio')).toBeOnTheScreen();
  });

  test('al cerrar sesión vuelve al Splash', async () => {
    useSesion.getState().iniciar(sesion(true));
    await renderRouter(rutas);
    await screen.findByText('Inicio');

    await act(() => useSesion.getState().cerrar());

    expect(await screen.findByText('Splash')).toBeOnTheScreen();
    expect(screen).toHavePathname('/splash');
  });

  test('sin sesión, un enlace directo a Inicio no deja entrar', async () => {
    await renderRouter(rutas, { initialUrl: '/inicio' });

    expect(await screen.findByText('Splash')).toBeOnTheScreen();
    expect(screen.queryByText('Inicio')).not.toBeOnTheScreen();
  });

  test('con sesión, el Login ya no está disponible', async () => {
    useSesion.getState().iniciar(sesion(true));

    await renderRouter(rutas, { initialUrl: '/iniciar-sesion' });

    expect(await screen.findByText('Inicio')).toBeOnTheScreen();
    expect(screen.queryByText('Login')).not.toBeOnTheScreen();
  });
});
