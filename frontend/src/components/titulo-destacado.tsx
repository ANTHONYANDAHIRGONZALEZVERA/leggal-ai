import { Text } from 'react-native';

import { AUMENTO_DESTACADO, destacado as estiloDestacado, type } from '@/theme';

import { Texto } from './texto';

type Props = {
  texto: string;
  destacado: string;
  variante?: 'titulo' | 'tituloPaso';
};

// Título del diseño: "Bienvenido" en negrita + "de nuevo" en serif cursiva
// morada. El texto anidado hereda la línea y queda alineado a la base.
export function TituloDestacado({ texto, destacado, variante = 'titulo' }: Props) {
  const tamano = type[variante].fontSize + AUMENTO_DESTACADO;
  return (
    <Texto variante={variante} accessibilityRole="header">
      {texto} <Text style={[estiloDestacado, { fontSize: tamano }]}>{destacado}</Text>
    </Texto>
  );
}
