import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gradients } from '@/theme';

type Props = {
  tono?: 'claro' | 'oscuro';
  /**
   * Fondo decorativo (esferas, anillo, ondas) con posición absoluta. Va detrás
   * del contenido y no recibe toques.
   */
  decoracion?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Contenedor de las pantallas de acceso y onboarding: fondo lavanda con brillo
// arriba (u oscuro en el Splash), la decoración detrás del contenido y los
// márgenes seguros del teléfono ya aplicados.
export function PantallaConEsfera({ tono = 'claro', decoracion, children, style }: Props) {
  const { top, bottom } = useSafeAreaInsets();
  const oscuro = tono === 'oscuro';

  return (
    <View
      style={{
        flex: 1,
        overflow: 'hidden',
        backgroundColor: oscuro ? colors.splash.fondo : colors.fondo,
        backgroundImage: oscuro ? gradients.fondoOscuro : gradients.fondoClaro,
      }}>
      {decoracion && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {decoracion}
        </View>
      )}
      <View style={[{ flex: 1, paddingTop: top, paddingBottom: bottom }, style]}>{children}</View>
    </View>
  );
}
