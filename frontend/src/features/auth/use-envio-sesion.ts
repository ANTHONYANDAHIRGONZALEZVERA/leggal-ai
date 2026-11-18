import { useMutation } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { aplicarErrorApi } from '@/services/api/errores-formulario';
import { useSesion } from '@/services/sesion';

import type { RespuestaSesion } from './api';

type Opciones<T extends FieldValues> = {
  /** Petición que devuelve la sesión: iniciarSesion o registrarse. */
  peticion: (datos: T) => Promise<RespuestaSesion>;
  /** A dónde ir cuando sale bien. */
  destino: Href;
  setError: UseFormSetError<T>;
  /** Campos del formulario que pueden recibir un error del servidor. */
  campos: readonly Path<T>[];
};

// Envío común de Login y Registro: llama a la API, guarda la sesión y navega;
// si falla, pone el error en su campo o devuelve un aviso general.
export function useEnvioSesion<T extends FieldValues>({ peticion, destino, setError, campos }: Opciones<T>) {
  const iniciar = useSesion((s) => s.iniciar);
  const { mutateAsync } = useMutation({ mutationFn: peticion });
  const [errorGeneral, setErrorGeneral] = useState<string>();

  async function enviar(datos: T) {
    setErrorGeneral(undefined);
    try {
      iniciar(await mutateAsync(datos));
      router.replace(destino);
    } catch (error) {
      setErrorGeneral(aplicarErrorApi(error, setError, campos));
    }
  }

  return { enviar, errorGeneral };
}
