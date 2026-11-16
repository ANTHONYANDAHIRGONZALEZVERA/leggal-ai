import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import Perfil from '@/app/(onboarding)/perfil';
import { iniciarSesion } from '@/features/auth/api';
import { renderizar } from '@/pruebas/renderizar';
import { reiniciarMock, USUARIO_NUEVO } from '@/services/api/mock';
import { useSesion } from '@/services/sesion';

import { useBorradorOnboarding } from '../borrador';

// El avatar se dibuja con Skia (no existe en Jest): se reemplaza por sus
// iniciales, que es lo que importa aquí.
jest.mock('@/components/avatar-esfera', () => {
  const { Text } = require('react-native');
  const { iniciales } = require('@/utils/texto');
  return { AvatarEsfera: ({ nombre }: { nombre: string }) => <Text testID="avatar">{iniciales(nombre)}</Text> };
});
jest.mock('@/components/icono', () => ({ Icono: () => null }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) } }));

// Cuenta de prueba con el onboarding pendiente, con su token real de la API simulada.
beforeEach(async () => {
  jest.clearAllMocks();
  reiniciarMock();
  useBorradorOnboarding.getState().vaciar();
  useSesion.getState().iniciar(await iniciarSesion({ correo: USUARIO_NUEVO.correo, contrasena: USUARIO_NUEVO.contrasena }));
});

const campoNombre = () => screen.getByLabelText('Nombre visible');
const campoUsuario = () => screen.getByLabelText('Nombre de usuario');

// Paso 1/5 "¿Cómo te llamamos?" (F30), contra la API simulada.
describe('Onboarding 1/5: ¿Cómo te llamamos?', () => {
  test('los dos campos empiezan vacíos y sin sugerencias', async () => {
    await renderizar(<Perfil />);

    expect(campoNombre()).toHaveProp('value', '');
    expect(campoUsuario()).toHaveProp('value', '');
    expect(screen.queryByLabelText('Sugerencias de nombre de usuario')).not.toBeOnTheScreen();
  });

  test('al escribir el nombre aparecen sugerencias armadas con lo escrito', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.type(campoNombre(), 'Bruno Díaz');

    expect(await screen.findByText('@bruno.diaz')).toBeOnTheScreen();
    expect(screen.getByText('@bdiaz.legal')).toBeOnTheScreen();
    expect(screen.getByText('@brunodiaz')).toBeOnTheScreen();
  });

  test('las sugerencias cambian si cambia el nombre', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);
    await user.type(campoNombre(), 'Bruno Díaz');
    await screen.findByText('@bruno.diaz');

    await user.clear(campoNombre());
    await user.type(campoNombre(), 'Carla Mora');

    expect(await screen.findByText('@carla.mora')).toBeOnTheScreen();
    expect(screen.queryByText('@bruno.diaz')).not.toBeOnTheScreen();
  });

  test('no sugiere un @usuario que ya está tomado', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.type(campoNombre(), 'Andrea Ruiz');

    expect(await screen.findByText('@aruiz.legal')).toBeOnTheScreen();
    expect(screen.queryByText('@andrea.ruiz')).not.toBeOnTheScreen();
  });

  test('al tocar una sugerencia llena el @usuario y queda "Disponible"', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);
    await user.type(campoNombre(), 'Andrea Ruiz');

    await user.press(await screen.findByText('@aruiz.legal'));

    expect(campoUsuario()).toHaveProp('value', 'aruiz.legal');
    expect(await screen.findByText('Disponible')).toBeOnTheScreen();
  });

  test('si escribe a mano un @usuario tomado lo avisa', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.type(campoUsuario(), 'andrea.ruiz');

    expect(await screen.findByText('Ya está en uso. Prueba una sugerencia.')).toBeOnTheScreen();
  });

  test('las iniciales del avatar siguen al nombre que se escribe', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.type(campoNombre(), 'Bruno Díaz');

    expect(screen.getByTestId('avatar')).toHaveTextContent('BD');
  });

  test('con nombre y un @usuario libre guarda el paso y pasa al 2/5', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.type(campoNombre(), 'Andrea Ruiz');
    await user.type(campoUsuario(), '@Andrea.Legal');
    await user.press(screen.getByLabelText('Continuar'));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/area'));
    // Se guarda normalizado: sin "@" y en minúsculas.
    expect(useBorradorOnboarding.getState().perfil).toEqual({ nombre: 'Andrea Ruiz', usuario: 'andrea.legal' });
  });

  test('vacío no avanza y pide los dos datos', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.press(screen.getByLabelText('Continuar'));

    expect(await screen.findByText('Ingresa tu nombre')).toBeOnTheScreen();
    expect(screen.getByText('Mínimo 3 caracteres')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });

  test('con un @usuario tomado no avanza aunque se toque Continuar enseguida', async () => {
    // Toca Continuar antes de que termine la revisión que se hace mientras
    // escribe: se revisa de nuevo al continuar y no deja pasar.
    const user = userEvent.setup();
    await renderizar(<Perfil />);
    await user.type(campoNombre(), 'Andrea Ruiz');
    await user.type(campoUsuario(), 'andrea.ruiz');

    await user.press(screen.getByLabelText('Continuar'));

    expect(await screen.findByText('Ese nombre de usuario ya está en uso')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
    expect(useBorradorOnboarding.getState().perfil).toBeNull();
  });

  test('un @usuario con formato inválido muestra la regla y no avanza', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);
    await user.type(campoNombre(), 'Andrea Ruiz');

    await user.type(campoUsuario(), 'andrea..ruiz');
    await user.press(screen.getByLabelText('Continuar'));

    expect(await screen.findByText('No uses dos símbolos seguidos')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });

  test('al volver desde el paso 2 encuentra lo que ya había llenado', async () => {
    useBorradorOnboarding.getState().guardarPerfil({ nombre: 'Andrea R.', usuario: 'aruiz.legal' });

    await renderizar(<Perfil />);

    expect(campoNombre()).toHaveProp('value', 'Andrea R.');
    expect(campoUsuario()).toHaveProp('value', 'aruiz.legal');
  });

  test('la flecha de volver del primer paso cierra la sesión', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.press(screen.getByLabelText('Salir y volver al inicio de sesión'));

    await waitFor(() => expect(useSesion.getState().tokens).toBeNull());
  });
});
