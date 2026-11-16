import { View } from 'react-native';
import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';

import { colors, gradients, motion } from '@/theme';

const ANCHO = 140;
const ALTO = 4;

// Llenado de izquierda a derecha animando el ancho. Es seguro para el
// rendimiento porque el relleno es absoluto y sin hijos: no obliga a
// recalcular nada más de la pantalla.
const llenar: CSSAnimationKeyframes = {
  from: { width: 0 },
  to: { width: ANCHO },
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
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 0,
            borderRadius: ALTO / 2,
            backgroundImage: gradients.carga,
            animationName: llenar,
            animationDuration: duracion,
            animationFillMode: 'forwards',
            // Arranca rápido y frena al final, como una carga real que termina.
            animationTimingFunction: motion.curvaCarga,
          }}
        />
      )}
    </View>
  );
}
