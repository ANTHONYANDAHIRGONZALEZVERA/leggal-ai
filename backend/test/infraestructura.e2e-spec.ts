import {
  Body,
  Controller,
  Get,
  HttpStatus,
  INestApplication,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { z } from 'zod';
import { AppModule } from './../src/app.module';
import { ErrorApi } from './../src/comun/errores/error-api';
import {
  Contexto,
  type ContextoPeticion,
} from './../src/comun/peticion/contexto-peticion';
import { ValidacionZodPipe } from './../src/comun/validacion/validacion-zod.pipe';
import { PrismaService } from './../src/prisma/prisma.service';

// Controlador solo para estas pruebas: ejercita el filtro, el pipe y el
// decorador a través de HTTP real, como lo hará el módulo de autenticación.
const esquemaPrueba = z.strictObject({
  correo: z.email('Ingresa un correo válido'),
});

@Controller('prueba')
class ControladorPrueba {
  @Post('validar')
  validar(@Body(new ValidacionZodPipe(esquemaPrueba)) datos: unknown) {
    return datos;
  }

  @Get('error-api')
  errorApi() {
    throw new ErrorApi(
      HttpStatus.CONFLICT,
      'CORREO_EN_USO',
      'Ya existe una cuenta con este correo.',
    );
  }

  @Get('inesperado')
  inesperado() {
    throw new Error('detalle interno con datos sensibles');
  }

  @Get('contexto')
  contexto(@Contexto() contexto: ContextoPeticion) {
    return contexto;
  }
}

describe('Infraestructura común (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ControladorPrueba],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('ErrorApi sale con { codigo, mensaje, campos }', () => {
    return request(app.getHttpServer())
      .get('/prueba/error-api')
      .expect(409)
      .expect({
        codigo: 'CORREO_EN_USO',
        mensaje: 'Ya existe una cuenta con este correo.',
        campos: null,
      });
  });

  it('la validación con Zod responde 400 VALIDACION con los campos', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/prueba/validar')
      .send({ correo: 'no-es-correo', tenantId: 'otra-empresa' })
      .expect(400);
    expect(respuesta.body).toEqual({
      codigo: 'VALIDACION',
      mensaje: 'Revisa los datos marcados.',
      campos: {
        correo: 'Ingresa un correo válido',
        tenantId: 'Este campo no está permitido',
      },
    });
  });

  it('un JSON mal formado responde 400 VALIDACION', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/prueba/validar')
      .set('Content-Type', 'application/json')
      .send('{"correo": ')
      .expect(400);
    expect(respuesta.body.codigo).toBe('VALIDACION');
  });

  it('una ruta inexistente responde 404 NO_ENCONTRADO', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/no-existe')
      .expect(404);
    expect(respuesta.body).toEqual(
      expect.objectContaining({ codigo: 'NO_ENCONTRADO', campos: null }),
    );
  });

  it('un error inesperado responde 500 sin filtrar el detalle', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/prueba/inesperado')
      .expect(500);
    expect(respuesta.body.codigo).toBe('ERROR_INTERNO');
    expect(JSON.stringify(respuesta.body)).not.toContain('datos sensibles');
  });

  it('lee X-Dispositivo y X-Version-App', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/prueba/contexto')
      .set('X-Dispositivo', 'android')
      .set('X-Version-App', '1.0.0')
      .expect(200);
    expect(respuesta.body).toEqual(
      expect.objectContaining({ dispositivo: 'android', versionApp: '1.0.0' }),
    );
  });

  // Necesita el PostgreSQL de Docker (docker compose up -d). En CI lo agrega B14.
  it('PrismaService se conecta a PostgreSQL con el adaptador pg', async () => {
    const prisma = app.get(PrismaService);
    const [fila] = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
    expect(fila.ok).toBe(1);
  });
});
