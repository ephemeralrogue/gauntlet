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
        'jest/no-standalone-expect': [
          2,
          {additionalTestBlockFunctions: ['_testWithClient', 'testWithClient']}
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
