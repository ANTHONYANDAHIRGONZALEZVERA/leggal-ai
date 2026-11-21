import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Anillo } from '@/components/anillo';
import { Aparecer } from '@/components/aparecer';
import { AvisoFlotante } from '@/components/aviso-flotante';
import { Esfera } from '@/components/esfera';
import { Icono } from '@/components/icono';
import { Ondas } from '@/components/ondas';
import { Texto } from '@/components/texto';
import { CajaPregunta } from '@/features/inicio/caja-pregunta';
import { EncabezadoInicio } from '@/features/inicio/encabezado-inicio';
import { useEspacioActivo } from '@/features/inicio/espacio';
import { SugerenciasAsistente } from '@/features/inicio/sugerencias-asistente';
import { useSesion } from '@/services/sesion';
import { colors, destacado, fontFamily, gradients } from '@/theme';
import { iniciales, primerNombre } from '@/utils/texto';

const ALTO_ESCENA = 262;

// Inicio (F12, diseño "Main"): encabezado con el espacio activo y el avatar,
// la esfera, el saludo y el asistente (sugerencias y caja de pregunta, que se
// ven pero todavía no funcionan: el asistente llega después del plan actual).
export default function Inicio() {
  const { top } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const x = width / 390;
  const usuario = useSesion((s) => s.usuario);
  const { espacio, cargando } = useEspacioActivo();
  const [aviso, setAviso] = useState<string | null>(null);
  const quitarAviso = useCallback(() => setAviso(null), []);

  const nombre = usuario?.nombreVisible ?? usuario?.nombre ?? '';
  const paraQuien = espacio?.tipo === 'empresa' ? 'Personalizado para tu despacho' : 'Personalizado para ti';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.fondo,
        backgroundImage:
          'radial-gradient(90% 50% at 85% 0%, #E6DEFF 0%, rgba(230,222,255,0) 70%), radial-gradient(70% 40% at 0% 60%, #DDF3F7 0%, rgba(221,243,247,0) 70%)',
      }}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: top + 10, paddingBottom: 16 }}>
        <EncabezadoInicio espacio={espacio} cargando={cargando} iniciales={iniciales(nombre)} onProximamente={setAviso} />

        {/* Escena decorativa: esfera grande, anillo, esfera chica y ondas. */}
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ height: ALTO_ESCENA, overflow: 'hidden' }}>
          <Anillo ancho={230 * x} alto={150 * x} style={{ position: 'absolute', left: -70 * x, top: 96 }} />
          <Esfera ancho={318 * x} alto={204 * x} ciclo={14000} flotar style={{ position: 'absolute', left: 36 * x, top: 18 }} />
          <Esfera ancho={150 * x} alto={96 * x} ciclo={11000} style={{ position: 'absolute', right: -46 * x, top: 150 }} />
          <Ondas juego="inicio" style={{ position: 'absolute', left: 0, right: 0, bottom: 6 }} />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, backgroundImage: gradients.desvanecer }} />
        </View>

        <View style={{ alignItems: 'center', gap: 10, marginTop: -26, paddingHorizontal: 20 }}>
          <Aparecer>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                height: 30,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.85)',
                borderWidth: 1,
                borderColor: colors.superficie,
              }}>
              <Icono nombre="chispa" tamano={14} color="#5B3DF5" />
              <Texto variante="nota" style={{ color: colors.etiqueta }}>
                {paraQuien}
              </Texto>
            </View>
          </Aparecer>
          <Aparecer retraso={120} style={{ alignItems: 'center', gap: 6 }}>
            <View
              accessible
              accessibilityRole="header"
              accessibilityLabel={`Hola, ${primerNombre(nombre)}`}
              style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', justifyContent: 'center', columnGap: 8 }}>
              <Texto variante="titulo" style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1.1 }}>
                Hola,
              </Texto>
              <Texto variante="titulo" numberOfLines={1} style={[destacado, { fontSize: 42, lineHeight: 50, paddingRight: 4 }]}>
                {primerNombre(nombre)}
              </Texto>
            </View>
            <Texto variante="subtitulo" style={{ fontSize: 15, fontFamily: fontFamily.medium }}>
              ¿En qué proceso trabajamos hoy?
            </Texto>
          </Aparecer>
        </View>

        <Aparecer retraso={240} style={{ marginTop: 22 }}>
          <SugerenciasAsistente />
        </Aparecer>

        <View style={{ flex: 1, minHeight: 16 }} />
        <CajaPregunta />
      </ScrollView>

      <AvisoFlotante mensaje={aviso} onTerminar={quitarAviso} />
    </View>
  );
}
