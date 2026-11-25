# Pruebas: autenticación (B05, B06, B07 y B11)

> Contrato que se prueba: [`docs/api/auth.md`](../../api/auth.md).
> Cómo correr las pruebas: [`docs/pruebas/backend.md`](../backend.md).

Fechas: 2026-11-22 (B05–B07), 2026-11-23 (B11) y 2026-11-24 (logout con token vencido) · Ramas: `feat/B05-B07-auth-tokens` y `feat/B11-auth-me-logout` · Responsable: Joel

## Resumen

| Tipo | Archivo | Casos | Resultado |
|---|---|---|---|
| Unitarias | `src/auth/esquemas.spec.ts` | 15 | ✅ |
| Unitarias | `src/auth/tokens.service.spec.ts` | 12 | ✅ |
| Unitarias | `src/auth/usuario-api.spec.ts` | 3 | ✅ |
| Unitarias | `src/auth/guardia/jwt-auth.guard.spec.ts` (B11) | 10 | ✅ |
| E2E (PostgreSQL real) | `test/auth.e2e-spec.ts` | 17 | ✅ |
| E2E (PostgreSQL real) | `test/auth-sesion.e2e-spec.ts` (B11) | 18 | ✅ |

Las e2e usan correos únicos del dominio `@pruebas-e2e.leggal.test` y los
borran al terminar (en cascada se borran sus sesiones y aceptaciones).

## Unitarias

| Qué se prueba | Esperado |
|---|---|
| Registro válido | Pasa sin cambios |
| Nombre y correo | Nombre recortado; correo recortado y en minúsculas |
| Nombre de 2 o de 81 caracteres, correo inválido, contraseña de 7 o de 73 | `400` con el mensaje del formulario en el campo |
| `aceptaTerminos` en `false`, ausente o `"true"` (texto) | Rechazado: tiene que ser el booleano `true` |
| `tenantId` en el cuerpo | Rechazado (`unrecognized_keys`): la empresa sale del token |
| Login | Normaliza el correo igual que el registro; contraseña vacía rechazada |
| Refresh | Token vacío o de más de 128 caracteres rechazado |
| JWT de acceso | Lleva solo `sub`, `tid`, `sid`, `iat` y `exp`; `exp − iat = 900` |
| JWT firmado con otro secreto | No se acepta |
| Refresh nuevo | 43 caracteres aleatorios; se guarda solo su SHA-256 (64 hex) |
| Duraciones | Refresh vence a los 30 días; gracia de 30 s; acceso de 900 s |
| Objeto usuario | Exactamente los 8 campos del contrato; nunca el hash ni el estado; fechas → booleanos |

## E2E

### `POST /auth/register`

| Caso | Esperado | Resultado |
|---|---|---|
| Registro con el correo en mayúsculas y con espacios | `201`; respuesta con `tokenAcceso`, `tokenRefresco`, `venceEn: 900` y el objeto usuario; correo guardado en minúsculas; JWT con `tid: null` y 15 min | ✅ |
| Lo que queda en la base | Contraseña con argon2id; 2 aceptaciones (términos y privacidad) con la **versión del servidor** y la IP; 1 sesión con el dispositivo y **solo el hash** del refresh; `sid` = `familia_id` | ✅ |
| Correo repetido (también en mayúsculas) | `409 CORREO_EN_USO` | ✅ |
| Sin aceptar los términos | `400 VALIDACION` en `aceptaTerminos` y **no** se crea la cuenta | ✅ |
| `tenantId` en el cuerpo | `400 VALIDACION`: "Este campo no está permitido" | ✅ |

### `POST /auth/login`

| Caso | Esperado | Resultado |
|---|---|---|
| Login correcto | `200`; mismo usuario que el registro; sesión nueva (otro `sid`) | ✅ |
| Correo sin verificar | Entra (`correoVerificado: false`) | ✅ |
| Contraseña mala, correo inexistente y cuenta solo de Google | Las tres dan **exactamente** el mismo `401 CREDENCIALES_INVALIDAS` | ✅ |
| Cuenta suspendida | `403 USUARIO_INACTIVO` con la clave correcta; con la clave mala sigue siendo `401` (no revela que la cuenta existe) | ✅ |

### `POST /auth/refresh`

| Caso | Esperado | Resultado |
|---|---|---|
| Refresh normal | `200`; refresh nuevo; **mismo `sid`**; `tid: null`; el nuevo también rota | ✅ |
| Ventana de gracia | Reenviar el refresh anterior antes de 30 s (desde otro `X-Dispositivo`) da `200` con un par nuevo del mismo `sid`; el par perdido queda sin efecto | ✅ |
| Reuso fuera de la gracia (31 s) | `401 SESION_REVOCADA` y se cierran **todas** las sesiones de la persona, también las de otro dispositivo | ✅ |
| Dos refresh simultáneos con el mismo token | Ambos `200` (no se toma como robo) | ✅ |
| Token que no existe | `401 REFRESCO_INVALIDO` | ✅ |
| Token vencido | `401 REFRESCO_INVALIDO` | ✅ |
| Cuenta suspendida con la sesión abierta | `401 SESION_REVOCADA` (la app vuelve al login, que explica el `403`) | ✅ |
| Aislamiento | El refresh de una persona nunca devuelve los datos de otra | ✅ |

## Las pruebas detectan errores reales

Se rompió el código a propósito para comprobar que las e2e fallan:

| Cambio en `auth.service.ts` | Pruebas que fallaron |
|---|---|
| Quitar la ventana de gracia | 2 (gracia y refresh simultáneos) |
| Ante un robo, revocar solo esa familia y no todas las sesiones | 1 (reuso fuera de la gracia) |

## Aislamiento entre empresas

Estas rutas todavía no manejan datos de empresas: el token sale con `tid: null`
(semana 1). Lo que sí se prueba es que el cuerpo **no** puede traer un
`tenantId` y que una sesión solo devuelve los datos de su propia persona. La
prueba de aislamiento entre empresas llega con B35–B37.

## Probado a mano

Con el servidor compilado (`node dist/main`) y PostgreSQL de Docker: registro
(201), registro repetido (409), login correcto (200), clave mala y correo
inexistente (mismo 401), refresh (mismo `sid`), reuso en la gracia (200),
refresh inventado (401). Swagger (`/docs-json`) documenta las 3 rutas con sus
respuestas.

## B11: token de acceso, `GET /auth/me` y `POST /auth/logout`

### Unitarias

| Qué se prueba | Esperado |
|---|---|
| `verificarAcceso` con un token válido | Devuelve `sub`, `tid` y `sid` |
| Token vencido | `TOKEN_EXPIRADO` |
| Basura, firma con otro secreto, `alg: "none"` o contenido con otra forma | `TOKEN_INVALIDO`, también con `permitirVencido` |
| `permitirVencido` (logout) con un token vencido de firma válida | Devuelve `sub`, `tid` y `sid` |
| `permitirVencido` con un token vencido firmado con otro secreto | `TOKEN_INVALIDO` |
| Guard sin cabecera, con otro esquema (`Basic`), `Bearer` sin token o con partes de más | `401 NO_AUTENTICADO`, sin consultar la base |
| Guard con firma falsa | `401 TOKEN_INVALIDO`, sin consultar la base |
| Guard con token vencido | `401 TOKEN_EXPIRADO` |
| Sesión sin filas abiertas en la base | `401 SESION_REVOCADA`; busca por el `sid` **y** el usuario del token |
| Cuenta suspendida | `403 USUARIO_INACTIVO` |
| Token válido (también `bearer` en minúsculas) | Pasa y guarda la sesión para `@UsuarioActual()` |
| `@PermitirSesionCerrada()` (logout) | Exige firma válida, acepta un token vencido y no consulta la sesión; con firma falsa, `401 TOKEN_INVALIDO` |

### E2E

| Caso | Esperado | Resultado |
|---|---|---|
| `GET /auth/me` recién registrada | `200` con el **mismo** objeto usuario del registro, `empresaActivaId: null` y `empresas: []` | ✅ |
| Membresías activa, en espera, rechazada y suspendida | Solo aparecen la activa y la en espera, con el nombre de su rol | ✅ |
| **Aislamiento** | El `/auth/me` de una persona nunca muestra las empresas de otra | ✅ |
| Sin `Authorization` | `401 NO_AUTENTICADO` | ✅ |
| Token alterado | `401 TOKEN_INVALIDO` | ✅ |
| Token vencido | `401 TOKEN_EXPIRADO` | ✅ |
| Cuenta suspendida con la sesión abierta | `403 USUARIO_INACTIVO` | ✅ |
| `POST /auth/logout` | `204`; el mismo token de acceso da `401 SESION_REVOCADA` **en el acto**, aunque no haya vencido; el refresh tampoco sirve | ✅ |
| Logout después de rotar | Revoca la familia completa: el refresh rotado también da `401 SESION_REVOCADA` | ✅ |
| Logout con token vencido (revisión de Anthony) | `/auth/me` con ese token sigue dando `401 TOKEN_EXPIRADO`; el logout da `204` y el refresh de la sesión queda en `401 SESION_REVOCADA` | ✅ |
| Logout con token vencido y firma falsa | `401 TOKEN_INVALIDO` y la sesión sigue abierta | ✅ |
| Logout dos veces con el mismo token | `204` las dos veces (idempotente) | ✅ |
| Logout en un dispositivo | La sesión del otro dispositivo sigue abierta | ✅ |
| Logout sin token | `401 NO_AUTENTICADO` | ✅ |
| JSON mal formado en login, register y refresh | `400 SOLICITUD_INVALIDA` con `campos: null` | ✅ |
| Cuerpo válido con datos malos | Sigue siendo `400 VALIDACION` con `campos` | ✅ |

### Las pruebas detectan errores reales

| Cambio a propósito | Pruebas que fallaron |
|---|---|
| El guard deja de revisar si la sesión se revocó | 1 (el token sigue sirviendo después del logout) |
| El JSON mal formado vuelve a ser `VALIDACION` | 3 (una por ruta) |
| `/auth/me` deja de filtrar por el usuario del token | 1 (aislamiento) |
| El logout vuelve a rechazar tokens vencidos | 1 unitaria y 1 e2e (logout con token vencido) |
