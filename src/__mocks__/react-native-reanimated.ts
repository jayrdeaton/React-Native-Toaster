import React, { useEffect, useRef } from 'react'

const noop = () => {}
const identity = (x: any) => x

const Animated = {
  View: ({ children }: { children?: React.ReactNode }) => children ?? null
}

export default Animated

// Test-only instrumentation: every useAnimatedReaction registers a runner here, and every
// shared-value write notifies all of them - a coarse stand-in for the real UI-thread frame
// loop that's good enough for these component tests.
const reactionRunners = new Set<() => void>()
const notifyReactions = () => reactionRunners.forEach((run) => run())

// Real reanimated shared values are stable across re-renders (ref-like): mirror that here
// so memoization deps that include a shared value behave correctly.
// The setter also notifies useAnimatedReaction subscribers synchronously, mirroring how a
// worklet mutating .value on the UI thread drives reactions in the real library.
export const useSharedValue = (init: any) => {
  const ref = useRef<{ value: any } | null>(null)
  if (ref.current === null) {
    let current = init
    ref.current = {
      get value() {
        return current
      },
      set value(next: any) {
        current = next
        notifyReactions()
      }
    }
  }
  return ref.current
}
// Closed keyboard by default -- tests that care about a specific height mock this module's own
// useAnimatedKeyboard return value directly, same as they already do for other reanimated hooks.
export const useAnimatedKeyboard = () => ({ height: { value: 0 } })
export const useAnimatedStyle = (fn: () => any) => fn()
export const useDerivedValue = (fn: () => any) => ({ value: fn() })
export const useAnimatedReaction = (prepare: () => any, react: (curr: any, prev: any) => void) => {
  const stateRef = useRef<{ hasRun: boolean; prev: any }>({ hasRun: false, prev: undefined })

  useEffect(() => {
    const run = () => {
      const curr = prepare()
      if (!stateRef.current.hasRun || curr !== stateRef.current.prev) {
        react(curr, stateRef.current.hasRun ? stateRef.current.prev : undefined)
        stateRef.current = { hasRun: true, prev: curr }
      }
    }
    reactionRunners.add(run)
    run()
    return () => {
      reactionRunners.delete(run)
    }
  })
}
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
