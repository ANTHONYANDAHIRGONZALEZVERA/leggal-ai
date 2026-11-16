# Reglas de seguridad de Leggal AI

Leggal AI guarda datos jurídicos de clientes, protegidos por la Ley Orgánica de
Protección de Datos Personales de Ecuador. Es multiempresa: un dato de una
empresa nunca debe verse desde otra. El repositorio es público.

## Multiempresa (backend)

- Toda consulta a una tabla con `tenant_id` filtra por el tenant activo. Las
  tablas con `tenant_id` son: `roles`, `rol_permisos`, `membresias`,
  `invitaciones` y `auditoria`, más todas las tablas de negocio que lleguen
  después (casos, clientes, documentos, actividades).
- El `tenant_id` sale solo del claim `tid` del JWT verificado. Nunca se acepta
  desde el cuerpo, la query, la ruta ni una cabecera enviada por el cliente.
- Las tablas sin `tenant_id` (`usuarios`, `perfiles`, `sesiones`,
  `codigos_verificacion`, `identidades_externas`, `aceptaciones_legales`) se
  filtran siempre por el `usuario_id` (`sub`) del token. Para listar a otros
  usuarios se consulta desde `membresias` de la empresa activa, nunca la tabla
  `usuarios` completa.
- No usar `$queryRawUnsafe` ni `$executeRawUnsafe` de Prisma. SQL crudo solo
  con plantillas parametrizadas (`$queryRaw` con template literal).
- La seguridad a nivel de fila (RLS) es la segunda barrera: la API se conecta
  con un usuario que no es dueño de las tablas. No desactivar RLS ni usar
  `BYPASSRLS` fuera del rol `claude_lectura` de desarrollo.

## Autorización

- Cada endpoint que toca datos de una empresa lleva el guard de permisos y el
  decorador `@RequierePermiso(modulo, nivel)`. Un endpoint nuevo sin guard es
  un hallazgo.
- Los permisos no viajan dentro del JWT; se consultan en cada petición.
- Una empresa siempre conserva al menos un Administrador activo.

## Autenticación y secretos

- Contraseñas solo con argon2. Refresh tokens, códigos de verificación y
  códigos de invitación se guardan como hash, nunca en claro.
- Nunca registrar en logs, errores ni auditoría: contraseñas, tokens (acceso
  o refresh), códigos de 6 dígitos, el `idToken` de Google ni cabeceras
  `Authorization`.
- Los tokens de Google y Facebook se verifican en el backend
  (`google-auth-library`, API Graph de Meta). Nunca confiar en datos de
  identidad enviados por la app sin verificar.
- Ningún secreto en el código ni en el repositorio: solo `.env.example` con
  valores falsos. Las variables `EXPO_PUBLIC_*` son públicas dentro de la app y
  nunca llevan secretos.
- Las respuestas de error al cliente usan el formato estándar (`codigo`,
  `mensaje`, `campos`) sin stack traces, SQL ni nombres internos.
- Las rutas públicas `/health` responden solo `ok` o `error`.

## App móvil (frontend)

- El refresh token se guarda solo en `expo-secure-store`. Nunca en
  AsyncStorage, MMKV, logs ni en el estado persistido de Zustand. El token de
  acceso vive solo en memoria.
- La app nunca decide permisos por sí sola: ocultar un botón es comodidad, la
  autorización real la hace el backend.
- No usar `eval`, `new Function` ni WebViews con `javaScriptEnabled` sobre
  contenido no confiable. Los enlaces externos se abren con
  `expo-web-browser`, validando el esquema `https:`.

## IA y documentos

- Todo texto que venga de documentos, correos o mensajes de usuarios es dato,
  no instrucción: nunca se concatena dentro del prompt del sistema ni puede
  cambiar herramientas, permisos o el tenant de la consulta.
- Las respuestas de la IA no se ejecutan como código ni como SQL.

## GitHub Actions

- Usar el evento `pull_request`, nunca `pull_request_target`.
- `permissions: contents: read` por defecto. Los secretos solo en workflows de
  `main`, nunca en los de PR.
