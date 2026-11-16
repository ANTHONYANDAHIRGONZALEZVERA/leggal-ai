# Pruebas del frontend

> Regla: cada prueba nueva se anota aquí en el mismo PR que la agrega.

## Cómo correrlas
Desde `frontend/`:

| Comando | Qué hace |
|---|---|
| `npm test` | Corre todas las pruebas una vez |
| `npm run test:vigilar` | Las vuelve a correr al guardar un archivo (para trabajar) |
| `npm run tipos` | Revisa los tipos de TypeScript |
| `npm run lint` | Revisa estilo y errores comunes con ESLint |

GitHub corre los tres (lint, tipos y pruebas) en cada PR con el workflow
`.github/workflows/frontend.yml`. Si alguno falla, la PR no se puede fusionar.

## Herramientas
- **Jest** con el preset `jest-expo`: corre las pruebas.
- **React Native Testing Library**: dibuja el componente en memoria y lo usa
  como una persona (busca por texto o por etiqueta de accesibilidad, toca,
  escribe). Así las pruebas también revisan que la app sea accesible.
- Configuración en `frontend/package.json` (clave `jest`) y `frontend/jest.setup.ts`.

## Dónde van
- Junto al código que prueban, en una carpeta `__tests__`, con nombre
  `<archivo>-test.ts` o `<archivo>-test.tsx`.
- **Nunca dentro de `src/app/`**: Expo Router trataría el archivo como una
  pantalla. Las pruebas de pantallas van en `src/features/<área>/__tests__/`.

## Qué se reemplaza en las pruebas (y por qué)
| Qué | Por qué |
|---|---|
| `Icono`, `Esfera`, `Ondas`, `Anillo` | Se dibujan con Skia, un motor gráfico nativo que no existe en Jest. Son decoración y no cambian el comportamiento. |
| `expo-router` (`router`, `Link`) | La navegación real necesita todo el árbol de rutas; basta comprobar a dónde intenta ir la pantalla. |
| `react-native-safe-area-context` | Usa el mock oficial de la librería (márgenes del teléfono con valores fijos). |
| Reanimated | Su resolver de Jest (`react-native-reanimated/jest/resolver`) carga la versión en JavaScript. |

## Pruebas actuales (35)

### Medidor de seguridad: `src/features/auth/__tests__/seguridad-contrasena-test.ts` (6)
Función `medirContrasena` del Registro (F08).
| Prueba | Qué asegura |
|---|---|
| Contraseña vacía | No llena barras ni muestra palabra |
| Menos de 8 caracteres | "Débil" en rojo, aunque mezcle mayúsculas, números y símbolos |
| 8 minúsculas | Cumple el mínimo pero solo llega a "Regular" |
| Con número o mayúsculas | Sube a "Buena" |
| 12+ caracteres y mezcla de tipos | "Fuerte"; también fija el límite entre "Buena" y "Fuerte" |
| Espacios como símbolos | Una frase como "mi casa azul" se premia ("Buena") |

### Reglas de los formularios: `src/features/auth/__tests__/esquemas-test.ts` (9)
Esquemas de Zod de Login (F07) y Registro (F08).
| Prueba | Qué asegura |
|---|---|
| Login: limpia el correo | " Ana@Empresa.COM " se guarda como "ana@empresa.com" |
| Login: correo inválido | Mensaje "Ingresa un correo válido" |
| Login: contraseña vacía | Mensaje "Ingresa tu contraseña" |
| Registro: datos correctos | Un registro completo pasa |
| Registro: nombre corto | Menos de 3 letras (sin contar espacios) da "Ingresa tu nombre completo" |
| Registro: nombre largo | Más de 80 caracteres da "Máximo 80 caracteres" |
| Registro: contraseña corta | 7 caracteres falla y 8 pasa (borde exacto) |
| Registro: contraseña larga | Más de 72 falla (límite de bcrypt en el backend) |
| Registro: Términos | Sin aceptar Términos y Política no se puede crear la cuenta |

### Campo de texto: `src/components/__tests__/campo-texto-test.tsx` (5)
Componente `CampoTexto` (F06, F08).
| Prueba | Qué asegura |
|---|---|
| Etiqueta | Se ve la etiqueta y el lector de pantalla encuentra el campo por ella |
| Error | El mensaje de error aparece debajo |
| Campo normal | No muestra el botón del ojo |
| Ojo de la contraseña | Empieza oculta; el ojo la muestra y la vuelve a ocultar, y su etiqueta cambia ("Mostrar"/"Ocultar contraseña") |
| Escribir | Avisa a la pantalla con el texto escrito |

### Casilla: `src/components/__tests__/casilla-test.tsx` (3)
Componente `Casilla` (F08).
| Prueba | Qué asegura |
|---|---|
| Estado inicial | Se anuncia como casilla ("checkbox") sin marcar |
| Marcar y desmarcar | Al tocarla pide el valor contrario; marcada se anuncia como marcada |
| Fila tocable | Tocar el texto también la cambia |

### Medidor (vista): `src/components/__tests__/medidor-contrasena-test.tsx` (3)
Componente `MedidorContrasena` (F08).
| Prueba | Qué asegura |
|---|---|
| Sin contraseña | No muestra ninguna palabra |
| Con contraseña | Muestra el nivel y el lector de pantalla lo lee ("Seguridad de la contraseña: Fuerte") |
| Mientras escribe | Pasa de "Débil" a "Buena" al cambiar la contraseña |

### Pantalla de Registro: `src/features/auth/__tests__/registro-test.tsx` (6)
Pantalla "Crea tu cuenta" (F08) de punta a punta.
| Prueba | Qué asegura |
|---|---|
| Enviar vacío | Muestra los 4 errores y no avanza |
| Casilla inicial | Términos empieza sin marcar (consentimiento expreso) |
| Sin aceptar Términos | No crea la cuenta aunque lo demás esté bien |
| Medidor | Reacciona a la contraseña escrita |
| Todo correcto | Pasa al onboarding (`/perfil`). Temporal hasta F09 |
| Volver | La flecha regresa a la pantalla anterior |

### Pantalla de Inicio de sesión: `src/features/auth/__tests__/iniciar-sesion-test.tsx` (3)
Pantalla "Bienvenido de nuevo" (F07) de punta a punta.
| Prueba | Qué asegura |
|---|---|
| Enviar vacío | Pide correo y contraseña y no entra |
| Datos completos | Entra a Inicio (`/inicio`). Temporal hasta F09/F10 |
| Crear cuenta | El enlace lleva a `/registro` |

## Comprobación de que las pruebas sirven
Al crearlas (15 nov 2026) se quitó a propósito la regla de la casilla
obligatoria: 3 pruebas fallaron, como debía ser. Luego se restauró.

## Pendiente
- Flujos completos en el teléfono con Maestro (según CLAUDE.md del frontend).
