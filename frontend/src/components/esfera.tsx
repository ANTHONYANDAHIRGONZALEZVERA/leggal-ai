import {
  Blur,
  Canvas,
  Group,
  Oval,
  Path,
  RadialGradient,
  Shadow,
  SweepGradient,
  usePathValue,
  vec,
  type SkPathBuilder,
} from '@shopify/react-native-skia';
import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// Esfera cromada del diseño, dibujada con Skia en lugar de exportarla como
// imagen: se ve nítida en cualquier pantalla y conserva su animación.

// Las 3 poses del @keyframes "morph" del diseño, como fracciones del ancho
// (esquinas sup-izq, sup-der, inf-der, inf-izq) y del alto (mismo orden).
const POSES = [
  [0.46, 0.54, 0.6, 0.4, 0.45, 0.4, 0.6, 0.55],
  [0.62, 0.38, 0.4, 0.6, 0.56, 0.62, 0.38, 0.44],
  [0.38, 0.62, 0.54, 0.46, 0.4, 0.5, 0.5, 0.6],
] as const;

// Constante para aproximar un cuarto de elipse con una curva cúbica.
const K = 0.5523;

const IRIS = ['#5fe3f2', '#8b7bff', '#f4a3e6', '#5fe3f2'];

const paletas = {
  // Pantallas claras (login, registro, onboarding).
  claro: {
    colores: ['#ffffff', '#f3f0fb', '#b9b3d3', '#fcfbff', '#8a83b2', '#e7e3f4'],
    posiciones: [0, 0.2, 0.4, 0.55, 0.73, 0.92],
    sombra: 'rgba(64,52,128,0.38)',
    brillo: 'rgba(255,255,255,0.95)',
    halo: 'rgba(60,40,150,0.35)',
    iris: 0.6,
  },
  // Splash sobre fondo oscuro: más contraste y halo morado.
  oscuro: {
    colores: ['#ffffff', '#dcd7f0', '#837cae', '#eeebf9', '#4b4580', '#bdb6dc'],
    posiciones: [0, 0.18, 0.4, 0.55, 0.74, 0.93],
    sombra: 'rgba(10,6,40,0.55)',
    brillo: 'rgba(255,255,255,0.8)',
    halo: 'rgba(124,92,255,0.6)',
    iris: 0.8,
  },
} as const;

type Props = {
  ancho: number;
  alto: number;
  tono?: keyof typeof paletas;
  /** Duración de un ciclo completo de deformación, en ms (el diseño usa 8–13 s). */
  ciclo?: number;
  style?: StyleProp<ViewStyle>;
};

function trazarForma(p: SkPathBuilder, r: readonly number[], x: number, y: number, w: number, h: number) {
  'worklet';
  const [a, b, c, d] = [r[0] * w, r[1] * w, r[2] * w, r[3] * w];
  const [e, f, g, i] = [r[4] * h, r[5] * h, r[6] * h, r[7] * h];
  p.moveTo(x + a, y);
  p.lineTo(x + w - b, y);
  p.cubicTo(x + w - b + b * K, y, x + w, y + f - f * K, x + w, y + f);
  p.lineTo(x + w, y + h - g);
  p.cubicTo(x + w, y + h - g + g * K, x + w - c + c * K, y + h, x + w - c, y + h);
  p.lineTo(x + d, y + h);
  p.cubicTo(x + d - d * K, y + h, x, y + h - i + i * K, x, y + h - i);
  p.lineTo(x, y + e);
  p.cubicTo(x, y + e - e * K, x + a - a * K, y, x + a, y);
  p.close();
}

export function Esfera({ ancho: w, alto: h, tono = 'claro', ciclo = 9000, style }: Props) {
  const reducido = useReducedMotion();
  const paleta = paletas[tono];

  // Margen alrededor para que el halo exterior no quede cortado.
  const m = Math.max(w, h) * 0.3;
  // Las sombras del diseño están pensadas para una esfera de ~250 px de ancho.
  const s = w / 250;

  const fase = useSharedValue(0);
  const giro = useSharedValue(0);

  useEffect(() => {
    // "Reducir movimiento": la esfera queda quieta en su primera pose.
    if (reducido) return;
    fase.set(withRepeat(withTiming(POSES.length, { duration: ciclo, easing: Easing.linear }), -1));
    giro.set(withRepeat(withTiming(2 * Math.PI, { duration: 6000, easing: Easing.linear }), -1));
    return () => {
      cancelAnimation(fase);
      cancelAnimation(giro);
    };
  }, [reducido, ciclo, fase, giro]);

  const forma = usePathValue((p) => {
    'worklet';
    const total = fase.get();
    const tramo = Math.floor(total) % POSES.length;
    const t = total - Math.floor(total);
    // Ease-in-out por tramo, igual que "ease-in-out" en el keyframe original.
    const suave = t * t * (3 - 2 * t);
    const desde = POSES[tramo];
    const hasta = POSES[(tramo + 1) % POSES.length];
    const radios = desde.map((v, k) => v + (hasta[k] - v) * suave);
    trazarForma(p, radios, m, m, w, h);
  });

  const centroIris = vec(m + w * 0.28 + (w * 0.58) / 2, m + h * 0.12 + (h * 0.6) / 2);
  const giroIris = useDerivedValue(() => [{ rotate: giro.get() }]);

  return (
    <Canvas
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: w + m * 2, height: h + m * 2, margin: -m }, style]}>
      {/* Halo exterior bajo la esfera. */}
      <Path path={forma} color="transparent">
        <Shadow dx={0} dy={34 * s} blur={30 * s} color={paleta.halo} shadowOnly />
      </Path>

      {/* Cuerpo cromado con luz arriba a la izquierda y volumen por sombras internas. */}
      <Path path={forma}>
        <RadialGradient
          c={vec(m + w * 0.3, m + h * 0.22)}
          r={w * 1.2}
          colors={[...paleta.colores]}
          positions={[...paleta.posiciones]}
          transform={[{ scaleY: (h * 0.9) / (w * 1.2) }]}
          origin={vec(m + w * 0.3, m + h * 0.22)}
        />
        <Shadow dx={-26 * s} dy={-30 * s} blur={25 * s} color={paleta.sombra} inner />
        <Shadow dx={22 * s} dy={18 * s} blur={15 * s} color={paleta.brillo} inner />
      </Path>

      {/* Reflejo tornasol: degradado cónico desenfocado que gira y tiñe la esfera. */}
      <Group clip={forma} blendMode="color" opacity={paleta.iris}>
        <Group transform={giroIris} origin={centroIris}>
          <Oval x={m + w * 0.28} y={m + h * 0.12} width={w * 0.58} height={h * 0.6}>
            <SweepGradient c={centroIris} colors={IRIS} />
            <Blur blur={9 * s} />
          </Oval>
        </Group>
      </Group>
    </Canvas>
  );
}
