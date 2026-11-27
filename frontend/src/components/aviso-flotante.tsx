import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { colors, fontFamily } from '@/theme';

import { Texto } from './texto';

/** Cuánto se ve el aviso antes de irse solo. */
export const DURACION_AVISO_MS = 2200;

type Props = {
  /** Texto del aviso; null lo oculta. */
  mensaje: string | null;
  /** Se llama cuando pasa su tiempo, para que la pantalla lo quite. */
  onTerminar: () => void;
};

// Aviso breve que flota sobre la pantalla y se va solo (por ejemplo,
// "Próximamente"). Aparece subiendo un poco y se desvanece; con "reducir
// movimiento" Reanimated deja solo el desvanecido. El lector de pantalla lo lee.
export function AvisoFlotante({ mensaje, onTerminar }: Props) {
  useEffect(() => {
    if (!mensaje) return;
    AccessibilityInfo.announceForAccessibility(mensaje);
    const reloj = setTimeout(onTerminar, DURACION_AVISO_MS);
    return () => clearTimeout(reloj);
  }, [mensaje, onTerminar]);

  if (!mensaje) return null;
  return (
    <Animated.View
      key={mensaje}
      entering={FadeInDown.duration(200)}
      exiting={FadeOut.duration(150)}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 24,
        right: 24,
        bottom: 96,
        alignItems: 'center',
      }}>
      <Texto
        variante="nota"
        style={{
          overflow: 'hidden',
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 999,
          backgroundColor: colors.texto,
          color: colors.sobreOscuro,
          fontFamily: fontFamily.semibold,
          fontSize: 13,
          textAlign: 'center',
        }}>
        {mensaje}
      </Texto>
    </Animated.View>
  );
}
