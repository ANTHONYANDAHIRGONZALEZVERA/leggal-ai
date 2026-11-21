import { Global, Module } from '@nestjs/common';
import { cargarArchivoEnv, ENTORNO, validarEntorno } from './entorno';

// Global para que cualquier módulo pueda pedir @Inject(ENTORNO) sin importarlo.
@Global()
@Module({
  providers: [
    {
      provide: ENTORNO,
      useFactory: () => {
        cargarArchivoEnv();
        return validarEntorno(process.env);
      },
    },
  ],
  exports: [ENTORNO],
})
export class ConfiguracionModule {}
