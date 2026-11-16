import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import Registro from '@/app/(auth)/registro';

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

beforeEach(() => jest.clearAllMocks());

/** Llena el formulario como lo haría una persona. */
async function llenar(user: ReturnType<typeof userEvent.setup>, { aceptar = true } = {}) {
  await user.type(screen.getByLabelText('Nombres y apellidos'), 'Ana Pérez');
  await user.type(screen.getByLabelText('Correo electrónico'), 'ana@empresa.com');
  await user.type(screen.getByLabelText('Contraseña'), 'Leggal2026!');
  if (aceptar) await user.press(screen.getByRole('checkbox'));
}

// Pantalla "Crea tu cuenta" (F08), de punta a punta.
describe('Pantalla de Registro', () => {
  test('al enviar vacío muestra un error por cada campo y no avanza', async () => {
    const user = userEvent.setup();
    await render(<Registro />);

    await user.press(screen.getByLabelText('Crear cuenta'));

    expect(await screen.findByText('Ingresa tu nombre completo')).toBeOnTheScreen();
    expect(screen.getByText('Ingresa un correo válido')).toBeOnTheScreen();
    expect(screen.getByText('Mínimo 8 caracteres')).toBeOnTheScreen();
    expect(screen.getByText('Debes aceptar los Términos y la Política para continuar')).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test('la casilla de Términos empieza sin marcar', async () => {
    await render(<Registro />);

    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  test('sin aceptar los Términos no crea la cuenta aunque lo demás esté bien', async () => {
    const user = userEvent.setup();
    await render(<Registro />);

    await llenar(user, { aceptar: false });
    await user.press(screen.getByLabelText('Crear cuenta'));

    expect(await screen.findByText('Debes aceptar los Términos y la Política para continuar')).toBeOnTheScreen();
    expect(screen.queryByText('Ingresa un correo válido')).not.toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test('el medidor reacciona a la contraseña escrita', async () => {
    const user = userEvent.setup();
    await render(<Registro />);

    await user.type(screen.getByLabelText('Contraseña'), 'Leggal2026!');

    expect(screen.getByText('Fuerte')).toBeOnTheScreen();
  });

  test('con todo correcto pasa al onboarding', async () => {
    // Temporal hasta F09: después de esto se llamará a la API del backend.
    const user = userEvent.setup();
    await render(<Registro />);

    await llenar(user);
    await user.press(screen.getByLabelText('Crear cuenta'));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/perfil'));
  });

  test('la flecha de volver regresa a la pantalla anterior', async () => {
    const user = userEvent.setup();
    await render(<Registro />);

    await user.press(screen.getByLabelText('Volver'));

    expect(router.back).toHaveBeenCalled();
  });
});
