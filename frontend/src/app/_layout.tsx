import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { crearClienteConsultas } from '@/services/consultas';
import { colors, fuentes } from '@/theme';

// El splash nativo se mantiene hasta tener las fuentes: así
// ninguna pantalla se dibuja un instante con la fuente del sistema.
SplashScreen.preventAutoHideAsync();

// Raíz de la navegación: un Stack sin encabezado que contiene los tres grupos.
// La redirección según la sesión (auth → onboarding → tabs) se agrega en F10.
export default function RootLayout() {
  const [cargadas, error] = useFonts(fuentes);
  // Un solo cliente de consultas durante toda la vida de la app.
  const [clienteConsultas] = useState(crearClienteConsultas);
  // Si una fuente falla se sigue con la del sistema en vez de bloquear la app.
  const listo = cargadas || error !== null;

  useEffect(() => {
    if (listo) SplashScreen.hide();
  }, [listo]);

  if (!listo) return null;

  return (
    <QueryClientProvider client={clienteConsultas}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.fondo } }} />
    </QueryClientProvider>
  );
}
