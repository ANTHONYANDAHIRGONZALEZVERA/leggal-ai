import type { TextStyle } from 'react-native';

import { colors } from './colors';

// Nombres con los que se registran las fuentes en useFonts (ver fonts.ts).
// Se usa una familia por peso: con archivos estáticos, fontWeight haría que
// iOS sintetice el peso o caiga a la fuente del sistema.
export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
} as const;

// El diseño usa letter-spacing -0.03em en los títulos: en RN va en puntos.
const ajusteTitulo = (tamano: number) => tamano * -0.03;

export const type = {
  titulo: {
    fontFamily: fontFamily.extrabold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: ajusteTitulo(32),
    color: colors.texto,
  },
  tituloPaso: {
    fontFamily: fontFamily.extrabold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: ajusteTitulo(28),
    color: colors.texto,
  },
  marca: {
    fontFamily: fontFamily.extrabold,
    fontSize: 34,
    letterSpacing: ajusteTitulo(34),
    color: colors.sobreOscuro,
  },
  subtitulo: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20, color: colors.textoSecundario },
  cuerpo: { fontFamily: fontFamily.medium, fontSize: 15, color: colors.texto },
  etiqueta: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.etiqueta },
  boton: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.texto },
  botonPequeno: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.texto },
  chip: { fontFamily: fontFamily.semibold, fontSize: 13, color: colors.etiqueta },
  enlace: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.acento },
  nota: { fontFamily: fontFamily.semibold, fontSize: 12, color: colors.textoSecundario },
  seccion: {
    fontFamily: fontFamily.extrabold,
    fontSize: 12,
    letterSpacing: 0.72,
    textTransform: 'uppercase',
    color: colors.textoSecundario,
  },
} as const satisfies Record<string, TextStyle>;

// La palabra destacada en serif cursiva es ~6 pt más grande que el título
// que la acompaña (32 → 38, 28 → 34, 34 → 40), siempre en color de acento.
export const destacado = {
  fontFamily: fontFamily.serifItalic,
  letterSpacing: 0,
  color: colors.acento,
} as const satisfies TextStyle;

export const AUMENTO_DESTACADO = 6;
