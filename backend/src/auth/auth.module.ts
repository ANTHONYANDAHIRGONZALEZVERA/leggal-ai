import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { type Entorno, ENTORNO } from '../config/entorno';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guardia/jwt-auth.guard';
import { TokensService } from './tokens.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ENTORNO],
      useFactory: (entorno: Entorno) => ({
        secret: entorno.JWT_SECRETO,
        // Algoritmo fijo al firmar y al verificar: así nadie puede mandar un
        // token con otro algoritmo (por ejemplo "none") y que se acepte.
        signOptions: {
          algorithm: 'HS256',
          expiresIn: entorno.JWT_ACCESO_SEGUNDOS,
        },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokensService, JwtAuthGuard],
  exports: [TokensService, JwtAuthGuard],
})
export class AuthModule {}
