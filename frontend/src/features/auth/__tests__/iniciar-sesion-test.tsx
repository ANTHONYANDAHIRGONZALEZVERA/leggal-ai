import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import IniciarSesion from '@/app/(auth)/iniciar-sesion';

// Lo decorativo se dibuja con Skia, que no existe en Jest. No cambia el
// comportamiento del formulario, así que se reemplaza por nada.
jest.mock('@/components/icono', () => ({ Icono: () => null }));
jest.mock('@/components/esfera', () => ({ Esfera: () => null }));
jest.mock('@/components/ondas', () => ({ Ondas: () => null }));
jest.mock('@/components/anillo', () => ({ Anillo: () => null }));

// Márgenes seguros del teléfono (notch, barra inferior) con valores de prueba.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// Solo se comprueba a dónde intenta ir la pantalla.
jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    router: { replace: jest.fn() },
    Link: ({ children, ...props }: { children: React.ReactNode }) => <Text {...props}>{children}</Text>,
  };
});

beforeEach(() => jest.clearAllMocks());

// Pantalla "Bienvenido de nuevo" (F07), de punta a punta.
describe('Pantalla de Inicio de sesión', () => {
  test('al enviar vacío pide correo y contraseña y no entra', async () => {
    const user = userEvent.setup();
    await render(<IniciarSesion />);

    await user.press(screen.getByLabelText('Iniciar sesión'));

    expect(await screen.findByText('Ingresa un correo válido')).toBeOnTheScreen();
    expect(screen.getByText('Ingresa tu contraseña')).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test('con correo y contraseña entra a Inicio', async () => {
    // Temporal hasta F09/F10: luego valida contra el backend y guarda la sesión.
    const user = userEvent.setup();
    await render(<IniciarSesion />);

    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@empresa.com');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta');
    await user.press(screen.getByLabelText('Iniciar sesión'));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/inicio'));
  });

  test('el enlace "Crear cuenta" lleva al Registro', async () => {
    await render(<IniciarSesion />);

    expect(screen.getByText('Crear cuenta')).toHaveProp('href', '/registro');
  });
});
