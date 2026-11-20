-- Ajustes de la revisión de la PR #23.

-- 1) El paso 5/5 del diseño tiene dos interruptores de tipos de aviso:
-- "Plazos y audiencias" (encendido) y "Resumen diario" (apagado).
-- Se renombra la columna en vez de borrarla para no perder lo que ya
-- eligió cada persona: el interruptor anterior era el de los avisos.
ALTER TABLE "perfiles" RENAME COLUMN "notificaciones" TO "notificar_plazos";
ALTER TABLE "perfiles" ADD COLUMN "resumen_diario" BOOLEAN NOT NULL DEFAULT false;

-- 2) Índice redundante: auditoria(tenant_id, actor_id, creado_en) ya cubre
--    los eventos sin empresa (tenant_id nulo) de una persona.
DROP INDEX "auditoria_actor_id_creado_en_idx";
