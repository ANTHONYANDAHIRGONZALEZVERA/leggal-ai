import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { claveDisponibilidad, consultarUsuario } from './api';
import { esquemaUsuario } from './usuario';

/** Espera tras la última tecla antes de consultar: no una petición por letra. */
export const ESPERA_CONSULTA_MS = 400;

export type EstadoUsuario = 'invalido' | 'revisando' | 'disponible' | 'ocupado' | 'error';

// Revisa en el servidor si el @usuario está libre mientras la persona escribe.
// Solo consulta nombres con formato válido y guarda cada respuesta en caché,
// así volver a un nombre ya revisado (o tocar una sugerencia) es instantáneo.
export function useDisponibilidad(texto: string) {
  const validado = esquemaUsuario.safeParse(texto);
  const usuario = validado.success ? validado.data : '';
  const consultado = useDiferido(usuario, ESPERA_CONSULTA_MS);

  const consulta = useQuery({
    queryKey: claveDisponibilidad(consultado),
    queryFn: () => consultarUsuario(consultado),
    enabled: consultado !== '',
    staleTime: 30_000,
    // Mientras revisa un nombre nuevo, las sugerencias anteriores siguen a la
    // vista en vez de desaparecer y volver.
    placeholderData: keepPreviousData,
  });

  let estado: EstadoUsuario;
  if (!usuario) estado = 'invalido';
  else if (consultado !== usuario || consulta.isPending || consulta.isPlaceholderData) estado = 'revisando';
  else if (consulta.isError) estado = 'error';
  else estado = consulta.data.disponible ? 'disponible' : 'ocupado';

  return { estado, sugerencias: consulta.data?.sugerencias ?? [] };
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
