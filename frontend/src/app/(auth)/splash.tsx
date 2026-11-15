import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Anillo } from '@/components/anillo';
import { Aparecer } from '@/components/aparecer';
import { BarraCarga } from '@/components/barra-carga';
import { Boton } from '@/components/boton';
import { Esfera } from '@/components/esfera';
import { Logo } from '@/components/logo';
import { Ondas } from '@/components/ondas';
import { PantallaConEsfera } from '@/components/pantalla-con-esfera';
import { Texto } from '@/components/texto';
import { colors, spacing } from '@/theme';

// El diseño está hecho en un lienzo de 390×844: las medidas se escalan al
// teléfono para que la composición se vea igual en cualquier tamaño.
const DISENO = { ancho: 390, alto: 844 };

// Tiempo de carga al pulsar Comenzar. En F10 se reemplaza por la revisión real
// de la sesión guardada (lo que tarde, con este valor como referencia).
const DURACION_CARGA = 2500;

// Las ondas miden 160 y su cresta más alta queda a ~120 del borde inferior;
// el bloque de abajo empieza justo encima con un pequeño respiro.
const ALTO_ONDAS = 130;

// "Splash" del diseño: fondo oscuro, esfera grande que aparece girando, anillo
// y esfera pequeña flotando, ondas al pie, logo y botón Comenzar.
export default function Splash() {
  const { width, height } = useWindowDimensions();
  const x = width / DISENO.ancho;
  const y = height / DISENO.alto;

  const principal = { ancho: 270 * x, alto: 250 * x };

  const [cargando, setCargando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const comenzar = () => {
    if (cargando) return;
    setCargando(true);
    // Se navega un instante después de llenarse, para que se vea la barra completa.
    temporizador.current = setTimeout(() => router.replace('/iniciar-sesion'), DURACION_CARGA + 200);
  };

  return (
    <PantallaConEsfera
      tono="oscuro"
      decoracion={
        <>
          {/* Un poco más arriba y a la izquierda que en el diseño, para que no
              se pegue a la esfera central en pantallas angostas. */}
          <Anillo
            ancho={240 * x}
            alto={160 * x}
            tono="oscuro"
            style={{ position: 'absolute', left: -115 * x, top: 70 * y }}
          />
          <Esfera
            {...principal}
            tono="oscuro"
            entrada
            style={{ position: 'absolute', left: (width - principal.ancho) / 2, top: 210 * y }}
          />
          <Esfera
            ancho={170 * x}
            alto={120 * x}
            tono="oscuro"
            ciclo={10000}
            flotar
            // Bajo el texto del logo y más hacia el borde, para no tapar "AI".
            style={{ position: 'absolute', right: -85 * x, top: 590 * y }}
          />
          <Ondas juego="splash" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} />
        </>
      }>
      <StatusBar style="light" />

      <Aparecer retraso={500} style={{ marginTop: 500 * y - spacing.xxxl, alignItems: 'center', gap: spacing.sm }}>
        <Logo />
        <Texto variante="subtitulo" style={{ color: colors.splash.texto, fontSize: 15 }}>
          Asistencia y trazabilidad jurídica
        </Texto>
      </Aparecer>

      <View style={{ flex: 1 }} />

      {/* Queda por encima de las ondas (no dentro de ellas) para que el botón
          y la firma se lean limpios sobre el fondo oscuro. */}
      <Aparecer retraso={1000} style={{ alignItems: 'center', gap: 18, paddingBottom: ALTO_ONDAS }}>
        <BarraCarga activa={cargando} duracion={DURACION_CARGA} />
        <Boton titulo="Comenzar" variante="vidrio" onPress={comenzar} />
        <Texto variante="nota" style={{ color: colors.splash.texto }}>
          por ACCONS
        </Texto>
      </Aparecer>
    </PantallaConEsfera>
  );
}
