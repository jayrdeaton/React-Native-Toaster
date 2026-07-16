/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'

export const GestureHandlerRootView = ({ children }: { children?: React.ReactNode }) => children ?? null
export const GestureDetector = ({ children }: { children?: React.ReactNode }) => children ?? null

// Test-only instrumentation: counts how many times a new Pan gesture is constructed,
// so tests can assert gestures are memoized instead of rebuilt on every render.
export const panInstanceCount = { current: 0 }

// Test-only instrumentation: captures the most recently registered onUpdate/onEnd
// worklets so tests can simulate a swipe by invoking them directly.
export const lastPanCallbacks: { onEnd?: (e: any) => void; onUpdate?: (e: any) => void } = {}

const makePanHandler = () => {
  const handler = {
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
