import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermisosGuard } from './permisos.guard';

/**
 * Los módulos con rutas protegidas por @RequierePermiso() importan este
 * módulo: trae PermisosGuard y, a través de AuthModule, lo que necesita
 * JwtAuthGuard (TokensService).
 */
@Module({
  imports: [AuthModule],
  providers: [PermisosGuard],
  exports: [AuthModule, PermisosGuard],
})
export class PermisosModule {}
