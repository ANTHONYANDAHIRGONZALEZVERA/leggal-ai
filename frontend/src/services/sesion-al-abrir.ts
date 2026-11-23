import { useEffect, useState } from 'react';

import { api } from './api';

/**
 * Lo máximo que el splash espera la respuesta del refresh. Si la red está
 * lenta, la persona entra con la sesión guardada y el refresh termina después
 * (si la rechaza, Expo Router la lleva al Login en ese momento).
 */
export const ESPERA_MAX_MS = 3000;

/**
 * Al abrir la app, una vez leída la sesión guardada, pregunta al servidor si
 * sigue viva (refresh del contrato B03). Devuelve true cuando ya se puede
 * mostrar la app: terminó el refresh, pasó ESPERA_MAX_MS o no había sesión.
 */
export function useSesionAlDia(sesionLeida: boolean, esperaMaxMs = ESPERA_MAX_MS) {
  const [lista, setLista] = useState(false);

  useEffect(() => {
    if (!sesionLeida) return;
    let vigente = true;
    const mostrar = () => {
      if (vigente) setLista(true);
    };
    const reloj = setTimeout(mostrar, esperaMaxMs);
    api.renovarAlAbrir().finally(() => {
      clearTimeout(reloj);
      mostrar();
    });
    return () => {
      vigente = false;
      clearTimeout(reloj);
    };
  }, [sesionLeida, esperaMaxMs]);

  return lista;
}
