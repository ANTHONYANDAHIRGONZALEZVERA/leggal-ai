import { create } from 'zustand';

import type { PerfilValidado } from './esquemas';

type Borrador = {
  perfil: PerfilValidado | null;
  /** Foto de perfil ya preparada (archivo local del teléfono), o null si no eligió. */
  foto: string | null;
  guardarPerfil: (perfil: PerfilValidado) => void;
  guardarFoto: (foto: string | null) => void;
  vaciar: () => void;
};

// Respuestas del onboarding mientras la persona avanza por los 5 pasos. Se
// envían juntas al servidor al final (F31); si vuelve atrás, cada paso
// encuentra lo que ya había llenado. Vive en memoria: es un borrador.
export const useBorradorOnboarding = create<Borrador>()((set) => ({
  perfil: null,
  foto: null,
  guardarPerfil: (perfil) => set({ perfil }),
  guardarFoto: (foto) => set({ foto }),
  vaciar: () => set({ perfil: null, foto: null }),
}));
