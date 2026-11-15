import { Text, View } from 'react-native';

import { AUMENTO_DESTACADO, colors, destacado, gradients, radius, spacing, type } from '@/theme';

import { Icono } from './icono';

// Marca "Leggal AI": insignia con la balanza en degradado morado-verde y el
// nombre con "AI" en serif cursiva. Va sobre fondo oscuro (Splash).
export function Logo() {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Leggal AI"
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View
        style={{
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.logo,
          borderCurve: 'continuous',
          backgroundImage: gradients.logo,
        }}>
        <Icono nombre="balanza" tamano={24} color={colors.sobreOscuro} />
      </View>
      <Text style={type.marca}>
        Leggal{' '}
        <Text style={[destacado, { fontSize: type.marca.fontSize + AUMENTO_DESTACADO, color: colors.splash.acento }]}>AI</Text>
      </Text>
    </View>
  );
}
