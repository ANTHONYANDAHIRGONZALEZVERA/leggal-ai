# Backend (NestJS)
- Prisma con filtro automático por tenant_id y Row-Level Security.
- Trabajo pesado (documentos, embeddings, voz, recordatorios) siempre en colas BullMQ.
- Guard de permisos en cada endpoint: usuario activo → membresía activa → permiso requerido.
- Pruebas: Jest (unitarias) y Jest + Supertest (e2e).