import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import { Platform } from 'react-native';

import { useSesion } from '../sesion';

import { crearClienteApi } from './cliente';
import { configApi } from './config';
import { transporteSimulado } from './mock';

export { ErrorApi, MENSAJE_GENERICO } from './errores';

/**
 * Cabeceras del contrato B03 para la auditoría: `X-Dispositivo` (android, ios
 * o web) y, si se conoce, `X-Version-App` (1.0.0).
 */
export function cabecerasDeDispositivo(plataforma: string, version?: string): Record<string, string> {
  return { 'X-Dispositivo': plataforma, ...(version && { 'X-Version-App': version }) };
}

// Cliente que usa toda la app. Lee y guarda los tokens en la sesión; si el
// servidor ya no la acepta, la cierra (F10 llevará entonces al Login).
export const api = crearClienteApi({
  urlBase: configApi.urlBase,
  transporte: configApi.usarMock ? transporteSimulado : (url, init) => fetch(url, init),
  cabeceras: cabecerasDeDispositivo(Platform.OS, Constants.expoConfig?.version),
  obtenerTokens: () => useSesion.getState().tokens,
  guardarSesion: (sesion) => useSesion.getState().iniciar(sesion),
  alExpirarSesion: () => useSesion.getState().cerrar(),
  limiteMs: configApi.limiteMs,
});
