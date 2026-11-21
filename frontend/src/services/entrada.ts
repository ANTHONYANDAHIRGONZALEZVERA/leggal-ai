import type { Href } from 'expo-router';

// El Splash es la portada de la app: se ve solo al abrirla sin sesión. Si la
// persona sale después (cerrar sesión, "atrás" en el paso 1/5 o la sesión
// cerrada desde otro lado), vuelve directo a "Bienvenido de nuevo".

let appAbierta = false;

/** Primera pantalla de quien no tiene sesión: el Splash solo al abrir la app. */
export const entradaInvitado = (): Href => (appAbierta ? '/iniciar-sesion' : '/splash');

/** Ya estuvo dentro con sesión (lo marca app/_layout.tsx). */
export function marcarAppAbierta() {
  appAbierta = true;
}

/** Solo pruebas: como si la app se abriera de nuevo. */
export function reiniciarEntrada() {
  appAbierta = false;
}
