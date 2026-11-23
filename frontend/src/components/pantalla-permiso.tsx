import { View } from "react-native";
import Animated, {
  useReducedMotion,
  type CSSAnimationKeyframes,
} from "react-native-reanimated";

import { colors, fontFamily, spacing } from "@/theme";

import { Aparecer } from "./aparecer";
import { Boton } from "./boton";
import { Esfera } from "./esfera";
import { Icono, type NombreIcono } from "./icono";
import { PantallaConEsfera } from "./pantalla-con-esfera";
import { Texto } from "./texto";
import { TituloDestacado } from "./titulo-destacado";

// @keyframes "ripple" del diseño: el anillo crece y se desvanece.
const onda: CSSAnimationKeyframes = {
  from: { transform: [{ scale: 0.7 }], opacity: 1 },
  to: { transform: [{ scale: 1.9 }], opacity: 0 },
};
const RETRASOS_ONDA = [0, 800, 1600];

export type PuntoPermiso = {
  icono: NombreIcono;
  texto: string;
  fondo: string;
  color: string;
};

type Props = {
  icono: NombreIcono;
  titulo: string;
  destacado: string;
  descripcion: string;
  puntos: PuntoPermiso[];
  textoPermitir: string;
  onPermitir: () => void;
  onAhoraNo: () => void;
};

// "Permiso del sistema" del diseño (PermisoSistema): explica para qué se usa
// el permiso antes de que aparezca el aviso del teléfono. El diseño lo muestra
// con el micrófono y dice que la cámara y las notificaciones usan la misma.
export function PantallaPermiso({
  icono,
  titulo,
  destacado,
  descripcion,
  puntos,
  textoPermitir,
  onPermitir,
  onAhoraNo,
}: Props) {
  const reducido = useReducedMotion();

  return (
    <PantallaConEsfera>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        // Más arriba que en el diseño (20 + 280) a pedido del equipo. En
        // pantallas bajas se encoge (hasta 220) para no chocar con los botones.
        style={{
          height: 300,
          minHeight: 220,
          flexShrink: 1,
          paddingTop: 20,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Esfera, ondas y círculo comparten el mismo centro. */}
        <View
          style={{
            width: 180,
            height: 170,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Esfera
            ancho={180}
            alto={170}
            ciclo={8000}
            style={{ position: "absolute", left: 0, top: 0 }}
          />
          {RETRASOS_ONDA.map((retraso) => (
            <Animated.View
              key={retraso}
              style={[
                {
                  position: "absolute",
                  left: 30,
                  top: 25,
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  borderWidth: 2,
                  borderColor: "rgba(75,47,224,0.45)",
                },
                reducido
                  ? { opacity: 0 }
                  : {
                      animationName: onda,
                      animationDuration: 2400,
                      animationDelay: retraso,
                      animationIterationCount: "infinite",
                      animationTimingFunction: "ease-out",
                    },
              ]}
            />
          ))}
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundImage: "linear-gradient(140deg, #4B2FE0, #8B7BFF)",
              boxShadow: "0 14px 30px -10px rgba(75,47,224,0.7)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icono nombre={icono} tamano={32} color={colors.sobreOscuro} />
          </View>
        </View>
      </View>

      <View
        style={{ alignItems: "center", gap: spacing.xs, paddingHorizontal: 28 }}
      >
        <TituloDestacado
          texto={titulo}
          destacado={destacado}
          style={{ justifyContent: "center" }}
        />
        <Texto variante="subtitulo" style={{ textAlign: "center" }}>
          {descripcion}
        </Texto>
      </View>

      <View style={{ gap: spacing.xs, paddingTop: 18, paddingHorizontal: 24 }}>
        {puntos.map((punto, i) => (
          <Aparecer
            key={punto.texto}
            retraso={i * 100}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 16,
              borderCurve: "continuous",
              backgroundColor: colors.superficie,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: punto.fondo,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icono nombre={punto.icono} tamano={18} color={punto.color} />
            </View>
            <Texto
              variante="cuerpo"
              style={{ flex: 1, fontSize: 14, fontFamily: fontFamily.semibold }}
            >
              {punto.texto}
            </Texto>
          </Aparecer>
        ))}
      </View>

      <View
        style={{
          marginTop: "auto",
          gap: 10,
          paddingTop: spacing.lg,
          paddingHorizontal: 24,
          paddingBottom: 40,
        }}
      >
        <Boton titulo={textoPermitir} onPress={onPermitir} />
        <Boton titulo="Ahora no" variante="texto" onPress={onAhoraNo} />
      </View>
    </PantallaConEsfera>
  );
}
