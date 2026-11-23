import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { CANAL_AVISOS, consultarPermisoNotificaciones, pedirPermisoNotificaciones } from '../permiso';

// Permiso de notificaciones (5/5). El módulo del sistema se reemplaza por un doble.
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 5 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}));

const sistema = jest.mocked(Notifications);
const respuesta = (granted: boolean, canAskAgain: boolean, ios?: { status: number }) =>
  ({ granted, canAskAgain, status: granted ? 'granted' : 'denied', expires: 'never', ios }) as never;

beforeEach(() => jest.clearAllMocks());

describe('permiso de notificaciones', () => {
  test.each([
    ['dado', respuesta(true, true), 'concedido'],
    ['provisional de iOS (avisos silenciosos)', respuesta(false, true, { status: 3 }), 'concedido'],
    ['negado pero se puede pedir', respuesta(false, true), 'preguntar'],
    ['negado para siempre', respuesta(false, false), 'bloqueado'],
  ])('%s → %s', async (_caso, estado, esperado) => {
    sistema.getPermissionsAsync.mockResolvedValue(estado);
    sistema.requestPermissionsAsync.mockResolvedValue(estado);

    await expect(consultarPermisoNotificaciones()).resolves.toBe(esperado);
    await expect(pedirPermisoNotificaciones()).resolves.toBe(esperado);
  });

  test('en Android crea el canal de avisos antes de pedir el permiso (Android 13+ lo necesita)', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const orden: string[] = [];
    sistema.setNotificationChannelAsync.mockImplementation(async () => (orden.push('canal'), null));
    sistema.requestPermissionsAsync.mockImplementation(async () => (orden.push('permiso'), respuesta(true, true)));

    await pedirPermisoNotificaciones();

    expect(orden).toEqual(['canal', 'permiso']);
    expect(sistema.setNotificationChannelAsync).toHaveBeenCalledWith(CANAL_AVISOS, expect.objectContaining({ name: 'Avisos' }));
  });

  test('en iOS no crea canales y pide alertas, globo y sonido', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    sistema.requestPermissionsAsync.mockResolvedValue(respuesta(true, true));

    await pedirPermisoNotificaciones();

    expect(sistema.setNotificationChannelAsync).not.toHaveBeenCalled();
    expect(sistema.requestPermissionsAsync).toHaveBeenCalledWith({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
  });
});
