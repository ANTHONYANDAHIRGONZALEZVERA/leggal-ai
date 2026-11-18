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
- Ayudantes para pruebas (no son pruebas): `src/pruebas/`. `renderizar()` dibuja
  una pantalla con los mismos proveedores que la app (TanStack Query).

## Qué se reemplaza en las pruebas (y por qué)
| Qué | Por qué |
|---|---|
| `Icono`, `Esfera`, `Ondas`, `Anillo` | Se dibujan con Skia, un motor gráfico nativo que no existe en Jest. Son decoración y no cambian el comportamiento. |
| `expo-router` (`router`, `Link`) | La navegación real necesita todo el árbol de rutas; basta comprobar a dónde intenta ir la pantalla. |
| `react-native-safe-area-context` | Usa el mock oficial de la librería (márgenes del teléfono con valores fijos). |
| Reanimated | Su resolver de Jest (`react-native-reanimated/jest/resolver`) carga la versión en JavaScript. |
| Backend | Las pantallas usan la **API simulada real** (F11), no un doble: en Jest no hay `EXPO_PUBLIC_API_URL`. Cada prueba la deja en limpio con `reiniciarMock()` y cierra la sesión. El cliente se prueba aparte con un transporte falso. |

## Pruebas actuales (68)

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

### Pantalla de Registro: `src/features/auth/__tests__/registro-test.tsx` (7)
Pantalla "Crea tu cuenta" (F08, conectada a la API en F09) de punta a punta.
| Prueba | Qué asegura |
|---|---|
| Enviar vacío | Muestra los 4 errores y no avanza |
| Casilla inicial | Términos empieza sin marcar (consentimiento expreso) |
| Sin aceptar Términos | No crea la cuenta aunque lo demás esté bien |
| Medidor | Reacciona a la contraseña escrita |
| Todo correcto | Crea la cuenta, guarda la sesión y pasa al onboarding (`/perfil`) |
| Correo ya registrado | Avisa debajo del campo correo (no como aviso general) y no avanza |
| Volver | La flecha regresa a la pantalla anterior |

### Pantalla de Inicio de sesión: `src/features/auth/__tests__/iniciar-sesion-test.tsx` (5)
Pantalla "Bienvenido de nuevo" (F07, conectada a la API en F09) de punta a punta.
| Prueba | Qué asegura |
|---|---|
| Enviar vacío | Pide correo y contraseña y no llama a la API |
| Cuenta correcta | Con " Demo@Leggal.ai " (espacios y mayúsculas) guarda la sesión y entra a `/inicio` |
| Contraseña incorrecta | Muestra el aviso "Correo o contraseña incorrectos." y no entra |
| Reintento | El aviso desaparece al volver a intentar con la cuenta correcta |
| Crear cuenta | El enlace lleva a `/registro` |

### Cliente de la API: `src/services/api/__tests__/cliente-test.ts` (16)
`crearClienteApi` (F09), con un transporte falso que registra cada petición.
| Prueba | Qué asegura |
|---|---|
| Petición POST | Arma la URL, manda el cuerpo en JSON y las cabeceras fijas (`X-Dispositivo`) |
| Token | Las rutas privadas llevan `Authorization`; las públicas no |
| GET | No lleva cuerpo ni `Content-Type` |
| Respuesta correcta | Devuelve los datos |
| Respuesta vacía (204) | Devuelve `undefined` sin romperse |
| Error con código | Se convierte en `ErrorApi` con código, campos y mensaje en español propio |
| Código desconocido | Usa el mensaje del servidor |
| Error 500 sin cuerpo | "El servidor tuvo un problema" |
| Sin red | Código `SIN_CONEXION` |
| Sin respuesta a tiempo | Corta la espera y da `TIEMPO_AGOTADO` |
| Token vencido | Lo renueva una vez (sin mandar el token viejo), lo guarda y repite la petición |
| Vencidos a la vez | Tres peticiones comparten una sola renovación |
| Renovación rechazada | Cierra la sesión, da `SESION_EXPIRADA` y no repite la petición |
| 401 después de renovar | No entra en un bucle (3 llamadas en total) |
| Sin red al renovar | No cierra la sesión |
| 401 en el login | No intenta renovar ("Correo o contraseña incorrectos.") |

### API simulada: `src/services/api/__tests__/mock-test.ts` (9)
`transporteSimulado` (F11). Debe comportarse como el backend.
| Prueba | Qué asegura |
|---|---|
| Login demo | Devuelve usuario y tokens, nunca la contraseña |
| Contraseña incorrecta | 401 `CREDENCIALES_INVALIDAS` |
| Correo sin cuenta | Mismo error que la contraseña incorrecta (no revela qué correos existen) |
| Registro | 201 y luego se puede iniciar sesión con esa cuenta |
| Correo repetido | 409 `CORREO_EN_USO` señalando el campo correo |
| reiniciarMock | Borra las cuentas creadas |
| Renovar | Cambia el token de renovación por tokens nuevos |
| Rotación | Cada token de renovación sirve una sola vez |
| Ruta desconocida | 404 que dice qué ruta falta |

### Errores en formularios: `src/services/api/__tests__/errores-formulario-test.ts` (5)
`aplicarErrorApi` (F09).
| Prueba | Qué asegura |
|---|---|
| Error con campo | Va debajo de ese campo y no hay aviso general |
| Varios campos | Solo enfoca el primero |
| Campo que no existe | Se ignora y pasa a aviso general |
| Sin campos | Se devuelve como aviso general (por ejemplo, sin conexión) |
| Error inesperado | Mensaje genérico |

## Comprobación de que las pruebas sirven
- 15 nov 2026 (F13): se quitó a propósito la regla de la casilla obligatoria y
  3 pruebas fallaron. Luego se restauró.
- 15 nov 2026 (F09): se hizo que el cliente intentara renovar el token también
  en rutas públicas y 2 pruebas fallaron. Luego se restauró.

## Pendiente
- Flujos completos en el teléfono con Maestro (según CLAUDE.md del frontend).
