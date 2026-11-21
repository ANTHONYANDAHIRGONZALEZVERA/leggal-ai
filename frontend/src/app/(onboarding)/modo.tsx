import { PantallaTemporal } from '@/components/pantalla-temporal';
import { useSesion } from '@/services/sesion';

// Temporal hasta F31 (paso 3/5): el botón da el onboarding por terminado para
// poder llegar a las pestañas. Al terminarlo, la navegación lleva sola a Inicio.
export default function Modo() {
  const completarOnboarding = useSesion((s) => s.completarOnboarding);
  return (
    <PantallaTemporal
      titulo="3/5 ¿Cómo vas a trabajar?"
      tarea="F31"
      accion={{ titulo: 'Saltar onboarding (temporal)', onPress: completarOnboarding }}
    />
  );
}
