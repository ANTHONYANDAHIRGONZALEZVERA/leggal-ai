# Registro de dependencias

> Regla: cada paquete, herramienta o plugin nuevo se anota aquí en el mismo PR
> que lo instala. Versión exacta, sin ^ ni ~. Las herramientas del sistema
> (Node, Git, Docker, WSL, VS Code) están en docs/procesos/entorno.md.

## Herramientas globales de npm (se instalan con `npm install -g`)
| Fecha | Paquete | Versión | Para qué | Quién |
|---|---|---|---|---|
| 2026-11-08 | @anthropic-ai/claude-code | 2.1.319 | Claude Code: desarrollo con IA en la terminal | Tony |
| 2026-11-08 | eas-cli | 27.5.0 | Compilar la app en la nube y subirla a Google Play | Tony |

## Plugins de Claude Code
| Fecha | Plugin | Catálogo | Para qué | Quién |
|---|---|---|---|---|
| 2026-11-08 | expo | anthropic-plugin-directory | Skills oficiales de Expo y EAS | Tony |

## Frontend (frontend/)
| Fecha | Paquete | Versión | Para qué | Quién |
|---|---|---|---|---|
| 2026-11-14 | @expo/ui | 58.0.28 | Componentes nativos (SwiftUI/Compose); peer opcional de expo-router | Tony |
| 2026-11-14 | @hookform/resolvers | 7.0.6 | Conecta los esquemas de Zod con React Hook Form (F04) | Tony |
| 2026-11-14 | @tanstack/react-query | 5.107.1 | Peticiones a la API con caché y reintentos (F04) | Tony |
| 2026-11-14 | @types/react | 19.3.0 | Tipos de React para TypeScript | Tony |
| 2026-11-14 | expo | 58.0.25 | SDK de Expo | Tony |
| 2026-11-14 | expo-constants | 58.0.16 | Datos de configuración de la app | Tony |
| 2026-11-14 | expo-font | 58.0.12 | Cargar las fuentes del diseño | Tony |
| 2026-11-14 | expo-image | 58.0.18 | Imágenes con caché | Tony |
| 2026-11-14 | expo-linking | 58.0.17 | Enlaces profundos (lo usa expo-router) | Tony |
| 2026-11-14 | expo-router | 58.0.31 | Navegación por archivos | Tony |
| 2026-11-14 | expo-secure-store | 58.0.3 | Guardar tokens de sesión cifrados (F04) | Tony |
| 2026-11-14 | expo-splash-screen | 58.0.14 | Pantalla de carga nativa | Tony |
| 2026-11-14 | expo-status-bar | 58.0.5 | Barra de estado | Tony |
| 2026-11-14 | expo-symbols | 58.0.5 | Íconos SF Symbols en las pestañas | Tony |
| 2026-11-14 | expo-system-ui | 58.0.7 | Color de fondo del sistema | Tony |
| 2026-11-14 | react | 19.3.0 | Librería de interfaz | Tony |
| 2026-11-14 | react-dom | 19.3.0 | React para la versión web | Tony |
| 2026-11-14 | react-hook-form | 7.92.0 | Manejo de formularios (F04) | Tony |
| 2026-11-14 | react-native | 0.88.1 | Base de la app móvil | Tony |
| 2026-11-14 | react-native-gesture-handler | 3.3.0 | Gestos nativos | Tony |
| 2026-11-14 | react-native-reanimated | 4.7.1 | Animaciones en el hilo de UI | Tony |
| 2026-11-14 | react-native-safe-area-context | 5.11.1 | Márgenes seguros (notch, barra) | Tony |
| 2026-11-14 | react-native-screens | 4.30.1 | Pantallas nativas para la navegación | Tony |
| 2026-11-14 | react-native-web | 0.21.4 | Ejecutar la app en web | Tony |
| 2026-11-14 | react-native-worklets | 0.13.0 | Requerido por Reanimated | Tony |
| 2026-11-14 | typescript | 6.0.3 | Tipado estático | Tony |
| 2026-11-14 | zod | 4.6.7 | Validación de datos y formularios (F04) | Tony |
| 2026-11-14 | zustand | 5.1.0 | Estado global (sesión) (F04) | Tony |

Quitados en F04 (solo los usaba el ejemplo de la plantilla): expo-device, expo-glass-effect, expo-web-browser.

## Backend (backend/)
| Fecha | Paquete | Versión | Para qué | Quién |
|---|---|---|---|---|
| (pendiente: se llena al crear NestJS y Prisma) | | | | |