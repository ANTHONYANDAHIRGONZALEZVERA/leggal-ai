import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Contexto,
  type ContextoPeticion,
} from '../comun/peticion/contexto-peticion';
import { ESQUEMA_ERROR, esquemaOpenApi } from '../comun/validacion/openapi';
import { ValidacionZodPipe } from '../comun/validacion/validacion-zod.pipe';
import { ESQUEMA_JWT } from '../swagger';
import { AuthService } from './auth.service';
import {
  type DatosLogin,
  type DatosRefresco,
  type DatosRegistro,
  esquemaLogin,
  esquemaRefresco,
  esquemaRegistro,
  esquemaRespuestaSesion,
  esquemaRespuestaYo,
  type RespuestaSesion,
  type RespuestaYo,
} from './esquemas';
import { JwtAuthGuard, PermitirSesionCerrada } from './guardia/jwt-auth.guard';
import { type SesionActual, UsuarioActual } from './guardia/sesion-actual';

const SESION = esquemaOpenApi(esquemaRespuestaSesion, 'salida');
const error = (status: number, description: string) =>
  ApiResponse({ status, description, schema: ESQUEMA_ERROR });

// Rutas de autenticación (contrato: docs/api/auth.md). register, login y
// refresh son públicas; me y logout exigen el token de acceso (JwtAuthGuard).
@ApiTags('Autenticación')
@ApiHeader({
  name: 'X-Dispositivo',
  required: false,
  description: 'android, ios o web. Si falta, se guarda "desconocido".',
})
@ApiHeader({
  name: 'X-Version-App',
  required: false,
  description: 'Versión de la app, por ejemplo 1.0.0.',
})
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear la cuenta y abrir la primera sesión' })
  @ApiBody({ schema: esquemaOpenApi(esquemaRegistro) })
  @ApiResponse({ status: 201, description: 'Cuenta creada', schema: SESION })
  @error(400, 'VALIDACION')
  @error(409, 'CORREO_EN_USO')
  registrar(
    @Body(new ValidacionZodPipe(esquemaRegistro)) datos: DatosRegistro,
    @Contexto() contexto: ContextoPeticion,
  ): Promise<RespuestaSesion> {
    return this.auth.registrar(datos, contexto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con correo y contraseña' })
  @ApiBody({ schema: esquemaOpenApi(esquemaLogin) })
  @ApiResponse({ status: 200, description: 'Sesión abierta', schema: SESION })
  @error(400, 'VALIDACION')
  @error(401, 'CREDENCIALES_INVALIDAS')
  @error(403, 'USUARIO_INACTIVO')
  iniciarSesion(
    @Body(new ValidacionZodPipe(esquemaLogin)) datos: DatosLogin,
    @Contexto() contexto: ContextoPeticion,
  ): Promise<RespuestaSesion> {
    return this.auth.iniciarSesion(datos, contexto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar los tokens (el refresh anterior deja de servir)',
  })
  @ApiBody({ schema: esquemaOpenApi(esquemaRefresco) })
  @ApiResponse({ status: 200, description: 'Par nuevo', schema: SESION })
  @error(400, 'VALIDACION')
  @error(401, 'REFRESCO_INVALIDO o SESION_REVOCADA')
  renovar(
    @Body(new ValidacionZodPipe(esquemaRefresco)) datos: DatosRefresco,
    @Contexto() contexto: ContextoPeticion,
  ): Promise<RespuestaSesion> {
    return this.auth.renovar(datos, contexto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth(ESQUEMA_JWT)
  @ApiOperation({ summary: 'Datos de la persona y sus empresas' })
  @ApiResponse({
    status: 200,
    description: 'Sesión vigente',
    schema: esquemaOpenApi(esquemaRespuestaYo, 'salida'),
  })
  @error(
    401,
    'NO_AUTENTICADO, TOKEN_INVALIDO, TOKEN_EXPIRADO o SESION_REVOCADA',
  )
  @error(403, 'USUARIO_INACTIVO')
  obtenerYo(@UsuarioActual() sesion: SesionActual): Promise<RespuestaYo> {
    return this.auth.obtenerYo(sesion);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @PermitirSesionCerrada()
  @ApiBearerAuth(ESQUEMA_JWT)
  @ApiOperation({
    summary: 'Cerrar esta sesión (las demás siguen abiertas). Idempotente.',
  })
  @ApiResponse({ status: 204, description: 'Sesión cerrada' })
  @error(401, 'NO_AUTENTICADO, TOKEN_INVALIDO o TOKEN_EXPIRADO')
  async cerrarSesion(@UsuarioActual() sesion: SesionActual): Promise<void> {
    await this.auth.cerrarSesion(sesion);
  }
}
