import { View } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';

import { colors, radius, sizes, spacing } from '@/theme';

// Anchos distintos, como los de @usuarios reales, para que no parezca una rejilla.
const ANCHOS = [112, 92, 128];

// Late suave mientras carga: solo opacidad, que no recalcula la pantalla.
const latir: CSSAnimationKeyframes = {
  from: { opacity: 1 },
  to: { opacity: 0.4 },
};

type Props = {
  /** Lo que lee el lector de pantalla mientras carga. */
  etiqueta: string;
};

// Carga esqueleto de una fila de chips: ocupa el lugar de las sugerencias
// mientras llegan, para que se sepa que vienen. Con "reducir movimiento" queda
// quieto.
export function EsqueletoChips({ etiqueta }: Props) {
  const reducido = useReducedMotion();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityState={{ busy: true }}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      {ANCHOS.map((ancho, i) => (
        <Animated.View
          key={ancho}
          style={{
            width: ancho,
            height: sizes.chip,
            borderRadius: radius.completo,
            backgroundColor: colors.borde,
            opacity: reducido ? 0.7 : 1,
            ...(!reducido && {
              animationName: latir,
              animationDuration: 800,
              animationDelay: i * 120,
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              animationTimingFunction: 'ease-in-out',
            }),
          }}
        />
      ))}
    </View>
  );
}
