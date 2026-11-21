import { Easing, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

/**
 * Bucle lineal de 0 a `hasta` que retoma desde `actual` sin saltos: primero
 * termina la vuelta en curso (solo el tiempo que le falta) y después repite
 * vueltas completas. Sirve para pausar una animación (cancelAnimation) y
 * reanudarla donde quedó. `hasta` debe verse igual que 0 (una vuelta entera).
 */
export function bucleDesde(actual: number, hasta: number, duracion: number) {
  const lineal = { easing: Easing.linear };
  return withSequence(
    withTiming(hasta, { ...lineal, duration: tiempoRestante(actual, hasta, duracion) }),
    withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(hasta, { ...lineal, duration: duracion })), -1),
  );
}

/** Lo que le falta a la vuelta en curso: desde 0 es una vuelta entera; a la mitad, media. */
export function tiempoRestante(actual: number, hasta: number, duracion: number) {
  const dentro = ((actual % hasta) + hasta) % hasta;
  return (1 - dentro / hasta) * duracion;
}
