import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { aplicarErrorApi } from '@/services/api/errores-formulario';
import { useSesion } from '@/services/sesion';

import type { RespuestaSesion } from './api';

type Opciones<T extends FieldValues> = {
  /** Petición que devuelve la sesión: iniciarSesion o registrarse. */
  peticion: (datos: T) => Promise<RespuestaSesion>;
  setError: UseFormSetError<T>;
  /** Campos del formulario que pueden recibir un error del servidor. */
  campos: readonly Path<T>[];
};

// Envío común de Login y Registro: llama a la API y guarda la sesión; si
// falla, pone el error en su campo o devuelve un aviso general. No navega: al
// haber sesión, app/_layout.tsx cambia las pantallas disponibles y lleva a
// Inicio o al onboarding según corresponda.
export function useEnvioSesion<T extends FieldValues>({ peticion, setError, campos }: Opciones<T>) {
  const iniciar = useSesion((s) => s.iniciar);
  const { mutateAsync } = useMutation({ mutationFn: peticion });
  const [errorGeneral, setErrorGeneral] = useState<string>();

  async function enviar(datos: T) {
    setErrorGeneral(undefined);
    try {
      iniciar(await mutateAsync(datos));
    } catch (error) {
      setErrorGeneral(aplicarErrorApi(error, setError, campos));
    }
  }

  return { enviar, errorGeneral };
}
