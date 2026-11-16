import { colors, radius, sizes, spacing } from '@/theme';

import { Presionable } from './presionable';
import { Texto } from './texto';

type Props = {
  texto: string;
  seleccionado: boolean;
  onPress: () => void;
};

// Píldora seleccionable del onboarding: blanca con borde lavanda y, al
// elegirla, morada con texto blanco. El cambio de color tiene transición corta.
export function Chip({ texto, seleccionado, onPress }: Props) {
  return (
    <Presionable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: seleccionado }}
      hitSlop={(sizes.tactilMinimo - sizes.chip) / 2}
      style={{
        height: sizes.chip,
        paddingHorizontal: spacing.sm,
        justifyContent: 'center',
        borderRadius: radius.completo,
        borderWidth: 1.5,
        borderColor: seleccionado ? colors.acento : colors.borde,
        backgroundColor: seleccionado ? colors.acento : colors.superficie,
      }}>
      <Texto variante="chip" style={{ color: seleccionado ? colors.sobreOscuro : colors.etiqueta }}>
        {texto}
      </Texto>
    </Presionable>
  );
}
