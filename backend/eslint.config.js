import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginImport from 'eslint-plugin-import';

export default tseslint.config(
  {
    ignores: ['build', 'node_modules']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      import: eslintPluginImport
    },
    rules: {
      'import/order': [
        'warn',
        {
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always'
        }
      ],
      'no-console': 'off'
    }
  }
);
