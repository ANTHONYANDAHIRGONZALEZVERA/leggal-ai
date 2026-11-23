import { View } from 'react-native';

import { colors, fontFamily } from '@/theme';

import { Icono, type NombreIcono } from './icono';
import { Presionable } from './presionable';
import { Texto } from './texto';

type Props = {
  titulo: string;
  icono: NombreIcono;
  /** Fondo del cuadrito del ícono y color del trazo. */
  fondo: string;
  color: string;
  seleccionada: boolean;
  onPress: () => void;
};

// Tarjeta de "Tu rol" (onboarding 2/5): ícono en un cuadrito de color y el
// título. Al elegirla, borde morado con halo suave. Se elige una sola: radio.
export function TarjetaOpcion({ titulo, icono, fondo, color, seleccionada, onPress }: Props) {
  return (
    <Presionable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: seleccionada }}
      accessibilityLabel={titulo}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minHeight: 56,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 16,
        borderCurve: 'continuous',
        borderWidth: 1.5,
        borderColor: seleccionada ? colors.acento : colors.superficie,
        backgroundColor: seleccionada ? colors.superficie : colors.superficieVidrio,
        boxShadow: seleccionada ? '0 0 0 4px rgba(91,61,245,0.14)' : undefined,
      }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: fondo, alignItems: 'center', justifyContent: 'center' }}>
        <Icono nombre={icono} tamano={18} color={color} />
      </View>
      <Texto variante="cuerpo" style={{ flex: 1, fontSize: 13, fontFamily: fontFamily.bold }}>
        {titulo}
      </Texto>
    </Presionable>
  );
}
