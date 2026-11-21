import { PantallaTemporal } from '@/components/pantalla-temporal';
import { useSesion } from '@/services/sesion';

// Temporal hasta F33 (paso 4/5, solo en modo Colaborativo): el botón da el
// onboarding por terminado para poder llegar a las pestañas.
export default function Empresa() {
  const completarOnboarding = useSesion((s) => s.completarOnboarding);
  return (
    <PantallaTemporal
      titulo="4/5 Conéctate a tu empresa"
      tarea="F33"
      accion={{ titulo: 'Saltar onboarding (temporal)', onPress: completarOnboarding }}
    />
  );
}
