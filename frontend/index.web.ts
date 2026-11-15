import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

// En el navegador Skia necesita descargar canvaskit.wasm (lo copia
// "postinstall" a public/) antes de que se dibuje cualquier esfera o ícono.
LoadSkiaWeb({ locateFile: (archivo: string) => `/${archivo}` }).then(() => {
  require('expo-router/entry');
});
