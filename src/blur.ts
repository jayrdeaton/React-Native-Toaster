export const blur = (() => {
  try {
    return require('expo-blur') as typeof import('expo-blur')
  } catch {
    return null
  }
})()
