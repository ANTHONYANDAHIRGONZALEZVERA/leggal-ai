import { View } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';

import { colors, gradients } from '@/theme';

const ANCHO = 140;
const ALTO = 4;
const TRAMO = ANCHO * 0.4;

// @keyframes "load": un tramo de luz recorre la barra de izquierda a derecha.
const recorrer: CSSAnimationKeyframes = {
  from: { transform: [{ translateX: -TRAMO }] },
  to: { transform: [{ translateX: ANCHO }] },
};

// Barra de carga indeterminada del Splash.
export function BarraCarga() {
  const reducido = useReducedMotion();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
      style={{
        width: ANCHO,
        height: ALTO,
        borderRadius: ALTO / 2,
        overflow: 'hidden',
        backgroundColor: colors.splash.pista,
      }}>
      <Animated.View
        style={[
          {
            width: TRAMO,
            height: ALTO,
            borderRadius: ALTO / 2,
            backgroundImage: gradients.carga,
          },
          // Con "reducir movimiento" queda quieta al centro como indicador estático.
          reducido
            ? { transform: [{ translateX: (ANCHO - TRAMO) / 2 }] }
            : {
                animationName: recorrer,
                animationDuration: 1600,
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-in-out',
              },
        ]}
      />
    </View>
  );
}
