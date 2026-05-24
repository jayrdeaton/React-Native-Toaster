export const paper = (() => {
  try {
    return require('react-native-paper') as typeof import('react-native-paper')
  } catch {
    return null
  }
})()
