import { colors } from '@/theme';

import { Texto } from './texto';

// Error general de un formulario (por ejemplo "Correo o contraseña
// incorrectos"), sobre el botón principal. El lector de pantalla lo anuncia
// apenas aparece.
export function AvisoError({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <Texto
      variante="nota"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ alignSelf: 'stretch', textAlign: 'center', color: colors.error }}>
      {mensaje}
    </Texto>
  );
}
