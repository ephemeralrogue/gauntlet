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
        'jest/no-standalone-expect': [
          2,
          {additionalTestBlockFunctions: ['testWithClient']}
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
      files: ['{matchers,utils}.ts'],
      rules: {
        'import/prefer-default-export': 0
      }
    }
  ],
  rules: {
    'import/no-unassigned-import': [
      1,
      {allow: [path.join(__dirname, 'matchers')]}
    ]
  }
}
module.exports = config
