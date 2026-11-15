import { useId, useState, type Ref } from 'react';
import { TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { colors, fontFamily, radius, shadows, sizes, spacing } from '@/theme';

import { Texto } from './texto';

type Props = Omit<TextInputProps, 'style'> & {
  etiqueta: string;
  error?: string;
  /** Para pasar el foco al siguiente campo con la tecla "siguiente". */
  ref?: Ref<TextInputInstance>;
};

// Campo con etiqueta arriba, como en Login y Registro. Al enfocarlo el borde
// pasa a morado con un halo suave; con error, borde y mensaje en rojo.
export function CampoTexto({ etiqueta, error, onFocus, onBlur, ref, ...props }: Props) {
  const [enfocado, setEnfocado] = useState(false);
  const id = useId();

  const colorBorde = error ? colors.error : enfocado ? colors.acentoClaro : colors.borde;

  return (
    <View style={{ gap: 6 }}>
      <Texto variante="etiqueta" nativeID={id}>
        {etiqueta}
      </Texto>
      <TextInput
        ref={ref}
        accessibilityLabelledBy={id}
        accessibilityLabel={etiqueta}
        placeholderTextColor={colors.textoSecundario}
        cursorColor={colors.acento}
        selectionColor={colors.acentoClaro}
        onFocus={(e) => {
          setEnfocado(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setEnfocado(false);
          onBlur?.(e);
        }}
        style={{
          height: sizes.campo,
          paddingHorizontal: spacing.md,
          borderRadius: radius.campo,
          borderCurve: 'continuous',
          borderWidth: 1.5,
          borderColor: colorBorde,
          backgroundColor: colors.superficie,
          boxShadow: enfocado && !error ? shadows.foco : undefined,
          fontFamily: fontFamily.medium,
          fontSize: 15,
          color: colors.texto,
        }}
        {...props}
      />
      {error && (
        <Texto variante="nota" style={{ color: colors.error }} accessibilityLiveRegion="polite">
          {error}
        </Texto>
      )}
    </View>
  );
}
