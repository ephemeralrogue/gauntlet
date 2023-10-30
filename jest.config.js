'use strict'

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  collectCoverage: true,
  coverageReporters: ['html'],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  watchPathIgnorePatterns: ['<rootDir>/(?:node_modules|dist|docs)/'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tests/tsconfig.json'
    }
  }
}
module.exports = config
