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

## Paso 2/5: área (F30)
Se guarda en el borrador y se envía al final con el resto (F31, B34). Valores
que manda la app:
- `rol` (obligatorio): `abogado`, `asistente_legal`, `contador`, `gerente`,
  `estudiante` u `otro`.
- `materias` (lista, puede ir vacía, sin repetidas y en este orden):
  `laboral`, `civil`, `penal`, `tributario`, `societario`, `familia`,
  `administrativo`, `constitucional`, `propiedad_intelectual`.
- `matricula` (texto o `null`): solo si el rol es `abogado`; de 3 a 30
  caracteres con letras, números, espacios, puntos, guiones o barras, al
  menos un número, en mayúsculas. El backend debe revisarla igual.

## Paso 3/5: modo de trabajo (F31)
- `modo` (obligatorio): `personal` o `colaborativo`. Se envía al final con el
  resto (B34).
- Con `personal` la app se salta el 4/5. Según el plan (B35), el backend crea
  una empresa de tipo `personal` con un solo miembro (`POST /tenants`), para
  que todo funcione igual con `tenant_id`.
- Con `colaborativo` sigue al 4/5 "Conéctate a tu empresa" (F33): unirse con
  código o crear una empresa.

## Paso 4/5: empresa (F33)
Solo en modo `colaborativo`. Las rutas (B35 y B39) están en
[`empresas-borrador-frontend.md`](empresas-borrador-frontend.md).
- **Unirme con código:** la solicitud se crea en el momento (no al final).
  Desde "Solicitud enviada" la persona puede "Continuar en modo personal": el
  `modo` sigue siendo `colaborativo` y la solicitud queda pendiente.
- **Crear empresa:** se crea en el momento (`POST /tenants`) y la app guarda la
  sesión nueva, cuyo token ya trae la empresa.
- **Al final (F31):** si la persona es `colaborativo` pero no creó empresa ni
  la aprobaron todavía, debe crearse igual su espacio personal (`POST /tenants`
  con `tipo: personal`) para que tenga dónde trabajar mientras espera.

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
