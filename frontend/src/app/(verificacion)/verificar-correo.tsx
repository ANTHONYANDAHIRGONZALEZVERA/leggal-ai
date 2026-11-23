import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { BackHandler, ScrollView, View } from 'react-native';

import { Aparecer } from '@/components/aparecer';
import { AvisoError } from '@/components/aviso-error';
import { Boton } from '@/components/boton';
import { BotonVolver } from '@/components/boton-volver';
import { CampoCodigo } from '@/components/campo-codigo';
import { CampoTexto } from '@/components/campo-texto';
import { EscenaCodigo } from '@/components/escena-codigo';
import { PantallaConEsfera } from '@/components/pantalla-con-esfera';
import { Presionable } from '@/components/presionable';
import { Texto } from '@/components/texto';
import { TituloDestacado } from '@/components/titulo-destacado';
import { cambiarCorreo, cerrarSesion, reenviarCodigo, verificarCorreo } from '@/features/auth/api';
import { esquemaCorreo, type DatosCorreo } from '@/features/auth/esquemas';
import { comoReloj, useCuentaRegresiva } from '@/features/auth/use-cuenta-regresiva';
import { ErrorApi } from '@/services/api/errores';
import { useSesion } from '@/services/sesion';
import { colors, fontFamily, MARGEN_PANTALLA, spacing } from '@/theme';

/** Espera entre reenvíos (plan B27). */
export const ESPERA_REENVIO_S = 45;
const LARGO = 6;

// "Revisa tu correo" (F23): el código de 6 dígitos que llega al registrarse.
// Al verificarlo, la sesión queda con el correo verificado y la navegación
// lleva sola al onboarding. "Cambiar correo" corrige un correo mal escrito.
export default function VerificarCorreo() {
  const usuario = useSesion((s) => s.usuario);
  const [codigo, setCodigo] = useState('');
  const [cambiando, setCambiando] = useState(false);
  const [aviso, setAviso] = useState<string>();
  const { restante, reiniciar } = useCuentaRegresiva(ESPERA_REENVIO_S);

  // Volver (flecha o "atrás" del teléfono) es salir: lleva al inicio de sesión.
  useFocusEffect(
    useCallback(() => {
      const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
        void cerrarSesion();
        return true;
      });
      return () => suscripcion.remove();
    }, []),
  );

  const verificar = useMutation({
    mutationFn: verificarCorreo,
    // Con el correo verificado, la navegación pasa sola al paso 1/5.
    onSuccess: ({ usuario: alDia }) => useSesion.getState().actualizarUsuario(alDia),
  });

  const reenviar = useMutation({
    mutationFn: reenviarCodigo,
    onSuccess: () => {
      reiniciar();
      setCodigo('');
      verificar.reset();
      setAviso('Te enviamos un código nuevo.');
    },
  });

  const formularioCorreo = useForm<DatosCorreo>({
    resolver: zodResolver(esquemaCorreo),
    defaultValues: { correo: usuario?.correo ?? '' },
  });
  const nuevoCorreo = useMutation({
    mutationFn: (correo: string) => cambiarCorreo(correo),
    onSuccess: ({ usuario: alDia }) => {
      useSesion.getState().actualizarUsuario(alDia);
      setCambiando(false);
      setCodigo('');
      verificar.reset();
      reiniciar();
      setAviso(`Te enviamos un código nuevo a ${alDia.correo}.`);
    },
    onError: (error) => {
      if (error instanceof ErrorApi && error.campos?.correo) {
        formularioCorreo.setError('correo', { message: error.campos.correo });
      }
    },
  });
  const enviarCorreo = formularioCorreo.handleSubmit(({ correo }) => nuevoCorreo.mutate(correo));

  function escribir(nuevo: string) {
    setCodigo(nuevo);
    setAviso(undefined);
    if (verificar.isError) verificar.reset();
  }

  const errorCodigo = verificar.error?.message;
  const errorReenvio = reenviar.error?.message;

  return (
    <PantallaConEsfera>
      <StatusBar style="dark" />
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ paddingTop: spacing.xs, paddingHorizontal: spacing.md }}>
          <BotonVolver onPress={() => void cerrarSesion()} accessibilityLabel="Salir y volver al inicio de sesión" />
        </View>

        <EscenaCodigo icono="sobre" fondo="anillos" />

        <View style={{ flex: 1, paddingHorizontal: MARGEN_PANTALLA }}>
          <Aparecer style={{ alignItems: 'center', gap: 8 }}>
            <TituloDestacado texto="Revisa tu" destacado="correo" />
            <Texto variante="subtitulo" style={{ textAlign: 'center' }}>
              Enviamos un código de 6 dígitos a{' '}
              <Texto variante="subtitulo" style={{ color: colors.texto, fontFamily: fontFamily.bold }}>
                {usuario?.correo}
              </Texto>
            </Texto>
          </Aparecer>

          {cambiando ? (
            <Aparecer style={{ paddingTop: 24, gap: 14 }}>
              <Controller
                control={formularioCorreo.control}
                name="correo"
                render={({ field: { onChange, onBlur, value } }) => (
                  <CampoTexto
                    etiqueta="Correo electrónico"
                    placeholder="nombre@empresa.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="send"
                    onSubmitEditing={() => enviarCorreo()}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={formularioCorreo.formState.errors.correo?.message}
                  />
                )}
              />
              <AvisoError mensaje={nuevoCorreo.error && !(nuevoCorreo.error instanceof ErrorApi && nuevoCorreo.error.campos?.correo) ? nuevoCorreo.error.message : undefined} />
            </Aparecer>
          ) : (
            <Aparecer retraso={100} style={{ paddingTop: 28, gap: 10 }}>
              <CampoCodigo
                tipo="numerico"
                valor={codigo}
                onCambiar={escribir}
                onCompleto={(completo) => verificar.mutate(completo)}
                error={Boolean(errorCodigo)}
              />
              {errorCodigo && (
                <Texto variante="nota" accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.error, textAlign: 'center' }}>
                  {errorCodigo}
                </Texto>
              )}
              {aviso && (
                <Texto variante="nota" accessibilityLiveRegion="polite" style={{ color: colors.verdeAzuladoOscuro, textAlign: 'center' }}>
                  {aviso}
                </Texto>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 6 }}>
                <Texto variante="subtitulo">¿No llegó? </Texto>
                {restante > 0 ? (
                  <Texto variante="subtitulo" style={{ fontFamily: fontFamily.bold, fontVariant: ['tabular-nums'] }} accessibilityLabel={`Podrás reenviar el código en ${restante} segundos`}>
                    Reenviar código en {comoReloj(restante)}
                  </Texto>
                ) : (
                  <Presionable accessibilityRole="button" hitSlop={12} disabled={reenviar.isPending} onPress={() => reenviar.mutate()}>
                    <Texto variante="enlace" style={{ fontSize: 14 }}>
                      {reenviar.isPending ? 'Enviando…' : 'Reenviar código'}
                    </Texto>
                  </Presionable>
                )}
              </View>
              {errorReenvio && (
                <Texto variante="nota" accessibilityLiveRegion="polite" style={{ color: colors.error, textAlign: 'center' }}>
                  {errorReenvio}
                </Texto>
              )}
            </Aparecer>
          )}

          <View style={{ flex: 1, minHeight: spacing.xxl }} />

          <View style={{ gap: 12, paddingBottom: spacing.xl }}>
            {cambiando ? (
              <>
                <Boton titulo="Enviar código" icono="flecha" cargando={nuevoCorreo.isPending} onPress={() => enviarCorreo()} />
                <Presionable accessibilityRole="button" style={{ alignSelf: 'center', padding: 12 }} onPress={() => setCambiando(false)}>
                  <Texto variante="enlace" style={{ fontSize: 14 }}>
                    Cancelar
                  </Texto>
                </Presionable>
              </>
            ) : (
              <>
                <Boton
                  titulo="Verificar"
                  icono="flecha"
                  deshabilitado={codigo.length < LARGO}
                  cargando={verificar.isPending}
                  onPress={() => verificar.mutate(codigo)}
                />
                <Presionable
                  accessibilityRole="button"
                  style={{ alignSelf: 'center', padding: 12 }}
                  onPress={() => {
                    formularioCorreo.reset({ correo: usuario?.correo ?? '' });
                    nuevoCorreo.reset();
                    setCambiando(true);
                  }}>
                  <Texto variante="enlace" style={{ fontSize: 14 }}>
                    Cambiar correo
                  </Texto>
                </Presionable>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </PantallaConEsfera>
  );
}
