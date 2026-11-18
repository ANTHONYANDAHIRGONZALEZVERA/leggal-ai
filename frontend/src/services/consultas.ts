import { QueryClient } from '@tanstack/react-query';

// Caché de datos del servidor (TanStack Query) para toda la app.
export function crearClienteConsultas() {
  return new QueryClient({
    defaultOptions: {
      // Los datos se consideran frescos 5 minutos; si una consulta falla se
      // reintenta 2 veces. Las acciones (login, registro) no se reintentan
      // solas: la persona decide si vuelve a enviar.
      queries: { staleTime: 5 * 60 * 1000, retry: 2 },
      mutations: { retry: false },
    },
  });
}
