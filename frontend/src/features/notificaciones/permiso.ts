import {
  AndroidImportance,
  getPermissionsAsync,
  IosAuthorizationStatus,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  type NotificationPermissionsStatus,
} from 'expo-notifications';
import { Platform } from 'react-native';

// Permiso de notificaciones (onboarding 5/5). Pedirlo funciona en Expo Go; los
// avisos push desde el servidor necesitan la build de EAS y el endpoint del
// backend (docs/api/notificaciones-propuesta.md).

/** Estado del permiso: ya dado, se puede pedir, o solo desde Ajustes. */
export type PermisoNotificaciones = 'concedido' | 'preguntar' | 'bloqueado';

/** Canal de Android para los avisos de la app. */
export const CANAL_AVISOS = 'avisos';

function aPermiso({ granted, canAskAgain, ios }: NotificationPermissionsStatus): PermisoNotificaciones {
  // En iOS, "provisional" también deja enviar avisos (llegan en silencio).
  const provisional = ios?.status === IosAuthorizationStatus.PROVISIONAL;
  if (granted || provisional) return 'concedido';
  return canAskAgain ? 'preguntar' : 'bloqueado';
}

/** Consulta el permiso sin mostrar nada. */
export async function consultarPermisoNotificaciones(): Promise<PermisoNotificaciones> {
  return aPermiso(await getPermissionsAsync());
}

/**
 * Muestra el aviso del sistema. En Android 13+ el aviso solo aparece si la app
 * ya tiene un canal de notificaciones, así que se crea antes.
 */
export async function pedirPermisoNotificaciones(): Promise<PermisoNotificaciones> {
  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(CANAL_AVISOS, {
      name: 'Avisos',
      importance: AndroidImportance.HIGH,
    });
  }
  return aPermiso(
    await requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } }),
  );
}
