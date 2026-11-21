import { Redirect, type Href } from 'expo-router';

import { entradaInvitado } from '@/services/entrada';
import { useAcceso, type Acceso } from '@/services/sesion';

// Primera pantalla de cada grupo según la sesión. Sin sesión: el Splash al
// abrir la app y, después, "Bienvenido de nuevo" (services/entrada.ts).
const inicioDe: Record<Acceso, () => Href> = {
  invitado: entradaInvitado,
  onboarding: () => '/perfil',
  app: () => '/inicio',
};

// "/" no es una pantalla: decide a dónde entrar. Se usa al abrir la app y cada
// vez que cambia la sesión (ver app/_layout.tsx).
export default function Entrada() {
  return <Redirect href={inicioDe[useAcceso()]()} />;
}
