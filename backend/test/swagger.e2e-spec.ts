import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ESQUEMA_JWT, montarSwagger } from './../src/swagger';

// Levanta la app igual que main.ts, pero eligiendo el entorno, para comprobar
// que Swagger existe en desarrollo y desaparece en producción.
async function crearApp(
  entorno: string,
): Promise<{ app: INestApplication<App>; montado: boolean }> {
  const modulo = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = modulo.createNestApplication<INestApplication<App>>();
  const montado = montarSwagger(app, entorno);
  await app.init();
  return { app, montado };
}

describe('Swagger (e2e)', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    await app.close();
  });

  describe('en desarrollo', () => {
    beforeEach(async () => {
      const creada = await crearApp('development');
      app = creada.app;
      expect(creada.montado).toBe(true);
    });

    it('GET /docs responde 200 con la interfaz de Swagger', async () => {
      const respuesta = await request(app.getHttpServer())
        .get('/docs')
        .expect(200);
      expect(respuesta.text).toContain('Swagger UI');
    });

    it('GET /docs-json responde 200 con el esquema Bearer JWT', async () => {
      const respuesta = await request(app.getHttpServer())
        .get('/docs-json')
        .expect(200)
        .expect('Content-Type', /json/);
      expect(respuesta.body.info.title).toBe('Leggal AI API');
      expect(respuesta.body.components.securitySchemes[ESQUEMA_JWT]).toEqual(
        expect.objectContaining({ type: 'http', scheme: 'bearer' }),
      );
    });
  });

  describe('en producción', () => {
    beforeEach(async () => {
      const creada = await crearApp('production');
      app = creada.app;
      expect(creada.montado).toBe(false);
    });

    it('GET /docs responde 404', () => {
      return request(app.getHttpServer()).get('/docs').expect(404);
    });

    it('GET /docs-json responde 404', () => {
      return request(app.getHttpServer()).get('/docs-json').expect(404);
    });

    it('el resto de la API sigue respondiendo', () => {
      return request(app.getHttpServer()).get('/').expect(200);
    });
  });
});
