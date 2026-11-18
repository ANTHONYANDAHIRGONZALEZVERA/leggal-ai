# Entorno de desarrollo

> Regla: si instalas una herramienta, plugin o dependencia, actualiza este archivo
> y docs/procesos/dependencias.md en el mismo PR.

## Herramientas del equipo (Windows)
| Herramienta | Versión | Para qué |
|---|---|---|
| Windows | 10.0.26300.9711 | Sistema operativo |
| Node.js | 26.13.0 (LTS) | NestJS y Expo |
| npm | 11.20.0 | Paquetes (no actualizar a la 12 sin acordarlo) |
| Git | 2.56.0.windows.4 | Control de versiones |
| WSL | 3.0.3.0 (kernel 6.18.54.1-1) | Requisito de Docker en Windows |
| Docker Desktop | 4.98.0 (Docker 29.9.2) | PostgreSQL y Redis locales |
| Claude Code | 2.1.319 | Desarrollo con IA en la terminal |
| EAS CLI | 27.5.0 | Compilar y subir la app a Google Play |
| VS Code | 1.145.2 (x64) | Editor |
| Expo Go (teléfono) | (versión de la tienda) | Ver la app en el teléfono mientras se desarrolla |
| scrcpy | 3.3.4 (win64) | Ver y controlar el celular Android en la PC por USB (trae adb) |
| GitHub CLI | (pendiente, opcional) | Abrir PRs desde la terminal |
| Python | 3.15.2 | security-guidance (día 1) y Graphify (día 10) |

## Ver el celular en la PC (scrcpy)
Sirve para revisar la app de Expo Go en una ventana de la PC, sacar capturas y
dejar que Claude Code las tome con adb para comprobar cambios en Android.

1. Descargar `scrcpy-win64-v3.3.4.zip` desde https://github.com/Genymobile/scrcpy/releases
   y descomprimirlo (por ejemplo en Descargas). No necesita instalación.
2. En el celular: Ajustes → Acerca del teléfono → tocar 7 veces "Número de
   compilación" para activar las Opciones de desarrollador. Después, en
   Opciones de desarrollador, activar **Depuración USB**.
3. Conectar el celular por USB y aceptar el aviso "¿Permitir depuración USB?".
4. Abrir `scrcpy.exe` (doble clic). La pantalla del celular aparece en la PC.
5. Con `npx expo start` corriendo, abrir la app en Expo Go como siempre.

Captura desde Git Bash, dentro de la carpeta de scrcpy:
`./adb.exe exec-out screencap -p > captura.png`

## Extensiones de VS Code recomendadas
ESLint, Prettier, Prisma, Docker y Expo Tools.

## Plugins de Claude Code
| Plugin | Cómo instalarlo | Para qué |
|---|---|---|
| expo@anthropic-plugin-directory | `claude plugin install expo@anthropic-plugin-directory` | Skills oficiales de Expo y EAS |
| security-guidance@anthropic-plugin-directory (2.0.17) | `claude plugin install security-guidance@anthropic-plugin-directory` | Avisa si Claude escribe código con patrones peligrosos y revisa cada cambio con IA. Requiere Python 3.8+ en el PATH. Las reglas del proyecto están en `.claude/claude-security-guidance.md` |

Notas de security-guidance:
- Cada revisión consume uso de la cuenta de Claude (por defecto usa el modelo más
  reciente de Opus). Si gasta demasiado, definir la variable
  `SECURITY_REVIEW_MODEL=claude-sonnet-5-5`.
- Reglas personales que no se suben: `.claude/claude-security-guidance.local.md`.
- Su registro está en `~/.claude/security/log.txt`.
- Si Claude y la persona no coinciden en un aviso, decide la persona.

## Cuentas necesarias (una por persona, nunca se suben al repositorio)
- GitHub, con acceso al repositorio.
- Expo (expo.dev), para EAS.
- Claude, para iniciar sesión en Claude Code.
- Google Play Console (pendiente de decidir si es personal o de organización).

## Problemas conocidos en Windows
- Si npm da "ejecución de scripts deshabilitada" en PowerShell:
  `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- Si WSL da `REGDB_E_CLASSNOTREG`, activar las funciones con dism
  (Microsoft-Windows-Subsystem-Linux y VirtualMachinePlatform) y reiniciar.
- Si `claude plugin install expo@claude-plugins-official` dice "not found":
  en nuestra versión el catálogo se llama `anthropic-plugin-directory`.
  Usar `claude plugin install expo@anthropic-plugin-directory`.
- Si npm avisa de "install-scripts not yet covered by allowScripts" y el programa
  no arranca, instalar con `--allow-scripts=<nombre-del-paquete>`.
- Cada persona usa su propia cuenta de Expo y su propia sesión de Claude Code;
  nunca se suben al repositorio.

## Servicios en Docker
| Servicio | Imagen y versión | Puerto |
|---|---|---|
| PostgreSQL + pgvector | pgvector/pgvector:0.8.7-pg16-bookworm | 5432 |
| Redis | redis:7.4.12-bookworm | 6379 |

Los dos tienen healthcheck (`pg_isready` y `redis-cli ping`). Con
`docker compose ps` se ve si están `healthy` antes de migrar o arrancar la API.

## Cómo dejarlo andando (compañero nuevo)
1. Instalar las herramientas de la tabla con esas versiones.
2. `git clone` del repositorio.
3. Instalar el plugin de Claude Code (ver sección Plugins).
4. `eas login` con tu propia cuenta de Expo y comprobar con `eas whoami`.
5. Instalar Expo Go en el teléfono.
6. En backend/ y frontend/: `npm ci`.
7. Copiar `.env.example` a `.env` y completar los valores. En `frontend/` es
   opcional y se llama `.env.local`: sin él la app usa la API simulada
   (cuenta de prueba `demo@leggal.ai` / `Leggal2026!`).
8. En backend/: `docker compose up -d` y esperar a que `docker compose ps`
   muestre los dos servicios como `healthy`.
9. En backend/: `npx prisma generate` y luego `npm run start:dev`.
   Prisma necesita el `.env` del paso 7: sin `DATABASE_URL` falla con
   `Cannot resolve environment variable: DATABASE_URL`.