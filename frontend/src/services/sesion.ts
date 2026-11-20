import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { almacenSeguro } from './almacen-seguro';
import type { Tokens } from './api/cliente';

export type Usuario = {
  id: string;
  nombre: string;
  correo: string;
  /** false hasta terminar los 5 pasos de bienvenida (F30-F31). */
  onboardingCompleto: boolean;
};

type EstadoSesion = {
  usuario: Usuario | null;
  tokens: Tokens | null;
  iniciar: (sesion: { usuario: Usuario; tokens: Tokens }) => void;
  actualizarTokens: (tokens: Tokens) => void;
  completarOnboarding: () => void;
  cerrar: () => void;
};

// Clave en el almacén seguro. Solo letras, números, ".", "-" y "_": es lo que
// acepta expo-secure-store.
export const CLAVE_SESION = 'leggal.sesion';

// Sesión de la persona, guardada cifrada en el teléfono: al volver a abrir la
// app sigue dentro. La navegación (app/_layout.tsx) decide qué pantallas se
// pueden ver según este estado.
export const useSesion = create<EstadoSesion>()(
  persist(
    (set) => ({
      usuario: null,
      tokens: null,
      iniciar: ({ usuario, tokens }) => set({ usuario, tokens }),
      actualizarTokens: (tokens) => set({ tokens }),
      completarOnboarding: () =>
        set(({ usuario }) => ({ usuario: usuario && { ...usuario, onboardingCompleto: true } })),
      cerrar: () => set({ usuario: null, tokens: null }),
    }),
    {
      name: CLAVE_SESION,
      storage: createJSONStorage(() => almacenSeguro),
      // Solo se guardan los datos; las funciones se crean de nuevo al abrir.
      partialize: ({ usuario, tokens }) => ({ usuario, tokens }),
    },
  ),
);

/**
 * Qué parte de la app puede ver la persona:
 * - invitado: sin sesión (Splash, Login, Registro).
 * - onboarding: con sesión, pero sin terminar los pasos de bienvenida.
 * - app: con sesión y onboarding hecho (pestañas).
 */
export type Acceso = 'invitado' | 'onboarding' | 'app';

export function useAcceso(): Acceso {
  return useSesion(({ tokens, usuario }) => {
    if (!tokens || !usuario) return 'invitado';
    return usuario.onboardingCompleto ? 'app' : 'onboarding';
  });
}

/**
 * true cuando ya se leyó la sesión guardada. Leer el almacén seguro tarda un
 * momento: hasta entonces no se sabe si mostrar el Login o el Inicio.
 */
export function useSesionLeida() {
  return useSyncExternalStore(
    (avisar) => useSesion.persist.onFinishHydration(avisar),
    () => useSesion.persist.hasHydrated(),
  );
}
