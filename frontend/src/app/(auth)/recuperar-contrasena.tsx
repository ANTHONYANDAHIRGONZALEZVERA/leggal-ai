import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';

import { Aparecer } from '@/components/aparecer';
import { AvisoError } from '@/components/aviso-error';
import { Boton } from '@/components/boton';
import { BotonVolver } from '@/components/boton-volver';
import { CampoCodigo } from '@/components/campo-codigo';
import { CampoTexto } from '@/components/campo-texto';
import { EscenaCodigo } from '@/components/escena-codigo';
import { MedidorContrasena } from '@/components/medidor-contrasena';
import { PantallaConEsfera } from '@/components/pantalla-con-esfera';
import { Presionable } from '@/components/presionable';
import { Texto } from '@/components/texto';
import { TituloDestacado } from '@/components/titulo-destacado';
import { pedirCodigoContrasena, restablecerContrasena } from '@/features/auth/api';
import {
  esquemaCorreo,
  esquemaNuevaContrasena,
  MINIMO_CONTRASENA,
  type DatosCorreo,
  type DatosNuevaContrasena,
} from '@/features/auth/esquemas';
import { comoReloj, useCuentaRegresiva } from '@/features/auth/use-cuenta-regresiva';
import { ErrorApi } from '@/services/api/errores';
import { colors, fontFamily, MARGEN_PANTALLA, spacing } from '@/theme';

/** Espera entre reenvíos (plan B27/B28). */
const ESPERA_REENVIO_S = 45;
/** Errores que corresponden al código (se muestran debajo de las cajas). */
const ERRORES_DEL_CODIGO = ['CODIGO_INCORRECTO', 'CODIGO_EXPIRADO', 'DEMASIADOS_INTENTOS'];

type Paso = 'correo' | 'codigo' | 'listo';

// "¿Olvidaste tu contraseña?" (F24): 1) el correo, 2) el código que llega y la
// contraseña nueva, 3) listo. Es el diseño "Recuperar contraseña" con
// "enlace" cambiado por "código" (plan). Por seguridad, el paso 1 siempre
// avanza: no revela si el correo tiene cuenta.
export default function RecuperarContrasena() {
  const [paso, setPaso] = useState<Paso>('correo');
  const [correo, setCorreo] = useState('');
  const { restante, reiniciar } = useCuentaRegresiva(ESPERA_REENVIO_S);

  const formularioCorreo = useForm<DatosCorreo>({ resolver: zodResolver(esquemaCorreo), defaultValues: { correo: '' } });
  const formularioNueva = useForm<DatosNuevaContrasena>({
    resolver: zodResolver(esquemaNuevaContrasena),
    defaultValues: { codigo: '', contrasena: '' },
  });

  const pedirCodigo = useMutation({
    mutationFn: pedirCodigoContrasena,
    onSuccess: (_vacio, enviado) => {
      setCorreo(enviado);
      reiniciar();
      setPaso('codigo');
    },
  });

  const cambiar = useMutation({
    mutationFn: (datos: DatosNuevaContrasena) => restablecerContrasena({ correo, ...datos }),
    onSuccess: () => setPaso('listo'),
    onError: (error) => {
      if (!(error instanceof ErrorApi)) return;
      if (ERRORES_DEL_CODIGO.includes(error.codigo)) formularioNueva.setError('codigo', { message: error.message });
      else if (error.campos?.contrasena) formularioNueva.setError('contrasena', { message: error.campos.contrasena });
    },
  });

  const enviarCorreo = formularioCorreo.handleSubmit(({ correo: escrito }) => pedirCodigo.mutate(escrito));
  const enviarNueva = formularioNueva.handleSubmit((datos) => cambiar.mutate(datos));
  const errorGeneral =
    cambiar.error instanceof ErrorApi && (ERRORES_DEL_CODIGO.includes(cambiar.error.codigo) || cambiar.error.campos?.contrasena)
      ? undefined
      : cambiar.error?.message;

  function volver() {
    if (paso === 'codigo') {
      formularioNueva.reset();
      cambiar.reset();
      setPaso('correo');
    } else if (router.canGoBack()) router.back();
    else router.replace('/iniciar-sesion');
  }

  return (
    <PantallaConEsfera>
      <StatusBar style="dark" />
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ paddingTop: spacing.xs, paddingHorizontal: spacing.md }}>
          <BotonVolver onPress={volver} />
        </View>

        <EscenaCodigo
          icono={paso === 'listo' ? 'check' : 'candado'}
          color={paso === 'listo' ? colors.verdeAzuladoOscuro : colors.acento}
          fondo="ondas"
        />

        <View style={{ flex: 1, paddingHorizontal: MARGEN_PANTALLA }}>
          {paso === 'correo' && (
            <Aparecer key="correo" style={{ gap: 8 }}>
              <TituloDestacado texto="¿Olvidaste tu" destacado="contraseña?" />
              <Texto variante="subtitulo">Escribe tu correo y te enviaremos un código para crear una nueva.</Texto>
              <View style={{ paddingTop: 18 }}>
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
              </View>
            </Aparecer>
          )}

          {paso === 'codigo' && (
            <Aparecer key="codigo" style={{ gap: 8 }}>
              <TituloDestacado texto="Crea una" destacado="nueva" />
              <Texto variante="subtitulo">
                Si hay una cuenta con{' '}
                <Texto variante="subtitulo" style={{ color: colors.texto, fontFamily: fontFamily.bold }}>
                  {correo}
                </Texto>
                , te llegó un código de 6 dígitos. Vence en 10 minutos.
              </Texto>
              <View style={{ paddingTop: 18, gap: 8 }}>
                <Controller
                  control={formularioNueva.control}
                  name="codigo"
                  render={({ field: { onChange, value } }) => (
                    <CampoCodigo
                      tipo="numerico"
                      valor={value}
                      onCambiar={(nuevo) => {
                        onChange(nuevo);
                        if (formularioNueva.formState.errors.codigo) formularioNueva.clearErrors('codigo');
                      }}
                      error={Boolean(formularioNueva.formState.errors.codigo)}
                    />
                  )}
                />
                {formularioNueva.formState.errors.codigo && (
                  <Texto variante="nota" accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.error }}>
                    {formularioNueva.formState.errors.codigo.message}
                  </Texto>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Texto variante="nota">¿No llegó? </Texto>
                  {restante > 0 ? (
                    <Texto variante="nota" style={{ fontFamily: fontFamily.bold, fontVariant: ['tabular-nums'] }} accessibilityLabel={`Podrás reenviar el código en ${restante} segundos`}>
                      Reenviar código en {comoReloj(restante)}
                    </Texto>
                  ) : (
                    <Presionable accessibilityRole="button" hitSlop={12} disabled={pedirCodigo.isPending} onPress={() => pedirCodigo.mutate(correo)}>
                      <Texto variante="enlace">{pedirCodigo.isPending ? 'Enviando…' : 'Reenviar código'}</Texto>
                    </Presionable>
                  )}
                </View>
              </View>
              <View style={{ paddingTop: 10 }}>
                <Controller
                  control={formularioNueva.control}
                  name="contrasena"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <>
                      <CampoTexto
                        etiqueta="Contraseña nueva"
                        placeholder={`Mínimo ${MINIMO_CONTRASENA} caracteres`}
                        secureTextEntry
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="done"
                        onSubmitEditing={() => enviarNueva()}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        error={formularioNueva.formState.errors.contrasena?.message}
                      />
                      <MedidorContrasena contrasena={value} />
                    </>
                  )}
                />
              </View>
              <Presionable accessibilityRole="button" style={{ alignSelf: 'flex-start', paddingVertical: 10 }} onPress={volver}>
                <Texto variante="enlace">Usar otro correo</Texto>
              </Presionable>
            </Aparecer>
          )}

          {paso === 'listo' && (
            <Aparecer key="listo" style={{ alignItems: 'center', gap: 8 }}>
              <TituloDestacado texto="Contraseña" destacado="actualizada" />
              <Texto variante="subtitulo" style={{ textAlign: 'center' }}>
                Ya puedes iniciar sesión con tu contraseña nueva. Por seguridad, cerramos tu sesión en los demás dispositivos.
              </Texto>
            </Aparecer>
          )}

          <View style={{ flex: 1, minHeight: spacing.xxl }} />

          <View style={{ gap: 12, paddingBottom: spacing.xl }}>
            {paso === 'correo' && (
              <>
                <AvisoError mensaje={pedirCodigo.error?.message} />
                <Boton titulo="Enviar código" icono="flecha" cargando={pedirCodigo.isPending} onPress={() => enviarCorreo()} />
              </>
            )}
            {paso === 'codigo' && (
              <>
                <AvisoError mensaje={errorGeneral} />
                <Boton titulo="Cambiar contraseña" icono="flecha" cargando={cambiar.isPending} onPress={() => enviarNueva()} />
              </>
            )}
            {paso === 'listo' && <Boton titulo="Iniciar sesión" icono="flecha" onPress={() => router.replace('/iniciar-sesion')} />}
          </View>
        </View>
      </ScrollView>
    </PantallaConEsfera>
  );
}
