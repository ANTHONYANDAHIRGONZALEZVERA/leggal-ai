import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import IniciarSesion from '@/app/(auth)/iniciar-sesion';
import { renderizar } from '@/pruebas/renderizar';
import { reiniciarMock, USUARIO_DEMO } from '@/services/api/mock';
import { useSesion } from '@/services/sesion';

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

// Sin EXPO_PUBLIC_API_URL las pruebas usan la API simulada (F11), en limpio.
beforeEach(() => {
  jest.clearAllMocks();
  reiniciarMock();
  useSesion.getState().cerrar();
});

async function escribir(correo: string, contrasena: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Correo electrónico'), correo);
  await user.type(screen.getByLabelText('Contraseña'), contrasena);
  await user.press(screen.getByLabelText('Iniciar sesión'));
}

// Pantalla "Bienvenido de nuevo" (F07, conectada a la API en F09).
describe('Pantalla de Inicio de sesión', () => {
  test('al enviar vacío pide correo y contraseña y no llama a la API', async () => {
    const user = userEvent.setup();
    await renderizar(<IniciarSesion />);

    await user.press(screen.getByLabelText('Iniciar sesión'));

    expect(await screen.findByText('Ingresa un correo válido')).toBeOnTheScreen();
    expect(screen.getByText('Ingresa tu contraseña')).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test('con la cuenta correcta guarda la sesión y entra a Inicio', async () => {
    await renderizar(<IniciarSesion />);

    // Con espacios y mayúsculas, como lo deja a veces el teclado.
    await escribir(' Demo@Leggal.ai ', USUARIO_DEMO.contrasena);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/inicio'));
    expect(useSesion.getState().usuario).toMatchObject({ correo: 'demo@leggal.ai', nombre: 'Usuario Demo' });
    expect(useSesion.getState().tokens).not.toBeNull();
  });

  test('con la contraseña incorrecta muestra el aviso y no entra', async () => {
    await renderizar(<IniciarSesion />);

    await escribir(USUARIO_DEMO.correo, 'incorrecta');

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(router.replace).not.toHaveBeenCalled();
    expect(useSesion.getState().usuario).toBeNull();
  });

  test('el aviso de error desaparece al volver a intentar con la cuenta correcta', async () => {
    const user = userEvent.setup();
    await renderizar(<IniciarSesion />);
    await escribir(USUARIO_DEMO.correo, 'incorrecta');
    expect(await screen.findByRole('alert')).toBeOnTheScreen();

    await user.clear(screen.getByLabelText('Contraseña'));
    await user.type(screen.getByLabelText('Contraseña'), USUARIO_DEMO.contrasena);
    await user.press(screen.getByLabelText('Iniciar sesión'));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/inicio'));
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  test('el enlace "Crear cuenta" lleva al Registro', async () => {
    await renderizar(<IniciarSesion />);

    expect(screen.getByText('Crear cuenta')).toHaveProp('href', '/registro');
  });
});
