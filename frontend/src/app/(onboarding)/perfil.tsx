import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Modal, ScrollView, View, type TextInputInstance } from 'react-native';

import { Aparecer } from '@/components/aparecer';
import { AvatarEsfera } from '@/components/avatar-esfera';
import { AvisoError } from '@/components/aviso-error';
import { BarraPasos } from '@/components/barra-pasos';
import { Boton } from '@/components/boton';
import { BotonVolver } from '@/components/boton-volver';
import { CampoTexto } from '@/components/campo-texto';
import { Chip } from '@/components/chip';
import { HojaOpciones } from '@/components/hoja-opciones';
import { Icono } from '@/components/icono';
import { PantallaConEsfera } from '@/components/pantalla-con-esfera';
import { PantallaPermiso, type PuntoPermiso } from '@/components/pantalla-permiso';
import { Texto } from '@/components/texto';
import { TituloDestacado } from '@/components/titulo-destacado';
import { cerrarSesion } from '@/features/auth/api';
import { claveDisponibilidad, consultarUsuario } from '@/features/onboarding/api';
import { useBorradorOnboarding } from '@/features/onboarding/borrador';
import { esquemaPerfil, type DatosPerfil, type PerfilValidado } from '@/features/onboarding/esquemas';
import { useDisponibilidad, useSugerencias, type EstadoUsuario } from '@/features/onboarding/use-disponibilidad';
import { useFotoPerfil } from '@/features/onboarding/use-foto-perfil';
import { aplicarErrorApi } from '@/services/api/errores-formulario';
import { colors, fontFamily, MARGEN_PANTALLA, spacing } from '@/theme';

// Texto y color bajo el @usuario según lo que respondió el servidor.
const avisoUsuario: Partial<Record<EstadoUsuario, { texto: string; color: string }>> = {
  revisando: { texto: 'Revisando…', color: colors.textoSecundario },
  disponible: { texto: 'Disponible', color: colors.exito },
  ocupado: { texto: 'Ya está en uso. Prueba una sugerencia.', color: colors.error },
  error: { texto: 'No se pudo revisar ahora. Se revisará al continuar.', color: colors.textoSecundario },
};

// Para qué se usa la cámara, antes de pedir el permiso (diseño PermisoSistema).
const PUNTOS_CAMARA: PuntoPermiso[] = [
  { icono: 'camara', texto: 'Solo para tu foto de perfil', fondo: '#ECE7FF', color: colors.acento },
  { icono: 'candado', texto: 'Quitamos la ubicación y los datos ocultos de la foto', fondo: '#DDF4F6', color: colors.verdeAzuladoOscuro },
  { icono: 'escudo', texto: 'Puedes desactivarla en Ajustes', fondo: '#FFF1DC', color: '#A15C00' },
];

// Onboarding 1/5 "¿Cómo te llamamos?" (F30). Los campos empiezan vacíos: al
// escribir el nombre visible aparecen @usuarios libres armados con él, y el
// @usuario se revisa en el servidor mientras se escribe.
export default function Perfil() {
  const campoUsuario = useRef<TextInputInstance>(null);
  const clienteConsultas = useQueryClient();
  const { perfil, guardarPerfil } = useBorradorOnboarding();
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const foto = useFotoPerfil();

  // Si vuelve desde el paso 2, encuentra lo que ya había llenado.
  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DatosPerfil, unknown, PerfilValidado>({
    resolver: zodResolver(esquemaPerfil),
    defaultValues: { nombre: perfil?.nombre ?? '', usuario: perfil?.usuario ?? '' },
  });
  const [nombre, usuario] = useWatch({ control, name: ['nombre', 'usuario'] });
  const estado = useDisponibilidad(usuario);
  const sugerencias = useSugerencias(nombre);

  const continuar = handleSubmit(async (datos) => {
    setErrorGeneral(undefined);
    try {
      // Se confirma justo antes de avanzar: otra persona pudo tomarlo recién.
      // Si ya se había consultado hace poco, responde la caché sin pedirlo otra vez.
      const { disponible } = await clienteConsultas.fetchQuery({
        queryKey: claveDisponibilidad(datos.usuario),
        queryFn: () => consultarUsuario(datos.usuario),
        staleTime: 30_000,
      });
      if (!disponible) {
        setError('usuario', { message: 'Ese nombre de usuario ya está en uso' }, { shouldFocus: true });
        return;
      }
    } catch (error) {
      setErrorGeneral(aplicarErrorApi(error, setError, ['usuario']));
      return;
    }
    guardarPerfil(datos);
    router.push('/area');
  });

  const aviso = errors.usuario ? undefined : avisoUsuario[estado];

  return (
    <PantallaConEsfera>
      <StatusBar style="dark" />
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: spacing.xs, paddingHorizontal: spacing.md }}>
          {/* Es el primer paso: volver significa salir de la cuenta recién creada. */}
          <BotonVolver onPress={() => void cerrarSesion()} accessibilityLabel="Salir y volver al inicio de sesión" />
          <BarraPasos actual={1} total={5} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: MARGEN_PANTALLA }}>
          <Aparecer style={{ paddingTop: 30, gap: 6 }}>
            <TituloDestacado texto="¿Cómo te" destacado="llamamos?" variante="tituloPaso" />
            <Texto variante="subtitulo">
              Tu nombre de usuario te identifica dentro de cada empresa y en la trazabilidad de los casos.
            </Texto>
          </Aparecer>

          <Aparecer retraso={100} style={{ alignItems: 'center', gap: spacing.sm, paddingTop: 28 }}>
            {/* La foto queda en el teléfono: el backend aún no tiene dónde
                guardarla (propuesta en docs/api/foto-perfil-propuesta.md). */}
            <AvatarEsfera nombre={nombre} foto={foto.foto} onSubirFoto={foto.hoja.abrir} />
            {foto.error && (
              <Texto variante="nota" accessibilityLiveRegion="polite" style={{ color: colors.error, textAlign: 'center' }}>
                {foto.error}
              </Texto>
            )}
          </Aparecer>

          <Aparecer retraso={200} style={{ paddingTop: 30, gap: 14 }}>
            <Controller
              control={control}
              name="nombre"
              render={({ field: { onChange, onBlur, value } }) => (
                <CampoTexto
                  etiqueta="Nombre visible"
                  placeholder="Ej.: Andrea Ruiz"
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => campoUsuario.current?.focus()}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.nombre?.message}
                />
              )}
            />

            <View style={{ gap: 6 }}>
              <Controller
                control={control}
                name="usuario"
                render={({ field: { onChange, onBlur, value } }) => (
                  <CampoTexto
                    ref={campoUsuario}
                    etiqueta="Nombre de usuario"
                    prefijo="@"
                    placeholder="tu.usuario"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username-new"
                    textContentType="username"
                    returnKeyType="done"
                    onSubmitEditing={() => continuar()}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.usuario?.message}
                    derecha={estado === 'disponible' && !errors.usuario ? <CheckDisponible /> : undefined}
                  />
                )}
              />
              {aviso && (
                <Texto variante="nota" accessibilityLiveRegion="polite" style={{ fontFamily: fontFamily.bold, color: aviso.color }}>
                  {aviso.texto}
                </Texto>
              )}
            </View>

            {sugerencias.length > 0 && (
              <View accessibilityLabel="Sugerencias de nombre de usuario" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {sugerencias.map((sugerencia) => (
                  <Chip
                    key={sugerencia}
                    texto={`@${sugerencia}`}
                    seleccionado={usuario === sugerencia}
                    onPress={() => setValue('usuario', sugerencia, { shouldValidate: true })}
                  />
                ))}
              </View>
            )}
          </Aparecer>

          <View style={{ flex: 1, minHeight: spacing.xxl }} />

          <View style={{ gap: 14, paddingBottom: spacing.xl }}>
            <AvisoError mensaje={errorGeneral} />
            <Boton titulo="Continuar" icono="flecha" cargando={isSubmitting} onPress={() => continuar()} />
          </View>
        </View>
      </ScrollView>

      <HojaOpciones visible={foto.hoja.visible} opciones={foto.hoja.opciones} onCerrar={foto.hoja.cerrar} />

      <Modal visible={foto.permiso.aviso !== null} animationType="slide" statusBarTranslucent onRequestClose={foto.permiso.ahoraNo}>
        <PantallaPermiso
          icono="camara"
          titulo="Activa la"
          destacado="cámara"
          descripcion={
            foto.permiso.aviso === 'bloqueado'
              ? 'La cámara está desactivada para Leggal AI. Actívala en los Ajustes del teléfono.'
              : 'La usamos solo cuando tocas Tomar foto. No la abrimos en segundo plano.'
          }
          puntos={PUNTOS_CAMARA}
          textoPermitir={foto.permiso.aviso === 'bloqueado' ? 'Abrir Ajustes' : 'Permitir cámara'}
          onPermitir={() => void foto.permiso.permitir()}
          onAhoraNo={foto.permiso.ahoraNo}
        />
      </Modal>
    </PantallaConEsfera>
  );
}

// Círculo verde azulado con check, dentro del campo, cuando el @usuario está libre.
function CheckDisponible() {
  return (
    <View
      accessibilityLabel="Disponible"
      style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.verdeAzulado, alignItems: 'center', justifyContent: 'center' }}>
      <Icono nombre="check" tamano={14} color={colors.sobreOscuro} />
    </View>
  );
}
