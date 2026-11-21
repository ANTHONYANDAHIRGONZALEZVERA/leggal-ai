import { useMutation, useQuery } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';

import { Aparecer } from '@/components/aparecer';
import { AvisoError } from '@/components/aviso-error';
import { Boton } from '@/components/boton';
import { BotonVolver } from '@/components/boton-volver';
import { Esfera } from '@/components/esfera';
import { Icono, type NombreIcono } from '@/components/icono';
import { PantallaConEsfera } from '@/components/pantalla-con-esfera';
import { Texto } from '@/components/texto';
import { TituloDestacado } from '@/components/titulo-destacado';
import { cancelarSolicitud, claveMisSolicitudes, consultarMisSolicitudes } from '@/features/empresas/api';
import type { EstadoSolicitud } from '@/features/empresas/contrato';
import { useBorradorOnboarding } from '@/features/onboarding/borrador';
import { colors, fontFamily, spacing } from '@/theme';
import { conPunto } from '@/utils/texto';

/** Cada cuánto se revisa si el administrador ya respondió, mientras se ve esta pantalla. */
export const REVISAR_CADA_MS = 30_000;

const onda: CSSAnimationKeyframes = {
  from: { transform: [{ scale: 0.8 }], opacity: 1 },
  to: { transform: [{ scale: 1.3 }], opacity: 0 },
};
const girarReloj: CSSAnimationKeyframes = {
  '0%': { transform: [{ rotate: '0deg' }] },
  '60%': { transform: [{ rotate: '180deg' }] },
  '100%': { transform: [{ rotate: '180deg' }] },
};

type Paso = {
  titulo: string;
  detalle: string;
  icono: NombreIcono;
  fondo: string;
  color: string;
  activo: boolean;
};

/** La línea de estado según cómo va la solicitud. */
function pasos(estado: EstadoSolicitud, codigo: string): Paso[] {
  const hecho = {
    icono: 'check',
    fondo: colors.verdeAzulado,
    color: colors.sobreOscuro,
    activo: true,
  } as const;
  const revision: Paso =
    estado === 'aprobada'
      ? { ...hecho, titulo: 'Revisión del administrador', detalle: 'Aprobada' }
      : estado === 'rechazada'
        ? {
            titulo: 'Revisión del administrador',
            detalle: 'Rechazada',
            icono: 'cerrar',
            fondo: '#FCE4E7',
            color: colors.error,
            activo: true,
          }
        : {
            titulo: 'Revisión del administrador',
            detalle: 'En curso',
            icono: 'reloj',
            fondo: '#FFF1DC',
            color: '#A15C00',
            activo: true,
          };
  const acceso: Paso =
    estado === 'aprobada'
      ? { ...hecho, titulo: 'Acceso habilitado', detalle: 'Listo' }
      : {
          titulo: 'Acceso habilitado',
          detalle: estado === 'rechazada' ? 'No habilitado' : 'Pendiente',
          icono: 'candado',
          fondo: '#EEEAF6',
          color: colors.textoSecundario,
          activo: false,
        };
  return [{ ...hecho, titulo: 'Código validado', detalle: codigo }, revision, acceso];
}

// "Solicitud enviada" (F33): la línea de estado de la solicitud, seguir en
// modo personal mientras el administrador responde, o cancelarla.
export default function Solicitud() {
  const reducido = useReducedMotion();
  const { perfil, solicitud, guardarSolicitud } = useBorradorOnboarding();

  // Estado al día desde el servidor (B39), revisado cada 30 s mientras espera.
  const misSolicitudes = useQuery({
    queryKey: claveMisSolicitudes,
    queryFn: consultarMisSolicitudes,
    enabled: Boolean(solicitud),
    refetchInterval: (consulta) =>
      consulta.state.data?.find((s) => s.id === solicitud?.id)?.estado === 'en_espera' ? REVISAR_CADA_MS : false,
  });
  const alDia = misSolicitudes.data?.find((s) => s.id === solicitud?.id);

  useEffect(() => {
    if (alDia && alDia.estado !== solicitud?.estado) guardarSolicitud(alDia);
  }, [alDia, solicitud?.estado, guardarSolicitud]);

  const cancelar = useMutation({
    mutationFn: () => cancelarSolicitud(solicitud!.id),
    onSuccess: () => {
      guardarSolicitud(null);
      if (router.canGoBack()) router.back();
      else router.replace('/empresa');
    },
  });

  if (!perfil) return <Redirect href="/perfil" />;
  if (!solicitud) return <Redirect href="/empresa" />;

  const { empresa, rol, codigo } = solicitud;
  const estado = alDia?.estado ?? solicitud.estado;

  function confirmarCancelacion() {
    Alert.alert('¿Cancelar la solicitud?', conPunto(`Ya no pedirás unirte a ${empresa.nombre}`), [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: () => cancelar.mutate(),
      },
    ]);
  }

  return (
    <PantallaConEsfera>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ paddingTop: spacing.xs, paddingHorizontal: spacing.md }}>
          <BotonVolver respaldo="/empresa" />
        </View>

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            height: 250,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {[0, 1200, 2400].map((retraso) => (
            <Animated.View
              key={retraso}
              style={[
                {
                  position: 'absolute',
                  width: 210,
                  height: 210,
                  borderRadius: 105,
                  borderWidth: 1.5,
                  borderColor: 'rgba(124,92,255,0.35)',
                },
                reducido
                  ? { opacity: 0 }
                  : {
                      animationName: onda,
                      animationDuration: 3600,
                      animationDelay: retraso,
                      animationIterationCount: 'infinite',
                      animationTimingFunction: 'ease-out',
                    },
              ]}
            />
          ))}
          <Esfera ancho={190} alto={180} ciclo={8000} style={{ position: 'absolute' }} />
          <Animated.View
            style={
              !reducido && {
                animationName: girarReloj,
                animationDuration: 2800,
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-in-out',
              }
            }>
            <Icono nombre="relojArena" tamano={44} color={colors.acento} />
          </Animated.View>
        </View>

        <Aparecer style={{ alignItems: 'center', gap: 6, paddingHorizontal: 28 }}>
          <TituloDestacado texto="Solicitud" destacado="enviada" style={{ justifyContent: 'center' }} />
          <Texto variante="subtitulo" style={{ textAlign: 'center' }}>
            Pediste unirte a{' '}
            <Texto variante="subtitulo" style={{ fontFamily: fontFamily.bold, color: colors.texto }}>
              {empresa.nombre}
            </Texto>{' '}
            como {conPunto(rol.nombre)}
          </Texto>
        </Aparecer>

        <View
          accessibilityLabel="Estado de la solicitud"
          style={{
            marginTop: 22,
            marginHorizontal: 20,
            padding: 18,
            borderRadius: 22,
            borderCurve: 'continuous',
            backgroundColor: colors.superficie,
            gap: 6,
          }}>
          {pasos(estado, codigo).map((paso, i, todos) => (
            <Aparecer key={paso.titulo} retraso={i * 150} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: paso.fondo,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icono nombre={paso.icono} tamano={14} color={paso.color} />
                </View>
                {i < todos.length - 1 && (
                  <View
                    style={{
                      width: 2,
                      height: 18,
                      backgroundColor: paso.icono === 'check' ? colors.verdeAzulado : colors.borde,
                    }}
                  />
                )}
              </View>
              <View accessible accessibilityLabel={`${paso.titulo}: ${paso.detalle}`}>
                <Texto
                  variante="cuerpo"
                  style={{
                    fontSize: 14,
                    fontFamily: fontFamily.bold,
                    color: paso.activo ? colors.texto : colors.textoSecundario,
                  }}>
                  {paso.titulo}
                </Texto>
                <Texto
                  variante="nota"
                  style={paso.detalle === 'En curso' ? { color: '#7A4300', fontFamily: fontFamily.bold } : undefined}>
                  {paso.detalle}
                </Texto>
              </View>
            </Aparecer>
          ))}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginTop: 14,
            marginHorizontal: 24,
          }}>
          <Icono nombre="campana" tamano={16} color={colors.etiqueta} />
          <Texto variante="nota" style={{ flex: 1, fontSize: 13, color: '#4A4668' }}>
            {estado === 'aprobada'
              ? conPunto(`Ya eres parte de ${empresa.nombre}`)
              : estado === 'rechazada'
                ? 'El administrador no aprobó tu solicitud. Puedes usar otro código.'
                : 'Te avisaremos cuando te aprueben.'}
          </Texto>
        </View>

        <View style={{ flex: 1, minHeight: spacing.xxl }} />

        <View style={{ gap: 10, paddingHorizontal: 24, paddingBottom: spacing.xl }}>
          <AvisoError mensaje={cancelar.error?.message} />
          {estado === 'aprobada' ? (
            <Boton titulo="Continuar" icono="flecha" onPress={() => router.push('/preferencias')} />
          ) : (
            <Boton titulo="Continuar en modo personal" onPress={() => router.push('/preferencias')} />
          )}
          {estado === 'en_espera' && (
            <Boton
              titulo="Cancelar solicitud"
              variante="textoPeligro"
              cargando={cancelar.isPending}
              onPress={confirmarCancelacion}
            />
          )}
        </View>
      </ScrollView>
    </PantallaConEsfera>
  );
}
