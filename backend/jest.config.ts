import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';

// Path aliases (e.g. the ones added by `nest g library`) live in tsconfig.json,
// so they are read from there instead of being duplicated here.
const { config: tsconfig } = ts.readConfigFile(
  './tsconfig.json',
  ts.sys.readFile,
);
const paths = tsconfig?.compilerOptions?.paths ?? {};

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    ...pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' }),
    // El cliente generado de Prisma importa './enums.js' apuntando a archivos
    // .ts; Jest necesita quitar la extensión para encontrarlos.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Variables de entorno de prueba (las mismas que usan los e2e).
  setupFiles: ['<rootDir>/test/entorno-pruebas.ts'],
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/generated/**',
    'libs/**/*.(t|j)s',
    'apps/**/*.(t|j)s',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};

export default config;
