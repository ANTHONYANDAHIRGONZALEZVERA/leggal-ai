import { Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Aparecer } from '@/components/aparecer';
import { BarraPasos } from '@/components/barra-pasos';
import { BotonVolver } from '@/components/boton-volver';
import { PantallaConEsfera } from '@/components/pantalla-con-esfera';
import { SelectorPestanas } from '@/components/selector-pestanas';
import { TituloDestacado } from '@/components/titulo-destacado';
import { PestanaCrear } from '@/features/empresas/pestana-crear';
import { PestanaUnirme } from '@/features/empresas/pestana-unirme';
import { useBorradorOnboarding } from '@/features/onboarding/borrador';
import { MARGEN_PANTALLA, spacing } from '@/theme';

type Pestana = 'unirme' | 'crear';
const PESTANAS = [
  { valor: 'unirme', titulo: 'Unirme con código' },
  { valor: 'crear', titulo: 'Crear empresa' },
] as const satisfies readonly { valor: Pestana; titulo: string }[];

// Onboarding 4/5 "Conéctate a tu empresa" (F33). Solo en modo Colaborativo:
// unirse a una empresa con el código de su administrador, o crear una nueva.
export default function Empresa() {
  const { perfil, area, modo, empresa } = useBorradorOnboarding();
  // Si ya creó una empresa y volvió atrás, abre en esa pestaña.
  const [pestana, setPestana] = useState<Pestana>(empresa ? 'crear' : 'unirme');

  // El borrador vive en memoria: si la app se recargó aquí, faltan pasos.
  if (!perfil) return <Redirect href="/perfil" />;
  if (!area) return <Redirect href="/area" />;
  if (modo !== 'colaborativo') return <Redirect href="/modo" />;

  return (
    <PantallaConEsfera>
      <StatusBar style="dark" />
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ flexGrow: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingTop: spacing.xs,
            paddingHorizontal: spacing.md,
          }}>
          <BotonVolver respaldo="/modo" />
          <BarraPasos actual={4} total={5} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: MARGEN_PANTALLA }}>
          <Aparecer style={{ paddingTop: 24, gap: 16 }}>
            <TituloDestacado texto="Conéctate a tu" destacado="empresa" variante="tituloPaso" />
            <SelectorPestanas opciones={PESTANAS} valor={pestana} onCambiar={setPestana} />
          </Aparecer>

          {pestana === 'unirme' ? <PestanaUnirme /> : <PestanaCrear />}
        </View>
      </ScrollView>
    </PantallaConEsfera>
  );
}
