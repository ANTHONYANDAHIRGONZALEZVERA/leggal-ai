import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View, type TextInputInstance } from 'react-native';

import { AvisoError } from '@/components/aviso-error';
import { Boton } from '@/components/boton';
import { CampoTexto } from '@/components/campo-texto';
import { Presionable } from '@/components/presionable';
import { Texto } from '@/components/texto';
import { useBorradorOnboarding } from '@/features/onboarding/borrador';
import { aplicarErrorApi } from '@/services/api/errores-formulario';
import { useSesion } from '@/services/sesion';
import { colors, fontFamily, spacing } from '@/theme';

import { crearEmpresa } from './api';
import { TAMANOS_EQUIPO, type TamanoEquipo } from './contrato';
import { esquemaEmpresa, LARGO_RUC, type DatosEmpresa, type EmpresaValidada } from './esquemas';

/** Cómo se ve cada tamaño: con raya larga, como el diseño. */
const TITULO_TAMANO: Record<TamanoEquipo, string> = {
  '1-5': '1–5',
  '6-20': '6–20',
  '21-50': '21–50',
  '50+': '50+',
};

// Pestaña "Crear empresa" del 4/5 (F33). Crea la empresa en el servidor (B35):
// la persona queda como Administradora y la sesión nueva ya trae su empresa.
export function PestanaCrear() {
  const { empresa, guardarEmpresa } = useBorradorOnboarding();
  const campoRuc = useRef<TextInputInstance>(null);
  const [errorGeneral, setErrorGeneral] = useState<string>();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DatosEmpresa, unknown, EmpresaValidada>({
    resolver: zodResolver(esquemaEmpresa),
    defaultValues: { razonSocial: '', ruc: '', tamanoEquipo: undefined },
  });

  const crear = handleSubmit(async (datos) => {
    setErrorGeneral(undefined);
    try {
      const respuesta = await crearEmpresa(datos);
      useSesion.getState().iniciar(respuesta);
      guardarEmpresa(respuesta.empresa);
      router.push('/preferencias');
    } catch (error) {
      setErrorGeneral(aplicarErrorApi(error, setError, ['razonSocial', 'ruc', 'tamanoEquipo']));
    }
  });

  // Ya la creó y volvió atrás: no se crea otra vez.
  if (empresa) {
    return (
      <>
        <View style={{ paddingTop: 18 }}>
          <Nota>Ya creaste {empresa.nombre} y eres su administrador. Podrás invitar a tu equipo desde Administrar empresa.</Nota>
        </View>
        <View style={{ flex: 1, minHeight: spacing.xxl }} />
        <View style={{ paddingBottom: spacing.xl }}>
          <Boton titulo="Continuar" icono="flecha" onPress={() => router.push('/preferencias')} />
        </View>
      </>
    );
  }

  return (
    <>
      <View style={{ gap: 14, paddingTop: 18 }}>
        <Controller
          control={control}
          name="razonSocial"
          render={({ field: { onChange, onBlur, value } }) => (
            <CampoTexto
              etiqueta="Razón social"
              placeholder="Nombre legal de la empresa"
              autoCapitalize="words"
              autoComplete="organization"
              textContentType="organizationName"
              maxLength={120}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => campoRuc.current?.focus()}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.razonSocial?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="ruc"
          render={({ field: { onChange, onBlur, value } }) => (
            <CampoTexto
              ref={campoRuc}
              etiqueta="RUC"
              placeholder="13 dígitos"
              keyboardType="number-pad"
              maxLength={LARGO_RUC}
              value={value}
              // Solo dígitos: si pega "1790012345-001" queda limpio.
              onChangeText={(texto) => onChange(texto.replace(/\D/g, '').slice(0, LARGO_RUC))}
              onBlur={onBlur}
              error={errors.ruc?.message}
            />
          )}
        />

        <View style={{ gap: spacing.xs }}>
          <Texto variante="etiqueta">Tamaño del equipo</Texto>
          <Controller
            control={control}
            name="tamanoEquipo"
            render={({ field: { onChange, value } }) => (
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Tamaño del equipo"
                style={{ flexDirection: 'row', gap: 6 }}>
                {TAMANOS_EQUIPO.map((tamano) => {
                  const elegido = value === tamano;
                  return (
                    <Presionable
                      key={tamano}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: elegido }}
                      accessibilityLabel={`${TITULO_TAMANO[tamano]} personas`}
                      onPress={() => onChange(tamano)}
                      style={{
                        flex: 1,
                        height: 42,
                        borderRadius: 12,
                        borderCurve: 'continuous',
                        borderWidth: 1.5,
                        borderColor: elegido ? colors.acento : colors.borde,
                        backgroundColor: elegido ? colors.acento : colors.superficie,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Texto
                        variante="botonPequeno"
                        style={{
                          fontSize: 13,
                          color: elegido ? colors.sobreOscuro : colors.etiqueta,
                        }}>
                        {TITULO_TAMANO[tamano]}
                      </Texto>
                    </Presionable>
                  );
                })}
              </View>
            )}
          />
          {errors.tamanoEquipo && (
            <Texto variante="nota" accessibilityLiveRegion="polite" style={{ color: colors.error }}>
              {errors.tamanoEquipo.message}
            </Texto>
          )}
        </View>

        <Nota>Serás administrador. Podrás invitar a tu equipo con un código y asignar roles y permisos.</Nota>
      </View>

      <View style={{ flex: 1, minHeight: spacing.xxl }} />

      <View style={{ gap: 14, paddingBottom: spacing.xl }}>
        <AvisoError mensaje={errorGeneral} />
        <Boton titulo="Crear empresa" icono="flecha" cargando={isSubmitting} onPress={() => crear()} />
      </View>
    </>
  );
}

// Recuadro lila con texto morado, para avisos informativos.
function Nota({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderCurve: 'continuous',
        backgroundColor: '#EFEBFF',
      }}>
      <Texto
        variante="nota"
        style={{
          fontSize: 13,
          lineHeight: 19,
          fontFamily: fontFamily.semibold,
          color: '#3B23C4',
        }}>
        {children}
      </Texto>
    </View>
  );
}
