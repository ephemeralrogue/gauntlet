'use strict'

module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'tests/coverage',
  coveragePathIgnorePatterns: ['/node_modules/'],
  coverageReporters: ['lcov'],
  globals: {'ts-jest': {packageJson: 'package.json'}},
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts']
}
