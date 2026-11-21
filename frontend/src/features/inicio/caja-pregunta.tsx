import { View } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';

import { Icono } from '@/components/icono';
import { Texto } from '@/components/texto';
import { colors, gradients, sizes } from '@/theme';

// @keyframes "pulse" del diseño: un halo que crece y se apaga alrededor del
// micrófono. Como anillo con scale y opacidad (no box-shadow animado).
const latir: CSSAnimationKeyframes = {
  from: { opacity: 0.45, transform: [{ scale: 1 }] },
  to: { opacity: 0, transform: [{ scale: 1.45 }] },
};

// Caja "Pregunta sobre tus casos…" con el micrófono, como en el diseño. El
// asistente todavía no existe: se ve, pero no recibe texto ni toques.
export function CajaPregunta() {
  const reducido = useReducedMotion();

  return (
    <View
      accessible
      accessibilityLabel="Pregunta sobre tus casos. El asistente estará disponible pronto."
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 60,
        marginHorizontal: 16,
        paddingLeft: 18,
        paddingRight: 8,
        borderRadius: 22,
        borderCurve: 'continuous',
        backgroundColor: colors.superficie,
        boxShadow: '0 14px 34px -16px rgba(60,40,140,0.45)',
      }}>
      <Texto variante="cuerpo" numberOfLines={1} style={{ flex: 1, color: colors.textoSecundario }}>
        Pregunta sobre tus casos…
      </Texto>
      <View style={{ width: sizes.tactilMinimo, height: sizes.tactilMinimo, alignItems: 'center', justifyContent: 'center' }}>
        {!reducido && (
          <Animated.View
            style={{
              position: 'absolute',
              width: sizes.tactilMinimo,
              height: sizes.tactilMinimo,
              borderRadius: sizes.tactilMinimo / 2,
              backgroundColor: 'rgba(91,61,245,0.45)',
              animationName: latir,
              animationDuration: 2600,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-out',
            }}
          />
        )}
        <View
          style={{
            width: sizes.tactilMinimo,
            height: sizes.tactilMinimo,
            borderRadius: sizes.tactilMinimo / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: gradients.botonMorado,
            boxShadow: '0 10px 24px -8px rgba(75,47,224,0.6)',
          }}>
          <Icono nombre="microfono" tamano={20} color={colors.superficie} />
        </View>
      </View>
    </View>
  );
}
