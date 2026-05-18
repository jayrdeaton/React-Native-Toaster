import React from 'react'

export const GestureHandlerRootView = ({ children }: { children?: React.ReactNode }) => children ?? null
export const GestureDetector = ({ children }: { children?: React.ReactNode }) => children ?? null

const panHandler = {
  onEnd: (_fn: unknown) => panHandler,
  onUpdate: (_fn: unknown) => panHandler
}

export const Gesture = {
  Pan: () => panHandler
}
