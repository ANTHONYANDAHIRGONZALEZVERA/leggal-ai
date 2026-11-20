import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { crearClienteConsultas } from '@/services/consultas';
import { useAcceso, useSesionLeida } from '@/services/sesion';
import { colors, fuentes } from '@/theme';

// La pantalla de carga nativa se mantiene hasta tener las fuentes y la sesión
// guardada: así no se ve un instante la fuente del sistema ni el Login a
// alguien que ya había iniciado sesión.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fuentesCargadas, errorFuentes] = useFonts(fuentes);
  const sesionLeida = useSesionLeida();
  // Un solo cliente de consultas durante toda la vida de la app.
  const [clienteConsultas] = useState(crearClienteConsultas);
  // Si una fuente falla se sigue con la del sistema en vez de bloquear la app.
  const listo = (fuentesCargadas || errorFuentes !== null) && sesionLeida;

  useEffect(() => {
    if (listo) SplashScreen.hide();
  }, [listo]);

  if (!listo) return null;

  return (
    <QueryClientProvider client={clienteConsultas}>
      <Navegacion />
    </QueryClientProvider>
  );
}

// Cada grupo de pantallas solo existe para quien puede verlo. Cuando cambia
// la sesión (entra, termina el onboarding o sale), Expo Router saca a la
// persona de las pantallas que dejó de poder ver y la lleva a "/", que la
// manda a su lugar (app/index.tsx). Por eso Login y Registro no navegan.
function Navegacion() {
  const acceso = useAcceso();

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.fondo } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={acceso === 'invitado'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={acceso === 'onboarding'}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={acceso === 'app'}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}
