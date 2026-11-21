import { View } from 'react-native';

import { colors } from '@/theme';

import { Presionable } from './presionable';
import { Texto } from './texto';

type Props<T extends string> = {
  opciones: readonly { valor: T; titulo: string }[];
  valor: T;
  onCambiar: (valor: T) => void;
};

// Pestañas del 4/5 ("Unirme con código" / "Crear empresa"): fondo lavanda y
// la activa en blanco con sombra suave. Cambian al instante, sin deslizar:
// son pares, no niveles, y se tocan seguido.
export function SelectorPestanas<T extends string>({ opciones, valor, onCambiar }: Props<T>) {
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        gap: 4,
        padding: 4,
        borderRadius: 16,
        borderCurve: 'continuous',
        backgroundColor: '#E8E3F5',
      }}>
      {opciones.map((opcion) => {
        const activa = opcion.valor === valor;
        return (
          <Presionable
            key={opcion.valor}
            accessibilityRole="tab"
            accessibilityState={{ selected: activa }}
            onPress={() => onCambiar(opcion.valor)}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 12,
              borderCurve: 'continuous',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: activa ? colors.superficie : 'transparent',
              boxShadow: activa ? '0 6px 16px -10px rgba(60,40,140,0.6)' : undefined,
            }}>
            <Texto variante="botonPequeno" style={{ color: activa ? colors.texto : colors.textoSecundario }}>
              {opcion.titulo}
            </Texto>
          </Presionable>
        );
      })}
    </View>
  );
}
