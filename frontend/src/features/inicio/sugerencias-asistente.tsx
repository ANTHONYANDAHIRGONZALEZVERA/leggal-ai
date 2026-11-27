import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDecay } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Icono, type NombreIcono } from '@/components/icono';
import { Texto } from '@/components/texto';
import { colors, fontFamily } from '@/theme';
import { bucleDesde } from '@/utils/animacion';

type Sugerencia = { accion: string; resto: string; icono: NombreIcono; fondo: string; color: string };

const VIOLETA = { fondo: '#ECE7FF', color: '#4B2FE0' };
const TURQUESA = { fondo: '#DDF4F6', color: '#0B7A8B' };
const ROSA = { fondo: '#FCE7F3', color: '#B0287A' };
const AMBAR = { fondo: '#FFF1DC', color: '#A15C00' };
const s = (accion: string, resto: string, icono: NombreIcono, tono: { fondo: string; color: string }): Sugerencia => ({
  accion,
  resto,
  icono,
  ...tono,
});

// Las del diseño, sin datos inventados ("del caso 0142" → "de un caso").
type Fila = { sugerencias: Sugerencia[]; duracion: number; haciaDerecha: boolean };
export const FILAS: Fila[] = [
  {
    sugerencias: [
      s('Resume', 'este contrato', 'documento', VIOLETA),
      s('Extrae', 'fechas clave', 'calendario', TURQUESA),
      s('Revisa', 'cláusulas de riesgo', 'balanza', ROSA),
      s('Busca', 'en mis expedientes', 'lupa', AMBAR),
    ],
    duracion: 34_000,
    haciaDerecha: true,
  },
  {
    sugerencias: [
      s('Plazos', 'de esta semana', 'reloj', TURQUESA),
      s('Redacta', 'un escrito', 'lapiz', VIOLETA),
      s('Compara', 'dos versiones', 'comparar', AMBAR),
      s('Partes', 'del proceso', 'personas', ROSA),
    ],
    duracion: 42_000,
    haciaDerecha: false,
  },
  {
    sugerencias: [
      s('Mapa', 'de un caso', 'red', ROSA),
      s('Audiencias', 'pendientes', 'calendario', VIOLETA),
      s('Notifica', 'al responsable', 'campana', TURQUESA),
      s('Genera', 'informe al cliente', 'documento', AMBAR),
    ],
    duracion: 34_000,
    haciaDerecha: true,
  },
];

const SEPARACION = 10;

/** Texto que lee el lector de pantalla: las sugerencias una sola vez, sin el movimiento. */
export const DESCRIPCION_SUGERENCIAS = `Ejemplos de lo que podrás pedirle al asistente: ${FILAS.flatMap((f) =>
  f.sugerencias.map((x) => `${x.accion} ${x.resto}`),
).join(', ')}.`;

function Chip({ accion, resto, icono, fondo, color }: Sugerencia) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 44,
        paddingLeft: 6,
        paddingRight: 16,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.78)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.95)',
        boxShadow: '0 6px 18px -10px rgba(60,40,140,0.35)',
      }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: fondo }}>
        <Icono nombre={icono} tamano={16} color={color} />
      </View>
      <Texto variante="cuerpo" style={{ fontSize: 14, fontFamily: fontFamily.bold }}>
        {accion}{' '}
        <Texto variante="cuerpo" style={{ fontSize: 14, color: colors.textoSecundario }}>
          {resto}
        </Texto>
      </Texto>
    </View>
  );
}

// Va antes que las demás: el plugin de worklets las vuelve constantes y no
// se pueden usar antes de declararlas.
/** Lleva cualquier avance a una vuelta (0 → 1): 1.25 → 0.25 y −0.25 → 0.75. */
export function enVuelta(avance: number) {
  'worklet';
  return ((avance % 1) + 1) % 1;
}

/**
 * Dónde está la fila según su avance en el ciclo (0 → 1). Hacia la izquierda
 * va de 0 a −ancho de una copia; hacia la derecha, de −ancho a 0. Al cerrar el
 * ciclo queda corrida justo una copia: la segunda está donde empezó la primera
 * y el salto no se nota.
 */
export function desplazamiento(avance: number, anchoCopia: number, haciaDerecha: boolean) {
  'worklet';
  // Al arrastrar o con el impulso puede salirse de 0 → 1: se lleva a la vuelta.
  const enCiclo = avance < 0 || avance > 1 ? enVuelta(avance) : avance;
  return haciaDerecha ? -anchoCopia * (1 - enCiclo) : -anchoCopia * enCiclo;
}

/**
 * Avance después de arrastrar la fila `dx` puntos con el dedo desde `inicio`:
 * la fila sigue al dedo punto por punto, vaya hacia donde vaya sola.
 */
export function avanceArrastrado(inicio: number, dx: number, anchoCopia: number, haciaDerecha: boolean) {
  'worklet';
  if (anchoCopia <= 0) return inicio;
  return inicio + (haciaDerecha ? dx : -dx) / anchoCopia;
}

/** El gesto se activa al mover el dedo 10 pt en horizontal; en vertical cede el scroll a la página. */
export const UMBRAL_ARRASTRE = 10;

/**
 * Una fila que se desliza sola y sin fin: la lista va dos veces seguidas y se
 * mueve el ancho de una copia (la mitad de la fila). Con valores compartidos de
 * Reanimated, como la esfera: corre en el hilo de UI y React no vuelve a
 * dibujar nada en cada cuadro.
 */
function FilaEnMovimiento({ sugerencias, duracion, haciaDerecha, pausada, indice }: Fila & { pausada?: boolean; indice: number }) {
  const anchoCopia = useSharedValue(0);
  const avance = useSharedValue(0);
  const inicioArrastre = useSharedValue(0);
  // Se mueve sola cuando ya se midió, la pantalla está a la vista y nadie la
  // arrastra. Al reanudar sigue donde quedó, sin saltar.
  const [medida, setMedida] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  // Cuenta las veces que se soltó: si se agarra y se suelta muy rápido, los
  // dos avisos llegan juntos y `arrastrando` termina igual que empezó; el
  // contador sí cambia y el movimiento siempre se reanuda.
  const [soltadas, setSoltadas] = useState(0);
  useEffect(() => {
    if (!medida || pausada || arrastrando) return;
    avance.set(enVuelta(avance.get()));
    avance.set(bucleDesde(avance.get(), 1, duracion));
    return () => cancelAnimation(avance);
  }, [medida, pausada, arrastrando, soltadas, duracion, avance]);

  function alSoltar() {
    setArrastrando(false);
    setSoltadas((n) => n + 1);
  }

  // Arrastre con el dedo (en el hilo de UI). Al soltar sigue con el impulso
  // del dedo hasta frenar y después vuelve a moverse sola desde ahí. Solo se
  // avisa a React al empezar y al terminar, nunca en cada cuadro.
  const arrastre = usePanGesture({
    testID: `arrastre-fila-${indice}`,
    activeOffsetX: [-UMBRAL_ARRASTRE, UMBRAL_ARRASTRE],
    failOffsetY: [-UMBRAL_ARRASTRE, UMBRAL_ARRASTRE],
    onActivate: () => {
      'worklet';
      cancelAnimation(avance);
      inicioArrastre.set(avance.get());
      scheduleOnRN(setArrastrando, true);
    },
    onUpdate: (e) => {
      'worklet';
      avance.set(avanceArrastrado(inicioArrastre.get(), e.translationX, anchoCopia.get(), haciaDerecha));
    },
    onDeactivate: (e) => {
      'worklet';
      const velocidad = avanceArrastrado(0, e.velocityX, anchoCopia.get(), haciaDerecha);
      avance.set(
        withDecay({ velocity: velocidad, deceleration: 0.997 }, (terminada) => {
          if (terminada) scheduleOnRN(alSoltar);
        }),
      );
    },
  });

  function medir(ancho: number) {
    if (ancho <= 0 || ancho === anchoCopia.get()) return;
    anchoCopia.set(ancho);
    setMedida(true);
  }

  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateX: desplazamiento(avance.get(), anchoCopia.get(), haciaDerecha) }],
  }));

  // Dos copias seguidas, cada una con su separación al final: así la fila
  // mide justo dos copias y la mitad es una copia exacta.
  const sugerenciasDobles = [...sugerencias, ...sugerencias];

  // El ScrollView horizontal (quieto) deja a la fila tener su ancho real: en
  // un View normal quedaría del ancho de la pantalla y en Android lo que se
  // sale no se dibuja. Se mide la misma vista animada, que Android nunca quita
  // al optimizar (un View simple sí puede quitarlo y su medida no llega).
  // El gesto va en una vista propia: el ScrollView no recibe toques.
  return (
    <GestureDetector gesture={arrastre}>
      <View collapsable={false}>
        <ScrollView horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false} pointerEvents="none">
          <Animated.View
            testID={`fila-${indice}`}
            onLayout={(e) => medir(e.nativeEvent.layout.width / 2)}
            style={[{ flexDirection: 'row', gap: SEPARACION, paddingRight: SEPARACION }, estilo]}>
            {sugerenciasDobles.map((sugerencia, i) => (
              <Chip key={`${sugerencia.accion}-${i}`} {...sugerencia} />
            ))}
          </Animated.View>
        </ScrollView>
      </View>
    </GestureDetector>
  );
}

// Sugerencias del asistente en el Inicio (diseño "Main"). El asistente todavía
// no existe: se muestran sin acción. Cada fila se mueve sola y se puede
// arrastrar con el dedo; con "reducir movimiento" no se mueven solas y se
// deslizan como una lista normal.
export function SugerenciasAsistente({ pausada }: { pausada?: boolean }) {
  const reducido = useReducedMotion();

  return (
    <View accessible accessibilityLabel={DESCRIPCION_SUGERENCIAS} style={{ gap: SEPARACION }}>
      {FILAS.map((fila, indice) =>
        reducido ? (
          <ScrollView
            key={fila.sugerencias[0].accion}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: SEPARACION, paddingHorizontal: 16 }}>
            {fila.sugerencias.map((sugerencia) => (
              <Chip key={sugerencia.accion} {...sugerencia} />
            ))}
          </ScrollView>
        ) : (
          <FilaEnMovimiento key={fila.sugerencias[0].accion} {...fila} indice={indice} pausada={pausada} />
        ),
      )}
      {/* Bordes que se desvanecen, como la máscara del diseño. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 36, backgroundImage: `linear-gradient(90deg, ${colors.fondo}, rgba(244,241,250,0))` }}
      />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 36, backgroundImage: `linear-gradient(270deg, ${colors.fondo}, rgba(244,241,250,0))` }}
      />
    </View>
  );
}
