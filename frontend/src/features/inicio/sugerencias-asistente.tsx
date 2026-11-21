import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';

import { Icono, type NombreIcono } from '@/components/icono';
import { Texto } from '@/components/texto';
import { colors, fontFamily } from '@/theme';

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
const FILAS: Fila[] = [
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

/**
 * Una fila que se desliza sin fin: la lista va dos veces seguidas y se mueve
 * justo el ancho de una; al terminar el ciclo la segunda copia está donde
 * empezó la primera y no se nota el salto. Solo translateX, en el hilo de UI.
 */
function FilaEnMovimiento({ sugerencias, duracion, haciaDerecha }: Fila) {
  const [anchoUnaVez, setAnchoUnaVez] = useState(0);
  const deslizar: CSSAnimationKeyframes = {
    from: { transform: [{ translateX: 0 }] },
    to: { transform: [{ translateX: -anchoUnaVez }] },
  };

  return (
    <View style={{ overflow: 'hidden' }}>
      <Animated.View
        onLayout={(e) => setAnchoUnaVez(e.nativeEvent.layout.width / 2)}
        style={[
          { flexDirection: 'row', alignSelf: 'flex-start', gap: SEPARACION, paddingRight: SEPARACION },
          anchoUnaVez > 0 && {
            animationName: deslizar,
            animationDuration: duracion,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
            animationDirection: haciaDerecha ? 'reverse' : 'normal',
          },
        ]}>
        {[...sugerencias, ...sugerencias].map((sugerencia, i) => (
          <Chip key={`${sugerencia.accion}-${i}`} {...sugerencia} />
        ))}
      </Animated.View>
    </View>
  );
}

// Sugerencias del asistente en el Inicio (diseño "Main"). El asistente todavía
// no existe: se muestran sin acción. Con "reducir movimiento" no se mueven y se
// pueden deslizar con el dedo.
export function SugerenciasAsistente() {
  const reducido = useReducedMotion();

  return (
    <View accessible accessibilityLabel={DESCRIPCION_SUGERENCIAS} style={{ gap: SEPARACION }}>
      {FILAS.map((fila) =>
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
          <FilaEnMovimiento key={fila.sugerencias[0].accion} {...fila} />
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
