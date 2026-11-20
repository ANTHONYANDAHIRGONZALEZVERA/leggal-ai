-- CreateEnum
CREATE TYPE "tipo_empresa" AS ENUM ('empresa', 'personal');

-- CreateEnum
CREATE TYPE "estado_usuario" AS ENUM ('activo', 'suspendido', 'eliminado');

-- CreateEnum
CREATE TYPE "rol_profesional" AS ENUM ('abogado', 'asistente_legal', 'contador', 'gerente', 'estudiante', 'otro');

-- CreateEnum
CREATE TYPE "modo_trabajo" AS ENUM ('personal', 'colaborativo');

-- CreateEnum
CREATE TYPE "canal_preferido" AS ENUM ('texto', 'voz', 'ambos');

-- CreateEnum
CREATE TYPE "documento_legal" AS ENUM ('terminos', 'privacidad');

-- CreateEnum
CREATE TYPE "proveedor_externo" AS ENUM ('google', 'facebook');

-- CreateEnum
CREATE TYPE "tipo_codigo" AS ENUM ('verificar_correo', 'recuperar_contrasena');

-- CreateEnum
CREATE TYPE "dispositivo" AS ENUM ('android', 'ios', 'web', 'desconocido');

-- CreateEnum
CREATE TYPE "nivel_permiso" AS ENUM ('ninguno', 'ver', 'editar');

-- CreateEnum
CREATE TYPE "estado_membresia" AS ENUM ('en_espera', 'activa', 'rechazada', 'suspendida');

-- CreateEnum
CREATE TYPE "origen_membresia" AS ENUM ('creador', 'codigo', 'dominio');

-- CreateTable
CREATE TABLE "empresas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" VARCHAR(160) NOT NULL,
    "ruc" VARCHAR(13),
    "tipo" "tipo_empresa" NOT NULL DEFAULT 'empresa',
    "plan" VARCHAR(40) NOT NULL DEFAULT 'beta',
    "ia_habilitada" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "correo" VARCHAR(254) NOT NULL,
    "hash_contrasena" TEXT,
    "nombre" VARCHAR(80) NOT NULL,
    "nombre_visible" VARCHAR(80),
    "nombre_usuario" VARCHAR(30),
    "correo_verificado_en" TIMESTAMPTZ(3),
    "onboarding_completo_en" TIMESTAMPTZ(3),
    "estado" "estado_usuario" NOT NULL DEFAULT 'activo',
    "ultima_empresa_id" UUID,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles" (
    "usuario_id" UUID NOT NULL,
    "rol_profesional" "rol_profesional",
    "materias" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "matricula" VARCHAR(40),
    "modo_trabajo" "modo_trabajo",
    "usos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "canal_preferido" "canal_preferido",
    "notificaciones" BOOLEAN NOT NULL DEFAULT true,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "perfiles_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "aceptaciones_legales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "documento" "documento_legal" NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "ip" INET,
    "aceptado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aceptaciones_legales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identidades_externas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "proveedor" "proveedor_externo" NOT NULL,
    "id_proveedor" VARCHAR(255) NOT NULL,
    "correo" VARCHAR(254),
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identidades_externas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "familia_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "hash_refresco" TEXT NOT NULL,
    "empresa_activa_id" UUID,
    "dispositivo" "dispositivo" NOT NULL DEFAULT 'desconocido',
    "ip" INET,
    "vence_en" TIMESTAMPTZ(3) NOT NULL,
    "usado_en" TIMESTAMPTZ(3),
    "revocado_en" TIMESTAMPTZ(3),
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigos_verificacion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "tipo" "tipo_codigo" NOT NULL,
    "hash_codigo" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "vence_en" TIMESTAMPTZ(3) NOT NULL,
    "usado_en" TIMESTAMPTZ(3),
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigos_verificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modulos" (
    "clave" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "orden" SMALLINT NOT NULL,

    CONSTRAINT "modulos_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "clave" VARCHAR(40),
    "es_sistema" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol_permisos" (
    "tenant_id" UUID NOT NULL,
    "rol_id" UUID NOT NULL,
    "modulo_clave" VARCHAR(40) NOT NULL,
    "nivel" "nivel_permiso" NOT NULL DEFAULT 'ninguno',

    CONSTRAINT "rol_permisos_pkey" PRIMARY KEY ("tenant_id","rol_id","modulo_clave")
);

-- CreateTable
CREATE TABLE "membresias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "rol_id" UUID NOT NULL,
    "estado" "estado_membresia" NOT NULL DEFAULT 'en_espera',
    "origen" "origen_membresia" NOT NULL,
    "invitacion_id" UUID,
    "aprobado_por_id" UUID,
    "aprobado_en" TIMESTAMPTZ(3),
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "membresias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitaciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "hash_codigo" TEXT NOT NULL,
    "rol_id" UUID NOT NULL,
    "requiere_aprobacion" BOOLEAN NOT NULL DEFAULT true,
    "usos_maximos" INTEGER,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "vence_en" TIMESTAMPTZ(3),
    "revocado_en" TIMESTAMPTZ(3),
    "creado_por_id" UUID,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "actor_id" UUID,
    "accion" VARCHAR(60) NOT NULL,
    "entidad" VARCHAR(60),
    "entidad_id" UUID,
    "detalle" JSONB,
    "dispositivo" "dispositivo" NOT NULL DEFAULT 'desconocido',
    "ip" INET,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_ruc_key" ON "empresas"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_nombre_usuario_key" ON "usuarios"("nombre_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "aceptaciones_legales_usuario_id_documento_version_key" ON "aceptaciones_legales"("usuario_id", "documento", "version");

-- CreateIndex
CREATE INDEX "identidades_externas_usuario_id_idx" ON "identidades_externas"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "identidades_externas_proveedor_id_proveedor_key" ON "identidades_externas"("proveedor", "id_proveedor");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_hash_refresco_key" ON "sesiones"("hash_refresco");

-- CreateIndex
CREATE INDEX "sesiones_familia_id_idx" ON "sesiones"("familia_id");

-- CreateIndex
CREATE INDEX "sesiones_usuario_id_revocado_en_idx" ON "sesiones"("usuario_id", "revocado_en");

-- CreateIndex
CREATE INDEX "codigos_verificacion_usuario_id_tipo_creado_en_idx" ON "codigos_verificacion"("usuario_id", "tipo", "creado_en" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_id_key" ON "roles"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_nombre_key" ON "roles"("tenant_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_clave_key" ON "roles"("tenant_id", "clave");

-- CreateIndex
CREATE INDEX "membresias_tenant_id_estado_creado_en_idx" ON "membresias"("tenant_id", "estado", "creado_en");

-- CreateIndex
CREATE INDEX "membresias_tenant_id_rol_id_idx" ON "membresias"("tenant_id", "rol_id");

-- CreateIndex
CREATE INDEX "membresias_usuario_id_idx" ON "membresias"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "membresias_tenant_id_usuario_id_key" ON "membresias"("tenant_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitaciones_hash_codigo_key" ON "invitaciones"("hash_codigo");

-- CreateIndex
CREATE INDEX "invitaciones_tenant_id_creado_en_idx" ON "invitaciones"("tenant_id", "creado_en" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "invitaciones_tenant_id_id_key" ON "invitaciones"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "auditoria_tenant_id_creado_en_id_idx" ON "auditoria"("tenant_id", "creado_en" DESC, "id");

-- CreateIndex
CREATE INDEX "auditoria_tenant_id_actor_id_creado_en_idx" ON "auditoria"("tenant_id", "actor_id", "creado_en" DESC);

-- CreateIndex
CREATE INDEX "auditoria_actor_id_creado_en_idx" ON "auditoria"("actor_id", "creado_en" DESC);

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_ultima_empresa_id_fkey" FOREIGN KEY ("ultima_empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles" ADD CONSTRAINT "perfiles_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aceptaciones_legales" ADD CONSTRAINT "aceptaciones_legales_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identidades_externas" ADD CONSTRAINT "identidades_externas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_empresa_activa_id_fkey" FOREIGN KEY ("empresa_activa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_verificacion" ADD CONSTRAINT "codigos_verificacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permisos" ADD CONSTRAINT "rol_permisos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permisos" ADD CONSTRAINT "rol_permisos_tenant_id_rol_id_fkey" FOREIGN KEY ("tenant_id", "rol_id") REFERENCES "roles"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permisos" ADD CONSTRAINT "rol_permisos_modulo_clave_fkey" FOREIGN KEY ("modulo_clave") REFERENCES "modulos"("clave") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_tenant_id_rol_id_fkey" FOREIGN KEY ("tenant_id", "rol_id") REFERENCES "roles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_tenant_id_invitacion_id_fkey" FOREIGN KEY ("tenant_id", "invitacion_id") REFERENCES "invitaciones"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_aprobado_por_id_fkey" FOREIGN KEY ("aprobado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_tenant_id_rol_id_fkey" FOREIGN KEY ("tenant_id", "rol_id") REFERENCES "roles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
