module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/learningTests/**/*.test.js'],
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/learningTests/**',
  ],
  verbose: true,
};

