/** End-to-end tests against a real PostgreSQL. Needs DATABASE_URL (see README "Testing"). */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  roots: ['<rootDir>/test/e2e'],
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  setupFiles: ['<rootDir>/test/support/jest.setup.ts'],
  testEnvironment: 'node',
};
