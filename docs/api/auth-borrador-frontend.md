# Autenticación: borrador del frontend

> **Provisional.** Lo escribió el frontend (F09/F11) para avanzar con la API
> simulada mientras llega el contrato oficial de Joel (B03, `docs/api/auth.md`).
> Cuando exista ese contrato, manda él: se ajustan `frontend/src/features/auth/api.ts`
> y `frontend/src/services/api/mock.ts`, y se borra este archivo.

## Cabeceras que envía la app
| Cabecera | Cuándo | Ejemplo |
|---|---|---|
| `Authorization` | Rutas privadas | `Bearer <token de acceso>` |
| `X-Dispositivo` | Siempre | `android/1.0.0` (plataforma/versión de la app) |
| `Content-Type` | Si hay cuerpo | `application/json` |

## Formato de error (todas las rutas)
```json
{ "codigo": "CORREO_EN_USO", "mensaje": "Texto para personas", "campos": { "correo": "Ya existe una cuenta con este correo" } }
```
- `codigo`: lo que usa la app para decidir qué mostrar. Códigos que ya entiende:
  `CREDENCIALES_INVALIDAS`, `CORREO_EN_USO`, `SESION_EXPIRADA`, `DATOS_INVALIDOS`.
- `campos` (opcional): errores por campo del formulario. La app los muestra
  debajo del campo correspondiente.
- Un 500 sin cuerpo se muestra como "El servidor tuvo un problema".

## Rutas
### `POST /auth/login` (pública)
Cuerpo: `{ "correo": "ana@empresa.com", "contrasena": "..." }` (el correo llega ya en minúsculas y sin espacios).
- **200** → `{ "usuario": { "id", "nombre", "correo" }, "tokens": { "acceso", "renovacion" } }`
- **401** `CREDENCIALES_INVALIDAS`: mismo error si el correo no existe o la contraseña falla.

### `POST /auth/registro` (pública)
Cuerpo: `{ "nombre", "correo", "contrasena", "aceptaTerminos": true }`.
La contraseña tiene entre 8 y 72 caracteres (72 es el límite de bcrypt).
- **201** → igual que el login (la persona queda con sesión iniciada).
- **409** `CORREO_EN_USO` con `campos.correo`.

### `POST /auth/renovar` (pública)
Cuerpo: `{ "renovacion": "<token de renovación>" }`.
- **200** → `{ "acceso", "renovacion" }`. El token de renovación usado deja de
  servir (rotación).
- **401** `SESION_EXPIRADA`: la app cierra la sesión.

## Cómo reacciona la app
- Cualquier ruta privada que responda **401**: la app llama una vez a
  `/auth/renovar`, guarda los tokens nuevos y repite la petición. Si la
  renovación falla, cierra la sesión.
- Sin respuesta en 15 s: "El servidor tardó demasiado".
