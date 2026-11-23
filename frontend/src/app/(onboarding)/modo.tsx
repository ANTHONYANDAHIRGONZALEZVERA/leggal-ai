import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';

import { Aparecer } from '@/components/aparecer';
import { BarraPasos } from '@/components/barra-pasos';
import { Boton } from '@/components/boton';
import { BotonVolver } from '@/components/boton-volver';
import { IlustracionEquipo, IlustracionPersonal } from '@/components/ilustracion-modo';
import { PantallaConEsfera } from '@/components/pantalla-con-esfera';
import { TarjetaModo } from '@/components/tarjeta-modo';
import { Texto } from '@/components/texto';
import { TituloDestacado } from '@/components/titulo-destacado';
import { useBorradorOnboarding } from '@/features/onboarding/borrador';
import { esquemaModo, type DatosModo, type Modo as ModoTrabajo, type ModoValidado } from '@/features/onboarding/esquemas';
import { colors, MARGEN_PANTALLA, spacing } from '@/theme';

/** A dónde sigue cada modo: Personal se salta el 4/5 (no hay empresa a la que unirse). */
const SIGUIENTE = { personal: '/preferencias', colaborativo: '/empresa' } as const satisfies Record<ModoTrabajo, string>;

// Onboarding 3/5 "¿Cómo vas a trabajar?" (F31): Personal (un espacio privado,
// que el backend crea como una empresa de un solo miembro) o Colaborativo
// (unirse o crear una empresa en el 4/5).
export default function Modo() {
  const { perfil, area, modo, guardarModo } = useBorradorOnboarding();

  // Si vuelve desde el paso siguiente, encuentra lo que ya había elegido.
  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<DatosModo, unknown, ModoValidado>({
    resolver: zodResolver(esquemaModo),
    defaultValues: { modo: modo ?? undefined },
  });

  // Al salir hacia atrás sin tocar Continuar, se guarda lo elegido.
  useEffect(
    () => () => {
      const elegido = esquemaModo.safeParse(getValues());
      if (elegido.success) useBorradorOnboarding.getState().guardarModo(elegido.data.modo);
    },
    [getValues],
  );

  const continuar = handleSubmit((datos) => {
    guardarModo(datos.modo);
    router.push(SIGUIENTE[datos.modo]);
  });

  // El borrador vive en memoria: si la app se recargó aquí, faltan los pasos
  // anteriores y hay que volver a ellos.
  if (!perfil) return <Redirect href="/perfil" />;
  if (!area) return <Redirect href="/area" />;

  return (
    <PantallaConEsfera>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: spacing.xs, paddingHorizontal: spacing.md }}>
          <BotonVolver respaldo="/area" />
          <BarraPasos actual={3} total={5} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          <Aparecer style={{ paddingTop: 26, paddingHorizontal: MARGEN_PANTALLA - 20, gap: 6 }}>
            <TituloDestacado texto="¿Cómo vas a" destacado="trabajar?" variante="tituloPaso" />
            <Texto variante="subtitulo">Puedes cambiarlo después o pertenecer a varias empresas.</Texto>
          </Aparecer>

          <Controller
            control={control}
            name="modo"
            render={({ field: { onChange, value } }) => (
              <View accessibilityRole="radiogroup" accessibilityLabel="Cómo vas a trabajar" style={{ gap: 14, paddingTop: 22 }}>
                <Aparecer retraso={100}>
                  <TarjetaModo
                    titulo="Personal"
                    descripcion="Un espacio privado para tus propios casos y documentos."
                    ilustracion={<IlustracionPersonal />}
                    seleccionada={value === 'personal'}
                    onPress={() => onChange('personal')}
                  />
                </Aparecer>
                <Aparecer retraso={200}>
                  <TarjetaModo
                    titulo="Colaborativo · Empresa"
                    descripcion="Trabaja con tu equipo: casos compartidos, roles y permisos."
                    ilustracion={<IlustracionEquipo />}
                    etiquetas={['Multiempresa', 'Trazabilidad', 'Roles']}
                    seleccionada={value === 'colaborativo'}
                    onPress={() => onChange('colaborativo')}
                  />
                </Aparecer>
              </View>
            )}
          />
          {errors.modo && (
            <Texto
              variante="nota"
              accessibilityLiveRegion="polite"
              style={{ color: colors.error, paddingTop: spacing.xs, paddingHorizontal: MARGEN_PANTALLA - 20 }}>
              {errors.modo.message}
            </Texto>
          )}

          <View style={{ flex: 1, minHeight: spacing.xxl }} />

          <View style={{ paddingHorizontal: MARGEN_PANTALLA - 20, paddingBottom: spacing.xl }}>
            <Boton titulo="Continuar" icono="flecha" onPress={() => continuar()} />
          </View>
        </View>
      </ScrollView>
    </PantallaConEsfera>
  );
}
