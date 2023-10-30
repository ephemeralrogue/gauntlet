'use strict'

const base = require('./jest.config')

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  ...base,
  collectCoverage: false,
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tests/tsconfig.dev.json',
      diagnostics: {
        ignoreCodes: [
          // Left side of comma operator is unused and has no side effects.
          2695,
          // '{0}' is declared but its value is never read.
          6133,
          // Property '{0}' is declared but its value is never read.
          6138,
          // All imports in import declaration are unused.
          6192,
          // '{0}' is declared but never used.
          6196,
          // All destructured elements are unused.
          6198,
          // All variables are unused.
          6199,
          // Unreachable code detected.
          7027,
          // Unused label
          7028
        ]
      }
    }
  }
}
module.exports = config
