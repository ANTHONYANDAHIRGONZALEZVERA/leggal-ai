import { Stack } from 'expo-router/stack';

// Cuenta con el correo sin verificar (B27): solo "Revisa tu correo".
export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
