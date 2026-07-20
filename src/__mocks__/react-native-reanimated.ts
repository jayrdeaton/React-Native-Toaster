import React, { useRef } from 'react'

const noop = () => {}
const identity = (x: any) => x

const Animated = {
  View: ({ children }: { children?: React.ReactNode }) => children ?? null
}

export default Animated

// Real reanimated shared values are stable across re-renders (ref-like) —
// mirror that here so memoization deps that include a shared value behave correctly.
export const useSharedValue = (init: any) => useRef({ value: init }).current
export const useAnimatedStyle = (fn: () => any) => fn()
export const useDerivedValue = (fn: () => any) => ({ value: fn() })
export const withTiming = (toValue: any, _config?: any, callback?: any) => {
  callback?.(true)
  return toValue
}
export const withSpring = identity
export const runOnJS = (fn: any) => fn
export const interpolate = (value: any, _input: any, output: any) => output[0]
export const Extrapolation = { CLAMP: 'clamp' }
export const LinearTransition = { duration: () => LinearTransition }
export const FadeInUp = { duration: () => FadeInUp }
export const FadeInDown = { duration: () => FadeInDown }
export const FadeOutUp = { duration: () => FadeOutUp }
export const FadeOutDown = { duration: () => FadeOutDown }
