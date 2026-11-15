import { View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { colors, fontFamily, gradients, spacing } from '@/theme';

import { Texto } from './texto';

type Props = {
  actual: number;
  total: number;
};

const ALTO = 5;

const rellenar = {
  from: { transform: [{ scaleX: 0 }] },
  to: { transform: [{ scaleX: 1 }] },
};

// Barra "2/5" del onboarding. Los pasos hechos están llenos y el actual se
// llena una vez al entrar (explica en qué paso estás); con "reducir
// movimiento" aparece ya lleno.
export function BarraPasos({ actual, total }: Props) {
  const reducido = useReducedMotion();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Paso ${actual} de ${total}`}
      accessibilityValue={{ min: 0, max: total, now: actual }}
      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => {
        const paso = i + 1;
        return (
          <View
            key={paso}
            style={{ flex: 1, height: ALTO, borderRadius: ALTO / 2, backgroundColor: colors.borde, overflow: 'hidden' }}>
            {paso <= actual && (
              <Animated.View
                style={[
                  { flex: 1, borderRadius: ALTO / 2, backgroundImage: gradients.progreso, transformOrigin: 'left' },
                  paso === actual &&
                    !reducido && {
                      animationName: rellenar,
                      animationDuration: 1100,
                      animationTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                    },
                ]}
              />
            )}
          </View>
        );
      })}
      <Texto variante="nota" style={{ marginLeft: spacing.xs, fontFamily: fontFamily.bold }}>
        {actual}/{total}
      </Texto>
    </View>
  );
}
