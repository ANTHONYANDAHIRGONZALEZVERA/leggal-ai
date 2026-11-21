import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global: una sola instancia (y un solo grupo de conexiones) para toda la API.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
