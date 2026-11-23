# Pruebas: roles y permisos (B08 y B09)

> Contrato que se prueba: [`docs/api/permisos.md`](../../api/permisos.md).
> Cómo correr las pruebas: [`docs/pruebas/backend.md`](../backend.md).

Fecha: 2026-11-23 · Rama: `feat/B08-B09-roles-permisos` · Responsable: Joel

## Resumen

| Tipo | Archivo | Casos | Resultado |
|---|---|---|---|
| Unitarias | `src/permisos/catalogo.spec.ts` | 19 | ✅ |
| Unitarias | `src/permisos/permisos.guard.spec.ts` | 17 | ✅ |
| E2E (PostgreSQL real) | `test/permisos.e2e-spec.ts` | 21 | ✅ |

Las e2e crean empresas `Empresa de prueba B08 …` y correos
`@pruebas-b08.leggal.test`, y los borran al terminar. El guard se prueba con
rutas de prueba registradas solo en la e2e (los módulos reales, como casos,
llegan después), importando `PermisosModule` igual que lo hará un módulo real.

## Unitarias

| Qué se prueba | Esperado |
|---|---|
| Catálogo | Los 8 módulos en el orden de la pantalla y los 5 roles con sus nombres |
| Matriz | Cada módulo × rol igual a la tabla del plan (escrita aparte en la prueba) |
| Regla de la IA | Solo `administrador` y `abogado` aprueban; un rol propio (`clave` null) tampoco |
| Auditoría | Ningún rol la tiene en `editar` |
| `alcanzaNivel` | `editar` incluye `ver`; `ninguno` no alcanza para nada |
| Guard: membresía activa con el nivel | Pasa y deja la membresía para la ruta; busca por la empresa y la persona **del token** y solo el módulo pedido |
| Guard: nivel insuficiente o sin fila para el módulo | `403 SIN_PERMISO` |
| Guard: membresía `en_espera`, `suspendida` o `rechazada`, o no es miembro | `403 SIN_PERMISO` |
| Guard: `tid` null | `403 SIN_PERMISO` sin consultar la base |
| Guard: aprobar IA con nivel `editar` en la base | Solo pasan Administrador y Abogado/a |
| Guard usado sin `@RequierePermiso()` o sin `JwtAuthGuard` | `500` (error de programación) |

## E2E

### Seed de roles base

| Caso | Esperado | Resultado |
|---|---|---|
| Catálogo `modulos` | Los 8 de la app, en orden y con su nombre | ✅ |
| Empresa nueva | 5 roles (`es_sistema`) y 40 permisos iguales a la matriz | ✅ |
| Correrlo otra vez | 0 creados, 0 corregidos y las filas idénticas | ✅ |
| Personalización del administrador (nivel y nombre) | Se respeta | ✅ |
| `aprobar_ia` subido a mano en Contador/a y en un rol propio; Administrador bajado a `ver` en Administración | Se corrigen las 3 filas; el resto del rol propio no se toca | ✅ |
| Rol "Administrador" creado antes del seed sin `clave` | Se adopta (no se duplica); se crean los otros 4 | ✅ |
| **Aislamiento** | Aplicar los roles en una empresa no corrige nada de otra | ✅ |

### Guard `@RequierePermiso()`

| Rol | Ver casos | Editar casos | Aprobar IA | Ver auditoría |
|---|---|---|---|---|
| Administrador | 200 | 201 | 201 | 200 |
| Abogado/a | 200 | 201 | 201 | 403 |
| Asistente legal | 200 | 201 | 403 | 403 |
| Contador/a | 200 | 403 | 403 | 403 |
| Solo lectura | 200 | 403 | 403 | 403 |

| Caso | Esperado | Resultado |
|---|---|---|
| Las 20 combinaciones de la tabla | Como en la tabla | ✅ |
| Formato del 403 | `{ codigo: "SIN_PERMISO", mensaje, campos: null }` | ✅ |
| La ruta recibe la membresía | `rolClave` y la empresa del token | ✅ |
| Administrador con membresía `en_espera`, `suspendida` o `rechazada` | `403 SIN_PERMISO` "No tienes acceso a esta empresa." | ✅ |
| Token con `tid: null` | `403 SIN_PERMISO` "Elige una empresa para continuar." | ✅ |
| **Aislamiento**: Administrador de una empresa con el `tid` de otra | `403 SIN_PERMISO` | ✅ |
| Rol propio con `aprobar_ia` en `editar` en la base | `403 SIN_PERMISO` igual | ✅ |
| Sin token / después del logout | `401` / `401 SESION_REVOCADA` (JwtAuthGuard va primero) | ✅ |

## Las pruebas detectan errores reales

| Cambio a propósito | Unitarias que fallaron | E2E que fallaron |
|---|---|---|
| El guard deja de exigir que el rol sea Administrador o Abogado/a para aprobar IA | 4 | 1 |
| El guard acepta cualquier membresía, no solo la activa | 3 | 3 |
| El guard deja pasar tokens sin empresa | 1 | 1 |
| El seed deja de corregir `aprobar_ia` | 0 | 1 |

## Probado contra la base de Docker

`npm run db:seed` dos veces con una empresa de demostración: la primera crea 5
roles y 40 permisos; la segunda, 0 y 0. La consulta de la matriz en
PostgreSQL coincide con la tabla del contrato.
