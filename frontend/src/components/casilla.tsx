import type { ReactNode } from 'react';
import { View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { Icono } from './icono';
import { Presionable } from './presionable';

type Props = {
  marcada: boolean;
  onCambiar: (marcada: boolean) => void;
  /** Texto a la derecha; puede llevar enlaces anidados. */
  children: ReactNode;
  /** Lo que lee el lector de pantalla para la casilla. */
  accessibilityLabel: string;
  error?: boolean;
};

const LADO = 24;

// Casilla del diseño (Registro): cuadro de 24 con esquinas de 8, morada con
// check blanco al marcarla. Toda la fila es tocable para no exigir precisión.
export function Casilla({ marcada, onCambiar, children, accessibilityLabel, error }: Props) {
  return (
    <Presionable
      accessibilityRole="checkbox"
      aria-checked={marcada}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onCambiar(!marcada)}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm - 2 }}>
      <View
        style={{
          width: LADO,
          height: LADO,
          borderRadius: radius.casilla,
          borderCurve: 'continuous',
          borderWidth: 1.5,
          borderColor: error ? colors.error : marcada ? colors.acento : colors.bordeFuerte,
          backgroundColor: marcada ? colors.acento : colors.superficie,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {marcada && <Icono nombre="check" tamano={14} color={colors.sobreOscuro} />}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Presionable>
  );
}
