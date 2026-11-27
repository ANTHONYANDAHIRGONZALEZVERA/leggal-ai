# Códigos por correo: borrador del frontend (B27, B28, B29)

> **Propuesta, no contrato.** La escribió el frontend (F23 y F24) para avanzar
> con la API simulada (`frontend/src/services/api/mock-codigos.ts`) mientras
> llega el contrato de Joel. Cuando B27 y B28 existan, su contrato en
> [`auth.md`](auth.md) manda: se ajusta la app y se borra este archivo.

Formato de error: el de [`auth.md`](auth.md#formato-de-error-estándar).

## Reglas comunes (del plan)
- Código de **6 dígitos**, guardado como **hash**, que **vence en 10 minutos**.
- **Máximo 5 intentos** por código; después hay que pedir otro.
- **Reenvío como mínimo cada 45 segundos** (el contador "Reenviar código en
  0:45" de la app).
- Plantillas de correo en español para los dos códigos (B29). El correo **no**
  debe llevar enlaces que inicien sesión: solo el código.

## Verificar el correo (B27, "Revisa tu correo")
Después de registrarse, la app muestra "Revisa tu correo" mientras
`usuario.correoVerificado` sea `false`, **antes** del onboarding. Quien ya
terminó el onboarding no se bloquea.

> ⚠️ Cuando la app apunte al servidor real (F17), B27 tiene que estar
> funcionando: sin él, una cuenta nueva se quedaría en "Revisa tu correo".

### `POST /auth/register` (cambio)
Además de lo que ya hace, **envía el primer código** al correo.

### `POST /auth/verify-email` (privada)
Cuerpo: `{ "codigo": "123456" }`
- **200** → `{ "usuario": UsuarioApi }` con `correoVerificado: true`.
  Idempotente: si ya estaba verificado, responde 200 igual.
- **400** `CODIGO_INCORRECTO` con `campos: { codigo }` (cuenta un intento).
- **410** `CODIGO_EXPIRADO`: venció o no hay código pendiente.
- **429** `DEMASIADOS_INTENTOS`: 5 intentos fallidos con este código.

### `POST /auth/verify-email/resend` (privada)
Sin cuerpo. **204** y envía un código nuevo (el anterior deja de servir).
- **429** `ESPERA_REENVIO`: pasaron menos de 45 s desde el último.
- Si ya está verificado: **204** sin enviar nada.

### `PATCH /auth/email` (privada, "Cambiar correo")
Para corregir un correo mal escrito **antes de verificarlo**.
Cuerpo: `{ "correo": "nuevo@empresa.com" }` (minúsculas y sin espacios).
- **200** → `{ "usuario": UsuarioApi }` con el correo nuevo; envía un código a
  ese correo.
- **400** `VALIDACION` con `campos.correo`.
- **409** `CORREO_EN_USO` con `campos.correo`.
- **409** `CORREO_YA_VERIFICADO`: ya verificado, no se cambia por aquí.

## Recuperar la contraseña (B28, "¿Olvidaste tu contraseña?")
Dos pasos: el correo, y luego el código más la contraseña nueva.

### `POST /auth/password/forgot` (pública)
Cuerpo: `{ "correo": "ana@empresa.com" }`
- **204 siempre**, exista o no la cuenta: así no se revela qué correos tienen
  cuenta. Si existe, envía el código (respetando los 45 s sin avisar).
- **400** `VALIDACION` solo si el correo está mal escrito.
- Límite por IP recomendado (como el login).

### `POST /auth/password/reset` (pública)
Cuerpo: `{ "correo": "...", "codigo": "123456", "contrasena": "..." }`
- **204**: cambia la contraseña y **cierra todas las sesiones** de la cuenta
  (plan B28). La app lleva a "Iniciar sesión".
- **400** `CODIGO_INCORRECTO` (cuenta un intento) o `VALIDACION` con
  `campos.contrasena` (mismas reglas del registro: 8 a 72 caracteres).
- **410** `CODIGO_EXPIRADO`: venció, no se pidió o la cuenta no existe (mismo
  error en los tres casos).
- **429** `DEMASIADOS_INTENTOS`.

## API simulada
- Todos los códigos son **`123456`** para poder probar sin correo.
- Una cuenta creada con "Crear cuenta" empieza sin verificar; las de prueba
  (`demo@leggal.ai` y `nuevo@leggal.ai`) ya están verificadas.

## Para Joel: qué falta en el backend
1. **B27**: las tres rutas de verificación y el envío del código al registrarse.
2. **B28**: `forgot` y `reset`, cerrando las sesiones al cambiar la contraseña.
3. **B29**: las plantillas de correo en español.
4. Confirmar los nombres de rutas y códigos de error; si cambian, avísame y
   adapto la app.
