import { useColorScheme } from 'react-native'

export type FallbackColors = {
  background: string
  badgeBg: string
  isDark: boolean
  surface: string
  text: string
}

export const useFallbackColors = (): FallbackColors => {
  const isDark = useColorScheme() === 'dark'
  return {
    background: isDark ? '#1c1c1e' : '#ffffff',
    badgeBg: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.85)',
    isDark,
    surface: isDark ? '#2c2c2e' : '#f2f2f7',
    text: isDark ? '#ffffff' : '#1c1c1e'
  }
}
