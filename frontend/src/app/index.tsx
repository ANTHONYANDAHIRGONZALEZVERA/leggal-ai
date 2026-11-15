import { Redirect } from 'expo-router';

// "/" no es una pantalla: decide a dónde entrar. Por ahora siempre al Splash;
// en F10 mirará la sesión guardada para mandar a (tabs) si ya inició sesión.
export default function Entrada() {
  return <Redirect href="/splash" />;
}
