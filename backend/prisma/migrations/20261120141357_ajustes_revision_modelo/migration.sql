-- Ajustes de la revisión de la PR #23.

-- 1) El paso 5/5 del diseño tiene dos interruptores (teléfono y correo).
--    Se renombra la columna en vez de borrarla para no perder lo que ya
--    eligió cada persona, y el correo arranca con ese mismo valor: el
--    interruptor anterior valía para los dos canales.
ALTER TABLE "perfiles" RENAME COLUMN "notificaciones" TO "notificaciones_push";

ALTER TABLE "perfiles" ADD COLUMN "notificaciones_correo" BOOLEAN NOT NULL DEFAULT true;

UPDATE "perfiles" SET "notificaciones_correo" = "notificaciones_push";

-- 2) Índice redundante: auditoria(tenant_id, actor_id, creado_en) ya cubre
--    los eventos sin empresa (tenant_id nulo) de una persona.
DROP INDEX "auditoria_actor_id_creado_en_idx";
