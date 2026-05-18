/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react'

const stub = ({ children }: { children?: React.ReactNode }) => children ?? null

const noop = () => {}

const StyleSheet = {
  create: <T extends object>(styles: T): T => styles,
  flatten: (style: unknown) => style
}

const Dimensions = {
  get: () => ({ height: 812, width: 375 })
}

const Keyboard = {
  addListener: () => ({ remove: noop })
}

const Platform = {
  OS: 'ios',
  select: (obj: Record<string, unknown>) => obj.ios ?? obj.default
}

export { Dimensions, Keyboard, Platform, StyleSheet }

export const Image = stub
export const Pressable = stub
export const Text = stub
export const TouchableOpacity = stub
export const View = stub
