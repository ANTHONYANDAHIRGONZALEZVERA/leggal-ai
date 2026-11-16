import { View } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';

import { colors, fontFamily, gradients, motion, spacing } from '@/theme';

import { Texto } from './texto';

type Props = {
  actual: number;
  total: number;
};

const ALTO = 5;

// Relleno absoluto y sin hijos: animar su ancho no recalcula el resto.
const rellenar: CSSAnimationKeyframes = {
  from: { width: '0%' },
  to: { width: '100%' },
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
                  { position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', borderRadius: ALTO / 2, backgroundImage: gradients.progreso },
                  paso === actual &&
                    !reducido && {
                      animationName: rellenar,
                      animationDuration: 1100,
                      animationTimingFunction: motion.curvaEntrada,
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
