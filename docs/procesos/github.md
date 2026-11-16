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

| Archivo | Cuándo | Qué hace hoy | Se completa en |
|---|---|---|---|
| `backend.yml` | PR y push a `main` | `npm ci` si cambió `backend/` | B14 |
| `frontend.yml` | PR y push a `main` | `npm ci` si cambió `frontend/` | F13 |
| `seguridad.yml` | Cada PR y los lunes | `npm audit` (altas y críticas) | — |

Los checks `backend` y `frontend` corren siempre y saltan los pasos con
`dorny/paths-filter`; si se filtraran por carpeta en el `on:`, GitHub los
dejaría "pendientes" y bloquearía la fusión.
