// Utilidades de texto compartidas.

/** "Pérez Núñez" → "Perez Nunez": quita tildes y diéresis. */
export function quitarAcentos(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Iniciales para el avatar: "Andrea Ruiz" → "AR"; "Ana" → "A"; vacío → "". */
export function iniciales(nombre: string) {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '';
  const primera = palabras[0][0];
  const ultima = palabras.length > 1 ? palabras[palabras.length - 1][0] : '';
  return (primera + ultima).toUpperCase();
}

/** Primer nombre para saludar: "Andrea Ruiz" → "Andrea"; vacío → "". */
export function primerNombre(nombre: string) {
  return nombre.trim().split(/\s+/)[0] ?? '';
}

/** Cierra una frase con punto sin duplicarlo: "ACCONS S.A.S." no queda "S.A.S..". */
export function conPunto(frase: string) {
  return /[.!?…]$/.test(frase) ? frase : `${frase}.`;
}
