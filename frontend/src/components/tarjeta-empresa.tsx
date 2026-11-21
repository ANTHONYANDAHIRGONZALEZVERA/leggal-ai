import { View } from 'react-native';

import type { VistaPreviaCodigo } from '@/features/empresas/contrato';
import { colors, fontFamily } from '@/theme';

import { Esfera } from './esfera';
import { Icono } from './icono';
import { Texto } from './texto';

// Lo que hay detrás del código antes de canjearlo (4/5): empresa, si está
// verificada, el rol con el que entrarías y si un administrador debe aprobar.
export function TarjetaEmpresa({ empresa, rol, requiereAprobacion }: VistaPreviaCodigo) {
  return (
    <View
      accessible
      accessibilityLabel={`${empresa.nombre}, ${empresa.verificada ? 'empresa verificada' : 'empresa sin verificar'}. Rol asignado: ${rol.nombre}. Acceso: ${requiereAprobacion ? 'requiere aprobación' : 'inmediato'}.`}
      style={{
        gap: 12,
        padding: 16,
        borderRadius: 22,
        borderCurve: 'continuous',
        backgroundColor: colors.superficie,
        boxShadow: '0 16px 36px -22px rgba(60,40,140,0.6)',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Esfera ancho={48} alto={46} ciclo={7000} />
        <View style={{ flex: 1 }}>
          <Texto variante="cuerpo" style={{ fontSize: 16, fontFamily: fontFamily.extrabold }} numberOfLines={2}>
            {empresa.nombre}
          </Texto>
          <Texto variante="nota">{empresa.verificada ? 'Empresa verificada' : 'Empresa sin verificar'}</Texto>
        </View>
        {empresa.verificada && (
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: colors.verdeAzulado,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icono nombre="check" tamano={14} color={colors.sobreOscuro} />
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Dato titulo="Rol asignado" valor={rol.nombre} />
        <Dato titulo="Acceso" valor={requiereAprobacion ? 'Requiere aprobación' : 'Inmediato'} />
      </View>
    </View>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderCurve: 'continuous',
        backgroundColor: '#F6F4FC',
      }}>
      <Texto variante="seccion" style={{ fontSize: 11 }}>
        {titulo}
      </Texto>
      <Texto variante="cuerpo" style={{ fontSize: 14, fontFamily: fontFamily.bold }}>
        {valor}
      </Texto>
    </View>
  );
}
