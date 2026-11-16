import { Text, type TextProps } from 'react-native';

import { type } from '@/theme';

export type VarianteTexto = keyof typeof type;

// Todo texto de la app pasa por aquí: las pantallas eligen una variante del
// tema y nunca escriben fontSize ni fontFamily a mano.
export function Texto({ variante = 'cuerpo', style, ...props }: TextProps & { variante?: VarianteTexto }) {
  return <Text style={[type[variante], style]} {...props} />;
}
