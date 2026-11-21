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
| 2026-11-14 | @expo-google-fonts/instrument-serif | 0.4.1 | Fuente Instrument Serif cursiva del diseño (F05) | Tony |
| 2026-11-14 | @expo-google-fonts/plus-jakarta-sans | 0.4.2 | Fuente Plus Jakarta Sans del diseño (F05) | Tony |
| 2026-11-14 | @shopify/react-native-skia | 2.14.0 | Dibujar las esferas animadas e íconos del diseño (F06) | Tony |
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

Solo para desarrollo (`devDependencies`, no van dentro de la app):
| Fecha | Paquete | Versión | Para qué | Quién |
|---|---|---|---|---|
| 2026-11-15 | @testing-library/react-native | 14.1.0 | Probar componentes como los usa una persona: tocar, escribir, leer (F13) | Tony |
| 2026-11-15 | @types/jest | 30.0.0 | Tipos de TypeScript para las pruebas (F13) | Tony |
| 2026-11-15 | eslint | 9.39.5 | Revisar estilo y errores comunes del código (F13) | Tony |
| 2026-11-15 | eslint-config-expo | 58.0.4 | Reglas de ESLint recomendadas por Expo (F13) | Tony |
| 2026-11-15 | jest | 30.5.2 | Correr las pruebas automáticas; jest-expo 58 exige Jest 30 (F13) | Tony |
| 2026-11-15 | jest-expo | 58.0.14 | Configuración de Jest para Expo y React Native (F13) | Tony |

Quitados en F04 (solo los usaba el ejemplo de la plantilla): expo-device, expo-glass-effect, expo-web-browser.

## Backend (backend/)
| Fecha | Paquete | Versión | Para qué | Quién |
|---|---|---|---|---|
| 2026-11-20 | @nestjs/common | 12.5.0 | Decoradores, módulos y utilidades base de NestJS | Dependabot (#24) |
| 2026-11-20 | @nestjs/core | 12.5.0 | Núcleo de NestJS (inyección de dependencias y arranque) | Dependabot (#24) |
| 2026-11-20 | @nestjs/platform-express | 12.5.0 | Servidor HTTP de NestJS sobre Express | Dependabot (#24) |
| 2026-11-17 | @nestjs/swagger | 12.1.2 | Documentación interactiva de la API en `/docs`, solo en desarrollo (B04) | Joel |
| 2026-11-20 | @prisma/adapter-pg | 7.10.1 | Conectar Prisma 7 a PostgreSQL mediante pg; misma versión que Prisma (B05 infraestructura) | Joel |
| 2026-11-08 | @prisma/client | 7.10.1 | Cliente de Prisma para consultar PostgreSQL | Tony |
| 2026-11-20 | pg | 8.23.1 | Controlador de PostgreSQL que usa el adaptador de Prisma (B05 infraestructura) | Joel |
| 2026-11-08 | reflect-metadata | 0.2.2 | Metadatos de decoradores; lo exige NestJS | Tony |
| 2026-11-08 | rxjs | 7.8.2 | Flujos reactivos; lo exige NestJS (interceptores y guards) | Tony |
| 2026-11-20 | zod | 4.6.7 | Validar el cuerpo de las peticiones y las variables de entorno; misma versión que el frontend (B05 infraestructura) | Joel |

Solo para desarrollo (`devDependencies`, no van al servidor en producción):
| Fecha | Paquete | Versión | Para qué | Quién |
|---|---|---|---|---|
| 2026-11-20 | @nestjs/cli | 12.0.13 | Compilar y arrancar la API (`nest build`, `nest start`) | Dependabot (#24) |
| 2026-11-08 | @nestjs/schematics | 12.0.13 | Plantillas de `nest generate` para módulos y servicios | Tony |
| 2026-11-20 | @nestjs/testing | 12.5.0 | Crear módulos de prueba en Jest | Dependabot (#24) |
| 2026-11-08 | @types/express | 5.0.6 | Tipos de Express para TypeScript | Tony |
| 2026-11-08 | @types/jest | 30.0.0 | Tipos de TypeScript para las pruebas | Tony |
| 2026-11-17 | @types/node | 26.6.6 | Tipos de Node; alineados con Node 26 del equipo (B01) | Joel |
| 2026-11-08 | @types/supertest | 7.2.1 | Tipos de Supertest | Tony |
| 2026-11-17 | dotenv | 17.4.2 | Cargar el `.env` en `prisma.config.ts`; Prisma 7 ya no lo lee solo (B01) | Joel |
| 2026-11-08 | jest | 30.5.2 | Pruebas unitarias y e2e | Tony |
| 2026-11-20 | oxlint | 1.93.0 | Revisar estilo y errores comunes del código | Dependabot (#24) |
| 2026-11-20 | oxlint-tsgolint | 7.0.2007 | Reglas de oxlint que usan los tipos (por ejemplo, promesas sin esperar) | Dependabot (#24) |
| 2026-11-20 | prettier | 3.10.1 | Formato del código | Dependabot (#24) |
| 2026-11-08 | prisma | 7.10.1 | CLI de Prisma: migraciones y generación del cliente | Tony |
| 2026-11-08 | source-map-support | 0.5.21 | Errores con la línea del código TypeScript original | Tony |
| 2026-11-08 | supertest | 7.3.2 | Peticiones HTTP en las pruebas e2e | Tony |
| 2026-11-08 | ts-jest | 29.4.15 | Correr las pruebas de Jest escritas en TypeScript | Tony |
| 2026-11-08 | ts-loader | 9.6.2 | Compilar TypeScript cuando se usa webpack en Nest | Tony |
| 2026-11-08 | ts-node | 10.9.2 | Ejecutar TypeScript sin compilar (depuración de pruebas) | Tony |
| 2026-11-08 | tsconfig-paths | 4.2.0 | Resolver los alias de rutas de `tsconfig.json` | Tony |
| 2026-11-08 | typescript | 6.0.3 | Tipado estático | Tony |

Quitado en B01: `@nestjs/observe` (lo agregó la plantilla de Nest, nunca se
instaló y enviaba telemetría a un servicio externo). La observabilidad se
decidirá aparte.