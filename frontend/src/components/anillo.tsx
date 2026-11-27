import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';

// Bandas del anillo cromado, copiadas del radial-gradient(closest-side, …) del diseño.
const tonos = {
  oscuro: 'radial-gradient(closest-side, transparent 52%, #5c5590 56%, #d9d4ef 63%, #4a4478 74%, #8f88bd 79%, transparent 81%)',
  claro: 'radial-gradient(closest-side, transparent 52%, #cfc9e6 56%, #ffffff 63%, #a49dc6 74%, #efecf9 79%, transparent 81%)',
} as const;

// @keyframes "drift2": se endereza un poco y se desplaza mientras flota.
const flotacion: CSSAnimationKeyframes = {
  '0%': { transform: [{ rotate: '-20deg' }, { translateX: 0 }, { translateY: 0 }] },
  '50%': { transform: [{ rotate: '-6deg' }, { translateX: 16 }, { translateY: -10 }] },
  '100%': { transform: [{ rotate: '-20deg' }, { translateX: 0 }, { translateY: 0 }] },
};

type Props = {
  ancho: number;
  alto: number;
  tono?: keyof typeof tonos;
  /** Detiene la animación donde va (pantalla que no está a la vista). */
  pausada?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Anillo cromado inclinado que acompaña a la esfera en Splash y Login. Es un
// degradado radial nativo: no necesita Skia.
export function Anillo({ ancho, alto, tono = 'claro', pausada, style }: Props) {
  const reducido = useReducedMotion();

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: ancho,
          height: alto,
          borderRadius: alto,
          backgroundImage: tonos[tono],
          opacity: 0.9,
          transform: [{ rotate: '-20deg' }],
        },
        style,
        !reducido && {
          animationName: flotacion,
          animationDuration: 11000,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
          animationPlayState: pausada ? 'paused' : 'running',
        },
      ]}
    />
  );
}
