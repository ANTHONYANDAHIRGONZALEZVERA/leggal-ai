import { View, type ViewProps } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

// Contenedor blanco con borde y sombra suave (lista de casos, inicio). Recibe
// children: el contenido lo decide cada pantalla, la tarjeta solo el marco.
export function Tarjeta({ style, ...props }: ViewProps) {
  return (
    <View
      style={[
        {
          gap: spacing.sm,
          padding: 14,
          borderRadius: radius.tarjeta,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.superficie,
          backgroundColor: colors.superficieVidrio,
          boxShadow: shadows.tarjeta,
        },
        style,
      ]}
      {...props}
    />
  );
}
