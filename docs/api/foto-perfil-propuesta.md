# Foto de perfil: propuesta del frontend

> **Propuesta, no contrato.** La escribió el frontend al agregar la foto en el
> onboarding 1/5. El plan de las semanas 1 y 2 no la incluye (el avatar es con
> iniciales y la subida de imágenes a R2 queda para después). Cuando el backend
> la implemente, su contrato en `docs/api/` manda y este archivo se borra.

## Qué hace hoy la app
- La persona elige una foto de la galería o la toma con la cámara.
- La app solo acepta JPG, PNG, WEBP o HEIC, de hasta 15 MB y con al menos
  200 × 200 px.
- La recorta en cuadrado y la vuelve a codificar como **JPEG de 512 × 512**
  (calidad 0,8). Al re-codificar solo se copian los píxeles: **se pierden el GPS
  y el resto del EXIF**, y un archivo que no es imagen falla al decodificarse.
- La foto queda **solo en el teléfono** (borrador del onboarding). No se envía
  a ningún lado todavía.

## Lo que el servidor debe hacer igual
Revisar en la app no basta: cualquiera puede llamar a la API sin pasar por ella.
1. **No confiar en el `Content-Type` ni en el nombre del archivo.** Leer los
   primeros bytes (firma) y aceptar solo JPEG, PNG o WEBP.
2. **Límite de tamaño antes de leer todo** (por ejemplo 2 MB, que sobra para un
   JPEG de 512 × 512) y rechazar con 413.
3. **Volver a codificar en el servidor** (por ejemplo con `sharp`): a JPEG o
   WEBP, máximo 512 × 512, quitando todos los metadatos. Así no se guarda nada
   que no sean píxeles (ni GPS ni contenido escondido).
4. **Nombre aleatorio** (UUID) en el almacenamiento; nunca el nombre que manda
   el cliente. Ruta por usuario, por ejemplo `avatares/<usuarioId>/<uuid>.jpg`.
5. Servirla con `Content-Type` fijo puesto por el servidor y
   `X-Content-Type-Options: nosniff`.
6. Límite de intentos por usuario (por ejemplo 10 por hora → 429
   `DEMASIADOS_INTENTOS`).
7. Al reemplazar o quitar la foto, borrar el archivo anterior.

## Rutas propuestas
Privadas (`Authorization: Bearer <tokenAcceso>`), con el formato de error de
[`auth.md`](auth.md#formato-de-error-estándar).

### `PUT /users/me/avatar`
- Cuerpo `multipart/form-data` con un solo campo `foto`.
- **200** → `{ "fotoUrl": "https://…/avatares/usr-1/9f2c….jpg" }`
- **400** `VALIDACION` (`campos.foto`): no es JPEG, PNG ni WEBP, o no se pudo
  decodificar.
- **413** `ARCHIVO_MUY_GRANDE`.
- **429** `DEMASIADOS_INTENTOS`.

### `DELETE /users/me/avatar`
- **204**, idempotente: vuelve a las iniciales.

### En el objeto `usuario`
Sumar `fotoUrl: string | null` a lo que devuelven login, registro, refresh y
`/auth/me`, para que la app muestre la foto al abrir.

## Cuándo se sube
Al final del onboarding (paso 5/5, F31), junto con el resto de las respuestas,
o apenas exista el endpoint si se prefiere subirla en el momento.
