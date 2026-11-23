import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { almacenSeguro } from './almacen-seguro';
import type { Tokens } from './api/cliente';
import type { RespuestaSesionApi, UsuarioApi } from './api/contrato';

/** La persona con sesión, tal como la describe el contrato B03. */
export type Usuario = UsuarioApi;

type EstadoSesion = {
  usuario: Usuario | null;
  tokens: Tokens | null;
  /** Guarda la respuesta de login, registro o refresh: tokens y usuario al día. */
  iniciar: (sesion: RespuestaSesionApi) => void;
  completarOnboarding: () => void;
  /** Reemplaza los datos de la persona (por ejemplo, al terminar el onboarding). */
  actualizarUsuario: (usuario: Usuario) => void;
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
      iniciar: ({ usuario, tokenAcceso, tokenRefresco }) =>
        set({ usuario, tokens: { acceso: tokenAcceso, renovacion: tokenRefresco } }),
      completarOnboarding: () =>
        set(({ usuario }) => ({ usuario: usuario && { ...usuario, onboardingCompleto: true } })),
      actualizarUsuario: (usuario) => set({ usuario }),
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
export type Acceso = 'invitado' | 'verificar' | 'onboarding' | 'app';

export function useAcceso(): Acceso {
  return useSesion(({ tokens, usuario }) => {
    if (!tokens || !usuario) return 'invitado';
    // Correo sin verificar: primero "Revisa tu correo" (B27). Quien ya terminó
    // el onboarding no se bloquea (cuentas de antes de la verificación).
    if (!usuario.correoVerificado && !usuario.onboardingCompleto) return 'verificar';
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
