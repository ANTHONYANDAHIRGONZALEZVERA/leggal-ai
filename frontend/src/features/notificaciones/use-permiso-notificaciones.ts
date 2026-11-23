import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Linking } from 'react-native';

import { consultarPermisoNotificaciones, pedirPermisoNotificaciones } from './permiso';

export const clavePermisoNotificaciones = ['permiso-notificaciones'] as const;

/**
 * Estado del permiso de notificaciones, al día: se revisa al abrir la pantalla
 * y cada vez que la app vuelve al frente (por si lo cambió en Ajustes).
 * `activar` muestra el aviso del sistema o, si quedó bloqueado, abre Ajustes.
 * Si el sistema falla, el estado queda sin saber (`undefined`) y no se insiste.
 */
export function usePermisoNotificaciones() {
  const clienteConsultas = useQueryClient();
  const { data: estado, refetch } = useQuery({
    queryKey: clavePermisoNotificaciones,
    queryFn: consultarPermisoNotificaciones,
    retry: false,
  });

  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (ahora) => {
      if (ahora === 'active') void refetch();
    });
    return () => suscripcion.remove();
  }, [refetch]);

  async function activar() {
    try {
      if (estado === 'bloqueado') await Linking.openSettings();
      else clienteConsultas.setQueryData(clavePermisoNotificaciones, await pedirPermisoNotificaciones());
    } catch {
      // Falla del sistema: se queda como estaba; el onboarding sigue.
    }
  }

  return { estado, activar };
}
