# Leggal AI — reglas del proyecto

Monorepo: frontend/ (Expo + React + TypeScript) y backend/ (NestJS + Prisma + PostgreSQL).

## Reglas obligatorias
- Multiempresa: toda tabla lleva tenant_id. El tenant_id sale del JWT, nunca del cuerpo de la petición.
- Cada endpoint nuevo trae una prueba e2e que confirme que otra empresa no ve sus datos.
- Comentarios en español, claros: explican el por qué, no repiten el qué.
- Código limpio: antes de crear un componente o función, buscar si ya existe uno reutilizable. Evitar código repetido.
- Documentar las pruebas en docs/pruebas/.
- Commits en formato Conventional Commits (feat:, fix:, test:, docs:).
- Nunca subir secretos al repositorio.