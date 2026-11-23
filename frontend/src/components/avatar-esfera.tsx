import { Canvas, Circle, SweepGradient, vec } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { View } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';

import { colors, fontFamily, sizes } from '@/theme';
import { iniciales } from '@/utils/texto';

import { Esfera } from './esfera';
import { Icono } from './icono';
import { Presionable } from './presionable';
import { Texto } from './texto';

const LADO = 118;
// El aro tornasol rodea la esfera con 8 px de separación y 8 de grosor.
const ARO = LADO + 16;
const GROSOR_ARO = 8;
const IRIS = ['#5fe3f2', '#8b7bff', '#f4a3e6', '#5fe3f2'];

const girar: CSSAnimationKeyframes = {
  from: { transform: [{ rotate: '0deg' }] },
  to: { transform: [{ rotate: '360deg' }] },
};

type Props = {
  nombre: string;
  /** Foto elegida (archivo local). Sin foto se ven las iniciales. */
  foto?: string | null;
  /** Si se pasa, aparece el botón de cámara para subir o cambiar la foto. */
  onSubirFoto?: () => void;
};

// Avatar del onboarding: esfera cromada con las iniciales, un aro tornasol que
// gira y el botón de cámara. Las iniciales cambian mientras se escribe el
// nombre; si la persona elige una foto, la foto ocupa el lugar de la esfera.
export function AvatarEsfera({ nombre, foto, onSubirFoto }: Props) {
  const reducido = useReducedMotion();
  const letras = iniciales(nombre);
  const descripcion = foto
    ? 'Tu foto de perfil'
    : letras
      ? `Avatar con las iniciales ${letras.split('').join(' ')}`
      : 'Avatar';

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={descripcion}
      style={{ width: LADO, height: LADO }}>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: -8, top: -8, width: ARO, height: ARO },
          !reducido && {
            animationName: girar,
            animationDuration: 6000,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
          },
        ]}>
        <Canvas style={{ width: ARO, height: ARO }}>
          <Circle cx={ARO / 2} cy={ARO / 2} r={(ARO - GROSOR_ARO) / 2} style="stroke" strokeWidth={GROSOR_ARO}>
            <SweepGradient c={vec(ARO / 2, ARO / 2)} colors={IRIS} />
          </Circle>
        </Canvas>
      </Animated.View>

      {foto ? (
        <Image
          source={{ uri: foto }}
          contentFit="cover"
          transition={200}
          style={{ width: LADO, height: LADO, borderRadius: LADO / 2, backgroundColor: colors.borde }}
        />
      ) : (
        <>
          <Esfera ancho={LADO} alto={LADO} ciclo={8000} />
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Texto variante="titulo" style={{ fontSize: 34, lineHeight: 40, fontFamily: fontFamily.extrabold, color: colors.etiqueta }}>
              {letras}
            </Texto>
          </View>
        </>
      )}

      {onSubirFoto && (
        <Presionable
          accessibilityLabel={foto ? 'Cambiar foto' : 'Subir foto'}
          onPress={onSubirFoto}
          style={{
            position: 'absolute',
            right: -4,
            bottom: -4,
            width: sizes.tactilMinimo,
            height: sizes.tactilMinimo,
            borderRadius: sizes.tactilMinimo / 2,
            borderWidth: 3,
            borderColor: colors.fondo,
            backgroundColor: colors.texto,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icono nombre="camara" tamano={18} color={colors.sobreOscuro} />
        </Presionable>
      )}
    </View>
  );
}
