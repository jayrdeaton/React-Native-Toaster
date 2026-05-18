const { defineConfig } = require('eslint/config')
const prettierRecommended = require('eslint-plugin-prettier/recommended')
const simpleImportSort = require('eslint-plugin-simple-import-sort')
const tsParser = require('@typescript-eslint/parser')
const eslintReactNative = require('eslint-plugin-react-native')
const tsEslint = require('typescript-eslint')

module.exports = defineConfig([
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json'
      }
    }
  },
  ...tsEslint.configs.recommended,
  prettierRecommended,
  {
    ignores: ['dist/**', 'node_modules/**', 'lib/**', 'coverage/**', '**/*.js']
  },
  {
    plugins: {
      'react-native': eslintReactNative,
      'simple-import-sort': simpleImportSort
    },
    rules: {
      'prettier/prettier': 'warn',
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      'no-console': 'warn',
      'react-native/no-inline-styles': 'warn',
      'react-native/no-unused-styles': 'warn',
      'react-native/no-raw-text': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-require-imports': 'off'
    }
  }
])
