import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import Modo from '@/app/(onboarding)/modo';
import { renderizar } from '@/pruebas/renderizar';

import { useBorradorOnboarding } from '../borrador';

// Las ilustraciones se dibujan con Skia (no existe en Jest) y son decoración.
jest.mock('@/components/ilustracion-modo', () => ({ IlustracionPersonal: () => null, IlustracionEquipo: () => null }));
jest.mock('@/components/icono', () => ({ Icono: () => null }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
    Redirect: ({ href }: { href: string }) => <Text>{`Redirige a ${href}`}</Text>,
  };
});

// Llega desde el 2/5 con los pasos anteriores en el borrador.
beforeEach(() => {
  jest.clearAllMocks();
  const borrador = useBorradorOnboarding.getState();
  borrador.vaciar();
  borrador.guardarPerfil({ nombre: 'Ana Pérez', usuario: 'ana.perez' });
  borrador.guardarArea({ rol: 'abogado', materias: ['laboral'], matricula: null });
});

const personal = () => screen.getByRole('radio', { name: 'Personal' });
const colaborativo = () => screen.getByRole('radio', { name: 'Colaborativo · Empresa' });
const continuar = () => screen.getByText('Continuar');

// Paso 3/5 "¿Cómo vas a trabajar?" (F31).
describe('Onboarding 3/5: ¿Cómo vas a trabajar?', () => {
  test('empieza sin modo elegido y muestra lo que incluye Colaborativo', async () => {
    await renderizar(<Modo />);

    expect(personal()).not.toBeChecked();
    expect(colaborativo()).not.toBeChecked();
    expect(screen.getByText('Multiempresa')).toBeOnTheScreen();
    expect(screen.getByText('Trazabilidad')).toBeOnTheScreen();
    expect(screen.getByText('Roles')).toBeOnTheScreen();
  });

  test('sin elegir no avanza y lo pide; el aviso se va al elegir', async () => {
    const user = userEvent.setup();
    await renderizar(<Modo />);

    await user.press(continuar());
    expect(await screen.findByText('Elige cómo vas a trabajar')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();

    await user.press(personal());
    expect(screen.queryByText('Elige cómo vas a trabajar')).not.toBeOnTheScreen();
  });

  test('se elige uno solo', async () => {
    const user = userEvent.setup();
    await renderizar(<Modo />);

    await user.press(personal());
    await user.press(colaborativo());

    expect(colaborativo()).toBeChecked();
    expect(personal()).not.toBeChecked();
  });

  test('Personal se salta el 4/5 y va directo al 5/5', async () => {
    const user = userEvent.setup();
    await renderizar(<Modo />);

    await user.press(personal());
    await user.press(continuar());

    expect(router.push).toHaveBeenCalledWith('/preferencias');
    expect(useBorradorOnboarding.getState().modo).toBe('personal');
  });

  test('Colaborativo sigue al 4/5 para unirse o crear una empresa', async () => {
    const user = userEvent.setup();
    await renderizar(<Modo />);

    await user.press(colaborativo());
    await user.press(continuar());

    expect(router.push).toHaveBeenCalledWith('/empresa');
    expect(useBorradorOnboarding.getState().modo).toBe('colaborativo');
  });

  test('al volver desde el paso siguiente encuentra lo que ya había elegido', async () => {
    useBorradorOnboarding.getState().guardarModo('colaborativo');

    await renderizar(<Modo />);

    expect(colaborativo()).toBeChecked();
  });

  test('al salir hacia atrás sin tocar Continuar, guarda lo elegido', async () => {
    const user = userEvent.setup();
    const { unmount } = await renderizar(<Modo />);

    await user.press(personal());
    await unmount();

    expect(useBorradorOnboarding.getState().modo).toBe('personal');
  });

  test('al salir sin elegir no guarda nada', async () => {
    const { unmount } = await renderizar(<Modo />);

    await unmount();

    expect(useBorradorOnboarding.getState().modo).toBeNull();
  });

  test('sin el 1/5 en el borrador (app recargada), vuelve al 1/5', async () => {
    useBorradorOnboarding.getState().vaciar();

    await renderizar(<Modo />);

    expect(screen.getByText('Redirige a /perfil')).toBeOnTheScreen();
  });

  test('sin el 2/5 en el borrador, vuelve al 2/5', async () => {
    const borrador = useBorradorOnboarding.getState();
    borrador.vaciar();
    borrador.guardarPerfil({ nombre: 'Ana Pérez', usuario: 'ana.perez' });

    await renderizar(<Modo />);

    expect(screen.getByText('Redirige a /area')).toBeOnTheScreen();
  });

  test('la flecha vuelve al paso 2/5', async () => {
    const user = userEvent.setup();
    await renderizar(<Modo />);

    await user.press(screen.getByLabelText('Volver'));

    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
