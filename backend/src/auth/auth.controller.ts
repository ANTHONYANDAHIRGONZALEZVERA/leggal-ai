import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
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
import { AuthService } from './auth.service';
import {
  type DatosLogin,
  type DatosRefresco,
  type DatosRegistro,
  esquemaLogin,
  esquemaRefresco,
  esquemaRegistro,
  esquemaRespuestaSesion,
  type RespuestaSesion,
} from './esquemas';

const SESION = esquemaOpenApi(esquemaRespuestaSesion, 'salida');
const error = (status: number, description: string) =>
  ApiResponse({ status, description, schema: ESQUEMA_ERROR });

// Rutas públicas de la semana 1 (contrato: docs/api/auth.md). /me y /logout
// llegan con B11, junto con el guard que valida el token de acceso.
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
}
