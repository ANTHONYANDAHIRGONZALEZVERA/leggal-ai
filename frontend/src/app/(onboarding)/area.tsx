import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aparecer } from '@/components/aparecer';
import { BarraPasos } from '@/components/barra-pasos';
import { Boton } from '@/components/boton';
import { BotonVolver } from '@/components/boton-volver';
import { CampoTexto } from '@/components/campo-texto';
import { Chip } from '@/components/chip';
import { Esfera } from '@/components/esfera';
import type { NombreIcono } from '@/components/icono';
import { PantallaConEsfera } from '@/components/pantalla-con-esfera';
import { TarjetaOpcion } from '@/components/tarjeta-opcion';
import { Texto } from '@/components/texto';
import { TituloDestacado } from '@/components/titulo-destacado';
import { useBorradorOnboarding } from '@/features/onboarding/borrador';
import {
  esquemaArea,
  LARGO_MAX_MATRICULA,
  MATERIAS,
  ROLES,
  type AreaValidada,
  type DatosArea,
  type Rol,
} from '@/features/onboarding/esquemas';
import { colors, MARGEN_PANTALLA, spacing } from '@/theme';

// Ícono y colores de cada rol, como en el diseño.
const ESTILO_ROL: Record<Rol, { icono: NombreIcono; fondo: string; color: string }> = {
  abogado: { icono: 'balanza', fondo: '#ECE7FF', color: '#4B2FE0' },
  asistente_legal: { icono: 'portapapeles', fondo: '#DDF4F6', color: '#0B7A8B' },
  contador: { icono: 'calculadora', fondo: '#FFF1DC', color: '#A15C00' },
  gerente: { icono: 'maletin', fondo: '#FCE7F3', color: '#B0287A' },
  estudiante: { icono: 'birrete', fondo: '#E4ECFF', color: '#2B55C9' },
  otro: { icono: 'puntos', fondo: '#EEEAF6', color: '#3A3560' },
};

// Los roles van de a dos por fila.
const FILAS_ROLES = [ROLES.slice(0, 2), ROLES.slice(2, 4), ROLES.slice(4, 6)];

// Onboarding 2/5 "¿En qué área te desempeñas?" (F30): rol (obligatorio),
// materias en chips (opcionales) y, para abogados, la matrícula (opcional).
export default function Area() {
  const { top } = useSafeAreaInsets();
  const { perfil, area, guardarArea } = useBorradorOnboarding();

  // Si vuelve desde el paso 3, encuentra lo que ya había elegido.
  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<DatosArea, unknown, AreaValidada>({
    resolver: zodResolver(esquemaArea),
    defaultValues: { rol: area?.rol, materias: area?.materias ?? [], matricula: area?.matricula ?? '' },
  });
  const rol = useWatch({ control, name: 'rol' });

  // Al salir hacia atrás (flecha o gesto del sistema) sin tocar Continuar, se
  // guarda lo elegido si está completo: al volver lo encuentra igual.
  useEffect(
    () => () => {
      const elegido = esquemaArea.safeParse(getValues());
      if (elegido.success) useBorradorOnboarding.getState().guardarArea(elegido.data);
    },
    [getValues],
  );

  const continuar = handleSubmit((datos) => {
    guardarArea(datos);
    router.push('/modo');
  });

  // El borrador vive en memoria: si la app se recargó en este paso, falta el
  // 1/5 (nombre y @usuario) y hay que empezar por ahí.
  if (!perfil) return <Redirect href="/perfil" />;

  return (
    <PantallaConEsfera
      decoracion={<Esfera ancho={70} alto={60} flotar style={{ position: 'absolute', right: 20, top: top + 66 }} />}>
      <StatusBar style="dark" />
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: spacing.xs, paddingHorizontal: spacing.md }}>
          <BotonVolver respaldo="/perfil" />
          <BarraPasos actual={2} total={5} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: MARGEN_PANTALLA }}>
          <Aparecer style={{ paddingTop: 26, paddingRight: 76, gap: 6 }}>
            <TituloDestacado texto="¿En qué área te" destacado="desempeñas?" variante="tituloPaso" />
            <Texto variante="subtitulo">Así el asistente adapta sus respuestas y sugerencias.</Texto>
          </Aparecer>

          <Aparecer retraso={100} style={{ paddingTop: 18, gap: spacing.xs }}>
            <Texto variante="seccion">Tu rol</Texto>
            <Controller
              control={control}
              name="rol"
              render={({ field: { onChange, value } }) => (
                <View accessibilityRole="radiogroup" accessibilityLabel="Tu rol" style={{ gap: spacing.xs }}>
                  {FILAS_ROLES.map((fila) => (
                    <View key={fila[0].valor} style={{ flexDirection: 'row', gap: spacing.xs }}>
                      {fila.map(({ valor, titulo }) => (
                        <TarjetaOpcion
                          key={valor}
                          titulo={titulo}
                          {...ESTILO_ROL[valor]}
                          seleccionada={value === valor}
                          onPress={() => onChange(valor)}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              )}
            />
            {errors.rol && (
              <Texto variante="nota" accessibilityLiveRegion="polite" style={{ color: colors.error }}>
                {errors.rol.message}
              </Texto>
            )}
          </Aparecer>

          <Aparecer retraso={200} style={{ paddingTop: 18, gap: spacing.xs }}>
            <Texto variante="seccion">Materias en las que trabajas</Texto>
            <Controller
              control={control}
              name="materias"
              render={({ field: { onChange, value } }) => (
                <View accessibilityLabel="Materias en las que trabajas" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  {MATERIAS.map(({ valor, titulo }) => (
                    <Chip
                      key={valor}
                      texto={titulo}
                      seleccionado={value.includes(valor)}
                      onPress={() => onChange(value.includes(valor) ? value.filter((m) => m !== valor) : [...value, valor])}
                    />
                  ))}
                </View>
              )}
            />
          </Aparecer>

          {rol === 'abogado' && (
            <Aparecer style={{ paddingTop: spacing.md }}>
              <Controller
                control={control}
                name="matricula"
                render={({ field: { onChange, onBlur, value } }) => (
                  <CampoTexto
                    etiqueta="Matrícula profesional (opcional)"
                    placeholder="N.º de matrícula del Foro de Abogados"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={LARGO_MAX_MATRICULA}
                    returnKeyType="done"
                    onSubmitEditing={() => continuar()}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.matricula?.message}
                  />
                )}
              />
            </Aparecer>
          )}

          <View style={{ flex: 1, minHeight: spacing.xxl }} />

          <View style={{ paddingBottom: spacing.xl }}>
            <Boton titulo="Continuar" icono="flecha" onPress={() => continuar()} />
          </View>
        </View>
      </ScrollView>
    </PantallaConEsfera>
  );
}
