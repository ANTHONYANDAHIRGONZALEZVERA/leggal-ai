import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';

// Ondas del pie de Splash y Login. En el diseño el SVG mide 780 de ancho (dos
// pantallas de 390) y se desplaza 390: al terminar el ciclo la onda coincide
// consigo misma, así el bucle no tiene salto. Colores y velocidades van más
// marcados que en el diseño a pedido del equipo, para que se noten en el teléfono.
const ANCHO_DISENO = 390;

type Capa = { d: string; color: string; duracion: number; inversa?: boolean };

const juegos = {
  splash: {
    alto: 160,
    capas: [
      { d: 'M0 80 C 65 40, 130 40, 195 80 S 325 120, 390 80 S 520 40, 585 80 S 715 120, 780 80 V160 H0Z', color: 'rgba(124,92,255,0.30)', duracion: 7000 },
      { d: 'M0 100 C 65 130, 130 130, 195 100 S 325 70, 390 100 S 520 130, 585 100 S 715 70, 780 100 V160 H0Z', color: 'rgba(95,227,242,0.22)', duracion: 11000, inversa: true },
      { d: 'M0 120 C 65 100, 130 100, 195 120 S 325 140, 390 120 S 520 100, 585 120 S 715 140, 780 120 V160 H0Z', color: 'rgba(244,163,230,0.18)', duracion: 15000 },
    ],
  },
  acceso: {
    alto: 80,
    capas: [
      { d: 'M0 45 C 65 18, 130 18, 195 45 S 325 72, 390 45 S 520 18, 585 45 S 715 72, 780 45 V80 H0Z', color: 'rgba(124,92,255,0.24)', duracion: 8000 },
      { d: 'M0 55 C 65 76, 130 76, 195 55 S 325 34, 390 55 S 520 76, 585 55 S 715 34, 780 55 V80 H0Z', color: 'rgba(14,143,163,0.20)', duracion: 12000, inversa: true },
    ],
  },
  // Registro: una sola onda tenue detrás del título.
  registro: {
    alto: 70,
    capas: [
      { d: 'M0 40 C 65 15, 130 15, 195 40 S 325 65, 390 40 S 520 15, 585 40 S 715 65, 780 40 V70 H0Z', color: 'rgba(124,92,255,0.14)', duracion: 12000 },
    ],
  },
} as const satisfies Record<string, { alto: number; capas: readonly Capa[] }>;

type Props = {
  juego: keyof typeof juegos;
  style?: StyleProp<ViewStyle>;
};

export function Ondas({ juego, style }: Props) {
  const { width } = useWindowDimensions();
  const reducido = useReducedMotion();
  const { alto, capas } = juegos[juego];
  const escala = width / ANCHO_DISENO;

  // Cada capa se mueve como imagen fija con translateX (barato, en el hilo
  // de UI); el dibujo Skia no se vuelve a pintar en cada cuadro.
  const desplazar: CSSAnimationKeyframes = {
    from: { transform: [{ translateX: 0 }] },
    to: { transform: [{ translateX: -width }] },
  };

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ height: alto, overflow: 'hidden' }, style]}>
      {capas.map((capa: Capa) => (
        <Animated.View
          key={capa.d}
          style={[
            { position: 'absolute', left: 0, top: 0, width: width * 2, height: alto },
            !reducido && {
              animationName: desplazar,
              animationDuration: capa.duracion,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'linear',
              animationDirection: capa.inversa ? 'reverse' : 'normal',
            },
          ]}>
          <Canvas style={{ width: width * 2, height: alto }}>
            <Group transform={[{ scaleX: escala }]}>
              <Path path={capa.d} color={capa.color} />
            </Group>
          </Canvas>
        </Animated.View>
      ))}
    </View>
  );
}
