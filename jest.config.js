/** Unit and integration tests. No database needed: Prisma is mocked or replaced by an in-memory repository. */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test/integration'],
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.module.ts'],
  coverageDirectory: 'coverage',
  setupFiles: ['<rootDir>/test/support/jest.setup.ts'],
  testEnvironment: 'node',
};
