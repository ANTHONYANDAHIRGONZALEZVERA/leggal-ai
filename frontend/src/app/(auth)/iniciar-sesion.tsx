import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View, type TextInputInstance } from 'react-native';

import { Aparecer } from '@/components/aparecer';
import { Boton } from '@/components/boton';
import { CampoTexto } from '@/components/campo-texto';
import { PantallaConEsfera } from '@/components/pantalla-con-esfera';
import { SeparadorTexto } from '@/components/separador-texto';
import { Texto } from '@/components/texto';
import { TituloDestacado } from '@/components/titulo-destacado';
import { esquemaInicioSesion, type DatosInicioSesion } from '@/features/auth/esquemas';
import { MARGEN_PANTALLA, spacing, type } from '@/theme';

// "Bienvenido de nuevo" del diseño. El botón de Facebook queda fuera en la beta.
export default function IniciarSesion() {
  const campoContrasena = useRef<TextInputInstance>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosInicioSesion>({
    resolver: zodResolver(esquemaInicioSesion),
    defaultValues: { correo: '', contrasena: '' },
  });

  // Temporal: sin API todavía, entra directo a Inicio para poder recorrer la
  // app. En F09/F10 esto llama al backend y guarda la sesión.
  const entrar = handleSubmit(async () => {
    router.replace('/inicio');
  });

  return (
    <PantallaConEsfera esfera={{ ancho: 230, alto: 170, top: 64, right: -10 }}>
      <StatusBar style="dark" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: MARGEN_PANTALLA, paddingTop: 230 }}>
        <Aparecer style={{ gap: 6 }}>
          <TituloDestacado texto="Bienvenido" destacado="de nuevo" />
          <Texto variante="subtitulo">Inicia sesión para continuar con tus casos.</Texto>
        </Aparecer>

        <Aparecer retraso={100} style={{ paddingTop: 22, gap: spacing.md }}>
          {/* Google se conecta en F27–F29; por ahora solo se muestra. */}
          <Boton titulo="Google" variante="google" />
          <SeparadorTexto texto="o con tu correo" />
        </Aparecer>

        <Aparecer retraso={200} style={{ paddingTop: spacing.md, gap: 14 }}>
          <Controller
            control={control}
            name="correo"
            render={({ field: { onChange, onBlur, value } }) => (
              <CampoTexto
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
              <CampoTexto
                ref={campoContrasena}
                etiqueta="Contraseña"
                placeholder="••••••••"
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => entrar()}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.contrasena?.message}
              />
            )}
          />
          {/* La recuperación de contraseña llega en F24. */}
          <Texto variante="enlace" style={{ alignSelf: 'flex-end' }} accessibilityRole="link">
            ¿Olvidaste tu contraseña?
          </Texto>
        </Aparecer>

        <View style={{ flex: 1, minHeight: spacing.xxl }} />

        <View style={{ alignItems: 'center', gap: 14, paddingBottom: spacing.xl }}>
          <Boton
            titulo="Iniciar sesión"
            icono="flecha"
            cargando={isSubmitting}
            onPress={() => entrar()}
            style={{ alignSelf: 'stretch' }}
          />
          <Texto variante="subtitulo">
            ¿No tienes cuenta?{' '}
            <Link href="/registro" style={[type.enlace, { fontSize: 14 }]}>
              Crear cuenta
            </Link>
          </Texto>
        </View>
      </ScrollView>
    </PantallaConEsfera>
  );
}
