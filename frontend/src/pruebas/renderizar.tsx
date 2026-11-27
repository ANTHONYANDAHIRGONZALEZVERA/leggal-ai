import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { crearClienteConsultas } from '@/services/consultas';

// Solo para pruebas: dibuja una pantalla con los mismos proveedores que la app
// (TanStack Query y la raíz de gestos). Cada llamada usa una caché nueva para que una prueba
// no herede datos de otra.
export function renderizar(ui: ReactElement) {
  return render(
    <GestureHandlerRootView>
      <QueryClientProvider client={crearClienteConsultas()}>{ui}</QueryClientProvider>
    </GestureHandlerRootView>,
  );
}
