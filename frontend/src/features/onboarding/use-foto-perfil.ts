import { useState } from 'react';
import { Linking } from 'react-native';

import type { Opcion } from '@/components/hoja-opciones';

import { useBorradorOnboarding } from './borrador';
import { consultarPermisoCamara, elegirFoto, pedirPermisoCamara, type OrigenFoto } from './foto';

/**
 * Pausa antes de abrir la galería o la cámara tras cerrar una hoja o la
 * pantalla de permiso. iOS no deja mostrar una vista mientras otra se está
 * cerrando, y ninguna de las dos avisa cuándo terminó de cerrarse.
 */
export const ESPERA_CIERRE_MS = 400;

const NO_SE_PUDO_ABRIR = 'No se pudo abrir la cámara ni la galería. Inténtalo de nuevo.';

/** Pantalla de permiso de cámara: antes del aviso del sistema, o si quedó bloqueado. */
export type AvisoPermiso = 'preguntar' | 'bloqueado' | null;

// Flujo de la foto de perfil del onboarding 1/5: hoja de opciones, permiso de
// cámara explicado antes de pedirlo, y la foto ya preparada en el borrador.
export function useFotoPerfil() {
  const { foto, guardarFoto } = useBorradorOnboarding();
  const [hojaVisible, setHojaVisible] = useState(false);
  const [avisoPermiso, setAvisoPermiso] = useState<AvisoPermiso>(null);
  const [error, setError] = useState<string>();

  const despuesDeCerrar = (accion: () => Promise<void>) => setTimeout(() => void accion(), ESPERA_CIERRE_MS);

  async function abrir(origen: OrigenFoto) {
    setError(undefined);
    try {
      const resultado = await elegirFoto(origen);
      if (resultado.estado === 'lista') guardarFoto(resultado.uri);
      if (resultado.estado === 'invalida') setError(resultado.mensaje);
    } catch {
      setError(NO_SE_PUDO_ABRIR);
    }
  }

  async function tomarFoto() {
    const permiso = await consultarPermisoCamara();
    if (permiso === 'concedido') await abrir('camara');
    else setAvisoPermiso(permiso);
  }

  function elegir(accion: () => Promise<void>) {
    setHojaVisible(false);
    despuesDeCerrar(accion);
  }

  const opciones: Opcion[] = [
    { titulo: 'Tomar foto', onPress: () => elegir(tomarFoto) },
    { titulo: 'Elegir de la galería', onPress: () => elegir(() => abrir('galeria')) },
    ...(foto
      ? [
          {
            titulo: 'Quitar foto',
            onPress: () => {
              setHojaVisible(false);
              guardarFoto(null);
            },
          },
        ]
      : []),
  ];

  /** "Permitir cámara" o, si está bloqueado, "Abrir Ajustes". */
  async function permitir() {
    if (avisoPermiso === 'bloqueado') {
      setAvisoPermiso(null);
      await Linking.openSettings();
      return;
    }
    const permiso = await pedirPermisoCamara();
    if (permiso === 'bloqueado') {
      setAvisoPermiso('bloqueado');
      return;
    }
    setAvisoPermiso(null);
    if (permiso === 'concedido') despuesDeCerrar(() => abrir('camara'));
  }

  return {
    foto,
    error,
    hoja: { visible: hojaVisible, opciones, abrir: () => setHojaVisible(true), cerrar: () => setHojaVisible(false) },
    permiso: { aviso: avisoPermiso, permitir, ahoraNo: () => setAvisoPermiso(null) },
  };
}
