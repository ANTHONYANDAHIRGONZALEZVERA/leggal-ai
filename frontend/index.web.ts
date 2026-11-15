import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

// En web, Skia crea su API en el momento en que se importa usando
// global.CanvasKit. Por eso canvaskit.wasm (lo copia "postinstall" a public/)
// se carga aquí, antes de importar la app: si cualquier pantalla con esferas
// se importara primero, Skia quedaría creado sin motor.
LoadSkiaWeb({ locateFile: (archivo: string) => `/${archivo}` }).then(() => {
  require('expo-router/entry');
});
