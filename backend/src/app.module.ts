import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FiltroErrores } from './comun/errores/filtro-errores';
import { ConfiguracionModule } from './config/configuracion.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  // ConfiguracionModule va primero: valida el entorno antes que todo lo demás.
  imports: [ConfiguracionModule, PrismaModule, AuthModule],
  controllers: [AppController],
  providers: [
    AppService,
    // Registrado aquí (y no en main.ts) para que también aplique en las
    // pruebas e2e, que crean la app sin pasar por main.ts.
    { provide: APP_FILTER, useClass: FiltroErrores },
  ],
})
export class AppModule {}
