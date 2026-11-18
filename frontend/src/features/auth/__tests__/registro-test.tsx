import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import Registro from '@/app/(auth)/registro';
import { renderizar } from '@/pruebas/renderizar';
import { reiniciarMock, USUARIO_DEMO } from '@/services/api/mock';
import { useSesion } from '@/services/sesion';

// Lo decorativo se dibuja con Skia, que no existe en Jest. No cambia el
// comportamiento del formulario, así que se reemplaza por nada.
jest.mock('@/components/icono', () => ({ Icono: () => null }));
jest.mock('@/components/esfera', () => ({ Esfera: () => null }));
jest.mock('@/components/ondas', () => ({ Ondas: () => null }));

// Márgenes seguros del teléfono (notch, barra inferior) con valores de prueba.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// La navegación real necesita el árbol de Expo Router; aquí solo se comprueba
// a dónde intenta ir la pantalla.
jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    router: { replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
    Link: ({ children, ...props }: { children: React.ReactNode }) => <Text {...props}>{children}</Text>,
  };
});

// Sin EXPO_PUBLIC_API_URL las pruebas usan la API simulada (F11), en limpio.
beforeEach(() => {
  jest.clearAllMocks();
  reiniciarMock();
  useSesion.getState().cerrar();
});

/** Llena el formulario como lo haría una persona. */
async function llenar(user: ReturnType<typeof userEvent.setup>, { aceptar = true, correo = 'ana@empresa.com' } = {}) {
  await user.type(screen.getByLabelText('Nombres y apellidos'), 'Ana Pérez');
  await user.type(screen.getByLabelText('Correo electrónico'), correo);
  await user.type(screen.getByLabelText('Contraseña'), 'Leggal2026!');
  if (aceptar) await user.press(screen.getByRole('checkbox'));
}

// Pantalla "Crea tu cuenta" (F08, conectada a la API en F09), de punta a punta.
describe('Pantalla de Registro', () => {
  test('al enviar vacío muestra un error por cada campo y no avanza', async () => {
    const user = userEvent.setup();
    await renderizar(<Registro />);

    await user.press(screen.getByLabelText('Crear cuenta'));

    expect(await screen.findByText('Ingresa tu nombre completo')).toBeOnTheScreen();
    expect(screen.getByText('Ingresa un correo válido')).toBeOnTheScreen();
    expect(screen.getByText('Mínimo 8 caracteres')).toBeOnTheScreen();
    expect(screen.getByText('Debes aceptar los Términos y la Política para continuar')).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test('la casilla de Términos empieza sin marcar', async () => {
    await renderizar(<Registro />);

    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  test('sin aceptar los Términos no crea la cuenta aunque lo demás esté bien', async () => {
    const user = userEvent.setup();
    await renderizar(<Registro />);

    await llenar(user, { aceptar: false });
    await user.press(screen.getByLabelText('Crear cuenta'));

    expect(await screen.findByText('Debes aceptar los Términos y la Política para continuar')).toBeOnTheScreen();
    expect(screen.queryByText('Ingresa un correo válido')).not.toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test('el medidor reacciona a la contraseña escrita', async () => {
    const user = userEvent.setup();
    await renderizar(<Registro />);

    await user.type(screen.getByLabelText('Contraseña'), 'Leggal2026!');

    expect(screen.getByText('Fuerte')).toBeOnTheScreen();
  });

  test('con todo correcto crea la cuenta, guarda la sesión y pasa al onboarding', async () => {
    const user = userEvent.setup();
    await renderizar(<Registro />);

    await llenar(user);
    await user.press(screen.getByLabelText('Crear cuenta'));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/perfil'));
    expect(useSesion.getState().usuario).toMatchObject({ nombre: 'Ana Pérez', correo: 'ana@empresa.com' });
  });

  test('si el correo ya tiene cuenta lo avisa debajo del campo y no avanza', async () => {
    const user = userEvent.setup();
    await renderizar(<Registro />);

    await llenar(user, { correo: USUARIO_DEMO.correo });
    await user.press(screen.getByLabelText('Crear cuenta'));

    expect(await screen.findByText('Ya existe una cuenta con este correo')).toBeOnTheScreen();
    // Es un error del campo, no un aviso general.
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
    expect(useSesion.getState().usuario).toBeNull();
  });

  test('la flecha de volver regresa a la pantalla anterior', async () => {
    const user = userEvent.setup();
    await renderizar(<Registro />);

    await user.press(screen.getByLabelText('Volver'));

    expect(router.back).toHaveBeenCalled();
  });
});
