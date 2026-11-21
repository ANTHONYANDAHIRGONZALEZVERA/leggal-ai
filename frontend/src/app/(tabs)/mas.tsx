import { PantallaTemporal } from '@/components/pantalla-temporal';
import { cerrarSesion } from '@/features/auth/api';

// Temporal: "Cerrar sesión" vive aquí para probar el ciclo completo hasta que
// llegue la pantalla "Más" real (F38). Al cerrar, la navegación lleva sola a
// "Bienvenido de nuevo".
export default function Mas() {
  return (
    <PantallaTemporal
      titulo="Más"
      tarea="pantalla marcador (F12)"
      accion={{ titulo: 'Cerrar sesión', onPress: () => void cerrarSesion() }}
    />
  );
}
