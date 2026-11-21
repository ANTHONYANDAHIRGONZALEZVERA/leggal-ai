import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Linking, Modal, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aparecer } from '@/components/aparecer';
import { AvisoError } from '@/components/aviso-error';
import { BarraPasos } from '@/components/barra-pasos';
import { Boton } from '@/components/boton';
import { BotonVolver } from '@/components/boton-volver';
import { Esfera } from '@/components/esfera';
import type { NombreIcono } from '@/components/icono';
import { PantallaConEsfera } from '@/components/pantalla-con-esfera';
import { PantallaPermiso } from '@/components/pantalla-permiso';
import { SelectorPestanas } from '@/components/selector-pestanas';
import { TarjetaOpcion } from '@/components/tarjeta-opcion';
import { Texto } from '@/components/texto';
import { TituloDestacado } from '@/components/titulo-destacado';
import { consultarPermisoNotificaciones, pedirPermisoNotificaciones } from '@/features/notificaciones/permiso';
import { PUNTOS_NOTIFICACIONES } from '@/features/notificaciones/puntos';
import { useBorradorOnboarding } from '@/features/onboarding/borrador';
import { enviarOnboarding } from '@/features/onboarding/envio';
import {
  CANALES,
  esquemaPreferencias,
  USOS,
  type DatosPreferencias,
  type PreferenciasValidadas,
  type Uso,
} from '@/features/onboarding/esquemas';
import { colors, fontFamily, MARGEN_PANTALLA, spacing } from '@/theme';

// Ícono y colores de cada uso, como en el diseño.
const ESTILO_USO: Record<Uso, { icono: NombreIcono; fondo: string; color: string }> = {
  resumir_documentos: { icono: 'documento', fondo: '#ECE7FF', color: '#4B2FE0' },
  controlar_plazos: { icono: 'reloj', fondo: '#DDF4F6', color: '#0B7A8B' },
  organizar_casos: { icono: 'carpeta', fondo: '#FFF1DC', color: '#A15C00' },
  consultar_normativa: { icono: 'lupa', fondo: '#FCE7F3', color: '#B0287A' },
  redactar_escritos: { icono: 'lapiz', fondo: '#E4ECFF', color: '#2B55C9' },
  informes_clientes: { icono: 'grafico', fondo: '#EEEAF6', color: '#3A3560' },
};
const FILAS_USOS = [USOS.slice(0, 2), USOS.slice(2, 4), USOS.slice(4, 6)];

type Aviso = 'plazos' | 'resumenDiario';
const AVISOS: { campo: Aviso; titulo: string; detalle: string }[] = [
  { campo: 'plazos', titulo: 'Plazos y audiencias', detalle: 'Recordatorios antes de cada vencimiento' },
  { campo: 'resumenDiario', titulo: 'Resumen diario', detalle: 'Actividad de tus casos cada mañana' },
];

/** Si el sistema falla al consultar o pedir el permiso (no debería, pero no hay que trabarse). */
const ERROR_PERMISO = 'No pudimos activar las notificaciones. Puedes activarlas luego en Ajustes.';

/** Pantalla de permiso abierta: para qué aviso, y si aún se puede pedir o solo en Ajustes. */
type Permiso = { campo: Aviso; estado: 'preguntar' | 'bloqueado' } | null;

// Onboarding 5/5 "¿Para qué usarás Leggal AI?" (F31): usos, cómo hablar con el
// asistente y notificaciones. "Empezar" envía todo el onboarding (B34).
export default function Preferencias() {
  const { top } = useSafeAreaInsets();
  const { perfil, area, modo, empresa, solicitud, preferencias } = useBorradorOnboarding();
  const [permiso, setPermiso] = useState<Permiso>(null);
  const [errorEnvio, setErrorEnvio] = useState<string>();
  const [errorPermiso, setErrorPermiso] = useState<string>();

  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DatosPreferencias, unknown, PreferenciasValidadas>({
    resolver: zodResolver(esquemaPreferencias),
    defaultValues: preferencias ?? { usos: [], canal: 'ambos', notificaciones: { plazos: false, resumenDiario: false } },
  });

  // Al salir hacia atrás sin tocar Empezar, se guarda lo elegido.
  useEffect(
    () => () => {
      const elegido = esquemaPreferencias.safeParse(getValues());
      if (elegido.success) useBorradorOnboarding.getState().guardarPreferencias(elegido.data);
    },
    [getValues],
  );

  /** Encender un aviso necesita el permiso del sistema; apagarlo no. */
  async function cambiarAviso(campo: Aviso, encendido: boolean) {
    setErrorPermiso(undefined);
    if (!encendido) return setValue(`notificaciones.${campo}`, false);
    try {
      const estado = await consultarPermisoNotificaciones();
      if (estado === 'concedido') setValue(`notificaciones.${campo}`, true);
      else setPermiso({ campo, estado });
    } catch {
      setErrorPermiso(ERROR_PERMISO);
    }
  }

  /** Si algo falla, el aviso queda apagado y se explica; el onboarding sigue. */
  async function permitir() {
    if (!permiso) return;
    try {
      if (permiso.estado === 'bloqueado') {
        setPermiso(null);
        await Linking.openSettings();
        return;
      }
      const estado = await pedirPermisoNotificaciones();
      if (estado === 'bloqueado') return setPermiso({ ...permiso, estado });
      setPermiso(null);
      if (estado === 'concedido') setValue(`notificaciones.${permiso.campo}`, true);
    } catch {
      setPermiso(null);
      setErrorPermiso(ERROR_PERMISO);
    }
  }

  const empezar = handleSubmit(async (datos) => {
    setErrorEnvio(undefined);
    try {
      // Al terminar, la navegación lleva sola a Inicio.
      await enviarOnboarding(datos);
    } catch (error) {
      setErrorEnvio(error instanceof Error ? error.message : undefined);
    }
  });

  // El borrador vive en memoria: si la app se recargó aquí, faltan pasos.
  if (!perfil) return <Redirect href="/perfil" />;
  if (!area) return <Redirect href="/area" />;
  if (!modo) return <Redirect href="/modo" />;
  if (modo === 'colaborativo' && !empresa && !solicitud) return <Redirect href="/empresa" />;

  return (
    <PantallaConEsfera
      decoracion={<Esfera ancho={74} alto={66} flotar style={{ position: 'absolute', right: 16, top: top + 62 }} />}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: spacing.xs, paddingHorizontal: spacing.md }}>
          <BotonVolver respaldo={modo === 'personal' ? '/modo' : '/empresa'} />
          <BarraPasos actual={5} total={5} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: MARGEN_PANTALLA }}>
          <Aparecer style={{ paddingTop: 24, paddingRight: 76 }}>
            <TituloDestacado texto="¿Para qué usarás" destacado="Leggal AI?" variante="tituloPaso" />
          </Aparecer>

          <Aparecer retraso={100} style={{ paddingTop: 18, gap: spacing.xs }}>
            <Controller
              control={control}
              name="usos"
              render={({ field: { onChange, value } }) => (
                <View accessibilityLabel="Para qué usarás Leggal AI" style={{ gap: spacing.xs }}>
                  {FILAS_USOS.map((fila) => (
                    <View key={fila[0].valor} style={{ flexDirection: 'row', gap: spacing.xs }}>
                      {fila.map(({ valor, titulo }) => (
                        <TarjetaOpcion
                          key={valor}
                          multiple
                          titulo={titulo}
                          {...ESTILO_USO[valor]}
                          seleccionada={value.includes(valor)}
                          onPress={() => onChange(value.includes(valor) ? value.filter((u) => u !== valor) : [...value, valor])}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              )}
            />
            {errors.usos && (
              <Texto variante="nota" accessibilityLiveRegion="polite" style={{ color: colors.error }}>
                {errors.usos.message}
              </Texto>
            )}
          </Aparecer>

          <Aparecer retraso={200} style={{ paddingTop: 20, gap: spacing.xs }}>
            <Texto variante="seccion">Habla con el asistente por</Texto>
            <Controller
              control={control}
              name="canal"
              render={({ field: { onChange, value } }) => (
                <SelectorPestanas
                  tipo="opciones"
                  accessibilityLabel="Habla con el asistente por"
                  opciones={CANALES}
                  valor={value}
                  onCambiar={onChange}
                />
              )}
            />
          </Aparecer>

          <Aparecer retraso={300} style={{ paddingTop: 20, gap: spacing.xs }}>
            <Texto variante="seccion">Notificaciones</Texto>
            {AVISOS.map(({ campo, titulo, detalle }) => (
              <Controller
                key={campo}
                control={control}
                name={`notificaciones.${campo}`}
                render={({ field: { value } }) => (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 16,
                      borderCurve: 'continuous',
                      backgroundColor: colors.superficie,
                    }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Texto variante="cuerpo" style={{ fontSize: 14, fontFamily: fontFamily.bold }}>
                        {titulo}
                      </Texto>
                      <Texto variante="nota" style={{ fontFamily: fontFamily.medium }}>
                        {detalle}
                      </Texto>
                    </View>
                    <Switch
                      accessibilityLabel={titulo}
                      value={value}
                      onValueChange={(encendido) => void cambiarAviso(campo, encendido)}
                      trackColor={{ false: '#D6D0EA', true: colors.acento }}
                      thumbColor={colors.superficie}
                      ios_backgroundColor="#D6D0EA"
                    />
                  </View>
                )}
              />
            ))}
            {errorPermiso && (
              <Texto variante="nota" accessibilityLiveRegion="polite" style={{ color: colors.error }}>
                {errorPermiso}
              </Texto>
            )}
          </Aparecer>

          <View style={{ flex: 1, minHeight: spacing.xxl }} />

          <View style={{ gap: 14, paddingBottom: spacing.xl }}>
            <AvisoError mensaje={errorEnvio} />
            <Boton titulo="Empezar" variante="morado" icono="chispa" cargando={isSubmitting} onPress={() => empezar()} />
          </View>
        </View>
      </ScrollView>

      <Modal visible={permiso !== null} animationType="slide" statusBarTranslucent onRequestClose={() => setPermiso(null)}>
        <PantallaPermiso
          icono="campana"
          titulo="Activa las"
          destacado="notificaciones"
          descripcion={
            permiso?.estado === 'bloqueado'
              ? 'Las notificaciones están desactivadas para Leggal AI. Actívalas en los Ajustes del teléfono.'
              : 'Te avisamos solo de lo importante de tus casos. Nada de publicidad.'
          }
          puntos={PUNTOS_NOTIFICACIONES}
          textoPermitir={permiso?.estado === 'bloqueado' ? 'Abrir Ajustes' : 'Permitir notificaciones'}
          onPermitir={() => void permitir()}
          onAhoraNo={() => setPermiso(null)}
        />
      </Modal>
    </PantallaConEsfera>
  );
}
