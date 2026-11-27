// Preparación común de todas las pruebas del frontend.
import { setUpTests } from 'react-native-reanimated';

// Reanimated corre sus animaciones en el hilo de UI del teléfono, que no existe
// en Jest. Su resolver (en package.json) carga la versión en JavaScript y esto
// agrega sus utilidades de prueba (por ejemplo, leer estilos animados).
setUpTests();

// Gesture Handler (además de su jestSetup, en package.json) pide al cargarse
// el hilo de UI de Worklets, que en Jest no existe y lanza un error al
// terminar la prueba. Se le da uno vacío; lo demás de Worklets queda igual.
jest.mock('react-native-worklets', () => ({
  ...jest.requireActual('react-native-worklets'),
  getUIRuntimeHolder: () => ({}),
}));

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

// @expo/ui dibuja vistas nativas (SwiftUI / Compose) que en Jest quedan como
// cajas vacías sin texto. Se reemplaza por equivalentes simples: la hoja
// muestra su contenido solo si está abierta y los botones se pueden tocar.
jest.mock('@expo/ui', () => {
  const { createElement } = require('react');
  const { Pressable, Text, View } = require('react-native');
  const Contenedor = ({ children }: { children?: unknown }) => createElement(View, null, children);
  return {
    Host: Contenedor,
    Column: Contenedor,
    BottomSheet: ({ isPresented, children }: { isPresented: boolean; children?: unknown }) =>
      isPresented ? createElement(View, { testID: 'hoja' }, children) : null,
    Button: ({ label, onPress }: { label: string; onPress?: () => void }) =>
      createElement(Pressable, { accessibilityRole: 'button', onPress }, createElement(Text, null, label)),
  };
});
