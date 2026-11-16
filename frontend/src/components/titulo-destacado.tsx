import { View } from 'react-native';

import { AUMENTO_DESTACADO, destacado as estiloDestacado, type } from '@/theme';

import { Texto } from './texto';

type Props = {
  texto: string;
  destacado: string;
  variante?: 'titulo' | 'tituloPaso';
};

// Título del diseño: "Bienvenido" en negrita + "de nuevo" en serif cursiva
// morada. Van como dos textos alineados por la base: si "de nuevo" quedara
// anidado, en Android heredaría el alto de línea del título (más chico que su
// letra) y se cortaría. El margen derecho evita que la cursiva pierda su final.
export function TituloDestacado({ texto, destacado, variante = 'titulo' }: Props) {
  const tamano = type[variante].fontSize + AUMENTO_DESTACADO;
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${texto} ${destacado}`}
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8 }}>
      <Texto variante={variante}>{texto}</Texto>
      <Texto
        variante={variante}
        style={[estiloDestacado, { fontSize: tamano, lineHeight: Math.round(tamano * 1.2), paddingRight: 4 }]}>
        {destacado}
      </Texto>
    </View>
  );
}
