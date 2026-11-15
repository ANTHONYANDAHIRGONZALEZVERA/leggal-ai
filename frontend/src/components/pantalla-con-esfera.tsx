import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gradients } from '@/theme';

import { Esfera } from './esfera';

type Posicion = { ancho: number; alto: number; top: number; left?: number; right?: number };

type Props = {
  tono?: 'claro' | 'oscuro';
  /** Dónde va la esfera decorativa; sin ella es solo el fondo del diseño. */
  esfera?: Posicion;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Contenedor de las pantallas de acceso y onboarding: fondo lavanda con brillo
// arriba (u oscuro en el Splash), la esfera detrás del contenido y los márgenes
// seguros del teléfono ya aplicados.
export function PantallaConEsfera({ tono = 'claro', esfera, children, style }: Props) {
  const { top, bottom } = useSafeAreaInsets();
  const oscuro = tono === 'oscuro';

  return (
    <View
      style={[
        {
          flex: 1,
          overflow: 'hidden',
          paddingTop: top,
          paddingBottom: bottom,
          backgroundColor: oscuro ? colors.splash.fondo : colors.fondo,
          backgroundImage: oscuro ? gradients.fondoOscuro : gradients.fondoClaro,
        },
        style,
      ]}>
      {esfera && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: esfera.top, left: esfera.left, right: esfera.right }}>
          <Esfera ancho={esfera.ancho} alto={esfera.alto} tono={tono} />
        </View>
      )}
      {children}
    </View>
  );
}
