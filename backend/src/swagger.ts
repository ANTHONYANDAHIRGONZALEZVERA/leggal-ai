import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Nombre del esquema de seguridad en Swagger. Los controladores protegidos lo
// declaran con @ApiBearerAuth(ESQUEMA_JWT) para que /docs pida el token.
export const ESQUEMA_JWT = 'jwt';

/**
 * Monta Swagger en /docs (y el JSON en /docs-json) salvo en producción.
 *
 * En producción /docs describiría todas las rutas y sus campos, y eso le da un
 * mapa de la API a cualquiera (el repo es público y el servidor también). El
 * contrato oficial vive en docs/api/.
 *
 * Recibe el entorno como parámetro para que las pruebas e2e cubran los dos
 * casos sin tocar process.env.
 *
 * @returns true si montó Swagger.
 */
export function montarSwagger(
  app: INestApplication,
  entorno: string | undefined = process.env.NODE_ENV,
): boolean {
  if (entorno === 'production') {
    return false;
  }

  const config = new DocumentBuilder()
    .setTitle('Leggal AI API')
    .setDescription('API de Leggal AI. Contratos detallados en docs/api/.')
    .setVersion('0.0.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'tokenAcceso de /auth/login (vence en 15 minutos)',
      },
      ESQUEMA_JWT,
    )
    .build();

  SwaggerModule.setup(
    'docs',
    app,
    () => SwaggerModule.createDocument(app, config),
    {
      // Solo el JSON (/docs-json), que es lo que usan los generadores de clientes.
      raw: ['json'],
      // Recuerda el token entre recargas de la página mientras se prueba.
      swaggerOptions: { persistAuthorization: true },
    },
  );
  return true;
}
