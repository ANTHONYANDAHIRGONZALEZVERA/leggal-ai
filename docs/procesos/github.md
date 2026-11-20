# Flujo en GitHub (tarea J02)

El repositorio es público y nadie sube directo a `main`: todo entra por PR con
una aprobación del otro y CI en verde. En repositorios públicos los rulesets
funcionan con el plan gratuito y GitHub Actions no descuenta minutos.

## Configuración (una sola vez, la hace el dueño del repositorio)

1. **Colaborador**: Settings → Collaborators → agregar a `CJjoelD` con permiso
   *Write*. CODEOWNERS solo cuenta revisiones de quien tiene permiso de escritura.
2. **Hacerlo público**: Settings → General → Danger Zone → Change visibility →
   Public. Antes, confirmar que no hay `.env`, llaves ni datos reales en el
   historial.
3. **Ruleset de `main`**: Settings → Rules → Rulesets → New ruleset →
   *Import a ruleset* → elegir `.github/rulesets/main.json`. Queda así:
   - Restrict deletions y Block force pushes.
   - Require a pull request: 1 aprobación, Require review from Code Owners y
     Dismiss stale approvals.
   - Require status checks: `backend` y `frontend`, con la rama al día.
   - Require linear history y fusión solo con squash.
   - Bypass list vacía: ni el dueño se salta las reglas.
4. **Fusión**: Settings → General → Pull Requests → dejar solo *Allow squash
   merging* (título de la PR como mensaje) y activar *Automatically delete head
   branches*.
5. **Code security**: activar Dependabot alerts, Dependabot security updates,
   Secret scanning y Push protection.
   - Las actualizaciones de versión (`.github/dependabot.yml`) son **mensuales**,
     **una PR por carpeta** (backend, frontend, GitHub Actions) y **sin versiones
     mayores**. Las versiones mayores, y en el frontend lo amarrado al SDK de
     Expo y TypeScript, se suben a mano con una tarea propia.
6. **Actions**: Settings → Actions → General → Fork pull request workflows from
   outside collaborators → *Require approval for all external contributors*.
   Workflow permissions → *Read repository contents*.

## Día a día

1. `git checkout main && git pull` y crear la rama con el código de la tarea:
   `feat/F07-login`, `feat/B05-auth-register`, `fix/B22-refresh`.
2. Commits pequeños siguiendo CONTRIBUTING.md.
3. Abrir la PR el mismo día, aunque sea como borrador, con la plantilla.
4. Meta: menos de 400 líneas cambiadas por PR.
5. Revisión del otro en menos de 24 horas; contrato de API y migraciones, en el día.
6. Fusionar con squash y borrar la rama.
7. Si `main` se rompe, se arregla con `git revert`, nunca con `push --force`.

## Quién revisa qué (CODEOWNERS)

| Carpeta | Revisa |
|---|---|
| `backend/` | Anthony |
| `frontend/` | Joel |
| `docs/`, `.github/`, los `CLAUDE.md` y la raíz | cualquiera de los dos |

## Workflows

| Archivo | Cuándo | Qué hace |
|---|---|---|
| `ci.yml` | Cada PR y push a `main` | Prueba, revisa tipos y hace el build de las dos carpetas; si todo pasa, fusiona |
| `seguridad.yml` | Cada PR y los lunes | `npm audit` (altas y críticas) |

### `ci.yml` paso a paso
En los jobs `frontend` y `backend` (corren a la vez, en las dos carpetas siempre):

| Paso | frontend | backend |
|---|---|---|
| 1. Clonar el repositorio | `actions/checkout` | `actions/checkout` |
| 2. Dependencias con el lockfile congelado | `npm ci` | `npm ci` |
| 3. Pruebas | `npm test -- --ci` | `npm test -- --ci` |
| 4. Tipos | `npm run tipos` (tsc) | `npx tsc --noEmit` |
| 5. Estilo | `npm run lint` | — |
| 6. Build | `npx expo export` (Android y web) | `npm run build` (nest build) |

`npm ci` es el "frozen lockfile" de npm: instala exactamente lo del
`package-lock.json` y falla si no coincide con `package.json`.

Después:
- **Todo pasa** → el job `fusionar si todo pasa` activa la fusión automática
  (squash). GitHub fusiona apenas el otro aprueba; si ya aprobó, en el momento.
- **Algo falla** → no se fusiona: el job `reportar error` quita la fusión
  automática y deja un comentario en la PR con la parte que falló y el enlace
  al error. Al subir el arreglo, todo vuelve a correr.

Reglas del archivo:
- Los jobs se llaman `frontend` y `backend` porque son los checks
  obligatorios del ruleset. Si se renombran, hay que cambiar el ruleset.
- Solo fusiona PRs hacia `main` que no son borrador. Las PRs apiladas (hacia
  otra rama) y las de Dependabot no se fusionan solas.
- La aprobación del otro sigue siendo obligatoria: el workflow no la salta.
