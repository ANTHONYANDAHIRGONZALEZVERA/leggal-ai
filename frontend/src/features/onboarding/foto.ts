import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

// Foto de perfil: se elige de la galería o con la cámara y se prepara en el
// teléfono antes de guardarla. Revisar aquí no reemplaza la revisión del
// servidor (cualquiera puede saltarse la app): cuando exista el endpoint, el
// backend debe validar de nuevo (docs/api/foto-perfil-propuesta.md).

/** Formatos que se aceptan. GIF no: puede ser animado y no sirve de avatar. */
export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
/** Peso máximo del archivo original (antes de achicarlo). */
export const PESO_MAX_FOTO = 15 * 1024 * 1024;
/** Lado mínimo: una foto más chica se vería borrosa en el avatar. */
export const LADO_MIN_FOTO = 200;
/** Lado de la foto que se guarda: 512 × 512, en JPEG. */
export const LADO_FOTO = 512;
const CALIDAD_FOTO = 0.8;

export type OrigenFoto = 'galeria' | 'camara';

export type ResultadoFoto = { estado: 'lista'; uri: string } | { estado: 'cancelada' } | { estado: 'invalida'; mensaje: string };

/** Estado del permiso de cámara: ya dado, se puede pedir, o solo desde Ajustes. */
export type PermisoCamara = 'concedido' | 'preguntar' | 'bloqueado';

const MENSAJES = {
  tipo: 'Elige una foto en JPG, PNG, WEBP o HEIC.',
  peso: 'La foto pesa más de 15 MB. Elige otra.',
  chica: 'La foto es muy pequeña. Elige una de al menos 200 × 200.',
  ilegible: 'No pudimos abrir esa imagen. Prueba con otra.',
} as const;

const OPCIONES_SELECTOR: ImagePicker.ImagePickerOptions = {
  // Solo imágenes: nada de videos ni otros archivos.
  mediaTypes: 'images',
  // Recorte cuadrado del sistema (en iOS siempre es cuadrado).
  allowsEditing: true,
  aspect: [1, 1],
  // Sin EXIF ni base64: la app nunca lee la ubicación ni los datos ocultos.
  exif: false,
  base64: false,
  quality: 1,
};

/** Qué tiene de malo la imagen elegida, o null si se puede usar. */
export function revisarFoto(foto: ImagePicker.ImagePickerAsset): string | null {
  if (foto.type && foto.type !== 'image') return MENSAJES.tipo;
  if (foto.mimeType && !TIPOS_FOTO.includes(foto.mimeType.toLowerCase())) return MENSAJES.tipo;
  if (foto.fileSize && foto.fileSize > PESO_MAX_FOTO) return MENSAJES.peso;
  if (Math.min(foto.width, foto.height) < LADO_MIN_FOTO) return MENSAJES.chica;
  return null;
}

/**
 * Deja la foto cuadrada de 512 × 512 en JPEG. Al volver a codificarla solo se
 * copian los píxeles: se pierden el GPS y los demás datos EXIF, y si el
 * archivo no era una imagen de verdad, falla al decodificarlo.
 */
async function prepararFoto({ uri, width, height }: ImagePicker.ImagePickerAsset): Promise<string> {
  const lado = Math.min(width, height);
  const contexto = ImageManipulator.manipulate(uri)
    .crop({ originX: Math.floor((width - lado) / 2), originY: Math.floor((height - lado) / 2), width: lado, height: lado })
    .resize({ width: LADO_FOTO, height: LADO_FOTO });
  const imagen = await contexto.renderAsync();
  const { uri: lista } = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: CALIDAD_FOTO });
  return lista;
}

/** Abre la galería o la cámara y devuelve la foto ya revisada y preparada. */
export async function elegirFoto(origen: OrigenFoto): Promise<ResultadoFoto> {
  const abrir = origen === 'camara' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  const resultado = await abrir(OPCIONES_SELECTOR);
  const foto = resultado.canceled ? undefined : resultado.assets[0];
  if (!foto) return { estado: 'cancelada' };

  const problema = revisarFoto(foto);
  if (problema) return { estado: 'invalida', mensaje: problema };

  try {
    return { estado: 'lista', uri: await prepararFoto(foto) };
  } catch {
    return { estado: 'invalida', mensaje: MENSAJES.ilegible };
  }
}

/** Consulta el permiso de cámara sin mostrar nada al usuario. */
export async function consultarPermisoCamara(): Promise<PermisoCamara> {
  return aPermiso(await ImagePicker.getCameraPermissionsAsync());
}

/** Muestra el aviso del sistema para la cámara (si todavía se puede pedir). */
export async function pedirPermisoCamara(): Promise<PermisoCamara> {
  return aPermiso(await ImagePicker.requestCameraPermissionsAsync());
}

function aPermiso({ granted, canAskAgain }: ImagePicker.CameraPermissionResponse): PermisoCamara {
  if (granted) return 'concedido';
  return canAskAgain ? 'preguntar' : 'bloqueado';
}
