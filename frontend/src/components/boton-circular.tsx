import { colors, sizes } from '@/theme';

import { Icono, type NombreIcono } from './icono';
import { Presionable } from './presionable';

type Props = {
  icono: NombreIcono;
  accessibilityLabel: string;
  onPress: () => void;
};

// Círculo blanco translúcido de 44 con un ícono (lupa y campana del Inicio).
export function BotonCircular({ icono, accessibilityLabel, onPress }: Props) {
  return (
    <Presionable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{
        width: sizes.tactilMinimo,
        height: sizes.tactilMinimo,
        borderRadius: sizes.tactilMinimo / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderWidth: 1,
        borderColor: colors.superficie,
      }}>
      <Icono nombre={icono} tamano={20} />
    </Presionable>
  );
}
