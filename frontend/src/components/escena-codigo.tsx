import { View } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';

import { colors } from '@/theme';

import { Esfera } from './esfera';
import { Icono, type NombreIcono } from './icono';
import { Ondas } from './ondas';

// Escena de "Revisa tu correo" y "¿Olvidaste tu contraseña?": la esfera con
// una tarjeta blanca que flota encima (sobre o candado) y, detrás, anillos que
// se expanden (correo) u ondas al pie (contraseña). Todo con transform y
// opacidad, desde que se monta.

const ALTO = 230;

const subirYBajar: CSSAnimationKeyframes = {
  '0%': { transform: [{ translateY: 0 }, { rotate: '-4deg' }] },
  '50%': { transform: [{ translateY: -8 }, { rotate: '3deg' }] },
  '100%': { transform: [{ translateY: 0 }, { rotate: '-4deg' }] },
};
const expandir: CSSAnimationKeyframes = {
  from: { opacity: 0.9, transform: [{ scale: 0.8 }] },
  to: { opacity: 0, transform: [{ scale: 1.5 }] },
};

type Props = {
  icono: NombreIcono;
  /** Color del ícono de la tarjeta. */
  color?: string;
  fondo: 'anillos' | 'ondas';
};

export function EscenaCodigo({ icono, color = colors.acento, fondo }: Props) {
  const reducido = useReducedMotion();

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: ALTO, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {fondo === 'anillos' &&
        !reducido &&
        [0, 1700].map((retraso) => (
          <Animated.View
            key={retraso}
            style={{
              position: 'absolute',
              width: 190,
              height: 190,
              borderRadius: 95,
              borderWidth: 1.5,
              borderColor: 'rgba(124,92,255,0.35)',
              animationName: expandir,
              animationDuration: 3400,
              animationDelay: retraso,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-out',
            }}
          />
        ))}
      {fondo === 'ondas' && <Ondas juego="acceso" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} />}
      <Esfera ancho={165} alto={155} ciclo={9000} style={{ position: 'absolute' }} />
      <Animated.View
        style={[
          {
            width: icono === 'sobre' ? 84 : 72,
            height: icono === 'sobre' ? 62 : 72,
            borderRadius: icono === 'sobre' ? 12 : 22,
            borderCurve: 'continuous',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.superficie,
            boxShadow: '0 14px 30px -12px rgba(60,40,140,0.55)',
          },
          !reducido && {
            animationName: subirYBajar,
            animationDuration: 3400,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in-out',
          },
        ]}>
        <Icono nombre={icono} tamano={icono === 'sobre' ? 38 : 34} color={color} />
      </Animated.View>
    </View>
  );
}
