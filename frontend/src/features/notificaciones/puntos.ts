import type { PuntoPermiso } from '@/components/pantalla-permiso';
import { colors } from '@/theme';

/** Para qué son las notificaciones, en la pantalla antes del aviso del sistema (diseño PermisoSistema). */
export const PUNTOS_NOTIFICACIONES: PuntoPermiso[] = [
  { icono: 'reloj', texto: 'Plazos y audiencias antes de que venzan', fondo: '#ECE7FF', color: colors.acento },
  { icono: 'check', texto: 'Cuando te aprueben en tu empresa', fondo: '#DDF4F6', color: colors.verdeAzuladoOscuro },
  { icono: 'escudo', texto: 'Puedes desactivarlas en Ajustes', fondo: '#FFF1DC', color: '#A15C00' },
];
