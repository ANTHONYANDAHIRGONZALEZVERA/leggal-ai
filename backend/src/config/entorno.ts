import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { z } from '../comun/validacion/zod-es';

// Variables de entorno del backend. Se validan al arrancar para que un error
// de configuración tumbe el proceso de inmediato con un mensaje claro, y no a
// mitad de una petición. Toda variable nueva va aquí y en .env.example.
const esquemaEntorno = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  // Firma de los tokens de acceso. 32 caracteres como mínimo: un secreto
  // corto se puede adivinar por fuerza bruta y con él se falsifica cualquier sesión.
  JWT_SECRETO: z.string().min(32, 'debe tener al menos 32 caracteres'),
  // Duraciones del contrato de autenticación (docs/api/auth.md).
  JWT_ACCESO_SEGUNDOS: z.coerce.number().int().positive().default(900),
  REFRESCO_DIAS: z.coerce.number().int().positive().default(30),
  // Margen para reenviar un refresh recién rotado sin que cuente como robo
  // (la respuesta se puede perder en la red móvil).
  REFRESCO_GRACIA_SEGUNDOS: z.coerce.number().int().nonnegative().default(30),

  // Versión vigente de cada documento legal. La decide el servidor, nunca la
  // app, y se guarda en aceptaciones_legales al registrarse.
  VERSION_TERMINOS: z.string().trim().min(1).max(20),
  VERSION_PRIVACIDAD: z.string().trim().min(1).max(20),
});

export type Entorno = z.infer<typeof esquemaEntorno>;

/** Token de inyección para recibir el entorno validado en los servicios. */
export const ENTORNO = Symbol('ENTORNO');

/**
 * Valida las variables y devuelve el entorno tipado. Lanza un error que lista
 * todas las variables con problemas a la vez, sin mostrar sus valores (pueden
 * ser secretos).
 */
export function validarEntorno(
  variables: Record<string, string | undefined>,
): Entorno {
  const resultado = esquemaEntorno.safeParse(variables);
  if (resultado.success) {
    return resultado.data;
  }
  const problemas = resultado.error.issues
    .map((problema) => `  - ${problema.path.join('.')}: ${problema.message}`)
    .join('\n');
  throw new Error(
    `Variables de entorno inválidas o faltantes:\n${problemas}\n` +
      'Revisa tu .env usando .env.example como guía.',
  );
}

/**
 * Carga el archivo .env si existe. En el servidor no hay archivo: las
 * variables vienen del entorno del contenedor. Nunca pisa una variable que ya
 * esté definida.
 */
export function cargarArchivoEnv(ruta = '.env'): void {
  if (!existsSync(ruta)) {
    return;
  }
  // Se copia variable por variable en lugar de usar process.loadEnvFile():
  // Jest le da a cada prueba una copia de process.env, y loadEnvFile escribe
  // en el original, así que las pruebas no verían el .env.
  const variables = parseEnv(readFileSync(ruta, 'utf8'));
  for (const [nombre, valor] of Object.entries(variables)) {
    process.env[nombre] ??= valor;
  }
}
