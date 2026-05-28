export const haptics = (() => {
  try {
    return require('expo-haptics') as typeof import('expo-haptics')
  } catch {
    return null
  }
})()
