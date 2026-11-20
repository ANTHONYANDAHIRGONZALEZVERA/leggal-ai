import { PantallaTemporal } from '@/components/pantalla-temporal';
import { useSesion } from '@/services/sesion';

// Temporal hasta F30-F31: el botón da el onboarding por terminado para poder
// llegar a las pestañas. Al terminarlo, la navegación lleva sola a Inicio.
export default function Perfil() {
  const completarOnboarding = useSesion((s) => s.completarOnboarding);
  return (
    <PantallaTemporal
      titulo="1/5 ¿Cómo te llamamos?"
      tarea="F30"
      accion={{ titulo: 'Saltar onboarding (temporal)', onPress: completarOnboarding }}
    />
  );
}
