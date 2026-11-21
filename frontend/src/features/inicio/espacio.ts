import { useQuery } from '@tanstack/react-query';

import { consultarYo } from '@/features/auth/api';
import type { EmpresaApi, RespuestaYoApi } from '@/services/api/contrato';

export const claveYo = ['yo'] as const;

/**
 * Espacio en el que trabaja la persona ahora (encabezado de Inicio, F12):
 * 1. El de la sesión (`empresaActivaId`, igual al `tid` del token).
 * 2. Si el token aún no trae empresa (por ejemplo, la aprobaron después de
 *    entrar), la primera empresa donde ya es miembro activo.
 * 3. Si no, su espacio personal.
 * Una membresía `en_espera` nunca es el espacio activo: todavía no entró.
 */
export function espacioActivo({ empresaActivaId, empresas }: Pick<RespuestaYoApi, 'empresaActivaId' | 'empresas'>): EmpresaApi | null {
  const activas = empresas.filter((e) => e.estadoMembresia === 'activa');
  return (
    activas.find((e) => e.id === empresaActivaId) ??
    activas.find((e) => e.tipo === 'empresa') ??
    activas.find((e) => e.tipo === 'personal') ??
    null
  );
}

/** Datos de la persona y su espacio activo, desde GET /auth/me (B11). */
export function useEspacioActivo() {
  const consulta = useQuery({ queryKey: claveYo, queryFn: consultarYo, staleTime: 60_000 });
  return {
    espacio: consulta.data ? espacioActivo(consulta.data) : null,
    cargando: consulta.isPending,
  };
}
