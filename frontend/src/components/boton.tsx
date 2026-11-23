import { ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';

import { colors, gradients, radius, shadows, sizes, spacing, type } from '@/theme';

import { Icono, type NombreIcono } from './icono';
import { Presionable } from './presionable';
import { Texto } from './texto';

// Cada variante es un botón concreto del diseño. Si una pantalla necesita
// cambiar colores, falta una variante aquí; no se sobreescribe desde fuera.
const variantes = {
  // "Iniciar sesión", "Crear cuenta": botón principal azul marino.
  oscuro: {
    contenedor: { height: sizes.boton, borderRadius: radius.boton, backgroundColor: colors.texto },
    texto: colors.sobreOscuro,
    tipo: 'boton',
  },
  // "Continuar" del onboarding y acciones de IA: degradado morado.
  morado: {
    contenedor: { height: sizes.boton, borderRadius: radius.boton, backgroundImage: gradients.botonMorado },
    texto: colors.sobreOscuro,
    tipo: 'boton',
  },
  // Acceso con Google: blanco con borde lavanda y el logo a color.
  google: {
    contenedor: {
      height: sizes.campo,
      borderRadius: radius.campo,
      backgroundColor: colors.superficie,
      borderWidth: 1.5,
      borderColor: colors.borde,
    },
    texto: colors.texto,
    tipo: 'botonPequeno',
  },
  // "Comenzar" del Splash: cápsula translúcida sobre fondo oscuro.
  vidrio: {
    contenedor: {
      height: sizes.botonPequeno,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.completo,
      backgroundColor: colors.splash.vidrio,
      borderWidth: 1,
      borderColor: colors.splash.bordeVidrio,
      boxShadow: shadows.flotante,
    },
    texto: colors.sobreOscuro,
    tipo: 'botonPequeno',
  },
  // "Ahora no" de la pantalla de permiso: solo texto, sin fondo.
  texto: {
    contenedor: { height: sizes.botonPequeno, borderRadius: radius.boton },
    texto: colors.texto,
    tipo: 'botonPequeno',
  },
  // "Cancelar solicitud": solo texto, en rojo (acción que deshace algo).
  textoPeligro: {
    contenedor: { height: sizes.botonPequeno, borderRadius: radius.boton },
    texto: '#B4232A',
    tipo: 'botonPequeno',
  },
} as const satisfies Record<string, { contenedor: ViewStyle; texto: string; tipo: keyof typeof type }>;

type Props = {
  titulo: string;
  variante?: keyof typeof variantes;
  icono?: NombreIcono;
  cargando?: boolean;
  deshabilitado?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Boton({ titulo, variante = 'oscuro', icono, cargando, deshabilitado, onPress, style }: Props) {
  const v = variantes[variante];
  // El de Google siempre lleva su logo a la izquierda; el resto, ícono opcional a la derecha.
  const iconoIzquierda = variante === 'google' ? 'google' : undefined;

  return (
    <Presionable
      onPress={onPress}
      disabled={deshabilitado || cargando}
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: deshabilitado, busy: cargando }}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
          borderCurve: 'continuous',
        },
        v.contenedor,
        style,
      ]}>
      {cargando ? (
        <ActivityIndicator color={v.texto} />
      ) : (
        <>
          {iconoIzquierda && <Icono nombre={iconoIzquierda} />}
          <Texto variante={v.tipo} style={{ color: v.texto }}>
            {titulo}
          </Texto>
          {icono && <Icono nombre={icono} tamano={18} color={v.texto} />}
        </>
      )}
    </Presionable>
  );
}
