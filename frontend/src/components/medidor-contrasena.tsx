import { View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { medirContrasena } from '@/features/auth/seguridad-contrasena';
import { colors, fontFamily, gradients, motion, spacing } from '@/theme';

import { Texto } from './texto';

const BARRAS = 4;
const ALTO = 5;

// Cuatro barras bajo el campo de contraseña: se llenan (con transición) según
// lo segura que es, y al lado la palabra "Débil", "Regular", "Buena" o "Fuerte".
export function MedidorContrasena({ contrasena }: { contrasena: string }) {
  const reducido = useReducedMotion();
  const { nivel, etiqueta, color } = medirContrasena(contrasena);

  return (
    <View
      accessible
      accessibilityLabel={etiqueta ? `Seguridad de la contraseña: ${etiqueta}` : 'Seguridad de la contraseña'}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: BARRAS }, (_, i) => (
        <View
          key={i}
          style={{ flex: 1, height: ALTO, borderRadius: ALTO / 2, backgroundColor: colors.borde, overflow: 'hidden' }}>
          <Animated.View
            style={{
              height: '100%',
              width: i < nivel ? '100%' : '0%',
              borderRadius: ALTO / 2,
              backgroundImage: gradients.medidor,
              transitionProperty: 'width',
              transitionDuration: reducido ? 0 : motion.lento,
              transitionTimingFunction: motion.curvaEntrada,
            }}
          />
        </View>
      ))}
      {/* Ancho fijo: el texto cambia ("Regular" → "Buena") sin mover las barras. */}
      <Texto
        variante="nota"
        accessibilityLiveRegion="polite"
        style={{ width: 52, marginLeft: spacing.xxs, fontFamily: fontFamily.bold, color, textAlign: 'right' }}>
        {etiqueta}
      </Texto>
    </View>
  );
}
