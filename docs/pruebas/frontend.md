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

GitHub corre pruebas, tipos, lint y el build (`expo export`) en cada PR con el
workflow `.github/workflows/ci.yml`. Si alguno falla, la PR no se fusiona y el
workflow deja un comentario con el error.

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
| `Icono`, `Esfera`, `Ondas`, `Anillo`, ilustraciones del 3/5 | Se dibujan con Skia, un motor gráfico nativo que no existe en Jest. Son decoración y no cambian el comportamiento. |
| `expo-router` (`router`, `Link`) | La navegación real necesita todo el árbol de rutas; basta comprobar a dónde intenta ir la pantalla. |
| `react-native-safe-area-context` | Usa el mock oficial de la librería (márgenes del teléfono con valores fijos). |
| Reanimated | Su resolver de Jest (`react-native-reanimated/jest/resolver`) carga la versión en JavaScript. |
| `expo-secure-store` | El almacén cifrado del teléfono no existe en Jest: `jest.setup.ts` lo reemplaza por uno en memoria. |
| `@expo/ui` | Dibuja vistas nativas (SwiftUI / Compose) que en Jest quedan como cajas vacías sin texto. `jest.setup.ts` lo reemplaza: la hoja muestra su contenido solo si está abierta y los botones se pueden tocar. |
| `expo-image-picker`, `expo-image-manipulator` | La galería, la cámara y el recorte son del sistema. Se reemplazan por dobles que devuelven una foto o registran qué se les pidió. |
| Backend | Las pantallas usan la **API simulada real** (F11), no un doble: en Jest no hay `EXPO_PUBLIC_API_URL`. Cada prueba la deja en limpio con `reiniciarMock()` y cierra la sesión. El cliente se prueba aparte con un transporte falso. |

## Pruebas actuales (225)

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
| Todo correcto | Crea la cuenta y guarda la sesión con el onboarding pendiente |
| Correo ya registrado | Avisa debajo del campo correo (no como aviso general) y no avanza, aunque el backend mande `CORREO_EN_USO` sin `campos` (contrato B03) |
| Volver | La flecha regresa a la pantalla anterior |

### Pantalla de Inicio de sesión: `src/features/auth/__tests__/iniciar-sesion-test.tsx` (5)
Pantalla "Bienvenido de nuevo" (F07, conectada a la API en F09) de punta a punta.
Desde F10 la pantalla no navega: guarda la sesión y la navegación (probada en
`navegacion-test`) lleva a donde corresponde.
| Prueba | Qué asegura |
|---|---|
| Enviar vacío | Pide correo y contraseña y no inicia sesión |
| Cuenta correcta | Con " Demo@Leggal.ai " (espacios y mayúsculas) guarda la sesión con el onboarding hecho |
| Contraseña incorrecta | Muestra el aviso "Correo o contraseña incorrectos." y no entra |
| Reintento | El aviso desaparece al volver a intentar con la cuenta correcta |
| Crear cuenta | El enlace lleva a `/registro` |

### Navegación según la sesión: `src/features/auth/__tests__/navegacion-test.tsx` (12)
`app/_layout.tsx` y `app/index.tsx` reales (F10) con el enrutador de Expo Router
(`renderRouter`); las pantallas son textos con su nombre.
| Prueba | Qué asegura |
|---|---|
| Sin sesión | La app abre en el Splash |
| Sesión guardada | Abre directo en Inicio, sin pasar por el Login |
| Onboarding pendiente | Abre en el paso 1/5 |
| Iniciar sesión | Desde el Login lleva sola a Inicio |
| Cuenta nueva | Va al onboarding y, al terminarlo, a Inicio |
| Cerrar sesión | Vuelve al Splash |
| Enlace directo sin sesión | `/inicio` no deja entrar |
| Login con sesión | El Login ya no está disponible |
| Refresh al abrir | Con sesión guardada pregunta una vez al servidor antes de mostrar la app |
| Sesión cerrada en el servidor | Mientras responde sigue el splash (Inicio no se ve ni un instante) y luego abre en el Splash de la app |
| Onboarding hecho en otro dispositivo | El usuario al día del refresh lleva a Inicio, no al paso 1/5 |
| Sin red al abrir | Entra igual con la sesión guardada |

### Acceso rápido de desarrollo: `src/features/auth/__tests__/acceso-rapido-dev-test.tsx` (3)
Botones del Login que solo existen en desarrollo con la API simulada.
| Prueba | Qué asegura |
|---|---|
| Visible | Aparece con `__DEV__` y la API simulada |
| Demo · Inicio | Entra con `demo@leggal.ai` (onboarding hecho) |
| Cuenta nueva · Onboarding | Entra con `nuevo@leggal.ai` (onboarding pendiente, "Andrea Ruiz") |

### Cerrar sesión: `src/features/auth/__tests__/cerrar-sesion-test.ts` (3)
`cerrarSesion` (F10), según el contrato B03.
| Prueba | Qué asegura |
|---|---|
| Cierre normal | Llama a `POST /auth/logout` con el token, sin renovarlo antes; borra la sesión y el refresh ya no sirve (`SESION_REVOCADA`) |
| Sin red | La sesión se cierra igual |
| Sin sesión | No llama al servidor |

### Sesión guardada: `src/services/__tests__/sesion-test.ts` (8)
`useSesion` y `useAcceso` (F10).
| Prueba | Qué asegura |
|---|---|
| Guardar | Al iniciar sesión, usuario y tokens quedan en el almacén cifrado |
| Borrar | Al cerrar sesión se borran |
| Recuperar | Al abrir la app se lee la sesión guardada |
| Refresh | Al renovar se guardan los tokens nuevos y el usuario al día que trae la respuesta |
| Acceso invitado | Sin sesión es "invitado" |
| Acceso onboarding | Con sesión y onboarding pendiente es "onboarding" |
| Acceso app | Con sesión y onboarding hecho es "app" |
| Terminar onboarding | Pasa a "app" sin perder la sesión |

### Sesión al abrir la app: `src/services/__tests__/sesion-al-abrir-test.ts` (3)
`useSesionAlDia`: cuánto espera el splash al refresh de la apertura.
| Prueba | Qué asegura |
|---|---|
| Antes de leer la sesión | No pregunta al servidor |
| Respuesta rápida | Queda lista apenas responde el refresh |
| Red lenta | El splash no dura más de `ESPERA_MAX_MS` (3 s) |

### Vencimiento del token: `src/services/api/__tests__/jwt-test.ts` (7)
`leerVencimiento` y `vencePronto` (F10).
| Prueba | Qué asegura |
|---|---|
| Leer exp | Pasa de segundos a milisegundos |
| base64url | Entiende los "-" y "_" de los JWT reales |
| Sin exp / no JWT | Devuelve null |
| Menos de 1 min | Vence pronto |
| Ya vencido | Vence pronto |
| Más de 1 min | No vence pronto |
| No se puede saber | Se usa tal cual |

### Cliente de la API: `src/services/api/__tests__/cliente-test.ts` (31)
`crearClienteApi` (F09), con un transporte falso que registra cada petición.
Sigue el contrato B03 (`docs/api/auth.md`): refresh en `POST /auth/refresh` con
`{ tokenRefresco }` y respuesta de sesión completa.
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
| Token vencido | Lo renueva una vez con `{ tokenRefresco }` (sin mandar el token viejo), lo guarda y repite la petición |
| Vencidos a la vez | Tres peticiones comparten una sola renovación |
| Renovación rechazada | Cierra la sesión, da `SESION_EXPIRADA` y no repite la petición |
| 401 después de renovar | No entra en un bucle (3 llamadas en total) |
| Sin red al renovar | No cierra la sesión |
| Refresh con 503 o 429 | Conserva la sesión y avisa (`ERROR_INTERNO`, `DEMASIADOS_INTENTOS`): solo un 401 la cierra |
| `SESION_REVOCADA` en una ruta privada | Cierra la sesión sin intentar renovar |
| Refresh trae usuario | Se guarda la respuesta completa (tokens y usuario) |
| 401 en el login | No intenta renovar ("Correo o contraseña incorrectos.") |
| Vence en menos de 1 min (F10) | Lo renueva **antes** de la petición, sin esperar un 401 |
| Le queda tiempo (F10) | No renueva |
| Renovación anticipada rechazada (F10) | Cierra la sesión sin hacer la petición |
| Sin renovar: token por vencer | Lo envía tal cual, sin renovarlo (cerrar sesión) |
| Sin renovar: 401 | No renueva, no repite y no cierra la sesión por su cuenta |
| Al abrir, sin sesión | No pregunta nada al servidor |
| Al abrir, refresh bien | Guarda los tokens nuevos ("renovada") |
| Al abrir, 401 | Cierra la sesión ("cerrada") |
| Al abrir, sin red / 503 / 429 | Conserva la sesión ("pendiente"); se reintenta sola en la próxima petición privada |

### Cabeceras de dispositivo: `src/services/api/__tests__/cabeceras-test.ts` (2)
`cabecerasDeDispositivo` (contrato B03).
| Prueba | Qué asegura |
|---|---|
| Plataforma y versión | `X-Dispositivo: android` y `X-Version-App: 1.0.0` por separado |
| Sin versión | No envía `X-Version-App` |

### API simulada: `src/services/api/__tests__/mock-test.ts` (25)
`transporteSimulado` (F11). Debe comportarse como el backend según su contrato
(B03, `docs/api/auth.md`).
| Prueba | Qué asegura |
|---|---|
| Login demo | Respuesta de sesión del contrato (`tokenAcceso`, `tokenRefresco`, `venceEn: 900` y el objeto usuario completo), nunca la contraseña |
| Token JWT | El de acceso trae `sub`, `tid` (nulo), `sid` y vence en 15 minutos |
| Contraseña incorrecta | 401 `CREDENCIALES_INVALIDAS` con el formato de error (`campos: null`) |
| Correo sin cuenta | Mismo error que la contraseña incorrecta (no revela qué correos existen) |
| Registro | 201 sin verificar ni onboarding, y luego se puede iniciar sesión con esa cuenta |
| Correo repetido | 409 `CORREO_EN_USO` con `campos: null` |
| Sin aceptar términos | 400 `VALIDACION` señalando `aceptaTerminos` |
| reiniciarMock | Borra las cuentas creadas |
| Refresh | Entrega tokens nuevos de la misma sesión (`sid`) y el usuario |
| Refresh inventado | 401 `REFRESCO_INVALIDO` |
| Refresh reusado | Se toma como robo: 401 `SESION_REVOCADA` y se cierran todas las sesiones de la persona |
| Logout | 204 con `Bearer`; cierra solo esa sesión, la otra sigue |
| Logout repetido / sin token | Idempotente (204); sin token 401 `NO_AUTENTICADO` |
| Me | Usuario, `empresaActivaId: null` y `empresas: []` |
| Me con sesión cerrada | 401 `SESION_REVOCADA` |
| Ruta desconocida | 404 que dice qué ruta falta |
| Recargar la app | Un refresh de antes de recargar sirve una vez (el backend real no olvida sesiones); reusarlo da `SESION_REVOCADA` |
| Recargar sin la cuenta | Si la cuenta era del registro (el mock la olvida), `REFRESCO_INVALIDO` |
| Rutas de @usuario sin token o con token falso (F30) | 401: son privadas |
| Disponible / tomado (F30) | `disponible: true` para uno libre y `false` para uno tomado |
| Sugerencias por nombre (F30) | Armadas con el nombre escrito, sin tildes y sin los tomados |
| Un solo nombre (F30) | También sugiere |
| Sin repetidos (F30) | Nunca repite una sugerencia |
| Reglas (F30) | Todas las sugerencias cumplen las reglas del @usuario |
| Sin nombre (F30) | No sugiere nada |

### Errores en formularios: `src/services/api/__tests__/errores-formulario-test.ts` (5)
`aplicarErrorApi` (F09).
| Prueba | Qué asegura |
|---|---|
| Error con campo | Va debajo de ese campo y no hay aviso general |
| Varios campos | Solo enfoca el primero |
| Campo que no existe | Se ignora y pasa a aviso general |
| Sin campos | Se devuelve como aviso general (por ejemplo, sin conexión) |
| Error inesperado | Mensaje genérico |

### Onboarding 1/5: `src/features/onboarding/__tests__/perfil-test.tsx` (21)
Pantalla "¿Cómo te llamamos?" (F30) contra la API simulada, con la cuenta de
prueba `nuevo@leggal.ai`. El avatar (Skia) se reemplaza por sus iniciales.
| Prueba | Qué asegura |
|---|---|
| Inicio | Los dos campos empiezan vacíos y sin sugerencias |
| Sugerencias | Al escribir "Bruno Díaz" aparecen @bruno.diaz, @bdiaz.legal y @brunodiaz |
| Cambio de nombre | Las sugerencias se rehacen con el nombre nuevo |
| Tomados | No sugiere @andrea.ruiz porque está tomado |
| Tocar sugerencia | Llena el @usuario y queda "Disponible" |
| Escrito a mano y tomado | Avisa "Ya está en uso" |
| Iniciales | Siguen al nombre que se escribe ("Bruno Díaz" → "BD") |
| Continuar | Guarda el paso normalizado (`@Andrea.Legal` → `andrea.legal`) y pasa a `/area` |
| Vacío | No avanza y pide los dos datos |
| Continuar enseguida | Con un @usuario tomado, revisa de nuevo y no avanza |
| Formato inválido | Muestra la regla ("No uses dos símbolos seguidos") y no avanza |
| Volver desde 2/5 | Encuentra lo que ya había llenado |
| Flecha del paso 1 | Cierra la sesión (volver = salir de la cuenta nueva) |
| Foto: opciones | El botón de cámara abre "Tomar foto" y "Elegir de la galería"; sin foto no ofrece quitarla |
| Foto: galería | La foto preparada reemplaza las iniciales, la hoja se cierra y queda en el borrador |
| Foto: no permitida | Un GIF avisa debajo del avatar y no se usa |
| Foto: quitar | "Quitar foto" vuelve a las iniciales |
| Cámara sin permiso | Primero la explicación (no el aviso del sistema); "Permitir cámara" pide el permiso y abre la cámara |
| Cámara: Ahora no | Cierra la explicación sin pedir el permiso ni abrir la cámara |
| Cámara bloqueada | Ofrece "Abrir Ajustes" del teléfono |
| Cámara con permiso | Abre la cámara directo, sin explicación |

### Onboarding 2/5: `src/features/onboarding/__tests__/area-test.tsx` (26)
Pantalla "¿En qué área te desempeñas?" (F30) y `esquemaArea`.
| Prueba | Qué asegura |
|---|---|
| Empieza vacío | Sin rol ni materias, y sin el campo de matrícula |
| Sin rol | No avanza y pide "Elige tu rol" |
| Un solo rol | Elegir otro desmarca el anterior |
| Materias | Se marcan y desmarcan, varias a la vez |
| Matrícula | Aparece solo para Abogado/a |
| Continuar | Guarda rol, materias y matrícula en el borrador y pasa al 3/5 |
| Sin materias | También avanza (son opcionales) |
| Matrícula inválida | Con símbolos raros muestra la regla y no avanza |
| Volver desde 3/5 | Encuentra lo que ya había elegido |
| Aviso de rol | "Elige tu rol" se va apenas elige uno |
| Matrícula oculta | Una matrícula inválida de abogado no bloquea si después cambia de rol |
| Largo de matrícula | El campo no deja escribir más de 30 caracteres |
| Sin el 1/5 | Si la app se recargó (borrador vacío), vuelve al 1/5 |
| Salir hacia atrás | Guarda lo elegido aunque no haya tocado Continuar |
| Salir sin rol | No guarda nada |
| Flecha | Vuelve al paso 1/5 |
| Matrícula de otro rol | Se descarta: solo se guarda para abogados |
| Matrícula vacía | Queda en `null` |
| Matrículas inválidas (5) | Guion solo, sin números, menos de 3, símbolos y más de 30 caracteres |
| Matrículas reales | Se aceptan y se guardan en mayúsculas |
| Orden de materias | Sin repetidas y en el orden de la lista |
| Valores inventados | Rechaza roles o materias que no existen |

### Onboarding 3/5: `src/features/onboarding/__tests__/modo-test.tsx` (11)
Pantalla "¿Cómo vas a trabajar?" (F31).
| Prueba | Qué asegura |
|---|---|
| Empieza vacío | Sin modo elegido; Colaborativo muestra Multiempresa, Trazabilidad y Roles |
| Sin elegir | No avanza y pide "Elige cómo vas a trabajar"; el aviso se va al elegir |
| Uno solo | Elegir otro desmarca el anterior |
| Personal | Se salta el 4/5 y va al 5/5 |
| Colaborativo | Sigue al 4/5 (unirse o crear empresa) |
| Volver desde el siguiente | Encuentra lo que ya había elegido |
| Salir hacia atrás | Guarda lo elegido aunque no haya tocado Continuar |
| Salir sin elegir | No guarda nada |
| Sin el 1/5 | Vuelve al 1/5 |
| Sin el 2/5 | Vuelve al 2/5 |
| Flecha | Vuelve al paso 2/5 |

### Foto de perfil: `src/features/onboarding/__tests__/foto-test.ts` (17)
`revisarFoto`, `elegirFoto` y el permiso de cámara (onboarding 1/5).
| Prueba | Qué asegura |
|---|---|
| Formatos aceptados | JPG, PNG, WEBP y HEIC (sin importar mayúsculas) |
| Rechazos (6) | GIF, SVG, PDF, video, más de 15 MB y menos de 200 px de lado, cada uno con su mensaje |
| Sin tipo ni peso | No se rechaza ahí: decide la decodificación |
| Galería | Solo imágenes, recorte cuadrado, sin EXIF ni base64 |
| Cámara | Mismas reglas |
| Cancelar | No procesa nada |
| Preparar | Recorta el centro en cuadrado, 512 × 512 y JPEG al 0,8 |
| Rechazada | No llega a procesarse |
| No es imagen | Si no se puede decodificar, se rechaza con su mensaje |
| Permiso (3) | Dado → concedido; negado pero se puede pedir → preguntar; negado para siempre → bloqueado |

### Reglas del @usuario: `src/features/onboarding/__tests__/usuario-test.ts` (7)
`normalizarUsuario` y `esquemaUsuario` (F30). Las sugerencias las arma el servidor.
| Prueba | Qué asegura |
|---|---|
| Normalizar | Quita "@", espacios y tildes; pasa a minúsculas |
| Caracteres válidos | Letras, números, punto y guion bajo |
| Forma guardada | Se guarda normalizado |
| Largo | Entre 3 y 30 |
| Inicio | Debe empezar con letra |
| Otros símbolos | No se admiten ("-", "!") |
| Símbolos seguidos o al final | No se admiten |

### Texto: `src/utils/__tests__/texto-test.ts` (6)
`quitarAcentos` e `iniciales` (F30).
| Prueba | Qué asegura |
|---|---|
| Quitar acentos | Tildes, diéresis y ñ |
| Sin acentos | Queda igual |
| Iniciales | Primer nombre y último apellido ("María José López Vera" → "MV") |
| Un nombre | Una letra |
| Espacios de más | Se ignoran y sale en mayúsculas |
| Vacío | Devuelve vacío |

## Comprobación de que las pruebas sirven
- 15 nov 2026 (F13): se quitó a propósito la regla de la casilla obligatoria y
  3 pruebas fallaron. Luego se restauró.
- 15 nov 2026 (F09): se hizo que el cliente intentara renovar el token también
  en rutas públicas y 2 pruebas fallaron. Luego se restauró.
- 15 nov 2026 (F10): se dejaron las pestañas sin protección y 2 pruebas de
  navegación fallaron. Luego se restauró.
- 15 nov 2026 (F30): se quitó la revisión del @usuario al tocar Continuar y
  falló la prueba "Continuar enseguida". Luego se restauró.
- 21 nov 2026 (contrato B03): se hizo que el cliente cerrara la sesión con
  cualquier fallo del refresh (no solo un 401) y fallaron las 2 pruebas de
  503/429; se hizo que ignorara `SESION_REVOCADA` y falló su prueba. Luego se
  restauró.
- 21 nov 2026 (refresh al abrir): se hizo que "sin red" cerrara la sesión
  (fallaron 3), se quitó la espera máxima del splash (falló 1), se quitó el
  recuerdo de refrescos del mock (falló 1) y el layout dejó de esperar el
  refresh (falló 1, tras reforzar la prueba: antes no lo detectaba). Luego se
  restauró.
- 21 nov 2026 (foto de perfil): se pidió el EXIF (fallaron 2), se aceptó
  cualquier tipo de archivo (fallaron 4), se usó la foto original sin volver a
  codificarla (fallaron 2) y se pidió el permiso de cámara sin la explicación
  antes (fallaron 3). Luego se restauró.
- 21 nov 2026 (onboarding 2/5): se hizo opcional el rol, se guardó la
  matrícula de cualquier rol, los chips dejaron de desmarcarse y la matrícula
  apareció para todos los roles; cada cambio hizo fallar 1 prueba. Luego se
  restauró.
- 21 nov 2026 (revisión del 2/5): se validó la matrícula con cualquier rol, se
  dejó de exigir un número, se quitó el límite de 30 al escribir, se quitó la
  vuelta al 1/5 sin borrador y se dejó de guardar al salir; cada cambio hizo
  fallar 1 prueba. Luego se restauró.
- 21 nov 2026 (onboarding 3/5): Personal dejó de saltarse el 4/5, se quitó la
  vuelta al 2/5 y se dejó de guardar al salir (falló 1 prueba cada vez); se
  dejó Colaborativo elegido de entrada y fallaron 3. Luego se restauró.

## Pendiente
- Jest no se cierra solo al terminar (algo queda abierto; ya pasaba antes de la
  foto). Con todos los archivos avisa "A worker process has failed to exit";
  con uno solo, queda esperando. Mientras tanto: `npx jest --forceExit`.
- Flujos completos en el teléfono con Maestro (según CLAUDE.md del frontend).
