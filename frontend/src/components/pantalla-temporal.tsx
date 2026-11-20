import { View } from 'react-native';

import { colors, MARGEN_PANTALLA, spacing } from '@/theme';

import { Boton } from './boton';
import { Texto } from './texto';

type Props = {
  titulo: string;
  tarea: string;
  /** Botón para poder seguir recorriendo la app mientras falta la pantalla real. */
  accion?: { titulo: string; onPress: () => void };
};

// Marcador mientras se construye cada pantalla real. Se reemplaza en la tarea
// indicada; cuando ya no quede ninguna pantalla usándolo, se borra este archivo.
export function PantallaTemporal({ titulo, tarea, accion }: Props) {
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
      {accion && (
        <Boton titulo={accion.titulo} onPress={accion.onPress} style={{ alignSelf: 'stretch', marginTop: spacing.xl }} />
      )}
    </View>
  );
}
