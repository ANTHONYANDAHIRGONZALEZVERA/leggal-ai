import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { consultarPermisoCamara, elegirFoto, LADO_FOTO, pedirPermisoCamara, PESO_MAX_FOTO, revisarFoto } from '../foto';

// Foto de perfil: selector del sistema y recorte reemplazados por dobles. Lo
// que importa aquí es qué se acepta, qué se rechaza y cómo se prepara.

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

// Registra cada paso del recorte para revisar qué se le pidió.
const mockPasos: unknown[] = [];
const mockGuardar = jest.fn(async (_opciones: object) => ({ uri: 'file:///cache/lista.jpg', width: LADO_FOTO, height: LADO_FOTO }));
const mockDecodificar = jest.fn(async () => ({ saveAsync: mockGuardar }));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
  ImageManipulator: {
    manipulate: jest.fn((uri: string) => {
      mockPasos.push({ abrir: uri });
      const contexto = {
        crop: (rect: object) => (mockPasos.push({ crop: rect }), contexto),
        resize: (tam: object) => (mockPasos.push({ resize: tam }), contexto),
        renderAsync: () => mockDecodificar(),
      };
      return contexto;
    }),
  },
}));

const selector = jest.mocked(ImagePicker);

/** Foto como la devuelve el selector del sistema. */
function fotoElegida(cambios: Partial<ImagePicker.ImagePickerAsset> = {}): ImagePicker.ImagePickerAsset {
  return { uri: 'file:///fotos/original.jpg', width: 1200, height: 900, type: 'image', mimeType: 'image/jpeg', fileSize: 2_000_000, ...cambios };
}
const elige = (foto: ImagePicker.ImagePickerAsset) =>
  selector.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [foto] });

beforeEach(() => {
  jest.clearAllMocks();
  mockPasos.length = 0;
});

describe('revisarFoto', () => {
  test('acepta JPG, PNG, WEBP y HEIC', () => {
    for (const mimeType of ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/HEIF']) {
      expect(revisarFoto(fotoElegida({ mimeType }))).toBeNull();
    }
  });

  test.each([
    ['un GIF (puede ser animado)', { mimeType: 'image/gif' }, 'JPG, PNG, WEBP o HEIC'],
    ['un SVG', { mimeType: 'image/svg+xml' }, 'JPG, PNG, WEBP o HEIC'],
    ['un PDF', { mimeType: 'application/pdf' }, 'JPG, PNG, WEBP o HEIC'],
    ['un video', { type: 'video' as const, mimeType: 'video/mp4' }, 'JPG, PNG, WEBP o HEIC'],
    ['más de 15 MB', { fileSize: PESO_MAX_FOTO + 1 }, '15 MB'],
    ['menos de 200 px de lado', { width: 199, height: 800 }, 'muy pequeña'],
  ])('rechaza %s', (_caso, cambios, mensaje) => {
    expect(revisarFoto(fotoElegida(cambios))).toContain(mensaje);
  });

  test('si el sistema no informa tipo ni peso, decide la decodificación (no se rechaza aquí)', () => {
    expect(revisarFoto(fotoElegida({ mimeType: undefined, fileSize: undefined }))).toBeNull();
  });
});

describe('elegirFoto', () => {
  test('abre la galería solo con imágenes, recorte cuadrado y sin pedir EXIF', async () => {
    selector.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });

    await elegirFoto('galeria');

    expect(selector.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], exif: false, base64: false }),
    );
    expect(selector.launchCameraAsync).not.toHaveBeenCalled();
  });

  test('"Tomar foto" abre la cámara con las mismas reglas', async () => {
    selector.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null });

    await elegirFoto('camara');

    expect(selector.launchCameraAsync).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: 'images', exif: false }));
  });

  test('si cancela, no hace nada más', async () => {
    selector.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });

    await expect(elegirFoto('galeria')).resolves.toEqual({ estado: 'cancelada' });
    expect(ImageManipulator.manipulate).not.toHaveBeenCalled();
  });

  test('recorta el centro en cuadrado, la deja de 512 × 512 y la guarda en JPEG', async () => {
    elige(fotoElegida({ width: 1200, height: 900 }));

    await expect(elegirFoto('galeria')).resolves.toEqual({ estado: 'lista', uri: 'file:///cache/lista.jpg' });

    expect(mockPasos).toEqual([
      { abrir: 'file:///fotos/original.jpg' },
      { crop: { originX: 150, originY: 0, width: 900, height: 900 } },
      { resize: { width: LADO_FOTO, height: LADO_FOTO } },
    ]);
    expect(mockGuardar).toHaveBeenCalledWith({ format: SaveFormat.JPEG, compress: 0.8 });
  });

  test('una imagen rechazada no llega a procesarse', async () => {
    elige(fotoElegida({ mimeType: 'image/gif' }));

    await expect(elegirFoto('galeria')).resolves.toMatchObject({ estado: 'invalida' });
    expect(ImageManipulator.manipulate).not.toHaveBeenCalled();
  });

  test('si el archivo no se puede mockDecodificar (no es una imagen de verdad), la rechaza', async () => {
    elige(fotoElegida());
    mockDecodificar.mockRejectedValueOnce(new Error('formato desconocido'));

    await expect(elegirFoto('galeria')).resolves.toEqual({
      estado: 'invalida',
      mensaje: 'No pudimos abrir esa imagen. Prueba con otra.',
    });
  });
});

describe('permiso de cámara', () => {
  const respuesta = (granted: boolean, canAskAgain: boolean) =>
    ({ granted, canAskAgain, status: granted ? 'granted' : 'denied', expires: 'never' }) as ImagePicker.CameraPermissionResponse;

  test.each([
    [true, true, 'concedido'],
    [false, true, 'preguntar'],
    [false, false, 'bloqueado'],
  ] as const)('dado=%s, se puede pedir=%s → %s', async (dado, sePuedePedir, esperado) => {
    selector.getCameraPermissionsAsync.mockResolvedValue(respuesta(dado, sePuedePedir));
    selector.requestCameraPermissionsAsync.mockResolvedValue(respuesta(dado, sePuedePedir));

    await expect(consultarPermisoCamara()).resolves.toBe(esperado);
    await expect(pedirPermisoCamara()).resolves.toBe(esperado);
  });
});
