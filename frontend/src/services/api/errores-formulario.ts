import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ErrorApi, MENSAJE_GENERICO } from './errores';

// Lleva un error de la API al formulario: si el servidor señala un campo (por
// ejemplo "correo ya registrado"), el mensaje aparece debajo de ese campo; si
// no, se devuelve para mostrarlo como aviso general sobre el botón.

// Errores que el backend envía sin `campos` (contrato B03) pero que la persona
// corrige en un campo concreto: el mensaje va debajo de ese campo.
const campoDelCodigo: Record<string, { campo: string; mensaje: string }> = {
  CORREO_EN_USO: { campo: 'correo', mensaje: 'Ya existe una cuenta con este correo' },
};

export function aplicarErrorApi<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  campos: readonly Path<T>[],
): string | undefined {
  if (!(error instanceof ErrorApi)) return MENSAJE_GENERICO;

  const deCodigo = campoDelCodigo[error.codigo];
  const porCampo = error.campos ?? (deCodigo ? { [deCodigo.campo]: deCodigo.mensaje } : {});

  let marcoCampo = false;
  for (const [campo, mensaje] of Object.entries(porCampo)) {
    const conocido = campos.find((c) => c === campo);
    if (conocido) {
      setError(conocido, { type: 'servidor', message: mensaje }, { shouldFocus: !marcoCampo });
      marcoCampo = true;
    }
  }
  return marcoCampo ? undefined : error.message;
}
