import { router, type Href } from 'expo-router';

import { colors, sizes } from '@/theme';

import { Icono } from './icono';
import { Presionable } from './presionable';

type Props = {
  /** A dónde ir si no hay pantalla anterior (por ejemplo, al abrir un enlace directo). */
  respaldo: Href;
};

// Círculo blanco translúcido con la flecha "<" de las pantallas de acceso.
export function BotonVolver({ respaldo }: Props) {
  return (
    <Presionable
      accessibilityLabel="Volver"
      onPress={() => (router.canGoBack() ? router.back() : router.replace(respaldo))}
      style={{
        width: sizes.tactilMinimo,
        height: sizes.tactilMinimo,
        borderRadius: sizes.tactilMinimo / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.superficieVidrio,
        borderWidth: 1,
        borderColor: colors.superficie,
      }}>
      <Icono nombre="volver" />
    </Presionable>
  );
}
