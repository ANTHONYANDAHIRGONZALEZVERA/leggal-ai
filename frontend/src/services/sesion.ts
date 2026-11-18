import { create } from 'zustand';

import type { Tokens } from './api/cliente';

export type Usuario = { id: string; nombre: string; correo: string };

type EstadoSesion = {
  usuario: Usuario | null;
  tokens: Tokens | null;
  iniciar: (sesion: { usuario: Usuario; tokens: Tokens }) => void;
  actualizarTokens: (tokens: Tokens) => void;
  cerrar: () => void;
};

// Sesión de la persona. Por ahora vive en memoria (se pierde al cerrar la
// app); en F10 se guarda en expo-secure-store y redirige según haya sesión.
export const useSesion = create<EstadoSesion>()((set) => ({
  usuario: null,
  tokens: null,
  iniciar: ({ usuario, tokens }) => set({ usuario, tokens }),
  actualizarTokens: (tokens) => set({ tokens }),
  cerrar: () => set({ usuario: null, tokens: null }),
}));
