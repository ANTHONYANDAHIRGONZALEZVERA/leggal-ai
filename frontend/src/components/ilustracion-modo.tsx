import { Canvas, DashPathEffect, Line, vec } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { cancelAnimation, Easing, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Esfera } from './esfera';

const ALTO = 96;
// Esferas pequeñas alrededor de la central, medidas desde el centro del
// recuadro (en el diseño mide 320 × 96 y el centro está en 160, 48).
const NODOS = [
  { x: -70, y: -18, lado: 28, ciclo: 7000 },
  { x: 73, y: -21, lado: 30, ciclo: 8000 },
  { x: 50, y: 26, lado: 24, ciclo: 6500 },
  { x: -56, y: 26, lado: 24, ciclo: 7500 },
];
// Trazo punteado "3 5" del diseño: el patrón mide 8 y avanza sin salto.
const PATRON = 8;

/** Recuadro con degradado lavanda → celeste donde va cada ilustración. */
function Recuadro({ children, onLayout }: { children: React.ReactNode; onLayout?: (e: LayoutChangeEvent) => void }) {
  return (
    <View
      onLayout={onLayout}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height: ALTO,
        borderRadius: 18,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundImage: 'linear-gradient(160deg, #EFEBFF, #E2F5F7)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {children}
    </View>
  );
}

// "Personal": una sola esfera en el centro.
export function IlustracionPersonal() {
  return (
    <Recuadro>
      <Esfera ancho={64} alto={60} ciclo={7000} />
    </Recuadro>
  );
}

// "Colaborativo": una esfera central unida a cuatro más chicas con líneas
// punteadas que avanzan hacia afuera, como un equipo conectado.
export function IlustracionEquipo() {
  const reducido = useReducedMotion();
  const [ancho, setAncho] = useState(0);
  const fase = useSharedValue(0);

  useEffect(() => {
    if (reducido) return;
    fase.set(withRepeat(withTiming(-PATRON, { duration: 1400, easing: Easing.linear }), -1));
    return () => cancelAnimation(fase);
  }, [reducido, fase]);

  const cx = ancho / 2;
  const cy = ALTO / 2;

  return (
    <Recuadro onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
      {ancho > 0 && (
        <Canvas style={{ position: 'absolute', left: 0, top: 0, width: ancho, height: ALTO }}>
          {NODOS.map(({ x, y }) => (
            <Line key={`${x},${y}`} p1={vec(cx, cy)} p2={vec(cx + x, cy + y)} color="#9C8FE8" strokeWidth={1.5} style="stroke">
              <DashPathEffect intervals={[3, 5]} phase={fase} />
            </Line>
          ))}
        </Canvas>
      )}
      {ancho > 0 &&
        NODOS.map(({ x, y, lado, ciclo }) => (
          <Esfera
            key={`${x},${y}`}
            ancho={lado}
            alto={lado}
            ciclo={ciclo}
            style={{ position: 'absolute', left: cx + x - lado / 2, top: cy + y - lado / 2 }}
          />
        ))}
      <Esfera ancho={52} alto={48} ciclo={8000} />
    </Recuadro>
  );
}
