import { useCallback, useEffect, useState } from 'react';

/**
 * Cuenta regresiva en segundos (el "Reenviar código en 0:45"). Se calcula con
 * la hora de término, así no se atrasa si la app pasa a segundo plano. Solo hay
 * un intervalo mientras queda tiempo; en 0 no corre nada.
 */
export function useCuentaRegresiva(segundos: number) {
  const [termina, setTermina] = useState(() => Date.now() + segundos * 1000);
  const [restante, setRestante] = useState(segundos);

  useEffect(() => {
    const calcular = () => Math.max(0, Math.ceil((termina - Date.now()) / 1000));
    if (calcular() === 0) return;
    const reloj = setInterval(() => {
      const quedan = calcular();
      setRestante(quedan);
      if (quedan === 0) clearInterval(reloj);
    }, 1000);
    return () => clearInterval(reloj);
  }, [termina]);

  /** Vuelve a empezar (después de reenviar el código). */
  const reiniciar = useCallback(() => {
    setRestante(segundos);
    setTermina(Date.now() + segundos * 1000);
  }, [segundos]);

  return { restante, reiniciar };
}

/** 45 → "0:45"; 5 → "0:05". */
export const comoReloj = (segundos: number) => `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
