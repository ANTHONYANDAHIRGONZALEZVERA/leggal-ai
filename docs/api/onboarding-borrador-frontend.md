# Onboarding: borrador del frontend

> **Provisional.** Lo escribió el frontend (F30) para avanzar con la API
> simulada mientras llega el contrato oficial del backend (B33 y B34). Cuando
> exista ese contrato en `docs/api/`, manda él: se ajustan
> `frontend/src/features/onboarding/api.ts` y `frontend/src/services/api/mock.ts`,
> y se borra este archivo.
>
> La autenticación ya sigue el contrato oficial: [`auth.md`](auth.md) (B03).

El plan nombra estas rutas `GET /users/username-available` y
`GET /users/username-suggestions` (B33). Los nombres de abajo son los que usa
hoy la API simulada; se cambian cuando B33 los deje escritos.

Son rutas privadas: llevan `Authorization: Bearer <tokenAcceso>`, y los errores
siguen el formato estándar de [`auth.md`](auth.md#formato-de-error-estándar).

## `GET /usuarios/disponible?usuario=<texto>` (F30)
Revisa si un @usuario está libre. La app solo consulta textos con formato
válido (3 a 30 caracteres; letras minúsculas, números, punto y guion bajo;
empieza con letra) y espera 400 ms después de la última tecla.
- **200** → `{ "usuario": "andrea.ruiz", "disponible": false }`
- La app vuelve a consultar al tocar Continuar.

## `GET /usuarios/sugerencias?nombre=<nombre visible>` (F30)
Mientras la persona escribe su nombre visible (desde 2 letras, 400 ms después
de la última tecla), la app pide @usuarios armados con ese nombre.
- **200** → `{ "sugerencias": ["aruiz.legal", "andrearuiz", "ruiz.andrea"] }`
  - Hasta 3, **libres**, **sin repetidos** y que cumplan las reglas del @usuario.
- El envío definitivo del onboarding (con el @usuario) es al final del paso 5/5
  (F31, `PATCH /users/me/onboarding` de B34).
