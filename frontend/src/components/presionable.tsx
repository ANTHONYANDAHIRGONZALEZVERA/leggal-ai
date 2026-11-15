import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { motion } from '@/theme';

const PressableAnimado = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

// Base de todo lo que se toca: reduce a 0.97 al presionar (respuesta al
// apoyar el dedo, no al soltarlo). Es una transición CSS de Reanimated, así
// corre en el hilo de UI y no hace falta un shared value para dos estados.
// El estilo va en el mismo Pressable, para que alignSelf, flex o márgenes que
// pase la pantalla afecten al área táctil real.
export function Presionable({ style, children, onPressIn, onPressOut, disabled, ...props }: Props) {
  const [presionado, setPresionado] = useState(false);

  return (
    <PressableAnimado
      accessibilityRole="button"
      disabled={disabled}
      pressRetentionOffset={16}
      onPressIn={(e) => {
        setPresionado(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPresionado(false);
        onPressOut?.(e);
      }}
      style={[
        style,
        {
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: presionado ? 0.97 : 1 }],
          transitionProperty: 'transform',
          transitionDuration: motion.presion,
          transitionTimingFunction: 'ease-out',
        },
      ]}
      {...props}>
      {children}
    </PressableAnimado>
  );
}
