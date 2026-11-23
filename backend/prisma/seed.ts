// Seed de roles y permisos (B08). Se corre con `npm run db:seed` (o
// `npx prisma db seed`) y se puede repetir las veces que sea:
// 1. Deja el catálogo de los 8 módulos igual al de la app.
// 2. A cada empresa existente le asegura los cinco roles base y su matriz,
//    sin pisar lo que el administrador haya personalizado (ver roles-base.ts).
//
// Las empresas nuevas reciben sus roles al crearse, llamando a la misma
// función dentro de su transacción.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  aplicarRolesBase,
  sincronizarModulos,
} from '../src/permisos/roles-base';

async function principal(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL (revisa el archivo .env)');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    await sincronizarModulos(prisma);
    console.log('Módulos: 8 al día');

    const empresas = await prisma.empresa.findMany({
      select: { id: true, nombre: true },
      orderBy: { creadoEn: 'asc' },
    });
    for (const empresa of empresas) {
      // Una transacción por empresa: si una falla, las demás quedan bien y
      // esa no queda a medias.
      const r = await prisma.$transaction((tx) =>
        aplicarRolesBase(tx, empresa.id),
      );
      console.log(
        `${empresa.nombre}: ${r.rolesCreados} roles y ${r.permisosCreados} permisos creados, ${r.permisosCorregidos} corregidos`,
      );
    }
    console.log(`Listo: ${empresas.length} empresas revisadas`);
  } finally {
    await prisma.$disconnect();
  }
}

principal().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
