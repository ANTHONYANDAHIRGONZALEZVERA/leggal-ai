# Frontend (Expo)
- Expo Router, TypeScript, TanStack Query, Zustand.
- Reutilizar componentes y tokens del tema; no duplicar estilos.
- Animaciones con Reanimated y Skia; respetar "reducir movimiento".
- Pruebas: Jest + React Native Testing Library; flujos completos con Maestro.
- Usar las skills de Expo (plugin expo@anthropic-plugin-directory) para estructura,
  navegación, animaciones y compilación con EAS.

## Optimización (siempre, en cada cambio)
Antes de dar por terminada una pantalla o componente, revisar su rendimiento:
- Animar solo `transform` y `opacity`, en el hilo de UI (Reanimated). Nada de
  `setState` por cuadro.
- Pausar lo que no se ve: las pestañas nativas dejan las pantallas montadas
  (usar `useIsFocused` y la prop `pausada` de Esfera, Anillo y Ondas). Al
  reanudar, seguir sin salto (`bucleDesde` en `src/utils/animacion.ts`).
- Si una animación depende de una medida (`onLayout`), usar valores
  compartidos (`withRepeat`/`withTiming`): en Android, una animación CSS
  agregada después de montar no arranca. Medir en la vista animada.
- Listas largas con `FlatList`/`FlashList`; consultas con caché de TanStack
  Query (`staleTime`) y sin reintentos donde cuentan para un límite.
- En Jest las animaciones no corren: probar el cálculo y confirmar en el
  teléfono.
