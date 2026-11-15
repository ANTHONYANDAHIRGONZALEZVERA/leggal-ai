// Preparación común de todas las pruebas del frontend.
import { setUpTests } from 'react-native-reanimated';

// Reanimated corre sus animaciones en el hilo de UI del teléfono, que no existe
// en Jest. Su resolver (en package.json) carga la versión en JavaScript y esto
// agrega sus utilidades de prueba (por ejemplo, leer estilos animados).
setUpTests();
