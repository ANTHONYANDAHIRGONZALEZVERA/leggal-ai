# Contrato: roles y permisos (B08 y B09)

> Formato de error y códigos: [`auth.md`](auth.md). Pruebas:
> [`docs/pruebas/backend/permisos.md`](../pruebas/backend/permisos.md).

## Módulos y niveles

La pantalla "Permisos por rol" muestra 8 módulos. Cada rol tiene un nivel en
cada uno: `ninguno`, `ver` o `editar`. `editar` incluye `ver`.

| Clave | Nombre en la app |
|---|---|
| `casos` | Casos |
| `clientes` | Clientes |
| `documentos` | Documentos |
| `actividades` | Actividades |
| `asistente_ia` | Asistente IA (`editar` = poder usarlo) |
| `aprobar_ia` | Aprobar respuestas IA |
| `administracion` | Administración (empresa, miembros, solicitudes, códigos, permisos y plan) |
| `auditoria` | Auditoría (solo tiene sentido `ver`: la bitácora es de solo inserción) |

## Roles base

Cada empresa recibe estos cinco roles al crearse. El administrador puede
ajustar los niveles después (B44).

| Módulo | Administrador | Abogado/a | Asistente legal | Contador/a | Solo lectura |
|---|---|---|---|---|---|
| Casos | editar | editar | editar | ver | ver |
| Clientes | editar | editar | editar | ver | ver |
| Documentos | editar | editar | editar | ver | ver |
| Actividades | editar | editar | editar | ver | ver |
| Asistente IA | editar | editar | editar | ninguno | ninguno |
| Aprobar respuestas IA | editar | editar | ninguno (bloqueado) | ninguno (bloqueado) | ninguno (bloqueado) |
| Administración | editar | ninguno | ninguno | ninguno | ninguno |
| Auditoría | ver | ninguno | ninguno | ninguno | ninguno |

En la API, cada rol base se identifica por su `clave` (`administrador`,
`abogado`, `asistente_legal`, `contador`, `solo_lectura`), que no cambia
aunque la empresa le cambie el nombre.

### Reglas que no se pueden cambiar

1. **Solo Administrador y Abogado/a aprueban respuestas de la IA.** Para los
   demás roles, también los que cree la empresa, "Aprobar respuestas IA"
   aparece bloqueado. El backend lo exige aunque el nivel diga `editar`.
2. **Administrador nunca baja de `editar` en Administración**, para que la
   empresa no se quede sin nadie que la administre.

## Cómo se revisa cada petición

Las rutas de una empresa declaran el permiso que piden, por ejemplo
`@RequierePermiso('casos', 'editar')`. El backend revisa en este orden y se
detiene en el primer fallo:

| Paso | Si falla |
|---|---|
| 1. Token válido y sesión abierta | `401` (`NO_AUTENTICADO`, `TOKEN_INVALIDO`, `TOKEN_EXPIRADO` o `SESION_REVOCADA`) |
| 2. Cuenta activa | `403 USUARIO_INACTIVO` |
| 3. El token trae una empresa (`tid`) | `403 SIN_PERMISO`: "Elige una empresa para continuar." |
| 3. Membresía **activa** en esa empresa (no `en_espera`, `suspendida` ni `rechazada`) | `403 SIN_PERMISO`: "No tienes acceso a esta empresa." |
| 4. El rol tiene el nivel pedido en el módulo | `403 SIN_PERMISO`: "No tienes permiso para hacer esto." |

La empresa sale siempre del `tid` del token, nunca del cuerpo ni de la URL.

Ejemplo:

```json
{
  "codigo": "SIN_PERMISO",
  "mensaje": "No tienes permiso para hacer esto.",
  "campos": null
}
```

La app decide por el `codigo`; el `mensaje` sirve para mostrarlo tal cual.
