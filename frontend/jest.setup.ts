// Preparación común de todas las pruebas del frontend.
import { setUpTests } from 'react-native-reanimated';

// Reanimated corre sus animaciones en el hilo de UI del teléfono, que no existe
// en Jest. Su resolver (en package.json) carga la versión en JavaScript y esto
// agrega sus utilidades de prueba (por ejemplo, leer estilos animados).
setUpTests();

// El almacén cifrado del teléfono no existe en Jest: se reemplaza por uno en
// memoria con las mismas funciones. Las pruebas lo vacían con __vaciar().
jest.mock('expo-secure-store', () => {
  const datos = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (clave: string) => datos.get(clave) ?? null),
    setItemAsync: jest.fn(async (clave: string, valor: string) => {
      datos.set(clave, valor);
    }),
    deleteItemAsync: jest.fn(async (clave: string) => {
      datos.delete(clave);
    }),
    __vaciar: () => datos.clear(),
  };
});
