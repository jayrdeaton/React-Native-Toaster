import React from 'react'

export const SafeAreaProvider = ({ children }: { children?: React.ReactNode }) => children ?? null
export const useSafeAreaInsets = () => ({ bottom: 0, left: 0, right: 0, top: 0 })
