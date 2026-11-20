import { useState } from 'react';
import { View } from 'react-native';

import { AvisoError } from '@/components/aviso-error';
import { Presionable } from '@/components/presionable';
import { Texto } from '@/components/texto';
import { aplicarErrorApi } from '@/services/api/errores-formulario';
import { configApi } from '@/services/api/config';
import { USUARIO_DEMO, USUARIO_NUEVO } from '@/services/api/mock';
import { useSesion } from '@/services/sesion';
import { colors, radius, spacing } from '@/theme';

import { iniciarSesion } from './api';

/**
 * Solo mientras se desarrolla con la API simulada. En la app publicada
 * `__DEV__` es false y este bloque no existe.
 */
export const mostrarAccesoRapido = __DEV__ && configApi.usarMock;

const cuentas = [
  { titulo: 'Demo · Inicio', cuenta: USUARIO_DEMO },
  { titulo: 'Cuenta nueva · Onboarding', cuenta: USUARIO_NUEVO },
] as const;

// Atajo para revisar pantallas sin escribir correo y contraseña cada vez:
// entra con una de las cuentas de prueba de la API simulada.
export function AccesoRapidoDev() {
  const iniciar = useSesion((s) => s.iniciar);
  const [error, setError] = useState<string>();

  if (!mostrarAccesoRapido) return null;

  async function entrar({ correo, contrasena }: { correo: string; contrasena: string }) {
    setError(undefined);
    try {
      iniciar(await iniciarSesion({ correo, contrasena }));
    } catch (e) {
      setError(aplicarErrorApi(e, () => {}, []));
    }
  }

  return (
    <View
      style={{
        alignSelf: 'stretch',
        gap: spacing.xs,
        padding: spacing.sm,
        borderRadius: radius.campo,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.bordeFuerte,
      }}>
      <Texto variante="nota" style={{ textAlign: 'center' }}>
        Solo desarrollo · entrar sin escribir
      </Texto>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {cuentas.map(({ titulo, cuenta }) => (
          <Presionable
            key={cuenta.correo}
            accessibilityLabel={`Entrar como ${titulo}`}
            onPress={() => void entrar(cuenta)}
            style={{
              flex: 1,
              minHeight: 40,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.xs,
              borderRadius: radius.completo,
              backgroundColor: colors.superficie,
              borderWidth: 1,
              borderColor: colors.borde,
            }}>
            <Texto variante="chip" style={{ textAlign: 'center' }}>
              {titulo}
            </Texto>
          </Presionable>
        ))}
      </View>
      <AvisoError mensaje={error} />
    </View>
  );
}
