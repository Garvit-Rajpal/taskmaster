'use strict';

module.exports = {
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/global-setup.js',
  globalTeardown: '<rootDir>/tests/global-teardown.js',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/docs/**',
    '!src/generated/**',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/src/generated/'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text-summary', 'text', 'html', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: { lines: 80, statements: 80, branches: 65, functions: 80 },
  },
  testTimeout: 30000,
};
