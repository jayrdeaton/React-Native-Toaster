import { type ComponentType, createElement, Fragment, type ReactNode } from 'react'

const safeAreaContext = (() => {
  try {
    const context = require('react-native-safe-area-context') as typeof import('react-native-safe-area-context')
    console.log('Successfully loaded react-native-safe-area-context. Safe area insets will be applied to the history modal.')
    return context
  } catch {
    console.log('react-native-safe-area-context is not installed. To apply safe area insets to the history modal, install react-native-safe-area-context and ensure it is properly linked.')
    return null
  }
})()

const zeros = { bottom: 0, left: 0, right: 0, top: 0 }
const PassthroughProvider: ComponentType<{ children?: ReactNode }> = ({ children }) => createElement(Fragment, null, children)

export const initialWindowMetrics = safeAreaContext?.initialWindowMetrics ?? null
export const SafeAreaProvider = (safeAreaContext?.SafeAreaProvider ?? PassthroughProvider) as ComponentType<{ children?: ReactNode; initialMetrics?: typeof initialWindowMetrics }>

// 🛠️ FIX: Intercept the native hook's return values dynamically
export const useSafeAreaInsets = () => {
  if (!safeAreaContext) {
    return zeros
  }

  // Call the native hook safely
  const insets = safeAreaContext.useSafeAreaInsets()

  // If the hook returns all zeros, it means the React Context lookup failed 
  // because of duplicate module resolution. Fall back to initialWindowMetrics.
  const isAllZeros = insets.top === 0 && insets.bottom === 0 && insets.left === 0 && insets.right === 0
  if (isAllZeros && safeAreaContext.initialWindowMetrics?.insets) {
    return safeAreaContext.initialWindowMetrics.insets
  }

  return insets
}
