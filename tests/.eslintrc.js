'use strict'

/** @type {import('eslint').Linter.Config & {parserOptions?: import('@typescript-eslint/parser').ParserOptions}} */
const config = {
  overrides: [
    {
      files: '**/*.ts',
      extends: '@cherryblossom/eslint-config/ts/jest',
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname
      },
      rules: {
        'jest/expect-expect': [
          2,
          {assertFunctionNames: ['expect', 'expectAPIError', 'expectFormError']}
        ]
      }
    },
    {
      files: '!**/*.test.ts',
      rules: {
        'jest/no-export': 0
      }
    },
    {
      files: '**/*.test.ts',
      rules: {
        'unicorn/consistent-function-scoping': 0
      }
    }
  ]
}
module.exports = config
