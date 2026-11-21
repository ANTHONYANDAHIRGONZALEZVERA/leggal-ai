import { router } from 'expo-router';
import { View } from 'react-native';

import { BotonCircular } from '@/components/boton-circular';
import { Icono } from '@/components/icono';
import { Presionable } from '@/components/presionable';
import { Texto } from '@/components/texto';
import type { EmpresaApi } from '@/services/api/contrato';
import { colors, fontFamily, gradients, sizes } from '@/theme';
import { conPunto } from '@/utils/texto';

type Props = {
  espacio: EmpresaApi | null;
  cargando: boolean;
  /** Iniciales del avatar ("AR"). */
  iniciales: string;
  /** Para lo que aún no existe: muestra "Próximamente". */
  onProximamente: (que: string) => void;
};

const vidrio = {
  backgroundColor: 'rgba(255,255,255,0.8)',
  borderWidth: 1,
  borderColor: colors.superficie,
  boxShadow: '0 6px 18px -10px rgba(60,40,140,0.35)',
} as const;

// Encabezado del Inicio (F12): a la izquierda el espacio activo (Elige tu
// espacio llega en F38); a la derecha buscar, notificaciones y el avatar, que
// lleva a "Más" (perfil y cuenta).
export function EncabezadoInicio({ espacio, cargando, iniciales, onProximamente }: Props) {
  const nombreEspacio = espacio?.nombre ?? 'Sin espacio';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 20 }}>
      <Presionable
        accessibilityLabel={cargando ? 'Leggal AI, cargando tu espacio' : `Leggal AI, espacio ${conPunto(nombreEspacio)} Cambiar de espacio`}
        accessibilityHint="Próximamente"
        onPress={() => onProximamente('Cambiar de espacio llega pronto')}
        style={{
          ...vidrio,
          flexShrink: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          height: sizes.tactilMinimo,
          paddingLeft: 6,
          paddingRight: 14,
          borderRadius: 999,
        }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: gradients.logo,
          }}>
          <Icono nombre="balanza" tamano={18} color={colors.superficie} />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Texto variante="cuerpo" style={{ fontSize: 14, fontFamily: fontFamily.extrabold, lineHeight: 16 }}>
            Leggal AI
          </Texto>
          {cargando ? (
            <View accessibilityElementsHidden style={{ width: 86, height: 10, marginTop: 3, borderRadius: 5, backgroundColor: colors.borde }} />
          ) : (
            <Texto variante="nota" numberOfLines={1} style={{ fontSize: 11, lineHeight: 14 }}>
              {nombreEspacio}
            </Texto>
          )}
        </View>
        <Icono nombre="abajo" tamano={14} color={colors.textoSecundario} />
      </Presionable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <BotonCircular icono="lupa" accessibilityLabel="Buscar" onPress={() => onProximamente('La búsqueda llega pronto')} />
        <BotonCircular icono="campana" accessibilityLabel="Notificaciones" onPress={() => onProximamente('Las notificaciones llegan pronto')} />
        <Presionable
          accessibilityLabel="Mi perfil y cuenta"
          onPress={() => router.navigate('/mas')}
          style={{
            width: sizes.tactilMinimo,
            height: sizes.tactilMinimo,
            borderRadius: sizes.tactilMinimo / 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: colors.superficie,
            backgroundImage: 'linear-gradient(140deg, #2A2550, #4B2FE0)',
            boxShadow: '0 6px 18px -8px rgba(60,40,140,0.6)',
          }}>
          <Texto variante="cuerpo" style={{ fontSize: 14, fontFamily: fontFamily.bold, color: colors.sobreOscuro }}>
            {iniciales}
          </Texto>
        </Presionable>
      </View>
    </View>
  );
}
