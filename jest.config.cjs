module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/learningTests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/learningTests/**',
  ],
  verbose: true,
};

