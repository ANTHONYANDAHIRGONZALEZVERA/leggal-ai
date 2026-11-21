import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, View } from 'react-native';

import { Aparecer } from '@/components/aparecer';
import { AvisoError } from '@/components/aviso-error';
import { Boton } from '@/components/boton';
import { CampoCodigo } from '@/components/campo-codigo';
import { PantallaPermiso } from '@/components/pantalla-permiso';
import { Presionable } from '@/components/presionable';
import { TarjetaEmpresa } from '@/components/tarjeta-empresa';
import { Texto } from '@/components/texto';
import { consultarPermisoNotificaciones, pedirPermisoNotificaciones } from '@/features/notificaciones/permiso';
import { PUNTOS_NOTIFICACIONES } from '@/features/notificaciones/puntos';
import { useBorradorOnboarding } from '@/features/onboarding/borrador';
import { colors, fontFamily, spacing } from '@/theme';
import { conPunto } from '@/utils/texto';

import { claveVistaPrevia, consultarCodigo, solicitarAcceso } from './api';
import { codigoConGuion, LARGO_CODIGO } from './esquemas';

// Pestaña "Unirme con código" del 4/5 (F33). Con los 6 caracteres escritos se
// consulta el código (B39, sin canjearlo) y se muestra la empresa y el rol.
// "Solicitar acceso" lo canjea. Escanear QR, Enlace de invitación y la unión
// por dominio verificado quedan fuera de estas dos semanas (plan).
export function PestanaUnirme() {
  const { solicitud, guardarSolicitud } = useBorradorOnboarding();
  const [codigo, setCodigo] = useState('');
  /** Empresa a la que se pidió acceso, mientras se ofrece activar los avisos. */
  const [ofrecerAvisos, setOfrecerAvisos] = useState<string | null>(null);
  const completo = codigo.length === LARGO_CODIGO;

  // Una consulta por código: no se reintenta sola, porque cada intento cuenta
  // para el límite de 5 por hora.
  const vistaPrevia = useQuery({
    queryKey: claveVistaPrevia(codigo),
    queryFn: () => consultarCodigo(codigoConGuion(codigo)),
    enabled: completo,
    retry: false,
    staleTime: Infinity,
  });

  const solicitar = useMutation({
    mutationFn: () => solicitarAcceso(codigoConGuion(codigo)),
    onSuccess: async (nueva) => {
      guardarSolicitud(nueva);
      // Si la empresa no pide aprobación ya es miembro: sigue al 5/5.
      if (nueva.estado === 'aprobada') return router.push('/preferencias');
      // Es el mejor momento para ofrecer los avisos: lo que espera es la
      // aprobación. Solo si aún se puede preguntar; nunca es obligatorio.
      if ((await consultarPermisoNotificaciones().catch(() => null)) === 'preguntar') {
        setOfrecerAvisos(nueva.empresa.nombre);
      } else {
        router.push('/solicitud');
      }
    },
  });

  /** Con o sin permiso, la solicitud ya se envió: sigue a "Solicitud enviada". */
  async function cerrarAvisos(pedir: boolean) {
    if (pedir) await pedirPermisoNotificaciones().catch(() => null);
    setOfrecerAvisos(null);
    router.push('/solicitud');
  }

  function cambiarCodigo(nuevo: string) {
    setCodigo(nuevo);
    solicitar.reset();
  }

  const datos = completo ? vistaPrevia.data : undefined;
  const errorCodigo = completo && vistaPrevia.isError ? vistaPrevia.error.message : undefined;
  const pendiente = solicitud?.estado === 'en_espera' ? solicitud : null;

  return (
    <>
      <View style={{ gap: 14, paddingTop: 18 }}>
        {pendiente && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: 12,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: '#FFF1DC',
            }}>
            <Texto variante="nota" style={{ flex: 1, color: '#7A4300' }}>
              Tu solicitud a {pendiente.empresa.nombre} está pendiente.
            </Texto>
            <Presionable accessibilityRole="link" onPress={() => router.push('/solicitud')} hitSlop={12}>
              <Texto variante="enlace">Ver solicitud</Texto>
            </Presionable>
          </View>
        )}

        <Texto variante="subtitulo">Ingresa el código que te compartió el administrador de tu empresa.</Texto>
        <CampoCodigo valor={codigo} onCambiar={cambiarCodigo} error={Boolean(errorCodigo)} />

        {completo && vistaPrevia.isFetching && (
          <Texto variante="nota" accessibilityLiveRegion="polite">
            Buscando la empresa…
          </Texto>
        )}
        {errorCodigo && (
          <Texto variante="nota" accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.error }}>
            {errorCodigo}
          </Texto>
        )}

        {datos && (
          <Aparecer>
            <TarjetaEmpresa {...datos} />
          </Aparecer>
        )}
      </View>

      <View style={{ flex: 1, minHeight: spacing.xxl }} />

      <View style={{ gap: 14, paddingBottom: spacing.xl }}>
        <AvisoError mensaje={solicitar.error?.message} />
        {!completo && (
          <Texto variante="nota" style={{ textAlign: 'center', fontFamily: fontFamily.semibold }}>
            Escribe los 6 caracteres del código
          </Texto>
        )}
        <Boton
          titulo="Solicitar acceso"
          icono="flecha"
          deshabilitado={!datos}
          cargando={solicitar.isPending}
          onPress={() => solicitar.mutate()}
        />
      </View>

      <Modal
        visible={ofrecerAvisos !== null}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => void cerrarAvisos(false)}>
        <PantallaPermiso
          icono="campana"
          titulo="Activa las"
          destacado="notificaciones"
          descripcion={conPunto(`Te avisamos cuando ${ofrecerAvisos ?? 'tu empresa'} apruebe tu solicitud`)}
          puntos={PUNTOS_NOTIFICACIONES}
          textoPermitir="Permitir notificaciones"
          onPermitir={() => void cerrarAvisos(true)}
          onAhoraNo={() => void cerrarAvisos(false)}
        />
      </Modal>
    </>
  );
}
