import { NativeTabs } from 'expo-router/native-tabs';

// Barra de 5 pestañas del diseño. Íconos del sistema (SF Symbols / Material)
// como marcador; los íconos y estilos definitivos llegan en F12.
export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="inicio">
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="casos">
        <NativeTabs.Trigger.Icon sf="briefcase.fill" md="work" />
        <NativeTabs.Trigger.Label>Casos</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="agenda">
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        <NativeTabs.Trigger.Label>Agenda</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="docs">
        <NativeTabs.Trigger.Icon sf="doc.text.fill" md="description" />
        <NativeTabs.Trigger.Label>Docs</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mas">
        <NativeTabs.Trigger.Icon sf="ellipsis" md="more_horiz" />
        <NativeTabs.Trigger.Label>Más</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
