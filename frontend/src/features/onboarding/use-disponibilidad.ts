import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { claveDisponibilidad, claveSugerencias, consultarUsuario, sugerirUsuarios } from './api';
import { esquemaUsuario } from './usuario';

/** Espera tras la última tecla antes de consultar: no una petición por letra. */
export const ESPERA_CONSULTA_MS = 400;

/** Letras mínimas del nombre para empezar a sugerir. */
const MINIMO_NOMBRE_SUGERENCIAS = 2;

export type EstadoUsuario = 'vacio' | 'invalido' | 'revisando' | 'disponible' | 'ocupado' | 'error';

// Revisa en el servidor si el @usuario está libre mientras la persona escribe.
// Solo consulta nombres con formato válido y guarda cada respuesta en caché,
// así volver a un nombre ya revisado (o tocar una sugerencia) es instantáneo.
export function useDisponibilidad(texto: string): EstadoUsuario {
  const validado = esquemaUsuario.safeParse(texto);
  const usuario = validado.success ? validado.data : '';
  const consultado = useDiferido(usuario, ESPERA_CONSULTA_MS);

  const consulta = useQuery({
    queryKey: claveDisponibilidad(consultado),
    queryFn: () => consultarUsuario(consultado),
    enabled: consultado !== '',
    staleTime: 30_000,
  });

  if (!texto.trim()) return 'vacio';
  if (!usuario) return 'invalido';
  if (consultado !== usuario || consulta.isPending) return 'revisando';
  if (consulta.isError) return 'error';
  return consulta.data.disponible ? 'disponible' : 'ocupado';
}

// Sugerencias de @usuario según el nombre visible que se va escribiendo.
export function useSugerencias(nombre: string): string[] {
  const limpio = nombre.trim().replace(/\s+/g, ' ');
  const consultado = useDiferido(limpio.length >= MINIMO_NOMBRE_SUGERENCIAS ? limpio : '', ESPERA_CONSULTA_MS);

  const consulta = useQuery({
    queryKey: claveSugerencias(consultado),
    queryFn: () => sugerirUsuarios(consultado),
    enabled: consultado !== '',
    staleTime: 30_000,
    // Mientras busca para el nombre nuevo, las anteriores siguen a la vista en
    // vez de desaparecer y volver a cada letra.
    placeholderData: keepPreviousData,
  });

  return consultado ? (consulta.data?.sugerencias ?? []) : [];
}

/** El valor, pero solo cuando dejó de cambiar durante `ms`. */
function useDiferido<T>(valor: T, ms: number) {
  const [diferido, setDiferido] = useState(valor);
  useEffect(() => {
    const reloj = setTimeout(() => setDiferido(valor), ms);
    return () => clearTimeout(reloj);
  }, [valor, ms]);
  return diferido;
}
