import type { ReactNode } from 'react';
import { View } from 'react-native';

import { colors, fontFamily } from '@/theme';

import { Icono } from './icono';
import { Presionable } from './presionable';
import { Texto } from './texto';

type Props = {
  titulo: string;
  descripcion: string;
  ilustracion: ReactNode;
  /** Píldoras grises al pie (por ejemplo "Multiempresa", "Roles"). */
  etiquetas?: string[];
  seleccionada: boolean;
  onPress: () => void;
};

// Tarjeta grande del onboarding 3/5: ilustración arriba, título y descripción
// con un círculo de selección a la derecha. Elegida: borde morado, halo y
// sombra, y el círculo lleno con check. Se elige una sola: radio.
export function TarjetaModo({ titulo, descripcion, ilustracion, etiquetas, seleccionada, onPress }: Props) {
  return (
    <Presionable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: seleccionada }}
      accessibilityLabel={titulo}
      accessibilityHint={descripcion}
      style={{
        gap: 12,
        padding: 18,
        borderRadius: 26,
        borderCurve: 'continuous',
        borderWidth: 2,
        borderColor: seleccionada ? colors.acento : colors.superficie,
        backgroundColor: seleccionada ? colors.superficie : colors.superficieVidrio,
        boxShadow: seleccionada ? '0 0 0 5px rgba(91,61,245,0.14), 0 20px 40px -24px rgba(60,40,140,0.7)' : undefined,
      }}>
      {ilustracion}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="cuerpo" style={{ fontSize: 17, fontFamily: fontFamily.extrabold }}>
            {titulo}
          </Texto>
          <Texto variante="subtitulo" style={{ fontSize: 13, lineHeight: 18 }}>
            {descripcion}
          </Texto>
        </View>
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 2,
            borderColor: seleccionada ? colors.acento : '#C9C0EE',
            backgroundColor: seleccionada ? colors.acento : colors.superficie,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {seleccionada && <Icono nombre="check" tamano={14} color={colors.sobreOscuro} />}
        </View>
      </View>

      {etiquetas && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {etiquetas.map((etiqueta) => (
            <View
              key={etiqueta}
              style={{ height: 26, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 999, backgroundColor: colors.fondo }}>
              <Texto variante="nota" style={{ fontFamily: fontFamily.bold, color: colors.etiqueta }}>
                {etiqueta}
              </Texto>
            </View>
          ))}
        </View>
      )}
    </Presionable>
  );
}
