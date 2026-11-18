import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { crearClienteConsultas } from '@/services/consultas';

// Solo para pruebas: dibuja una pantalla con los mismos proveedores que la app
// (hoy, TanStack Query). Cada llamada usa una caché nueva para que una prueba
// no herede datos de otra.
export function renderizar(ui: ReactElement) {
  return render(<QueryClientProvider client={crearClienteConsultas()}>{ui}</QueryClientProvider>);
}
