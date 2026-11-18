import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import { Platform } from 'react-native';

import { useSesion } from '../sesion';

import { crearClienteApi } from './cliente';
import { configApi } from './config';
import { transporteSimulado } from './mock';

export { ErrorApi, MENSAJE_GENERICO } from './errores';

// Cliente que usa toda la app. Lee y guarda los tokens en la sesión; si el
// servidor ya no la acepta, la cierra (F10 llevará entonces al Login).
export const api = crearClienteApi({
  urlBase: configApi.urlBase,
  transporte: configApi.usarMock ? transporteSimulado : (url, init) => fetch(url, init),
  // Permite al backend registrar desde qué plataforma y versión se conecta.
  cabeceras: { 'X-Dispositivo': `${Platform.OS}/${Constants.expoConfig?.version ?? 'desconocida'}` },
  obtenerTokens: () => useSesion.getState().tokens,
  guardarTokens: (tokens) => useSesion.getState().actualizarTokens(tokens),
  alExpirarSesion: () => useSesion.getState().cerrar(),
  limiteMs: configApi.limiteMs,
});
