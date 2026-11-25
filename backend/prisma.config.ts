// Prisma 7 ya no lee el .env por su cuenta: dotenv lo carga aquí para que
// los comandos de la CLI (migrate, generate, studio) encuentren DATABASE_URL.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Roles y permisos base (B08). Prisma 7 lee el comando de aquí y no de
    // package.json. ts-node usa prisma/tsconfig.json, que le permite resolver
    // los imports './x.js' del cliente generado (son archivos .ts).
    seed: 'ts-node -P prisma/tsconfig.json prisma/seed.ts',
  },
  datasource: {
    // env() falla con un mensaje claro si falta la variable, en lugar de
    // intentar conectarse con una URL vacía.
    url: env('DATABASE_URL'),
  },
});
