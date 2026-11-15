// Colores del diseño "Leggal AI — App móvil". La app es solo modo claro (el
// diseño no define modo oscuro), por eso son valores fijos y no semánticos.
export const colors = {
  texto: '#17142E',
  textoSecundario: '#5E5A78',
  etiqueta: '#3A3560',
  acento: '#4B2FE0',
  acentoOscuro: '#2F1BA8',
  acentoClaro: '#7C5CFF',
  fondo: '#F4F1FA',
  fondoBrillo: '#E6DEFF',
  superficie: '#FFFFFF',
  superficieVidrio: 'rgba(255,255,255,0.85)',
  borde: '#E1DBF5',
  bordeFuerte: '#B9AEF0',
  separador: '#DCD5F0',
  verdeAzulado: '#0E8FA3',
  verdeAzuladoOscuro: '#0B7A8B',
  exito: '#0B6F7E',
  error: '#C2334D',
  sobreOscuro: '#FFFFFF',
  splash: {
    fondo: '#120F26',
    texto: '#D3CDEE',
    acento: '#C9BEFF',
    tenue: '#ABA4CF',
    vidrio: 'rgba(255,255,255,0.12)',
    bordeVidrio: 'rgba(255,255,255,0.25)',
    pista: 'rgba(255,255,255,0.18)',
  },
} as const;

// Degradados como cadenas CSS: React Native 0.88 los dibuja de forma nativa
// con la propiedad `backgroundImage`, sin librerías extra.
export const gradients = {
  botonMorado: 'linear-gradient(140deg, #4B2FE0, #7C5CFF)',
  logo: 'linear-gradient(140deg, #5B3DF5, #0E8FA3)',
  progreso: 'linear-gradient(90deg, #4B2FE0, #7C5CFF)',
  medidor: 'linear-gradient(90deg, #7C5CFF, #0E8FA3)',
  carga: 'linear-gradient(90deg, #5FE3F2, #8B7BFF)',
  desvanecer: 'linear-gradient(180deg, rgba(244,241,250,0) 0%, #F4F1FA 92%)',
  fondoClaro: 'radial-gradient(90% 45% at 90% 0%, #E6DEFF 0%, rgba(230,222,255,0) 70%)',
  fondoOscuro:
    'radial-gradient(80% 50% at 50% 38%, #3A2C8F 0%, rgba(58,44,143,0) 70%), radial-gradient(60% 30% at 0% 100%, #0E5E6B 0%, rgba(14,94,107,0) 70%)',
} as const;
