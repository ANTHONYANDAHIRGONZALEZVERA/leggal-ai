import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';

import { motion } from '@/theme';

type Props = {
  /** Retraso en ms para escalonar bloques, como en el diseño (0, 100, 200…). */
  retraso?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// @keyframes "rise" del diseño: sube un poco y aparece.
const subir: CSSAnimationKeyframes = {
  from: { opacity: 0, transform: [{ translateY: 16 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
};

// Entrada al montar la pantalla. Usa animación CSS y no `entering`: en Android
// la animación de layout a veces no arrancaba al llegar desde el Splash y el
// bloque quedaba invisible. Con "reducir movimiento" se muestra directo.
export function Aparecer({ retraso = 0, children, style }: Props) {
  const reducido = useReducedMotion();
  return (
    <Animated.View
      style={[
        style,
        !reducido && {
          animationName: subir,
          animationDuration: motion.lento,
          animationDelay: retraso,
          animationFillMode: 'both',
          animationTimingFunction: motion.curvaEntrada,
        },
      ]}>
      {children}
    </Animated.View>
  );
}
