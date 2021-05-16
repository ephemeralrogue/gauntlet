'use strict'

const path = require('path')

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
        'import/no-unassigned-import': [
          1,
          {allow: [path.join(__dirname, 'matchers')]}
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
        'jest/expect-expect': [
          2,
          {assertFunctionNames: ['expect', 'expectNotToBeNull']}
        ],
        'unicorn/consistent-function-scoping': 0
      }
    }
  ]
}
module.exports = config
