# Leggal AI — backend

API de Leggal AI con NestJS, Prisma y PostgreSQL (pgvector), más Redis para colas.
Las reglas del backend están en [CLAUDE.md](CLAUDE.md) y las del proyecto en
[../CLAUDE.md](../CLAUDE.md).

## Requisitos

Node 26.13.0, npm 11.20.0 y Docker Desktop. Las versiones exactas de todo el
equipo están en [docs/procesos/entorno.md](../docs/procesos/entorno.md).

## Arranque desde cero

```bash
npm ci
cp .env.example .env          # completar los valores
docker compose up -d          # PostgreSQL y Redis, esperar a que estén "healthy"
npx prisma generate
npx prisma migrate dev        # crea las tablas
npm run db:seed               # módulos y roles base (se puede repetir)
npm run start:dev
```

`docker compose ps` muestra el estado de salud de cada servicio.

## Comandos

| Comando | Para qué |
|---|---|
| `npm run start:dev` | API con recarga automática |
| `npm run build` | Compilar a `dist/` |
| `npm run db:seed` | Cargar los 8 módulos y los 5 roles base en cada empresa (idempotente) |
| `npm run lint` | Revisar el código con oxlint |
| `npm run format` | Formatear con Prettier |
| `npm test` | Pruebas unitarias (Jest) |
| `npm run test:e2e` | Pruebas e2e (Jest + Supertest) |
| `npm run test:cov` | Cobertura de las pruebas unitarias |

## Dependencias

Cada paquete nuevo va con versión exacta (sin `^` ni `~`) y se registra en
[docs/procesos/dependencias.md](../docs/procesos/dependencias.md) en el mismo PR.
