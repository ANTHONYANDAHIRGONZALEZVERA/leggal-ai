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
| GitHub CLI | (pendiente, opcional) | Abrir PRs desde la terminal |

## Extensiones de VS Code recomendadas
ESLint, Prettier, Prisma, Docker y Expo Tools.

## Plugins de Claude Code
| Plugin | Cómo instalarlo | Para qué |
|---|---|---|
| expo@anthropic-plugin-directory | `claude plugin install expo@anthropic-plugin-directory` | Skills oficiales de Expo y EAS |

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
| PostgreSQL + pgvector | pgvector/pgvector:pg16 | 5432 |
| Redis | redis:7 | 6379 |

## Cómo dejarlo andando (compañero nuevo)
1. Instalar las herramientas de la tabla con esas versiones.
2. `git clone` del repositorio.
3. Instalar el plugin de Claude Code (ver sección Plugins).
4. `eas login` con tu propia cuenta de Expo y comprobar con `eas whoami`.
5. Instalar Expo Go en el teléfono.
6. En backend/ y frontend/: `npm ci`.
7. Copiar `.env.example` a `.env` y completar los valores.
8. En backend/: `docker compose up -d`.