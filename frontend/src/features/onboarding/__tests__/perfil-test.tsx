import { screen, userEvent, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import Perfil from '@/app/(onboarding)/perfil';
import { iniciarSesion } from '@/features/auth/api';
import { renderizar } from '@/pruebas/renderizar';
import { reiniciarMock, USUARIO_NUEVO } from '@/services/api/mock';
import { useSesion } from '@/services/sesion';

import { useBorradorOnboarding } from '../borrador';

// El avatar se dibuja con Skia (no existe en Jest): se reemplaza por sus
// iniciales (o la foto elegida) y el botón de cámara, que es lo que importa aquí.
jest.mock('@/components/avatar-esfera', () => {
  const { Pressable, Text } = require('react-native');
  const { iniciales } = require('@/utils/texto');
  return {
    AvatarEsfera: ({ nombre, foto, onSubirFoto }: { nombre: string; foto?: string | null; onSubirFoto: () => void }) => (
      <>
        <Text testID="avatar">{foto ? `foto ${foto}` : iniciales(nombre)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={foto ? 'Cambiar foto' : 'Subir foto'} onPress={onSubirFoto} />
      </>
    ),
  };
});
jest.mock('@/components/icono', () => ({ Icono: () => null }));
jest.mock('@/components/esfera', () => ({ Esfera: () => null }));
// Selector y recorte del sistema: dobles que devuelven una foto lista.
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));
jest.mock('expo-image-manipulator', () => {
  const contexto = {
    crop: () => contexto,
    resize: () => contexto,
    renderAsync: async () => ({ saveAsync: async () => ({ uri: 'file:///cache/lista.jpg' }) }),
  };
  return { SaveFormat: { JPEG: 'jpeg' }, ImageManipulator: { manipulate: () => contexto } };
});
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

  test('mientras llegan las sugerencias muestra su lugar (carga esqueleto) y luego las cambia por ellas', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.type(campoNombre(), 'Bruno Díaz');

    expect(screen.getByLabelText('Buscando sugerencias de nombre de usuario')).toBeOnTheScreen();
    expect(await screen.findByText('@bruno.diaz')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Buscando sugerencias de nombre de usuario')).not.toBeOnTheScreen();
  });

  test('si el servidor no tiene sugerencias, la carga se quita y no queda nada', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.type(campoNombre(), '12'); // sin letras: no hay con qué armar @usuarios
    expect(screen.getByLabelText('Buscando sugerencias de nombre de usuario')).toBeOnTheScreen();

    await waitFor(() => expect(screen.queryByLabelText('Buscando sugerencias de nombre de usuario')).not.toBeOnTheScreen());
    expect(screen.queryByLabelText('Sugerencias de nombre de usuario')).not.toBeOnTheScreen();
  });

  test('con una sola letra no sugiere ni muestra la carga', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.type(campoNombre(), 'B');

    expect(screen.queryByLabelText('Buscando sugerencias de nombre de usuario')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Sugerencias de nombre de usuario')).not.toBeOnTheScreen();
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

// Foto de perfil del paso 1/5: hoja nativa de opciones, permiso de cámara
// explicado antes de pedirlo y la foto ya preparada en el borrador.
describe('Onboarding 1/5: foto de perfil', () => {
  const selector = jest.mocked(ImagePicker);
  const FOTO = { uri: 'file:///fotos/yo.jpg', width: 1000, height: 1000, type: 'image', mimeType: 'image/jpeg', fileSize: 900_000 } as const;
  const permiso = (granted: boolean, canAskAgain: boolean) =>
    ({ granted, canAskAgain, status: granted ? 'granted' : 'denied', expires: 'never' }) as ImagePicker.CameraPermissionResponse;
  const avatar = () => screen.getByTestId('avatar');

  test('el botón de cámara abre las opciones; sin foto no ofrece quitarla', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.press(screen.getByLabelText('Subir foto'));

    expect(screen.getByText('Tomar foto')).toBeOnTheScreen();
    expect(screen.getByText('Elegir de la galería')).toBeOnTheScreen();
    expect(screen.queryByText('Quitar foto')).not.toBeOnTheScreen();
  });

  test('al elegir de la galería, la foto preparada reemplaza las iniciales y se guarda en el borrador', async () => {
    selector.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [FOTO] });
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.press(screen.getByLabelText('Subir foto'));
    await user.press(screen.getByText('Elegir de la galería'));

    await waitFor(() => expect(avatar()).toHaveTextContent('foto file:///cache/lista.jpg'));
    expect(screen.queryByTestId('hoja')).not.toBeOnTheScreen();
    expect(useBorradorOnboarding.getState().foto).toBe('file:///cache/lista.jpg');
  });

  test('una imagen no permitida avisa debajo del avatar y no la usa', async () => {
    selector.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ ...FOTO, mimeType: 'image/gif' }] });
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.press(screen.getByLabelText('Subir foto'));
    await user.press(screen.getByText('Elegir de la galería'));

    expect(await screen.findByText('Elige una foto en JPG, PNG, WEBP o HEIC.')).toBeOnTheScreen();
    expect(useBorradorOnboarding.getState().foto).toBeNull();
  });

  test('con foto, "Quitar foto" vuelve a las iniciales', async () => {
    useBorradorOnboarding.getState().guardarFoto('file:///cache/lista.jpg');
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.press(screen.getByLabelText('Cambiar foto'));
    await user.press(screen.getByText('Quitar foto'));

    expect(useBorradorOnboarding.getState().foto).toBeNull();
    expect(avatar()).not.toHaveTextContent(/foto/);
  });

  test('"Tomar foto" sin permiso explica para qué es antes del aviso del sistema', async () => {
    selector.getCameraPermissionsAsync.mockResolvedValue(permiso(false, true));
    selector.requestCameraPermissionsAsync.mockResolvedValue(permiso(true, true));
    selector.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [FOTO] });
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.press(screen.getByLabelText('Subir foto'));
    await user.press(screen.getByText('Tomar foto'));

    // El aviso del sistema todavía no apareció: primero la explicación.
    expect(await screen.findByText('Permitir cámara')).toBeOnTheScreen();
    expect(selector.requestCameraPermissionsAsync).not.toHaveBeenCalled();

    await user.press(screen.getByText('Permitir cámara'));

    await waitFor(() => expect(avatar()).toHaveTextContent('foto file:///cache/lista.jpg'));
    expect(selector.launchCameraAsync).toHaveBeenCalledTimes(1);
  });

  test('"Ahora no" cierra la explicación sin pedir el permiso ni abrir la cámara', async () => {
    selector.getCameraPermissionsAsync.mockResolvedValue(permiso(false, true));
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.press(screen.getByLabelText('Subir foto'));
    await user.press(screen.getByText('Tomar foto'));
    await user.press(await screen.findByText('Ahora no'));

    expect(screen.queryByText('Permitir cámara')).not.toBeOnTheScreen();
    expect(selector.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(selector.launchCameraAsync).not.toHaveBeenCalled();
  });

  test('si la cámara quedó bloqueada, ofrece abrir los Ajustes del teléfono', async () => {
    selector.getCameraPermissionsAsync.mockResolvedValue(permiso(false, false));
    const abrirAjustes = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.press(screen.getByLabelText('Subir foto'));
    await user.press(screen.getByText('Tomar foto'));
    await user.press(await screen.findByText('Abrir Ajustes'));

    expect(abrirAjustes).toHaveBeenCalledTimes(1);
    expect(selector.launchCameraAsync).not.toHaveBeenCalled();
  });

  test('con el permiso ya dado, "Tomar foto" abre la cámara directo', async () => {
    selector.getCameraPermissionsAsync.mockResolvedValue(permiso(true, true));
    selector.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [FOTO] });
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    await user.press(screen.getByLabelText('Subir foto'));
    await user.press(screen.getByText('Tomar foto'));

    await waitFor(() => expect(avatar()).toHaveTextContent('foto file:///cache/lista.jpg'));
    expect(screen.queryByText('Permitir cámara')).not.toBeOnTheScreen();
  });
});
