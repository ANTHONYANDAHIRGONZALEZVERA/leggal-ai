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
import Animated, {
  cancelAnimation,
  type CSSAnimationKeyframes,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';

import { motion } from '@/theme';
import { bucleDesde } from '@/utils/animacion';

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
  // Pantallas claras (login, registro, onboarding): reflejo más suave, como en el diseño.
  claro: {
    colores: ['#ffffff', '#f3f0fb', '#b9b3d3', '#fcfbff', '#8a83b2', '#e7e3f4'],
    posiciones: [0, 0.2, 0.4, 0.55, 0.73, 0.92],
    sombra: 'rgba(64,52,128,0.38)',
    brillo: 'rgba(255,255,255,0.95)',
    halo: 'rgba(60,40,150,0.35)',
    iris: 0.5,
  },
  // Splash sobre fondo oscuro: más contraste y halo morado.
  oscuro: {
    colores: ['#ffffff', '#dcd7f0', '#837cae', '#eeebf9', '#4b4580', '#bdb6dc'],
    posiciones: [0, 0.18, 0.4, 0.55, 0.74, 0.93],
    sombra: 'rgba(10,6,40,0.55)',
    brillo: 'rgba(255,255,255,0.8)',
    halo: 'rgba(124,92,255,0.6)',
    iris: 0.95,
  },
} as const;

// @keyframes "intro" del Splash: la esfera aparece creciendo y enderezándose.
const intro: CSSAnimationKeyframes = {
  from: { opacity: 0, transform: [{ scale: 0.6 }, { rotate: '-30deg' }] },
  to: { opacity: 1, transform: [{ scale: 1 }, { rotate: '0deg' }] },
};

// @keyframes "drift": vaivén lento, como si flotara.
const flotacion: CSSAnimationKeyframes = {
  '0%': { transform: [{ translateX: 0 }, { translateY: 0 }, { rotate: '0deg' }] },
  '50%': { transform: [{ translateX: -12 }, { translateY: 10 }, { rotate: '8deg' }] },
  '100%': { transform: [{ translateX: 0 }, { translateY: 0 }, { rotate: '0deg' }] },
};

type Props = {
  ancho: number;
  alto: number;
  tono?: keyof typeof paletas;
  /** Duración de un ciclo completo de deformación, en ms (el diseño usa 8–13 s). */
  ciclo?: number;
  /** Aparece creciendo al montar la pantalla (solo la esfera principal del Splash). */
  entrada?: boolean;
  /** Se desplaza suavemente en bucle. */
  flotar?: boolean;
  /** Posición dentro de la pantalla (normalmente absoluta). */
  style?: StyleProp<ViewStyle>;
  /** Detiene la animación sin perder la pose (pantalla que no está a la vista). */
  pausada?: boolean;
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

export function Esfera({ ancho: w, alto: h, tono = 'claro', ciclo = 9000, entrada, flotar, pausada, style }: Props) {
  const reducido = useReducedMotion();
  const paleta = paletas[tono];

  // Margen alrededor para que el halo exterior no quede cortado.
  const m = Math.max(w, h) * 0.3;
  // Las sombras del diseño están pensadas para una esfera de ~250 px de ancho.
  const s = w / 250;

  const fase = useSharedValue(0);
  const giro = useSharedValue(0);
  const orbita = useSharedValue(0);

  useEffect(() => {
    // "Reducir movimiento": la esfera queda quieta en su primera pose. En
    // pausa queda quieta donde iba y al reanudar sigue desde ahí.
    if (reducido || pausada) return;
    fase.set(bucleDesde(fase.get(), POSES.length, ciclo));
    giro.set(bucleDesde(giro.get(), 2 * Math.PI, 4000));
    orbita.set(bucleDesde(orbita.get(), 2 * Math.PI, 7000));
    return () => {
      cancelAnimation(fase);
      cancelAnimation(giro);
      cancelAnimation(orbita);
    };
  }, [reducido, pausada, ciclo, fase, giro, orbita]);

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
  // El reflejo gira sobre sí mismo y a la vez recorre un círculo pequeño
  // dentro de la esfera: así los colores se desplazan y el brillo se nota vivo.
  const radioOrbita = w * 0.12;
  const giroIris = useDerivedValue(() => [
    { translateX: Math.cos(orbita.get()) * radioOrbita },
    { translateY: Math.sin(orbita.get()) * radioOrbita },
    { rotate: giro.get() },
  ]);

  // Dos capas: la de fuera hace la entrada y la de dentro flota, para que
  // sus transformaciones no se pisen entre sí.
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width: w, height: h },
        style,
        entrada &&
          !reducido && {
            animationName: intro,
            animationDuration: 1400,
            animationFillMode: 'both',
            animationTimingFunction: motion.curvaEntrada,
          },
      ]}>
      <Animated.View
        style={
          flotar &&
          !reducido && {
            animationName: flotacion,
            animationDuration: 8000,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in-out',
            animationPlayState: pausada ? 'paused' : 'running',
          }
        }>
        <Canvas style={{ width: w + m * 2, height: h + m * 2, margin: -m }}>
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
      </Animated.View>
    </Animated.View>
  );
}

