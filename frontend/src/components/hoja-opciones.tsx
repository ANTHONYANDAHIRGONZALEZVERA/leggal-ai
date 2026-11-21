import { BottomSheet, Button, Column } from '@expo/ui';

export type Opcion = { titulo: string; onPress: () => void };

type Props = {
  visible: boolean;
  opciones: Opcion[];
  onCerrar: () => void;
};

// Hoja nativa que sube desde abajo con una lista de acciones: SwiftUI en iOS y
// Material 3 en Android (@expo/ui). La usa la foto de perfil (Tomar foto,
// Elegir de la galería, Quitar foto).
export function HojaOpciones({ visible, opciones, onCerrar }: Props) {
  return (
    // BottomSheet trae su propio Host de @expo/ui: no hace falta envolverlo.
    <BottomSheet isPresented={visible} onDismiss={onCerrar} contentPadding={{ bottom: 24 }}>
      <Column>
        {opciones.map(({ titulo, onPress }) => (
          <Button key={titulo} label={titulo} variant="text" onPress={onPress} />
        ))}
      </Column>
    </BottomSheet>
  );
}
