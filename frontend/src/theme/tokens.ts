import { Easing } from 'react-native-reanimated';

// Escala de espacios en la cuadrícula de 4 pt. El diseño usa 24 como margen
// lateral de pantalla y 12/14 entre campos; se toma el paso más cercano.
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const MARGEN_PANTALLA = spacing.xl;

export const radius = {
  casilla: 8,
  icono: 12,
  logo: 14,
  campo: 16,
  boton: 18,
  tarjeta: 20,
  completo: 999,
} as const;

export const sizes = {
  campo: 52,
  boton: 56,
  botonPequeno: 44,
  chip: 38,
  tactilMinimo: 44,
} as const;

// boxShadow en formato CSS (RN 0.76+), nunca shadow*/elevation.
export const shadows = {
  tarjeta: '0px 10px 26px -20px rgba(60, 40, 140, 0.6)',
  foco: '0px 0px 0px 4px rgba(124, 92, 255, 0.15)',
  seleccion: '0px 0px 0px 4px rgba(91, 61, 245, 0.14)',
} as const;

export const motion = {
  presion: 120,
  estado: 180,
  entrada: 250,
  // Curvas del skill de animación: nunca ease-in en interfaz.
  easeOut: Easing.bezier(0.23, 1, 0.32, 1),
  easeInOut: Easing.bezier(0.77, 0, 0.175, 1),
} as const;
