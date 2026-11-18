// Configuración de la conexión con el backend. Las variables EXPO_PUBLIC_ se
// copian dentro de la app al compilar: nunca deben llevar secretos.
const urlBase = process.env.EXPO_PUBLIC_API_URL ?? '';

export const configApi = {
  urlBase,
  // Sin URL configurada se usa la API simulada: así la app funciona recién
  // clonada, sin backend ni archivo .env.
  usarMock: process.env.EXPO_PUBLIC_API_MOCK === 'true' || urlBase === '',
  /** Tiempo máximo de espera de cada petición. */
  limiteMs: 15_000,
} as const;
