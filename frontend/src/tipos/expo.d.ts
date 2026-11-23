// Tipos de Expo (entre ellos las propiedades de animación CSS de los estilos,
// como animationName). Expo los carga desde expo-env.d.ts, pero ese archivo
// solo se genera al correr `expo start` y no va a git; sin esta referencia el
// CI revisaba los tipos distinto que el computador de desarrollo.
/// <reference types="expo/types" />
