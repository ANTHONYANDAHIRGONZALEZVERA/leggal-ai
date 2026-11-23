import { Fragment, useRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';

import { normalizarCodigo } from '@/features/empresas/esquemas';
import { colors, fontFamily, motion } from '@/theme';

import { Texto } from './texto';

const CAJAS = 6;

// Las cajas bajan un poco al aparecer, escalonadas (sin rebote: nadie las
// lanzó). El cursor parpadea en la caja donde va la próxima letra.
const caer: CSSAnimationKeyframes = {
  from: { opacity: 0, transform: [{ translateY: -12 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
};
const parpadear: CSSAnimationKeyframes = {
  '0%': { opacity: 1 },
  '49%': { opacity: 1 },
  '50%': { opacity: 0 },
  '100%': { opacity: 0 },
};

type Props = {
  /** Código sin guion, en mayúsculas (hasta 6). */
  valor: string;
  onCambiar: (codigo: string) => void;
  error?: boolean;
  /**
   * `invitacion` (por defecto): letras y números con guion al medio, como
   * ACC-7K2 (4/5). `numerico`: 6 dígitos que llegan por correo (B27 y B28),
   * con teclado numérico y autocompletar del código.
   */
  tipo?: 'invitacion' | 'numerico';
  /** Al escribir el sexto carácter (por ejemplo, para verificar solo). */
  onCompleto?: (codigo: string) => void;
};

/** Solo dígitos, hasta 6 (lo que se escribe o se pega: "123 456" → "123456"). */
export const soloDigitos = (texto: string) => texto.replace(/\D/g, '').slice(0, CAJAS);

// 6 cajas para un código. Por dentro es un solo campo invisible encima de las
// cajas, así funcionan el teclado, pegar el código completo y el lector de
// pantalla.
export function CampoCodigo({ valor, onCambiar, error, tipo = 'invitacion', onCompleto }: Props) {
  const numerico = tipo === 'numerico';
  const reducido = useReducedMotion();
  const campo = useRef<TextInputInstance>(null);
  const [enfocado, setEnfocado] = useState(false);
  const actual = Math.min(valor.length, CAJAS - 1);

  return (
    <Pressable onPress={() => campo.current?.focus()} accessible={false}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}>
        {Array.from({ length: CAJAS }, (_, i) => {
          const esActual = enfocado && i === actual && valor.length < CAJAS;
          const borde = error ? colors.error : esActual ? colors.acentoClaro : colors.borde;
          return (
            <Fragment key={i}>
              <Animated.View
                style={[
                  {
                    flex: 1,
                    maxWidth: 48,
                    height: 56,
                    borderRadius: 14,
                    borderCurve: 'continuous',
                    borderWidth: 1.5,
                    borderColor: borde,
                    backgroundColor: colors.superficie,
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: esActual ? '0 0 0 4px rgba(124,92,255,0.15)' : undefined,
                  },
                  !reducido && {
                    animationName: caer,
                    animationDuration: 400,
                    animationDelay: i * 80,
                    animationFillMode: 'both',
                    animationTimingFunction: motion.curvaSalida,
                  },
                ]}>
                {valor[i] ? (
                  <Texto
                    variante="titulo"
                    style={{
                      fontSize: 22,
                      lineHeight: 28,
                      fontFamily: fontFamily.bold,
                      fontVariant: ['tabular-nums'],
                    }}>
                    {valor[i]}
                  </Texto>
                ) : esActual ? (
                  <Animated.View
                    style={[
                      { width: 2, height: 24, backgroundColor: colors.acento },
                      !reducido && {
                        animationName: parpadear,
                        animationDuration: 1000,
                        animationIterationCount: 'infinite',
                      },
                    ]}
                  />
                ) : null}
              </Animated.View>
              {/* Guion entre las 3 primeras y las 3 últimas, como ACC-7K2. */}
              {i === 2 && !numerico && (
                <View
                  style={{
                    width: 10,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: colors.bordeFuerte,
                  }}
                />
              )}
            </Fragment>
          );
        })}
      </View>

      <TextInput
        ref={campo}
        value={valor}
        onChangeText={(texto) => {
          const codigo = numerico ? soloDigitos(texto) : normalizarCodigo(texto);
          onCambiar(codigo);
          if (codigo.length === CAJAS && codigo !== valor) onCompleto?.(codigo);
        }}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        accessibilityLabel={numerico ? 'Código de verificación' : 'Código de invitación'}
        accessibilityHint={numerico ? '6 dígitos que te enviamos por correo' : '6 letras o números, por ejemplo ACC-7K2'}
        autoCapitalize={numerico ? 'none' : 'characters'}
        autoCorrect={false}
        keyboardType={numerico ? 'number-pad' : 'default'}
        autoComplete={numerico ? 'one-time-code' : 'off'}
        textContentType={numerico ? 'oneTimeCode' : 'none'}
        spellCheck={false}
        caretHidden
        contextMenuHidden={false}
        returnKeyType="done"
        // Encima de las cajas y casi invisible: recibe los toques y el teclado.
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.02,
          color: 'transparent',
          fontSize: 1,
        }}
      />
    </Pressable>
  );
}
