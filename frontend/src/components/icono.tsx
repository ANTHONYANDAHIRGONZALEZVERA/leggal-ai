import { Canvas, Group, Path } from '@shopify/react-native-skia';

import { colors } from '@/theme';

// Trazos copiados tal cual de los SVG del diseño (viewBox 24×24, trazo
// redondeado). Se dibujan con Skia para no sumar react-native-svg.
const trazos = {
  flecha: { d: 'M5 12h14M13 6l6 6-6 6', grosor: 2.2 },
  volver: { d: 'M15 6l-6 6 6 6', grosor: 2 },
  check: { d: 'M5 12l5 5L20 7', grosor: 3 },
  camara: { d: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', grosor: 2 },
  // Ojo abierto (contraseña a la vista) y tachado (contraseña oculta).
  ojo: { d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', grosor: 1.8 },
  ojoCerrado: {
    d: 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1.1',
    grosor: 1.8,
  },
  // Roles del onboarding 2/5.
  portapapeles: { d: 'M9 4h6v3H9zM6 6h12v15H6zM9 12h6M9 16h4', grosor: 2 },
  calculadora: { d: 'M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01', grosor: 2 },
  maletin: { d: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16', grosor: 2 },
  birrete: { d: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5', grosor: 2 },
  puntos: { d: 'M5 12h.01M12 12h.01M19 12h.01', grosor: 3 },
  // Usos del onboarding 5/5.
  documento: { d: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4', grosor: 2 },
  carpeta: { d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', grosor: 2 },
  lupa: { d: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4', grosor: 2 },
  lapiz: { d: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4', grosor: 2 },
  grafico: { d: 'M5 20V10M12 20V4M19 20v-7', grosor: 2 },
  chispa: { d: 'M12 2l2.2 6.1L20 10l-5.8 2-2.2 6-2.2-6L4 10l5.8-1.9z', grosor: 2 },
  // Solicitud enviada (4/5).
  relojArena: { d: 'M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9', grosor: 2 },
  reloj: { d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2', grosor: 2 },
  cerrar: { d: 'M6 6l12 12M18 6L6 18', grosor: 2.4 },
  campana: { d: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4', grosor: 2 },
  candado: { d: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3', grosor: 2 },
  escudo: { d: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', grosor: 2 },
  balanza: { d:'M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0zM8 21h8', grosor: 1.8 },
} as const;

// Logo de Google: cuatro rellenos de color en un viewBox 48×48.
const google = [
  { color: '#EA4335', d: 'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z' },
  { color: '#4285F4', d: 'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z' },
  { color: '#FBBC05', d: 'M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z' },
  { color: '#34A853', d: 'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z' },
] as const;

export type NombreIcono = keyof typeof trazos | 'google';

type Props = {
  nombre: NombreIcono;
  tamano?: number;
  color?: string;
};

export function Icono({ nombre, tamano = 20, color = colors.texto }: Props) {
  if (nombre === 'google') {
    return (
      <Canvas style={{ width: tamano, height: tamano }}>
        <Group transform={[{ scale: tamano / 48 }]}>
          {google.map((parte) => (
            <Path key={parte.color} path={parte.d} color={parte.color} />
          ))}
        </Group>
      </Canvas>
    );
  }

  const { d, grosor } = trazos[nombre];
  return (
    <Canvas style={{ width: tamano, height: tamano }}>
      <Group transform={[{ scale: tamano / 24 }]}>
        <Path path={d} color={color} style="stroke" strokeWidth={grosor} strokeCap="round" strokeJoin="round" />
      </Group>
    </Canvas>
  );
}
