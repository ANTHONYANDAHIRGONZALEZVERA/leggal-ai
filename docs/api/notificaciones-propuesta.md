# Notificaciones push: propuesta del frontend

> **Propuesta, no contrato.** Las notificaciones push están en "Después" en el
> plan de las semanas 1 y 2. Se deja escrita para programarla junto con B40
> (aprobar o rechazar solicitudes). Cuando el backend la implemente, su
> contrato en `docs/api/` manda y este archivo se borra.

## Qué hace hoy la app
- En el onboarding 5/5 la persona activa "Plazos y audiencias" o "Resumen
  diario". Antes del aviso del sistema se muestra la pantalla de permiso del
  diseño (PermisoSistema).
- Si da el permiso, la preferencia se envía con el onboarding
  (`preferencias.notificaciones` en `PATCH /users/me/onboarding`).
- **Todavía no se registra el teléfono para push**: en Expo Go (Android, SDK
  53+) no se puede. Hace falta la build de desarrollo de EAS (F14–F16).

## Lo que falta y quién lo hace
| Paso | Quién | Qué |
|---|---|---|
| 1 | Frontend | Con la build de EAS, obtener el token push (`getExpoPushTokenAsync`) cuando la persona dio el permiso, y enviarlo al backend al iniciar sesión y cada vez que cambie. |
| 2 | Backend | Guardar los tokens por persona y dispositivo (ruta de abajo). |
| 3 | Backend | Enviar el aviso cuando pase algo (tabla de eventos) por el servicio push de Expo. |
| 4 | Los dos | Credenciales de Firebase (FCM V1) cargadas en EAS para Android; en iOS las gestiona EAS. |

## Rutas propuestas
Privadas (`Authorization: Bearer <tokenAcceso>`), con el formato de error de
[`auth.md`](auth.md#formato-de-error-estándar).

### `PUT /devices/push-token`
Registra o actualiza el token de este dispositivo. Idempotente.
```json
{ "token": "ExponentPushToken[xxxxxxxx]", "plataforma": "android" }
```
- **204**.
- Guardar con: usuario, token (único), plataforma, sesión (`sid`) y fecha de
  último uso. Si el mismo token ya era de otra persona (otro usuario en el
  mismo teléfono), pasa a la persona nueva.

### `DELETE /devices/push-token`
Al cerrar sesión, borra el token de **esta sesión** para que el teléfono deje
de recibir avisos de esa cuenta. **204**, idempotente.
- Recomendado: hacerlo también dentro de `POST /auth/logout`, por si la app
  no alcanza a llamar.

## Cuándo enviar (primeros eventos)
| Evento | Para quién | Texto sugerido | Datos (`data`) |
|---|---|---|---|
| Solicitud aprobada (B40) | Quien pidió unirse | "ACCONS S.A.S. aprobó tu solicitud. Ya puedes trabajar con tu equipo." | `{ "tipo": "solicitud", "id": "sol-1", "estado": "aprobada" }` |
| Solicitud rechazada (B40) | Quien pidió unirse | "Tu solicitud a ACCONS S.A.S. no fue aprobada." | `{ "tipo": "solicitud", "id": "sol-1", "estado": "rechazada" }` |
| Nueva solicitud (B39) | Administradores de la empresa | "Andrea Ruiz pidió unirse como Abogado/a." | `{ "tipo": "solicitudes_pendientes" }` |

Los avisos de solicitudes son de la cuenta (como un correo de seguridad): se
envían si hay permiso, sin depender de los interruptores del 5/5. "Plazos y
audiencias" y "Resumen diario" se respetan cuando existan esas funciones.

## Reglas
- **Nada sensible en el texto del aviso**: se ve en la pantalla bloqueada. Solo
  el nombre de la empresa y el resultado; nunca datos de casos ni de clientes.
- `data` lleva solo tipo e ids; la app pide el detalle a la API con su sesión.
- Envío en lotes (hasta 100 por petición) con el SDK de Expo para Node
  (`expo-server-sdk`), y revisar los recibos: si llega `DeviceNotRegistered`,
  borrar ese token.
- Canal de Android: `avisos` (la app ya lo crea al pedir el permiso).
- Si el envío falla, no se cae la acción principal (aprobar sigue aprobado).
