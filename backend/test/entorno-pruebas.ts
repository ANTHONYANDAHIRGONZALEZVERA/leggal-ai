import { cargarArchivoEnv } from '../src/config/entorno';

// Variables mínimas para que la app arranque en las pruebas, incluso en CI
// donde no hay archivo .env. Primero se carga el .env local (si existe) para
// respetar la configuración de cada uno, por ejemplo el puerto de PostgreSQL;
// después se completa solo lo que falte. Ninguno de estos valores sirve fuera
// de las pruebas.
cargarArchivoEnv();

const valoresDePrueba: Record<string, string> = {
  DATABASE_URL:
    'postgresql://leggal:cambia_esta_clave@localhost:5432/leggal_ai',
  JWT_SECRETO: 'secreto-solo-para-pruebas-automaticas-0123456789',
  VERSION_TERMINOS: '1.0',
  VERSION_PRIVACIDAD: '1.0',
};

for (const [nombre, valor] of Object.entries(valoresDePrueba)) {
  process.env[nombre] ??= valor;
}
