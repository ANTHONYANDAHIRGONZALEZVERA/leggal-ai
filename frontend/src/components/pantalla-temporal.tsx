import { View } from 'react-native';

import { colors, MARGEN_PANTALLA, spacing } from '@/theme';

import { Texto } from './texto';

type Props = {
  titulo: string;
  tarea: string;
};

// Marcador mientras se construye cada pantalla real. Se reemplaza en la tarea
// indicada; cuando ya no quede ninguna pantalla usándolo, se borra este archivo.
export function PantallaTemporal({ titulo, tarea }: Props) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        padding: MARGEN_PANTALLA,
        backgroundColor: colors.fondo,
      }}>
      <Texto variante="tituloPaso" style={{ textAlign: 'center' }}>
        {titulo}
      </Texto>
      <Texto variante="subtitulo">Pendiente: {tarea}</Texto>
    </View>
  );
}
