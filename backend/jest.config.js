module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\.|/)(test|spec))\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  // Setup file for global test environment (e.g. mocking auth)
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
