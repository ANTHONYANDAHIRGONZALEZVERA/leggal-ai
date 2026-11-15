import { View } from 'react-native';
import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';

import { colors, gradients } from '@/theme';

const ANCHO = 140;
const ALTO = 4;

// Llenado de izquierda a derecha. Se anima scaleX (transformación, en el hilo
// de UI) en lugar de width, para que sea fluido aunque la app esté ocupada.
const llenar: CSSAnimationKeyframes = {
  from: { transform: [{ scaleX: 0 }] },
  to: { transform: [{ scaleX: 1 }] },
};

type Props = {
  /** Empieza a llenarse cuando pasa a true. */
  activa: boolean;
  /** Tiempo del llenado completo, en ms. */
  duracion: number;
};

// Barra de carga del Splash: la pista se ve vacía desde el inicio y al
// activarse se llena una sola vez. Es información del estado (cuánto falta),
// por eso se mantiene aunque el sistema pida reducir movimiento.
export function BarraCarga({ activa, duracion }: Props) {
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
          style={{
            flex: 1,
            borderRadius: ALTO / 2,
            backgroundImage: gradients.carga,
            transformOrigin: 'left',
            animationName: llenar,
            animationDuration: duracion,
            animationFillMode: 'forwards',
            // Arranca rápido y frena al final, como una carga real que termina.
            animationTimingFunction: 'cubic-bezier(0.33, 0, 0.2, 1)',
          }}
        />
      )}
    </View>
  );
}
