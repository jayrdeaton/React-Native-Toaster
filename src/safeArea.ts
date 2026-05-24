import { type ComponentType, createElement, Fragment, type ReactNode } from 'react'

const safeAreaContext = (() => {
  try {
    return require('react-native-safe-area-context') as typeof import('react-native-safe-area-context')
  } catch {
    return null
  }
})()

const zeros = { bottom: 0, left: 0, right: 0, top: 0 }
const PassthroughProvider: ComponentType<{ children?: ReactNode }> = ({ children }) => createElement(Fragment, null, children)

export const initialWindowMetrics = safeAreaContext?.initialWindowMetrics ?? null
export const useSafeAreaInsets = safeAreaContext?.useSafeAreaInsets ?? (() => safeAreaContext?.initialWindowMetrics?.insets ?? zeros)
export const SafeAreaProvider = (safeAreaContext?.SafeAreaProvider ?? PassthroughProvider) as ComponentType<{ children?: ReactNode; initialMetrics?: typeof initialWindowMetrics }>
