import { NativeTabs } from 'expo-router/native-tabs';

import { colors, fontFamily } from '@/theme';

// Barra de 5 pestañas del diseño (F12), nativa: en Android es la barra de
// Material con su indicador en forma de píldora, que es justo lo que dibuja el
// diseño (fondo lila suave detrás del ícono activo). Íconos del sistema
// (Material Symbols / SF Symbols) equivalentes a los del diseño.
export default function TabsLayout() {
  return (
    <NativeTabs
      backgroundColor="#FBFAFE"
      indicatorColor="rgba(91,61,245,0.10)"
      rippleColor="rgba(91,61,245,0.12)"
      iconColor={{ default: colors.textoSecundario, selected: colors.acento }}
      labelStyle={{
        default: { fontFamily: fontFamily.semibold, fontSize: 11, color: colors.textoSecundario },
        selected: { fontFamily: fontFamily.semibold, fontSize: 11, color: colors.acento },
      }}
      labelVisibilityMode="labeled">
      <NativeTabs.Trigger name="inicio">
        <NativeTabs.Trigger.Icon sf="house" md="home" />
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="casos">
        <NativeTabs.Trigger.Icon sf="folder" md="folder" />
        <NativeTabs.Trigger.Label>Casos</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="agenda">
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        <NativeTabs.Trigger.Label>Agenda</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="docs">
        <NativeTabs.Trigger.Icon sf="doc.text" md="description" />
        <NativeTabs.Trigger.Label>Docs</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mas">
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" md="grid_view" />
        <NativeTabs.Trigger.Label>Más</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
