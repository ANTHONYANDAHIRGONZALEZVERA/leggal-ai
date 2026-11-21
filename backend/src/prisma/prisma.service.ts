import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { type Entorno, ENTORNO } from '../config/entorno';
import { PrismaClient } from '../generated/prisma/client';

// Cliente de Prisma compartido por toda la API. Prisma 7 se conecta a
// PostgreSQL a través de un adaptador (pg).
//
// No se conecta al arrancar: Prisma abre la conexión con la primera consulta.
// Así la API levanta aunque la base todavía no esté lista, y es
// /health/ready (B21) quien informa si hay base o no.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ENTORNO) entorno: Entorno) {
    super({
      adapter: new PrismaPg({ connectionString: entorno.DATABASE_URL }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
