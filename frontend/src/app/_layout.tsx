import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { colors, fuentes } from '@/theme';

// El splash nativo se mantiene hasta tener las fuentes: así ninguna pantalla
// se dibuja un instante con la fuente del sistema.
SplashScreen.preventAutoHideAsync();

// Raíz de la navegación: un Stack sin encabezado que contiene los tres grupos.
// La redirección según la sesión (auth → onboarding → tabs) se agrega en F10.
export default function RootLayout() {
  const [cargadas, error] = useFonts(fuentes);
  const listo = cargadas || error !== null;

  useEffect(() => {
    if (listo) SplashScreen.hide();
  }, [listo]);

  // Si una fuente falla se sigue con la del sistema en vez de bloquear la app.
  if (!listo) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.fondo } }} />
  );
}
