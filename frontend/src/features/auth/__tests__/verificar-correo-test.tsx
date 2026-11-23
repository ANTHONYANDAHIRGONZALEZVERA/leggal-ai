import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import VerificarCorreo from '@/app/(verificacion)/verificar-correo';
import { registrarse } from '@/features/auth/api';
import { renderizar } from '@/pruebas/renderizar';
import { reiniciarMock, USUARIO_DEMO } from '@/services/api/mock';
import { CODIGO_DE_PRUEBA, vencerCodigos } from '@/services/api/mock-codigos';
import { useSesion } from '@/services/sesion';

import { useCuentaRegresiva } from '../use-cuenta-regresiva';

jest.mock('@/components/icono', () => ({ Icono: () => null }));
jest.mock('@/components/esfera', () => ({ Esfera: () => null }));
jest.mock('@/components/ondas', () => ({ Ondas: () => null }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useFocusEffect: (efecto: () => void | (() => void)) => require('react').useEffect(efecto, [efecto]),
}));
// La cuenta regresiva real se prueba aparte; aquí se puede adelantar.
jest.mock('../use-cuenta-regresiva', () => {
  const real = jest.requireActual('../use-cuenta-regresiva');
  return { ...real, useCuentaRegresiva: jest.fn(real.useCuentaRegresiva) };
});

const NUEVA = { nombre: 'Ana Pérez', correo: 'ana@empresa.com', contrasena: 'Leggal2026!', aceptaTerminos: true };

// Recién registrada: correo sin verificar, con el código ya enviado.
beforeEach(async () => {
  jest.clearAllMocks();
  reiniciarMock();
  useSesion.getState().iniciar(await registrarse(NUEVA));
});

const campo = () => screen.getByLabelText('Código de verificación');
const verificado = () => useSesion.getState().usuario?.correoVerificado;

// "Revisa tu correo" (F23, B27).
describe('Revisa tu correo', () => {
  test('dice a qué correo se envió y que se podrá reenviar en 0:45', async () => {
    await renderizar(<VerificarCorreo />);

    expect(screen.getByText('ana@empresa.com')).toBeOnTheScreen();
    expect(screen.getByText('Reenviar código en 0:45')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Verificar' })).toBeDisabled();
  });

  test('al escribir el sexto dígito verifica solo y la cuenta queda verificada', async () => {
    const user = userEvent.setup();
    await renderizar(<VerificarCorreo />);

    await user.type(campo(), CODIGO_DE_PRUEBA);

    await waitFor(() => expect(verificado()).toBe(true));
  });

  test('solo acepta dígitos, también al pegar ("12a 3B4-56" → 123456)', async () => {
    const user = userEvent.setup();
    await renderizar(<VerificarCorreo />);

    await user.paste(campo(), '12a 3B4-56');

    expect(campo()).toHaveProp('value', '123456');
  });

  test('un código incorrecto lo dice y, al corregirlo, el aviso se va', async () => {
    const user = userEvent.setup();
    await renderizar(<VerificarCorreo />);

    await user.type(campo(), '000000');
    expect(await screen.findByText('El código no es correcto. Revísalo e inténtalo de nuevo.')).toBeOnTheScreen();
    expect(verificado()).toBe(false);

    await user.type(campo(), '{Backspace}');
    expect(screen.queryByText('El código no es correcto. Revísalo e inténtalo de nuevo.')).not.toBeOnTheScreen();
  });

  test('un código vencido pide uno nuevo', async () => {
    vencerCodigos();
    const user = userEvent.setup();
    await renderizar(<VerificarCorreo />);

    await user.type(campo(), CODIGO_DE_PRUEBA);

    expect(await screen.findByText('El código venció. Pide uno nuevo.')).toBeOnTheScreen();
  });

  test('pasados los 45 s se puede reenviar, y avisa que llegó uno nuevo', async () => {
    const reiniciar = jest.fn();
    jest.mocked(useCuentaRegresiva).mockReturnValue({ restante: 0, reiniciar });
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 46_000); // el servidor también deja reenviar
    const user = userEvent.setup();
    await renderizar(<VerificarCorreo />);

    await user.press(screen.getByRole('button', { name: 'Reenviar código' }));

    expect(await screen.findByText('Te enviamos un código nuevo.')).toBeOnTheScreen();
    expect(reiniciar).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });

  test('"Cambiar correo" corrige un correo mal escrito y envía el código al nuevo', async () => {
    const user = userEvent.setup();
    await renderizar(<VerificarCorreo />);

    await user.press(screen.getByRole('button', { name: 'Cambiar correo' }));
    await user.clear(screen.getByLabelText('Correo electrónico'));
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana.p@empresa.com');
    await user.press(screen.getByRole('button', { name: 'Enviar código' }));

    expect(await screen.findByText('Te enviamos un código nuevo a ana.p@empresa.com.')).toBeOnTheScreen();
    expect(screen.getByText('ana.p@empresa.com')).toBeOnTheScreen();
    expect(useSesion.getState().usuario?.correo).toBe('ana.p@empresa.com');
  });

  test('un correo que ya tiene otra cuenta se avisa debajo del campo', async () => {
    const user = userEvent.setup();
    await renderizar(<VerificarCorreo />);

    await user.press(screen.getByRole('button', { name: 'Cambiar correo' }));
    await user.clear(screen.getByLabelText('Correo electrónico'));
    await user.type(screen.getByLabelText('Correo electrónico'), USUARIO_DEMO.correo);
    await user.press(screen.getByRole('button', { name: 'Enviar código' }));

    expect(await screen.findByText('Ya existe una cuenta con este correo')).toBeOnTheScreen();
    expect(useSesion.getState().usuario?.correo).toBe('ana@empresa.com');
  });

  test('la flecha y el "atrás" del teléfono salen al inicio de sesión', async () => {
    const escuchar = jest.spyOn(BackHandler, 'addEventListener');
    await renderizar(<VerificarCorreo />);
    const atras = escuchar.mock.calls.find(([evento]) => evento === 'hardwareBackPress')?.[1] as (() => boolean) | undefined;

    expect(atras?.()).toBe(true);
    await waitFor(() => expect(useSesion.getState().tokens).toBeNull());
    escuchar.mockRestore();
  });
});
