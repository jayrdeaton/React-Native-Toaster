module.exports = require('@infinitetoken/jest-config/react-native')({
  moduleNameMapper: {
    '^@rific/gestures$': '<rootDir>/src/__mocks__/@rific/gestures.tsx',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.tsx',
    '^react-native-reanimated$': '<rootDir>/src/__mocks__/react-native-reanimated.ts',
    '^react-native-safe-area-context$': '<rootDir>/src/__mocks__/react-native-safe-area-context.ts'
  }
})
