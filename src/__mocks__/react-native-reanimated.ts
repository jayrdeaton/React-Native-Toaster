import React from 'react'

// Test-only instrumentation: the enter/exit animations most recently handed to a toast's wrapper (the only Animated.View with an `onLayout`, which
// measures the toast for the stack).
export const lastToastMotion: { current?: { entering: unknown; exiting: unknown } } = {}

const Animated = {
  View: ({ children, entering, exiting, onLayout }: { children?: React.ReactNode; entering?: unknown; exiting?: unknown; onLayout?: (e: any) => void }) => {
    if (onLayout) lastToastMotion.current = { entering, exiting }
    return children ?? null
  }
}

export default Animated

// Closed keyboard by default -- tests that care about a specific height mock this module's own
// useAnimatedKeyboard return value directly, same as they already do for other reanimated hooks.
export const useAnimatedKeyboard = () => ({ height: { value: 0 } })
export const useAnimatedStyle = (fn: () => any) => fn()
export const LinearTransition = { duration: () => LinearTransition }
export const FadeInUp = { duration: () => FadeInUp }
export const FadeInDown = { duration: () => FadeInDown }
export const FadeOutUp = { duration: () => FadeOutUp }
export const FadeOutDown = { duration: () => FadeOutDown }
