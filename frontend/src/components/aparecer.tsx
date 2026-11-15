import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { motion } from '@/theme';

type Props = {
  /** Retraso en ms para escalonar bloques, como en el diseño (0, 100, 200…). */
  retraso?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Entrada "rise" del diseño: sube un poco y aparece al montar la pantalla.
// Reanimated omite el desplazamiento si el sistema pide reducir movimiento.
export function Aparecer({ retraso = 0, children, style }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(motion.lento).delay(retraso).easing(motion.easeOut)}
      style={style}>
      {children}
    </Animated.View>
  );
}
