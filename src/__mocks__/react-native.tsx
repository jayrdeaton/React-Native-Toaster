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

export const useColorScheme = () => 'light'

type FlatListProps<T> = {
  ItemSeparatorComponent?: React.ComponentType | (() => React.ReactNode)
  data?: T[]
  ListEmptyComponent?: React.ReactNode
  renderItem?: (info: { index: number; item: T }) => React.ReactNode
}

const FlatList = <T,>({ data, ItemSeparatorComponent, ListEmptyComponent, renderItem }: FlatListProps<T>) => {
  if (!data || data.length === 0) return <>{ListEmptyComponent ?? null}</>
  return (
    <>
      {data.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && ItemSeparatorComponent ? <ItemSeparatorComponent /> : null}
          {renderItem?.({ index, item })}
        </React.Fragment>
      ))}
    </>
  )
}

// Text renders a span carrying its flattened style, so a test can check what a toast's title/caption were styled with.
const flattenStyle = (style: unknown): Record<string, unknown> => (Array.isArray(style) ? Object.assign({}, ...style.map(flattenStyle)) : style && typeof style === 'object' ? (style as Record<string, unknown>) : {})

export const Image = ({ source }: { source?: { uri?: string } }) => <img alt='' src={source?.uri} />
export const Modal = stub
// Pressable renders a div that a click presses, carrying its role and label, and its style at rest and while pressed (a style callback is
// called with each), so a test can find a pressable toast by role and check its feedback.
type PressableProps = { accessibilityLabel?: string; accessibilityRole?: string; children?: React.ReactNode; onPress?: () => void; style?: unknown }
const pressableStyle = (style: unknown, pressed: boolean) => JSON.stringify(flattenStyle(typeof style === 'function' ? style({ pressed }) : style))
export const Pressable = ({ accessibilityLabel, accessibilityRole, children, onPress, style }: PressableProps) => (
  <div aria-label={accessibilityLabel} data-rn-pressed-style={pressableStyle(style, true)} data-rn-style={pressableStyle(style, false)} onClick={onPress} role={accessibilityRole}>
    {children}
  </div>
)
export const Text = ({ children, style }: { children?: React.ReactNode; style?: unknown }) => <span data-rn-style={JSON.stringify(flattenStyle(style))}>{children}</span>
export const TouchableOpacity = stub
export const View = stub

export { FlatList }
