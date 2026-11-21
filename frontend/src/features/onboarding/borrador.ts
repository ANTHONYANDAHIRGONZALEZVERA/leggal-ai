import { create } from 'zustand';

import type { EmpresaResumen, SolicitudAcceso } from '@/features/empresas/contrato';

import type { AreaValidada, Modo, PerfilValidado } from './esquemas';

type Borrador = {
  perfil: PerfilValidado | null;
  /** Foto de perfil ya preparada (archivo local del teléfono), o null si no eligió. */
  foto: string | null;
  area: AreaValidada | null;
  modo: Modo | null;
  /** 4/5: solicitud enviada con un código (puede seguir pendiente al terminar). */
  solicitud: SolicitudAcceso | null;
  /** 4/5: empresa creada por la persona (ya existe en el servidor). */
  empresa: EmpresaResumen | null;
  guardarPerfil: (perfil: PerfilValidado) => void;
  guardarFoto: (foto: string | null) => void;
  guardarArea: (area: AreaValidada) => void;
  guardarModo: (modo: Modo) => void;
  guardarSolicitud: (solicitud: SolicitudAcceso | null) => void;
  guardarEmpresa: (empresa: EmpresaResumen) => void;
  vaciar: () => void;
};

// Respuestas del onboarding mientras la persona avanza por los 5 pasos. Se
// envían juntas al servidor al final (F31); si vuelve atrás, cada paso
// encuentra lo que ya había llenado. Vive en memoria: es un borrador.
export const useBorradorOnboarding = create<Borrador>()((set) => ({
  perfil: null,
  foto: null,
  area: null,
  modo: null,
  solicitud: null,
  empresa: null,
  guardarPerfil: (perfil) => set({ perfil }),
  guardarFoto: (foto) => set({ foto }),
  guardarArea: (area) => set({ area }),
  guardarModo: (modo) => set({ modo }),
  guardarSolicitud: (solicitud) => set({ solicitud }),
  guardarEmpresa: (empresa) => set({ empresa }),
  vaciar: () => set({ perfil: null, foto: null, area: null, modo: null, solicitud: null, empresa: null }),
}));
