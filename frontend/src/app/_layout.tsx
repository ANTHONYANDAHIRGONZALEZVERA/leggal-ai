import { Stack } from 'expo-router/stack';

// Raíz de la navegación: un Stack sin encabezado que contiene los tres grupos.
// La redirección según la sesión (auth → onboarding → tabs) se agrega en F10.
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
