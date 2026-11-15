import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useWindowDimensions, View } from 'react-native';

import { Aparecer } from '@/components/aparecer';
import { Boton } from '@/components/boton';
import { Logo } from '@/components/logo';
import { PantallaConEsfera } from '@/components/pantalla-con-esfera';
import { Texto } from '@/components/texto';
import { colors, spacing } from '@/theme';

// "Splash" del diseño: fondo oscuro, esfera grande al centro, logo y botón
// Comenzar. El tamaño de la esfera sale del ancho para verse igual en todo teléfono.
export default function Splash() {
  const { width } = useWindowDimensions();
  const ancho = Math.min(width * 0.69, 300);

  return (
    <PantallaConEsfera
      tono="oscuro"
      esfera={{ ancho, alto: ancho * 0.93, top: '22%', left: (width - ancho) / 2 }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: spacing.xxxl }}>
        <Aparecer retraso={500} style={{ alignItems: 'center', gap: spacing.sm }}>
          <Logo />
          <Texto variante="subtitulo" style={{ color: colors.splash.texto, fontSize: 15 }}>
            Asistencia y trazabilidad jurídica
          </Texto>
        </Aparecer>
      </View>

      <Aparecer retraso={1000} style={{ alignItems: 'center', gap: spacing.md, paddingBottom: spacing.xxxl }}>
        <Boton titulo="Comenzar" variante="vidrio" onPress={() => router.push('/iniciar-sesion')} />
        <Texto variante="nota" style={{ color: colors.splash.tenue }}>
          por ACCONS
        </Texto>
      </Aparecer>
    </PantallaConEsfera>
  );
}
