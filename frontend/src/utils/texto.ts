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
