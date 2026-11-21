# Empresas, códigos y solicitudes: borrador del frontend

> **Provisional.** Lo escribió el frontend (F33, onboarding 4/5) para avanzar
> con la API simulada. Sigue las rutas del plan (B35 y B39); los campos son una
> propuesta. Cuando el backend escriba su contrato en `docs/api/`, manda él: se
> ajustan `frontend/src/features/empresas/` y
> `frontend/src/services/api/mock-empresas.ts`, y se borra este archivo.

Todas son rutas privadas (`Authorization: Bearer <tokenAcceso>`) y los errores
siguen el formato de [`auth.md`](auth.md#formato-de-error-estándar).

## Tipos
```ts
EmpresaResumen  = { id, nombre, verificada: boolean }
RolAsignado     = { codigo: "abogado", nombre: "Abogado/a" }
SolicitudAcceso = { id, estado: "en_espera" | "aprobada" | "rechazada" | "cancelada",
                    empresa: EmpresaResumen, rol: RolAsignado,
                    codigo: "ACC-7K2", creadaEn: ISO 8601 }
```

## Códigos de invitación (B39)
El código tiene 6 letras o números y se muestra con guion: `ACC-7K2` (B38). La
app lo envía en mayúsculas y con guion; conviene aceptarlo también sin guion.

**Límite común de 5 intentos por hora por persona** entre vista previa y
canje: el 6.º responde **429** `DEMASIADOS_INTENTOS`. La app no reintenta sola
estas rutas para no gastar intentos.

### `POST /invitations/preview`
Consulta el código **sin canjearlo**. Cuerpo: `{ "codigo": "ACC-7K2" }`.
- **200** → `{ "empresa": EmpresaResumen, "rol": RolAsignado, "requiereAprobacion": true }`
- **404** `CODIGO_INVALIDO`: no existe.
- **410** `CODIGO_VENCIDO`: venció o ya no tiene usos.
- **409** `YA_ES_MIEMBRO`: la persona ya está en esa empresa.

### `POST /invitations/redeem`
Canjea el código. Cuerpo: `{ "codigo": "ACC-7K2" }`.
- **201** → `{ "solicitud": SolicitudAcceso }`
  - Si la empresa requiere aprobación: membresía `en_espera` con origen
    `codigo` y la solicitud en `en_espera` (la app muestra "Solicitud enviada").
  - Si no la requiere: `aprobada` (la app sigue al 5/5).
- **409** `SOLICITUD_EXISTENTE`: ya hay una pendiente para esa empresa.
- Mismos 404, 410 y 429 que la vista previa.

### `GET /join-requests/me`
- **200** → `{ "solicitudes": SolicitudAcceso[] }` de la persona, con su estado
  al día. "Solicitud enviada" lo consulta cada 30 s mientras está pendiente.

### `DELETE /join-requests/me/:id`
Cancela la solicitud. **204** e idempotente (si ya no está pendiente, no
falla). **404** si no es de la persona o no existe. Después se puede volver a
pedir con el mismo código.

## Crear empresa (B35)
### `POST /tenants`
```json
{ "tipo": "empresa", "razonSocial": "Estudio Ruiz", "ruc": "1790012345001", "tamanoEquipo": "1-5" }
```
- `tamanoEquipo`: `1-5`, `6-20`, `21-50` o `50+`.
- `ruc`: 13 dígitos. La app revisa provincia (01–24 o 30), tercer dígito (0–6
  o 9) y que no termine en 000, **sin** el dígito verificador (el SRI asigna RUC
  que no siempre lo cumplen). El backend puede validarlo contra el SRI.
- **201** → respuesta de sesión del contrato **más** la empresa:
  `{ tokenAcceso, tokenRefresco, venceEn, usuario, empresa: EmpresaResumen & { tipo } }`.
  El token nuevo ya trae el `tid` de la empresa; la app lo guarda como sesión.
- **400** `VALIDACION` con `campos` (`razonSocial`, `ruc`, `tamanoEquipo`).
- **409** `RUC_EN_USO` (la app lo muestra debajo del campo RUC).

El modo Personal llama a esta misma ruta con `"tipo": "personal"` (B35), al
final del onboarding.

## Fuera de estas dos semanas (plan)
"Escanear QR", "Enlace de invitación" y la unión automática por dominio
verificado: la app los oculta.

## Códigos de prueba de la API simulada
| Código | Resultado |
|---|---|
| `ACC-7K2` | ACCONS S.A.S., verificada, rol Abogado/a, requiere aprobación |
| `LEX-4P9` | Estudio Lex & Asociados, sin verificar, rol Asistente legal |
| `OLD-2X1` | Vencido (410) |
| RUC `1790012345001` | Ya registrado (409 `RUC_EN_USO`) |
