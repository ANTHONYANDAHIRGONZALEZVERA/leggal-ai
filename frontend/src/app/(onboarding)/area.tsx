import { PantallaTemporal } from '@/components/pantalla-temporal';
import { useSesion } from '@/services/sesion';

// Temporal hasta F30 (paso 2/5): el botón da el onboarding por terminado para
// poder llegar a las pestañas. Al terminarlo, la navegación lleva sola a Inicio.
export default function Area() {
  const completarOnboarding = useSesion((s) => s.completarOnboarding);
  return (
    <PantallaTemporal
      titulo="2/5 ¿En qué área te desempeñas?"
      tarea="F30"
      accion={{ titulo: 'Saltar onboarding (temporal)', onPress: completarOnboarding }}
    />
  );
}
