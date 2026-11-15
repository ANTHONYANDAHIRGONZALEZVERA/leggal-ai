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

// Barra de carga del Splash. Se ve vacía desde el inicio y el tramo de luz
// solo aparece y recorre la pista mientras está activa.
export function BarraCarga({ activa }: { activa: boolean }) {
  const reducido = useReducedMotion();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
      accessibilityState={{ busy: activa }}
      style={{
        width: ANCHO,
        height: ALTO,
        borderRadius: ALTO / 2,
        overflow: 'hidden',
        backgroundColor: colors.splash.pista,
      }}>
      {activa && (
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
      )}
    </View>
  );
}
