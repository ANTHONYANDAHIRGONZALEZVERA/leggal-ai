// Reglas de ESLint del frontend: las recomendadas por Expo (React, hooks,
// imports y TypeScript). Se ignoran carpetas generadas que no son código nuestro.
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*', 'public/*', 'coverage/*']),
  expoConfig,
  {
    // En las pruebas, jest.mock se ejecuta antes que los import del archivo,
    // así que dentro de sus fábricas solo se puede usar require().
    files: ['**/__tests__/**'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
