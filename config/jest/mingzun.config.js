module.exports = {
  rootDir: require('path').resolve(__dirname, '../..'),
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: [
    '<rootDir>/src/心法模块/心法/明尊琉璃体/*.test.js',
    '<rootDir>/src/心法模块/心法/洗髓经/*.test.js',
  ],
  transform: { '^.+\\.[jt]sx?$': '<rootDir>/config/jest/babelTransform.js' },
  watchPlugins: [],
}
