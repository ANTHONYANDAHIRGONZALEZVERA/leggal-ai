import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View, type TextInputInstance } from 'react-native';

import { Aparecer } from '@/components/aparecer';
import { Boton } from '@/components/boton';
import { BotonVolver } from '@/components/boton-volver';
import { CampoTexto } from '@/components/campo-texto';
import { Casilla } from '@/components/casilla';
import { Esfera } from '@/components/esfera';
import { MedidorContrasena } from '@/components/medidor-contrasena';
import { Ondas } from '@/components/ondas';
import { PantallaConEsfera } from '@/components/pantalla-con-esfera';
import { SeparadorTexto } from '@/components/separador-texto';
import { Texto } from '@/components/texto';
import { TituloDestacado } from '@/components/titulo-destacado';
import { esquemaRegistro, MINIMO_CONTRASENA, type DatosRegistro } from '@/features/auth/esquemas';
import { colors, MARGEN_PANTALLA, spacing, type } from '@/theme';

// "Crea tu cuenta" del diseño. Facebook queda fuera en la beta.
export default function Registro() {
  const campoCorreo = useRef<TextInputInstance>(null);
  const campoContrasena = useRef<TextInputInstance>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosRegistro>({
    resolver: zodResolver(esquemaRegistro),
    defaultValues: { nombre: '', correo: '', contrasena: '', aceptaTerminos: false },
  });

  // Temporal: sin API todavía, pasa directo al onboarding. En F09 esto crea
  // la cuenta en el backend (y luego viene "Verifica tu correo").
  const crear = handleSubmit(async () => {
    router.replace('/perfil');
  });

  return (
    <PantallaConEsfera
      decoracion={
        <>
          <Esfera ancho={170} alto={140} ciclo={10000} flotar style={{ position: 'absolute', right: -30, top: 30 }} />
          <Ondas juego="registro" style={{ position: 'absolute', left: 0, right: 0, top: 120 }} />
        </>
      }>
      <StatusBar style="dark" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ paddingTop: spacing.xs, paddingHorizontal: spacing.md }}>
          <BotonVolver respaldo="/iniciar-sesion" />
        </View>

        <View style={{ flex: 1, paddingHorizontal: MARGEN_PANTALLA }}>
          <Aparecer style={{ paddingTop: spacing.xxl, gap: 6 }}>
            <TituloDestacado texto="Crea tu" destacado="cuenta" style={{ transform: [{ translateY: -7 }] }} />
            <Texto variante="subtitulo" style={{ transform: [{ translateY: -16 }] }}>Toma menos de un minuto.</Texto>
          </Aparecer>

          <Aparecer retraso={100} style={{ paddingTop: spacing.lg, gap: spacing.md }}>
            {/* Google se conecta en F27–F29; por ahora solo se muestra. */}
            <Boton titulo="Google" variante="google" />
            <SeparadorTexto texto="o regístrate con tu correo" />
          </Aparecer>

          <Aparecer retraso={200} style={{ paddingTop: 14, gap: spacing.sm }}>
            <Controller
              control={control}
              name="nombre"
              render={({ field: { onChange, onBlur, value } }) => (
                <CampoTexto
                  etiqueta="Nombres y apellidos"
                  placeholder="Tu nombre completo"
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => campoCorreo.current?.focus()}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.nombre?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="correo"
              render={({ field: { onChange, onBlur, value } }) => (
                <CampoTexto
                  ref={campoCorreo}
                  etiqueta="Correo electrónico"
                  placeholder="nombre@empresa.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => campoContrasena.current?.focus()}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.correo?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="contrasena"
              render={({ field: { onChange, onBlur, value } }) => (
                <>
                  <CampoTexto
                    ref={campoContrasena}
                    etiqueta="Contraseña"
                    placeholder={`Mínimo ${MINIMO_CONTRASENA} caracteres`}
                    secureTextEntry
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="done"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.contrasena?.message}
                  />
                  <MedidorContrasena contrasena={value} />
                </>
              )}
            />
          </Aparecer>

          <Aparecer retraso={300} style={{ paddingTop: spacing.md, gap: 6 }}>
            <Controller
              control={control}
              name="aceptaTerminos"
              render={({ field: { onChange, value } }) => (
                <Casilla
                  marcada={value}
                  onCambiar={onChange}
                  error={!!errors.aceptaTerminos}
                  accessibilityLabel="Acepto los Términos y la Política de privacidad y tratamiento de datos">
                  {/* Las pantallas de Términos y Política llegan en su tarea;
                      por ahora los nombres se resaltan pero no abren nada. */}
                  <Texto variante="cuerpo" style={{ fontSize: 13, lineHeight: 19, color: colors.etiqueta }}>
                    Acepto los <Texto variante="enlace">Términos</Texto> y la{' '}
                    <Texto variante="enlace">Política de privacidad y tratamiento de datos</Texto>.
                  </Texto>
                </Casilla>
              )}
            />
            {errors.aceptaTerminos && (
              <Texto variante="nota" style={{ color: colors.error }} accessibilityLiveRegion="polite">
                {errors.aceptaTerminos.message}
              </Texto>
            )}
          </Aparecer>

          <View style={{ flex: 1, minHeight: spacing.xxl }} />

          <View style={{ alignItems: 'center', gap: 14, paddingBottom: spacing.xl }}>
            <Boton
              titulo="Crear cuenta"
              variante="morado"
              icono="flecha"
              cargando={isSubmitting}
              onPress={() => crear()}
              style={{ alignSelf: 'stretch' }}
            />
            <Texto variante="subtitulo">
              ¿Ya tienes cuenta?{' '}
              <Link href="/iniciar-sesion" replace style={[type.enlace, { fontSize: 14 }]}>
                Inicia sesión
              </Link>
            </Texto>
          </View>
        </View>
      </ScrollView>
    </PantallaConEsfera>
  );
}
