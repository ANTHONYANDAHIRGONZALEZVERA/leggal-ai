// Lectura del vencimiento de un token JWT ("exp"), sin verificar la firma: la
// app no decide si un token es válido (eso lo hace el backend), solo si
// conviene renovarlo antes de usarlo.

/** Momento en que vence el token, en milisegundos; null si no se puede leer. */
export function leerVencimiento(token: string): number | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    // base64url → base64 normal, con el relleno "=" que atob necesita.
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const carga: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    const exp = typeof carga === 'object' && carga !== null && 'exp' in carga ? carga.exp : undefined;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Margen del plan (F10): si al token le queda menos que esto, se renueva antes. */
export const MARGEN_RENOVACION_MS = 60_000;

export function vencePronto(token: string, ahora = Date.now()) {
  const vence = leerVencimiento(token);
  return vence !== null && vence - ahora < MARGEN_RENOVACION_MS;
}
