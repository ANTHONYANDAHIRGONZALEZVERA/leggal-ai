# Leggal AI — reglas del proyecto

Monorepo: frontend/ (Expo + React + TypeScript) y backend/ (NestJS + Prisma + PostgreSQL).

## Reglas obligatorias
- Multiempresa: toda tabla lleva tenant_id. El tenant_id sale del JWT, nunca del cuerpo de la petición.
- Cada endpoint nuevo trae una prueba e2e que confirme que otra empresa no ve sus datos.
- Comentarios en español, claros: explican el por qué, no repiten el qué.
- Código limpio: antes de crear un componente o función, buscar si ya existe uno reutilizable. Evitar código repetido.
- Documentar las pruebas en docs/pruebas/.
- Commits obligatoriamente en español siguiendo las reglas de CONTRIBUTING.md.
- Formato: tipo(alcance): descripción en español.
- Utilizar verbos en infinitivo, minúsculas y sin punto final.
- Mantener los tipos de Conventional Commits: feat, fix, docs, style, refactor, test, chore, perf, build y ci.
- Nunca subir secretos al repositorio.

## Dependencias y entorno (obligatorio)
- Toda dependencia o herramienta nueva se registra en docs/procesos/dependencias.md
  (fecha, paquete, versión exacta, dónde, para qué, quién) en el mismo PR.
- Las herramientas globales, plugins y servicios van en docs/procesos/entorno.md.
- Versiones exactas siempre; no usar ^ ni ~. Subir siempre el package-lock.json.
- Node 26.13.0 y npm 11.20.0: no actualizar sin acordarlo con el equipo.
- Imágenes de Docker con etiqueta fija, nunca latest.
- Antes de instalar algo, revisar si ya existe una dependencia que cubra la necesidad.
- Si cambia una variable de entorno, actualizar .env.example.