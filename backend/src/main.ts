import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { montarSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  montarSwagger(app); // solo fuera de producción
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
