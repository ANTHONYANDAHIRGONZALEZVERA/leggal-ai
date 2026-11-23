# Pruebas del backend

> Regla: cada prueba nueva se anota aquí en el mismo PR que la agrega. Cada
> endpoint nuevo trae una prueba e2e que confirme que otra empresa no ve sus datos.

## Cómo correrlas
Desde `backend/`:

| Comando | Qué hace | Necesita |
|---|---|---|
| `npm test` | Pruebas unitarias (`src/**/*.spec.ts`) | Nada |
| `npm run test:e2e` | Pruebas e2e (`test/**/*.e2e-spec.ts`) con HTTP real | PostgreSQL de Docker (`docker compose up -d`) |
| `npm run test:cov` | Unitarias con cobertura | Nada |

Antes de la primera vez: `npx prisma generate` (crea el cliente en `src/generated/prisma`).

Las variables de entorno de prueba salen de `test/entorno-pruebas.ts`: primero
se usa el `.env` local si existe y luego se completan las que falten con valores
que solo sirven para pruebas. Así corren igual en tu PC y en CI.

## Herramientas
- **Jest** con `ts-jest`: corre las pruebas escritas en TypeScript.
- **Supertest**: hace peticiones HTTP reales a la app creada en memoria.
- Configuración: `backend/jest.config.ts` (unitarias) y `backend/test/jest-e2e.json` (e2e).

## Casos probados

Por módulo:
- [Autenticación (B05, B06, B07 y B11)](backend/auth.md): register, login, refresh, me, logout y el guard del token.

### Infraestructura común (B05, PR de infraestructura) — 2026-11-20

Unitarias:

| Archivo | Qué prueba | Resultado |
|---|---|---|
| `src/config/entorno.spec.ts` | Valores por defecto del contrato (15 min, 30 días, 30 s de gracia); conversión a número; rechazo de `JWT_SECRETO` corto y de una `DATABASE_URL` que no es PostgreSQL; el error lista todas las variables que faltan **sin mostrar sus valores** | ✅ 5 de 5 |
| `src/comun/validacion/validacion-zod.pipe.spec.ts` | Datos válidos pasan; error `400 VALIDACION` con un mensaje por campo; campos que sobran (por ejemplo `tenantId`) quedan marcados; mensajes por defecto en español; cuerpo que no es objeto | ✅ 5 de 5 |
| `src/comun/peticion/contexto-peticion.spec.ts` | Lee `X-Dispositivo`, `X-Version-App` e IP; mayúsculas y espacios; sin cabeceras no rechaza; formato del borrador `android/1.0.0` y versiones mal formadas se ignoran; cabecera repetida | ✅ 9 de 9 |

E2E (`test/infraestructura.e2e-spec.ts`, con la app completa):

| Caso | Esperado | Resultado |
|---|---|---|
| `ErrorApi` lanzado en un controlador | `409 { codigo: "CORREO_EN_USO", mensaje, campos: null }` | ✅ |
| Cuerpo inválido con Zod | `400 VALIDACION` con `campos` por campo, incluido el que sobra | ✅ |
| JSON mal formado | `400 SOLICITUD_INVALIDA` con `campos: null` (desde B11; antes `VALIDACION`) | ✅ |
| Ruta inexistente | `404 NO_ENCONTRADO` | ✅ |
| Error inesperado | `500 ERROR_INTERNO` sin el detalle interno en la respuesta | ✅ |
| Cabeceras de la app | `dispositivo` y `versionApp` leídos | ✅ |
| `PrismaService` contra PostgreSQL | `SELECT 1` responde por el adaptador `pg` | ✅ |

Aislamiento entre empresas: no aplica todavía; esta PR no agrega endpoints con datos.

Verificado a mano con el servidor compilado: arranca y responde `404` con el
formato del contrato; sin `JWT_SECRETO` ni versiones legales, se niega a
arrancar y lista las variables que faltan.
