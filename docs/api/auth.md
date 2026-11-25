# Contrato de la API: autenticación (B03)

> Estado: **borrador para revisión** · Semana 1 · Responsable backend: Joel ·
> Lo usa el frontend en F09 (cliente de la API) y F11 (mock).
>
> Si algo de este contrato cambia, se cambia primero aquí, en una PR que
> revisen los dos, y después en el código.

Cubre las rutas de la semana 1: `register`, `login`, `refresh`, `logout` y `me`.
La verificación de correo, la recuperación de contraseña, Google y el cambio de
empresa se documentan en este mismo archivo cuando lleguen (semana 2).

## Convenciones generales

| Tema | Regla |
|---|---|
| URL base | `EXPO_PUBLIC_API_URL` en la app. Local: `http://localhost:3000`. |
| Formato | JSON en UTF-8 (`Content-Type: application/json`). |
| Nombres de campos | En español y en `camelCase`, sin tildes ni eñes (`contrasena`, `tokenAcceso`). |
| Fechas | Texto ISO 8601 en UTC: `2026-11-17T14:05:00.000Z`. |
| Identificadores | UUID v4 en texto. |
| Autenticación | Cabecera `Authorization: Bearer <tokenAcceso>` en las rutas protegidas. |
| Dispositivo | Cabecera `X-Dispositivo: android`, `ios` o `web` en **todas** las peticiones. Se guarda en `sesiones` y en `auditoria`. Si falta o trae otro valor, se guarda como `desconocido`; no se rechaza la petición. |
| Versión de la app | Cabecera **opcional** `X-Version-App` con la versión de la app (`1.0.0`). Sirve para saber desde qué versión se hizo una acción cuando hay que dar soporte o revisar la auditoría. Se guarda en los logs y en el `detalle` de `auditoria`. Si falta o no tiene la forma `número.número.número`, se ignora; no se rechaza la petición. |
| Correo | El backend lo guarda recortado y en minúsculas, igual que el formulario de la app. |

## Tokens

Las formas de entrar (correo, y más adelante Google y Facebook) terminan igual:
el backend crea una fila en `sesiones` y entrega dos tokens.

| Token | Qué es | Dónde lo guarda la app | Vence |
|---|---|---|---|
| `tokenAcceso` | JWT firmado por el backend | Solo en memoria (Zustand) | **15 minutos** |
| `tokenRefresco` | Cadena aleatoria opaca, sin datos dentro. En la base solo se guarda su hash. | `expo-secure-store` | **30 días**, y **rota en cada uso** |

### Contenido del token de acceso

```json
{
  "sub": "8f1c2d7a-3b4e-4f6a-9c1d-2e3f4a5b6c7d",
  "tid": null,
  "sid": "b2a4c6e8-1d3f-4a5b-8c7d-9e0f1a2b3c4d",
  "iat": 1795442700,
  "exp": 1795443600
}
```

| Campo | Significado |
|---|---|
| `sub` | Id del usuario. |
| `tid` | Id de la empresa activa (`tenant_id`). Es **`null`** hasta que la persona crea o elige una empresa (semana 2, `POST /tenants` y `POST /auth/switch-tenant`). |
| `sid` | Id de la sesión. Permite revocarla aunque el token todavía no haya vencido. |
| `iat` / `exp` | Emitido y vence, en segundos Unix. `exp - iat = 900`. |

Reglas:

- Los **permisos no van dentro del JWT**. El backend los consulta en cada
  petición, para que un cambio de rol aplique de inmediato y no 15 minutos
  después.
- El `tenant_id` de una petición sale **siempre** de `tid`, nunca del cuerpo ni
  de la URL.
- La app solo lee `exp` del token, para renovarlo cuando falten menos de 60
  segundos. No debe decidir permisos con lo que hay dentro.

### Rotación y robo del refresh token

1. Cada `POST /auth/refresh` entrega un par nuevo y marca el refresh anterior
   como usado.
2. Si llega un refresh **ya usado**, se toma como robo: se revocan **todas** las
   sesiones de esa persona y la respuesta es `401 SESION_REVOCADA`. La app
   borra la sesión local y vuelve al login.
3. **El cliente nunca debe enviar dos `POST /auth/refresh` a la vez con el
   mismo token.** Tiene que serializarlos: un solo refresh en curso, cuyo
   resultado comparten todas las peticiones que esperan, y guardar siempre el
   **último** par recibido. Si dos refresh simultáneos llegan al servidor, cada
   uno recibe un par distinto (el segundo entra por la ventana de gracia del
   punto 4 y deja sin efecto el primero). Si después la app usa el par que
   quedó sin efecto, pasados los 30 s se detecta como reutilización (punto 2)
   y se **revocan todas las sesiones** de la persona.
4. En red móvil la respuesta del refresh se puede perder después de que el
   servidor ya rotó el token, y la app reenviaría el anterior. Para que eso no
   cierre todas las sesiones, hay una **ventana de gracia de 30 segundos**:
   si un refresh ya usado llega dentro de los 30 s siguientes a su rotación,
   el servidor no revoca nada; emite un par nuevo para la misma familia
   (mismo `sid`) y deja sin efecto el par que se perdió. No exige que
   `X-Dispositivo` coincida. Pasados los 30 s, se aplica el punto 2.

## Formato de error estándar

Todas las respuestas con error (4xx y 5xx) tienen esta forma:

```json
{
  "codigo": "VALIDACION",
  "mensaje": "Revisa los datos marcados.",
  "campos": {
    "correo": "Ingresa un correo válido",
    "contrasena": "Mínimo 8 caracteres"
  }
}
```

| Campo | Tipo | Significado |
|---|---|---|
| `codigo` | texto | Código estable en `MAYUSCULAS_CON_GUION_BAJO`. La app decide qué hacer con él; **nunca** con el texto de `mensaje`. |
| `mensaje` | texto | Frase en español que se puede mostrar a la persona. |
| `campos` | objeto o `null` | Solo en errores de validación: nombre del campo → mensaje. En los demás errores es `null`. |

Códigos del formato de error. El backend los usa en todas las rutas, no solo en las de autenticación:

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 400 | `VALIDACION` | Falta un campo, sobra uno o tiene un formato inválido. Trae `campos`. |
| 401 | `NO_AUTENTICADO` | No llegó la cabecera `Authorization: Bearer <token>` (o no tiene ese formato). |
| 401 | `TOKEN_INVALIDO` | El token de acceso no tiene una firma válida (HS256), está mal formado o su contenido no es el esperado. La app intenta un refresh. |
| 401 | `TOKEN_EXPIRADO` | El token de acceso venció (15 minutos). La app intenta un refresh. |
| 401 | `CREDENCIALES_INVALIDAS` | Correo o contraseña incorrectos. Es el mismo mensaje en los dos casos, para no revelar qué correos existen. |
| 401 | `REFRESCO_INVALIDO` | El refresh no existe o venció. La app vuelve al login. |
| 401 | `SESION_REVOCADA` | La sesión fue cerrada, se reutilizó un refresh ya usado o la cuenta se suspendió mientras la sesión estaba abierta. La app vuelve al login. |
| 403 | `USUARIO_INACTIVO` | La cuenta está suspendida o dada de baja. |
| 403 | `SIN_PERMISO` | La persona inició sesión, pero su rol no tiene permiso para esa acción. La app muestra "No tienes permiso". |
| 404 | `NO_ENCONTRADO` | La ruta o el recurso no existe (o pertenece a otra empresa: el backend no distingue los dos casos). |
| 409 | `CORREO_EN_USO` | Registro con un correo que ya tiene cuenta. |
| 4xx | `SOLICITUD_INVALIDA` | Cualquier otro error 4xx sin código propio, por ejemplo un **cuerpo que no es JSON válido** (400), 405 o 415. Lleva `campos: null`: `VALIDACION` se usa solo cuando hay campos que marcar. La app muestra el mensaje genérico. |
| 429 | `DEMASIADOS_INTENTOS` | Se superó el límite de peticiones. La respuesta trae la cabecera `Retry-After` en segundos. |
| 500 | `ERROR_INTERNO` | Error no esperado. El mensaje es genérico y no trae detalles del servidor. |

## Objeto usuario

`register`, `login`, `refresh` y `me` devuelven **exactamente el mismo** objeto
`usuario`. Así la app tiene todo lo que necesita para decidir la primera
pantalla (verificar correo, onboarding o inicio) sin hacer una segunda petición.

```json
{
  "id": "8f1c2d7a-3b4e-4f6a-9c1d-2e3f4a5b6c7d",
  "nombre": "Andrea Ruiz Mora",
  "nombreVisible": null,
  "nombreUsuario": null,
  "correo": "andrea.ruiz@ejemplo.com",
  "correoVerificado": false,
  "onboardingCompleto": false,
  "creadoEn": "2026-11-17T14:05:00.000Z"
}
```

| Campo | Significado |
|---|---|
| `nombre` | Nombres y apellidos, como se escribieron al registrarse. |
| `nombreVisible`, `nombreUsuario` | Se llenan en el onboarding (B34). Son `null` hasta entonces. |
| `correoVerificado` | `false` hasta verificar el correo con el código (B27). La app lo usa para mostrar "Revisa tu correo". |
| `onboardingCompleto` | `false` hasta terminar el paso 5/5. La app lo usa para decidir si muestra el onboarding. |
| `creadoEn` | Fecha de registro. |

## Respuesta de sesión

`register`, `login` y `refresh` devuelven el mismo objeto:

```json
{
  "tokenAcceso": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOi...",
  "tokenRefresco": "q8Zr3V1m0pXo6s2b9TyK4uNcW7aL5eHdFgJiQkRtYvU",
  "venceEn": 900,
  "usuario": {
    "id": "8f1c2d7a-3b4e-4f6a-9c1d-2e3f4a5b6c7d",
    "nombre": "Andrea Ruiz Mora",
    "nombreVisible": null,
    "nombreUsuario": null,
    "correo": "andrea.ruiz@ejemplo.com",
    "correoVerificado": false,
    "onboardingCompleto": false,
    "creadoEn": "2026-11-17T14:05:00.000Z"
  }
}
```

- `usuario` es el [objeto usuario](#objeto-usuario) completo.
- `venceEn` son los segundos de vida del `tokenAcceso`. Como la app guarda la
  respuesta tal cual, no necesita decodificar el JWT para el primer cálculo.
- La lista de empresas no va aquí: está en `GET /auth/me`, que la app pide
  cuando la necesita (semana 2).

---

## POST /auth/register

Crea la cuenta con correo y contraseña, guarda la aceptación de los términos y
de la política de privacidad, y abre la primera sesión. Así la persona entra
directo a "Revisa tu correo" sin volver a escribir la contraseña.

**Protegida:** no. **Límite:** 5 por hora por IP.

### Petición

```http
POST /auth/register
Content-Type: application/json
X-Dispositivo: android
X-Version-App: 1.0.0
```

```json
{
  "nombre": "Andrea Ruiz Mora",
  "correo": "andrea.ruiz@ejemplo.com",
  "contrasena": "Lunes.Claro.2026",
  "aceptaTerminos": true
}
```

| Campo | Tipo | Reglas |
|---|---|---|
| `nombre` | texto | Nombres y apellidos. Se recorta. De 3 a 80 caracteres. |
| `correo` | texto | Correo válido. Se recorta y pasa a minúsculas. Único. |
| `contrasena` | texto | De 8 a 72 caracteres. Se guarda con argon2 y nunca se devuelve ni se registra en logs. |
| `aceptaTerminos` | booleano | Debe ser `true`. |

Al aceptar, el backend guarda en `aceptaciones_legales` una fila por documento
(términos y privacidad) con la **versión vigente que conoce el servidor**, la
fecha y la IP. La app no envía versiones: así nadie puede declarar que aceptó
una versión distinta.

### Respuestas

**201 Created**: la [respuesta de sesión](#respuesta-de-sesión), con
`correoVerificado: false` y `tid` nulo dentro del token.

**400 VALIDACION**

```json
{
  "codigo": "VALIDACION",
  "mensaje": "Revisa los datos marcados.",
  "campos": {
    "aceptaTerminos": "Debes aceptar los Términos y la Política para continuar"
  }
}
```

**409 CORREO_EN_USO**

```json
{
  "codigo": "CORREO_EN_USO",
  "mensaje": "Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.",
  "campos": null
}
```

---

## POST /auth/login

Valida correo y contraseña, crea una fila en `sesiones` y devuelve los tokens.

**Protegida:** no. **Límite:** 10 por 15 minutos por IP y correo.

### Petición

```http
POST /auth/login
Content-Type: application/json
X-Dispositivo: android
X-Version-App: 1.0.0
```

```json
{
  "correo": "andrea.ruiz@ejemplo.com",
  "contrasena": "Lunes.Claro.2026"
}
```

### Respuestas

**200 OK**: la [respuesta de sesión](#respuesta-de-sesión). En la semana 1 el
`tid` del token es `null`. Cuando existan empresas (semana 2), el login
recupera la última empresa activa de la persona, si su membresía sigue activa.

**401 CREDENCIALES_INVALIDAS**

```json
{
  "codigo": "CREDENCIALES_INVALIDAS",
  "mensaje": "El correo o la contraseña no son correctos.",
  "campos": null
}
```

También sale `401 CREDENCIALES_INVALIDAS` si la cuenta solo entra con Google
(no tiene contraseña), para no revelar cómo se registró.

**403 USUARIO_INACTIVO**

```json
{
  "codigo": "USUARIO_INACTIVO",
  "mensaje": "Tu cuenta está suspendida. Escríbenos si crees que es un error.",
  "campos": null
}
```

Un correo **sin verificar sí puede iniciar sesión** en la beta. La app usa
`correoVerificado` para mostrar "Revisa tu correo".

---

## POST /auth/refresh

Entrega un par nuevo de tokens y marca el refresh anterior como usado.

**Protegida:** no (el refresh es la credencial). **Límite:** 30 por minuto por IP.

### Petición

```http
POST /auth/refresh
Content-Type: application/json
X-Dispositivo: android
X-Version-App: 1.0.0
```

```json
{
  "tokenRefresco": "q8Zr3V1m0pXo6s2b9TyK4uNcW7aL5eHdFgJiQkRtYvU"
}
```

### Respuestas

**200 OK**: la [respuesta de sesión](#respuesta-de-sesión), con un
`tokenRefresco` **nuevo**. La app debe reemplazar el guardado en
`expo-secure-store` antes de usarlo. El `tid` del token nuevo es el de la sesión.

**401 REFRESCO_INVALIDO**: el token no existe o venció.

```json
{
  "codigo": "REFRESCO_INVALIDO",
  "mensaje": "Tu sesión expiró. Vuelve a iniciar sesión.",
  "campos": null
}
```

**401 SESION_REVOCADA**: la sesión fue cerrada, o se reutilizó un refresh
viejo. En ese caso también se cerraron las demás sesiones de la persona.

```json
{
  "codigo": "SESION_REVOCADA",
  "mensaje": "Tu sesión se cerró por seguridad. Vuelve a iniciar sesión.",
  "campos": null
}
```

---

## POST /auth/logout

Revoca la sesión actual (la del `sid` del token). Las demás sesiones de la
persona siguen abiertas. Para cerrarlas está `POST /auth/logout-others`
(semana 2, pantalla Seguridad).

**Protegida:** sí, pero **acepta un `tokenAcceso` vencido** siempre que su
firma sea válida (HS256) y su contenido tenga la forma esperada. Así la app
puede cerrar sesión aunque el token haya vencido hace horas, sin tener que
renovarlo antes: igual se revocan la sesión y su `tokenRefresco`. Las demás
rutas protegidas siguen respondiendo `401 TOKEN_EXPIRADO` con un token vencido.

### Petición

```http
POST /auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Dispositivo: android
X-Version-App: 1.0.0
```

Sin cuerpo.

### Respuestas

**204 No Content**: sesión cerrada (se revoca la familia completa del `sid`,
así ningún refresh de esa sesión vuelve a servir). Es idempotente: si la
sesión ya estaba revocada, la cuenta está suspendida o el token de acceso
venció, también responde 204.

**401 NO_AUTENTICADO o TOKEN_INVALIDO**: el token falta, tiene una firma que
no es válida o está mal formado. Nunca responde `TOKEN_EXPIRADO`. En ese caso la app borra la sesión local igual: para la
persona el resultado es el mismo.

---

## GET /auth/me

Devuelve los datos de la persona y sus empresas. La app lo llama al volver del
segundo plano y cuando necesita la lista de empresas. También sirve para
comprobar que la sesión sigue vigente. Al abrir la app no hace falta: el
refresh ya trae el [objeto usuario](#objeto-usuario).

**Protegida:** sí. No exige `tid`: funciona antes de tener empresa.

### Petición

```http
GET /auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Dispositivo: android
X-Version-App: 1.0.0
```

### Respuestas

**200 OK**

```json
{
  "usuario": {
    "id": "8f1c2d7a-3b4e-4f6a-9c1d-2e3f4a5b6c7d",
    "nombre": "Andrea Ruiz Mora",
    "nombreVisible": null,
    "nombreUsuario": null,
    "correo": "andrea.ruiz@ejemplo.com",
    "correoVerificado": false,
    "onboardingCompleto": false,
    "creadoEn": "2026-11-17T14:05:00.000Z"
  },
  "empresaActivaId": null,
  "empresas": []
}
```

Cuando existan empresas (semana 2), cada elemento de `empresas` tiene esta forma.
Solo aparecen las membresías `activa` y `en_espera`:

```json
{
  "id": "4c3b2a19-8d7e-4f6a-b5c4-d3e2f1a0b9c8",
  "nombre": "ACCONS S.A.S.",
  "tipo": "empresa",
  "rol": "Administrador",
  "estadoMembresia": "activa"
}
```

| Campo | Significado |
|---|---|
| `usuario` | El mismo [objeto usuario](#objeto-usuario) que devuelven `register`, `login` y `refresh`. |
| `empresaActivaId` | Igual al `tid` del token. |
| `tipo` | `empresa` o `personal`. |
| `estadoMembresia` | `activa` o `en_espera`. |

**401 NO_AUTENTICADO, TOKEN_INVALIDO o TOKEN_EXPIRADO**: el token falta, no es
válido o venció. La app intenta un refresh.

**401 SESION_REVOCADA**: la sesión fue cerrada (logout, robo detectado o desde
otro dispositivo), aunque el token todavía no haya vencido. La app vuelve al
login sin intentar refresh.

**403 USUARIO_INACTIVO**: la cuenta se suspendió con la sesión abierta.

---

## Flujo esperado en la app

```text
Abrir app ─► ¿hay tokenRefresco guardado?
              ├─ no ─► Login / Registro ─► guardar tokens y usuario ─► primera pantalla
              └─ sí ─► POST /auth/refresh
                        ├─ 200 ─► guardar el refresh nuevo y el usuario ─► primera pantalla
                        ├─ 401 ─► borrar sesión local ─► Login
                        └─ sin red, timeout, 5xx o 429 ─► conservar los tokens,
                                  mostrar "Sin conexión" y reintentar después

Cada petición ─► ¿faltan < 60 s para exp? ─► refresh primero (uno solo a la vez)
             ─► 401 NO_AUTENTICADO, TOKEN_INVALIDO o TOKEN_EXPIRADO ─► un refresh y un solo reintento
             ─► 401 SESION_REVOCADA o REFRESCO_INVALIDO ─► Login
```

La primera pantalla sale del [objeto usuario](#objeto-usuario):
`correoVerificado: false` lleva a "Revisa tu correo", `onboardingCompleto: false`
al onboarding y, si no, a Inicio.

### Cuándo se cierra la sesión por un fallo del refresh

**Solo un `401` de `/auth/refresh` cierra la sesión** y lleva al login. Cualquier
otro fallo es pasajero y no dice nada sobre si la sesión sigue siendo válida:

| Fallo de `/auth/refresh` | Qué hace la app |
|---|---|
| Sin red o timeout | Conserva los tokens y reintenta cuando vuelva la conexión. |
| `5xx` | Conserva los tokens y reintenta más tarde, esperando cada vez un poco más. |
| `429 DEMASIADOS_INTENTOS` | Conserva los tokens y espera los segundos de `Retry-After` antes de reintentar. |
| `401` (`REFRESCO_INVALIDO` o `SESION_REVOCADA`) | Borra la sesión local y lleva al login. |

Borrar los tokens por un error de red dejaría a la persona fuera de la app solo
por pasar por una zona sin señal.

## Pendiente de confirmar en la revisión

- **Nombre:** el plan habla de "nombres y apellidos" por separado, pero el
  formulario "Crea tu cuenta" (F08) tiene un solo campo. El contrato usa un solo
  `nombre` para no cambiar el formulario. Si se quieren separados, hay que
  cambiar F08 y este contrato antes de B05.
- **`CORREO_EN_USO`:** responder 409 deja saber si un correo tiene cuenta. Se
  acepta por facilidad de uso, y el límite de 5 registros por hora por IP reduce
  el riesgo. Revisarlo en B48 (OWASP ASVS).
- **Límites:** los números de cada ruta son una propuesta inicial para B12.
- **Ventana de gracia del refresh (B07):** decidida e implementada en B07: 30 segundos
  dentro de la misma familia, sin exigir el mismo dispositivo (ver el punto 4
  de [Rotación y robo](#rotación-y-robo-del-refresh-token)). Se configura con
  `REFRESCO_GRACIA_SEGUNDOS`.
