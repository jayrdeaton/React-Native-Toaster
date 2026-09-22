import React from 'react'

export const GestureHandlerRootView = ({ children }: { children?: React.ReactNode }) => children ?? null
export const GestureDetector = ({ children }: { children?: React.ReactNode }) => children ?? null

// Test-only instrumentation: counts how many times a new Pan gesture is constructed,
// so tests can assert gestures are memoized instead of rebuilt on every render.
export const panInstanceCount = { current: 0 }

// Test-only instrumentation: captures the most recently registered onBegin/onUpdate/onEnd
// worklets so tests can simulate a swipe by invoking them directly.
export const lastPanCallbacks: { onEnd?: (e: any) => void; onStart?: (e: any) => void; onUpdate?: (e: any) => void } = {}

// Test-only instrumentation: the config chained onto the most recent Pan (e.g. maxPointers), so tests can assert how a gesture was set up.
export const lastPanConfig: { maxPointers?: number } = {}

const makePanHandler = () => {
  const handler = {
    maxPointers: (n: number) => {
      lastPanConfig.maxPointers = n
      return handler
    },
    onStart: (fn: (e: any) => void) => {
      lastPanCallbacks.onStart = fn
      return handler
    },
    onEnd: (fn: (e: any) => void) => {
      lastPanCallbacks.onEnd = fn
      return handler
    },
    onUpdate: (fn: (e: any) => void) => {
      lastPanCallbacks.onUpdate = fn
      return handler
    }
  }
  return handler
}

export const Gesture = {
  Pan: () => {
    panInstanceCount.current++
    return makePanHandler()
  }
}
