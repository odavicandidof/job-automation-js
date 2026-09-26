module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.js'],
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/learningTests/**',
  ],
  verbose: true,
};

