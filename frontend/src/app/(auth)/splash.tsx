import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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

// "Splash" del diseño: fondo oscuro, esfera grande que aparece girando, anillo
// y esfera pequeña flotando, ondas al pie, logo y botón Comenzar.
export default function Splash() {
  const { width, height } = useWindowDimensions();
  const x = width / DISENO.ancho;
  const y = height / DISENO.alto;

  const principal = { ancho: 270 * x, alto: 250 * x };

  return (
    <PantallaConEsfera
      tono="oscuro"
      decoracion={
        <>
          <Anillo ancho={240 * x} alto={160 * x} tono="oscuro" style={{ position: 'absolute', left: -80 * x, top: 120 * y }} />
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
            style={{ position: 'absolute', right: -60 * x, top: 470 * y }}
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

      <Aparecer retraso={1000} style={{ alignItems: 'center', gap: 18, paddingBottom: spacing.xxxl }}>
        <BarraCarga />
        <Boton titulo="Comenzar" variante="vidrio" onPress={() => router.push('/iniciar-sesion')} />
        <Texto variante="nota" style={{ color: colors.splash.tenue }}>
          por ACCONS
        </Texto>
      </Aparecer>
    </PantallaConEsfera>
  );
}
