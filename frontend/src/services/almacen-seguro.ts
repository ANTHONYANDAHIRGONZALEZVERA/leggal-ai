import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

// Dónde se guarda la sesión. En el teléfono, expo-secure-store la cifra con el
// llavero del sistema (Keystore en Android). En web no existe, así que se usa
// localStorage: la versión web es solo para revisar pantallas en la PC.
export const almacenSeguro: StateStorage =
  Platform.OS === 'web'
    ? {
        getItem: (clave) => globalThis.localStorage?.getItem(clave) ?? null,
        setItem: (clave, valor) => globalThis.localStorage?.setItem(clave, valor),
        removeItem: (clave) => globalThis.localStorage?.removeItem(clave),
      }
    : {
        getItem: (clave) => SecureStore.getItemAsync(clave),
        setItem: (clave, valor) => SecureStore.setItemAsync(clave, valor),
        removeItem: (clave) => SecureStore.deleteItemAsync(clave),
      };
