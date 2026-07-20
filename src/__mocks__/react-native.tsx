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

export const Image = stub
export const Modal = stub
export const Pressable = stub
export const Text = stub
export const TouchableOpacity = stub
export const View = stub

export { FlatList }
