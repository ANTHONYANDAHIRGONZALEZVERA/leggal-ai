import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import Perfil from '@/app/(onboarding)/perfil';
import { registrarse } from '@/features/auth/api';
import { renderizar } from '@/pruebas/renderizar';
import { reiniciarMock } from '@/services/api/mock';
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

// Cuenta recién creada en la API simulada ("Andrea Ruiz"), con su token real.
beforeEach(async () => {
  jest.clearAllMocks();
  reiniciarMock();
  useBorradorOnboarding.getState().vaciar();
  useSesion.getState().iniciar(
    await registrarse({ nombre: 'Andrea Ruiz', correo: 'andrea@empresa.com', contrasena: 'Leggal2026!', aceptaTerminos: true }),
  );
});

const campoUsuario = () => screen.getByLabelText('Nombre de usuario');

// Paso 1/5 "¿Cómo te llamamos?" (F30), contra la API simulada.
describe('Onboarding 1/5: ¿Cómo te llamamos?', () => {
  test('propone el nombre de la cuenta y un @usuario armado con él', async () => {
    await renderizar(<Perfil />);

    expect(screen.getByLabelText('Nombre visible')).toHaveProp('value', 'Andrea Ruiz');
    expect(campoUsuario()).toHaveProp('value', 'andrea.ruiz');
    expect(screen.getByTestId('avatar')).toHaveTextContent('AR');
  });

  test('si el @usuario propuesto está tomado lo avisa y ofrece sugerencias libres', async () => {
    await renderizar(<Perfil />);

    expect(await screen.findByText('Ya está en uso. Prueba una sugerencia.')).toBeOnTheScreen();
    expect(screen.getByText('@ab.andrearuiz')).toBeOnTheScreen();
    expect(screen.getByText('@aruiz.legal')).toBeOnTheScreen();
  });

  test('al tocar una sugerencia la usa y queda "Disponible"', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.press(await screen.findByText('@aruiz.legal'));

    expect(campoUsuario()).toHaveProp('value', 'aruiz.legal');
    expect(await screen.findByText('Disponible')).toBeOnTheScreen();
  });

  test('las iniciales del avatar siguen al nombre que se escribe', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.clear(screen.getByLabelText('Nombre visible'));
    await user.type(screen.getByLabelText('Nombre visible'), 'Bruno Díaz');

    expect(screen.getByTestId('avatar')).toHaveTextContent('BD');
  });

  test('con un @usuario libre guarda el paso en el borrador y pasa al 2/5', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.clear(campoUsuario());
    await user.type(campoUsuario(), '@Andrea.Legal');
    await user.press(screen.getByLabelText('Continuar'));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/area'));
    // Se guarda normalizado: sin "@" y en minúsculas.
    expect(useBorradorOnboarding.getState().perfil).toEqual({ nombre: 'Andrea Ruiz', usuario: 'andrea.legal' });
  });

  test('con un @usuario tomado no avanza aunque se toque Continuar enseguida', async () => {
    // Toca Continuar antes de que termine la revisión que se hace mientras
    // escribe: se revisa de nuevo al continuar y no deja pasar.
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.press(screen.getByLabelText('Continuar'));

    expect(await screen.findByText('Ese nombre de usuario ya está en uso')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
    expect(useBorradorOnboarding.getState().perfil).toBeNull();
  });

  test('un @usuario con formato inválido muestra la regla y no avanza', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.clear(campoUsuario());
    await user.type(campoUsuario(), 'andrea..ruiz');
    await user.press(screen.getByLabelText('Continuar'));

    expect(await screen.findByText('No uses dos símbolos seguidos')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });

  test('al volver desde el paso 2 encuentra lo que ya había llenado', async () => {
    useBorradorOnboarding.getState().guardarPerfil({ nombre: 'Andrea R.', usuario: 'aruiz.legal' });

    await renderizar(<Perfil />);

    expect(screen.getByLabelText('Nombre visible')).toHaveProp('value', 'Andrea R.');
    expect(campoUsuario()).toHaveProp('value', 'aruiz.legal');
  });

  test('la flecha de volver del primer paso cierra la sesión', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.press(screen.getByLabelText('Salir y volver al inicio de sesión'));

    await waitFor(() => expect(useSesion.getState().tokens).toBeNull());
  });
});
