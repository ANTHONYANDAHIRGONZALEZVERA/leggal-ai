import { StyleSheet, Text, View } from 'react-native';

type Props = {
  titulo: string;
  tarea: string;
};

// Marcador mientras se construye cada pantalla real. Se reemplaza en la tarea
// indicada; cuando ya no quede ninguna pantalla usándolo, se borra este archivo.
export function PantallaTemporal({ titulo, tarea }: Props) {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.tarea}>Pendiente: {tarea}</Text>
    </View>
  );
}

// Colores fijos a propósito: el tema con los tokens del diseño llega en F05.
const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    backgroundColor: '#F4F1FA',
  },
  titulo: { fontSize: 22, fontWeight: '700', color: '#17142E', textAlign: 'center' },
  tarea: { fontSize: 14, color: '#5E5A78' },
});
