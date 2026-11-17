// Prisma 7 ya no lee el .env por su cuenta: dotenv lo carga aquí para que
// los comandos de la CLI (migrate, generate, studio) encuentren DATABASE_URL.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // env() falla con un mensaje claro si falta la variable, en lugar de
    // intentar conectarse con una URL vacía.
    url: env('DATABASE_URL'),
  },
});
