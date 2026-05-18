/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'

const noop = () => {}
const identity = (x: any) => x

const Animated = {
  View: ({ children }: { children?: React.ReactNode }) => children ?? null
}

export default Animated

export const useSharedValue = (init: any) => ({ value: init })
export const useAnimatedStyle = (fn: () => any) => fn()
export const useDerivedValue = (fn: () => any) => ({ value: fn() })
export const withTiming = (toValue: any, _config?: any, callback?: any) => {
  callback?.()
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
