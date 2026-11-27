import { Stack } from 'expo-router/stack';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RootLayout from '@/app/_layout';
import Entrada from '@/app/index';
import { sesionDePrueba } from '@/pruebas/sesion';
import { api } from '@/services/api';
import { reiniciarEntrada } from '@/services/entrada';
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
  '(verificacion)/_layout': grupo(),
  '(onboarding)/_layout': grupo(),
  '(tabs)/_layout': grupo(),
  '(auth)/splash': pantalla('Splash'),
  '(auth)/iniciar-sesion': pantalla('Login'),
  '(verificacion)/verificar-correo': pantalla('Revisa tu correo'),
  '(onboarding)/perfil': pantalla('Perfil'),
  '(tabs)/inicio': pantalla('Inicio'),
};

const sesion = (onboardingCompleto: boolean) => sesionDePrueba({ usuario: { onboardingCompleto } });

/** Lo que responde el servidor al refresh de la apertura (por defecto, que todo sigue igual). */
const renovarAlAbrir = jest.spyOn(api, 'renovarAlAbrir');

beforeEach(() => {
  reiniciarEntrada(); // cada prueba es una app recién abierta
  useSesion.getState().cerrar();
  renovarAlAbrir.mockReset().mockResolvedValue('renovada');
});

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

  test('con el correo sin verificar va a "Revisa tu correo" y, al verificarlo, al paso 1/5', async () => {
    useSesion.getState().iniciar(sesionDePrueba({ usuario: { correoVerificado: false, onboardingCompleto: false } }));
    await renderRouter(rutas);

    expect(await screen.findByText('Revisa tu correo')).toBeOnTheScreen();
    expect(screen).toHavePathname('/verificar-correo');

    const usuario = useSesion.getState().usuario!;
    await act(() => useSesion.getState().actualizarUsuario({ ...usuario, correoVerificado: true }));

    expect(await screen.findByText('Perfil')).toBeOnTheScreen();
    expect(screen.queryByText('Revisa tu correo')).not.toBeOnTheScreen();
  });

  test('sin verificar, el onboarding y el Inicio no están disponibles', async () => {
    useSesion.getState().iniciar(sesionDePrueba({ usuario: { correoVerificado: false, onboardingCompleto: false } }));
    await renderRouter(rutas, { initialUrl: '/perfil' });

    expect(await screen.findByText('Revisa tu correo')).toBeOnTheScreen();
    expect(screen.queryByText('Perfil')).not.toBeOnTheScreen();
  });

  test('una cuenta que ya terminó el onboarding no se bloquea aunque no haya verificado', async () => {
    useSesion.getState().iniciar(sesionDePrueba({ usuario: { correoVerificado: false, onboardingCompleto: true } }));
    await renderRouter(rutas);

    expect(await screen.findByText('Inicio')).toBeOnTheScreen();
  });

  test('al cerrar sesión va a "Bienvenido de nuevo", no al Splash', async () => {
    useSesion.getState().iniciar(sesion(true));
    await renderRouter(rutas);
    await screen.findByText('Inicio');

    await act(() => useSesion.getState().cerrar());

    expect(await screen.findByText('Login')).toBeOnTheScreen();
    expect(screen).toHavePathname('/iniciar-sesion');
  });

  test('el Splash se ve una sola vez: al abrir sin sesión, y no otra vez al salir', async () => {
    await renderRouter(rutas);
    await screen.findByText('Splash');
    await act(() => useSesion.getState().iniciar(sesion(true)));
    await screen.findByText('Inicio');

    await act(() => useSesion.getState().cerrar());

    expect(await screen.findByText('Login')).toBeOnTheScreen();
  });

  test('al salir del paso 1/5 va a "Bienvenido de nuevo", no al Splash', async () => {
    useSesion.getState().iniciar(sesion(false));
    await renderRouter(rutas);
    await screen.findByText('Perfil');

    await act(() => useSesion.getState().cerrar());

    expect(await screen.findByText('Login')).toBeOnTheScreen();
    expect(screen.queryByText('Splash')).not.toBeOnTheScreen();
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

describe('Navegación: sesión confirmada con el servidor al abrir', () => {
  test('pregunta una vez por la sesión guardada antes de mostrar la app', async () => {
    useSesion.getState().iniciar(sesion(true));

    await renderRouter(rutas);

    await screen.findByText('Inicio');
    expect(renovarAlAbrir).toHaveBeenCalledTimes(1);
  });

  test('si el servidor ya cerró la sesión, abre en el Splash y no se ve Inicio', async () => {
    useSesion.getState().iniciar(sesion(true));
    let responder = () => {};
    renovarAlAbrir.mockImplementation(
      () =>
        new Promise((resolver) => {
          responder = () => {
            useSesion.getState().cerrar();
            resolver('cerrada');
          };
        }),
    );

    await renderRouter(rutas);
    // Mientras el servidor no responde, sigue el splash: Inicio no se ve ni un instante.
    expect(screen.queryByText('Inicio')).not.toBeOnTheScreen();
    await act(async () => responder());

    expect(await screen.findByText('Splash')).toBeOnTheScreen();
    expect(screen.queryByText('Inicio')).not.toBeOnTheScreen();
  });

  test('si el onboarding se terminó en otro dispositivo, abre en Inicio y no en el paso 1/5', async () => {
    useSesion.getState().iniciar(sesion(false));
    renovarAlAbrir.mockImplementation(async () => {
      useSesion.getState().iniciar(sesion(true));
      return 'renovada';
    });

    await renderRouter(rutas);

    expect(await screen.findByText('Inicio')).toBeOnTheScreen();
    expect(screen.queryByText('Perfil')).not.toBeOnTheScreen();
  });

  test('sin red, entra igual con la sesión guardada', async () => {
    useSesion.getState().iniciar(sesion(true));
    renovarAlAbrir.mockResolvedValue('pendiente');

    await renderRouter(rutas);

    expect(await screen.findByText('Inicio')).toBeOnTheScreen();
  });
});
