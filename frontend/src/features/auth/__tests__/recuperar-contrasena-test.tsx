import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import RecuperarContrasena from '@/app/(auth)/recuperar-contrasena';
import { iniciarSesion } from '@/features/auth/api';
import { renderizar } from '@/pruebas/renderizar';
import { reiniciarMock, USUARIO_DEMO } from '@/services/api/mock';
import { CODIGO_DE_PRUEBA } from '@/services/api/mock-codigos';

jest.mock('@/components/icono', () => ({ Icono: () => null }));
jest.mock('@/components/esfera', () => ({ Esfera: () => null }));
jest.mock('@/components/ondas', () => ({ Ondas: () => null }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));

beforeEach(() => {
  jest.clearAllMocks();
  reiniciarMock();
});

const NUEVA = 'NuevaClave2026!';
const correo = () => screen.getByLabelText('Correo electrónico');
const codigo = () => screen.getByLabelText('Código de verificación');
const nueva = () => screen.getByLabelText('Contraseña nueva');

async function pedirCodigo(user: ReturnType<typeof userEvent.setup>, escrito: string = USUARIO_DEMO.correo) {
  await user.type(correo(), escrito);
  await user.press(screen.getByRole('button', { name: 'Enviar código' }));
  await screen.findByLabelText('Código de verificación');
}

// "¿Olvidaste tu contraseña?" (F24, B28).
describe('¿Olvidaste tu contraseña?', () => {
  test('pide un correo válido antes de enviar el código', async () => {
    const user = userEvent.setup();
    await renderizar(<RecuperarContrasena />);

    await user.type(correo(), 'no-es-correo');
    await user.press(screen.getByRole('button', { name: 'Enviar código' }));

    expect(await screen.findByText('Ingresa un correo válido')).toBeOnTheScreen();
  });

  test('con el correo pasa al código y dice a qué correo, sin confirmar si tiene cuenta', async () => {
    const user = userEvent.setup();
    await renderizar(<RecuperarContrasena />);

    await pedirCodigo(user, '  Nadie@Empresa.com ');

    expect(screen.getByText('nadie@empresa.com')).toBeOnTheScreen();
    expect(screen.getByText(/Si hay una cuenta con/)).toBeOnTheScreen();
    expect(screen.getByText('Reenviar código en 0:45')).toBeOnTheScreen();
  });

  test('con el código y la contraseña nueva la cambia: se puede entrar con la nueva y no con la vieja', async () => {
    const user = userEvent.setup();
    await renderizar(<RecuperarContrasena />);
    await pedirCodigo(user);

    await user.type(codigo(), CODIGO_DE_PRUEBA);
    await user.type(nueva(), NUEVA);
    await user.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText(/cerramos tu sesión en los demás dispositivos/)).toBeOnTheScreen();
    await expect(iniciarSesion({ correo: USUARIO_DEMO.correo, contrasena: NUEVA })).resolves.toBeTruthy();
    await expect(iniciarSesion({ correo: USUARIO_DEMO.correo, contrasena: USUARIO_DEMO.contrasena })).rejects.toThrow();
  });

  test('un código incorrecto se avisa debajo de las cajas', async () => {
    const user = userEvent.setup();
    await renderizar(<RecuperarContrasena />);
    await pedirCodigo(user);

    await user.type(codigo(), '000000');
    await user.type(nueva(), NUEVA);
    await user.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText('El código no es correcto. Revísalo e inténtalo de nuevo.')).toBeOnTheScreen();
    expect(screen.queryByText(/cerramos tu sesión/)).not.toBeOnTheScreen();
  });

  test('pide los 6 dígitos y una contraseña de al menos 8 caracteres', async () => {
    const user = userEvent.setup();
    await renderizar(<RecuperarContrasena />);
    await pedirCodigo(user);

    await user.type(codigo(), '123');
    await user.type(nueva(), 'corta');
    await user.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText('Escribe los 6 dígitos del código')).toBeOnTheScreen();
    expect(screen.getByText('Mínimo 8 caracteres')).toBeOnTheScreen();
  });

  test('"Usar otro correo" y la flecha vuelven al paso del correo', async () => {
    const user = userEvent.setup();
    await renderizar(<RecuperarContrasena />);
    await pedirCodigo(user);

    await user.press(screen.getByRole('button', { name: 'Usar otro correo' }));

    expect(correo()).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });

  test('en el primer paso la flecha vuelve al inicio de sesión', async () => {
    const user = userEvent.setup();
    await renderizar(<RecuperarContrasena />);

    await user.press(screen.getByRole('button', { name: 'Volver' }));

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  test('al terminar, "Iniciar sesión" lleva al inicio de sesión', async () => {
    const user = userEvent.setup();
    await renderizar(<RecuperarContrasena />);
    await pedirCodigo(user);
    await user.type(codigo(), CODIGO_DE_PRUEBA);
    await user.type(nueva(), NUEVA);
    await user.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    await user.press(await screen.findByRole('button', { name: 'Iniciar sesión' }));

    expect(router.replace).toHaveBeenCalledWith('/iniciar-sesion');
  });
});
