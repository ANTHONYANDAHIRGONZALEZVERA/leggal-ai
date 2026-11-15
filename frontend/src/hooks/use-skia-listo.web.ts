import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { useEffect, useState } from 'react';

// En el navegador Skia necesita descargar canvaskit.wasm (lo copia
// "postinstall" a public/) antes de dibujar cualquier esfera o ícono.
// Empieza en false también en el servidor: allí no hay Skia y el efecto no
// corre, así el render del servidor no intenta dibujar nada.
export function useSkiaListo() {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let activo = true;
    LoadSkiaWeb({ locateFile: (archivo: string) => `/${archivo}` }).then(() => {
      if (activo) setListo(true);
    });
    return () => {
      activo = false;
    };
  }, []);

  return listo;
}
