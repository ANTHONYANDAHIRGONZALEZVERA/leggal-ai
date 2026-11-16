import { View } from 'react-native';

import { colors, spacing } from '@/theme';

import { Texto } from './texto';

// Línea — texto — línea, como "o con tu correo" en Login y Registro.
export function SeparadorTexto({ texto }: { texto: string }) {
  const linea = <View style={{ flex: 1, height: 1, backgroundColor: colors.separador }} />;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      {linea}
      <Texto variante="nota">{texto}</Texto>
      {linea}
    </View>
  );
}
