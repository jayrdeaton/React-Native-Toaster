import type { ComponentType, ReactNode } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'

import type { ToastLevel } from './Toast'
import { LEVEL_COLORS } from './Toast'
import { useToastContext } from './ToastContext'
import { useFallbackColors } from './useFallbackColors'
import { useToast } from './useToast'

export type HistoryContainerProps = {
  children: ReactNode
  onClose: () => void
  visible: boolean
}

export type HistoryModalProps = {
  backgroundColor?: string
  Container?: ComponentType<HistoryContainerProps>
  levelColors?: Partial<Record<ToastLevel, string>>
  style?: ViewStyle
  textColor?: string
}

const DefaultContainer = ({ children, onClose, visible }: HistoryContainerProps) => (
  <Modal animationType='slide' onRequestClose={onClose} visible={visible}>
    <SafeAreaProvider>{children}</SafeAreaProvider>
  </Modal>
)

type HistoryContentProps = Omit<HistoryModalProps, 'Container'>

const HistoryContent = ({ backgroundColor, levelColors, style, textColor }: HistoryContentProps) => {
  const { clearHistory, closeHistory, history } = useToast()
  const { paper } = useToastContext()
  const insets = useSafeAreaInsets()
  const fallback = useFallbackColors()

  const mergedColors = { ...LEVEL_COLORS, ...levelColors }
  const bg = backgroundColor ?? fallback.surface
  const text = textColor ?? fallback.text

  const divider = paper ? <paper.Divider /> : <View style={[styles.divider, { backgroundColor: text + '22' }]} />

  const renderItem = ({ item }: { item: (typeof history)[0] }) => (
    <View style={styles.item}>
      <View style={[styles.indicator, { backgroundColor: mergedColors[item.level] }]} />
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: text }]}>{item.title ?? item.caption}</Text>
        {item.title && item.caption ? <Text style={[styles.itemCaption, { color: text }]}>{item.caption}</Text> : null}
        <Text style={[styles.itemTime, { color: text }]}>{new Date(item.createdAt).toLocaleTimeString()}</Text>
      </View>
    </View>
  )

  const listProps = {
    contentContainerStyle: [history.length === 0 ? styles.emptyContainer : undefined, { paddingBottom: insets.bottom }],
    data: history,
    ItemSeparatorComponent: () => divider,
    keyExtractor: (item: (typeof history)[0]) => item.id,
    ListEmptyComponent: <Text style={[styles.emptyText, { color: text }]}>No history</Text>,
    renderItem
  }

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }, style]}>
      <View style={styles.header}>
        {paper ? (
          <paper.IconButton icon='chevron-down' onPress={closeHistory} />
        ) : (
          <Pressable hitSlop={8} onPress={closeHistory}>
            <Text style={[styles.close, { color: text }]}>↓</Text>
          </Pressable>
        )}
        <Text style={[styles.title, { color: text }]}>Toast History</Text>
        {history.length > 0 ? (
          paper ? (
            <paper.IconButton icon='delete-sweep' onPress={clearHistory} />
          ) : (
            <Pressable hitSlop={8} onPress={clearHistory}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          )
        ) : null}
      </View>
      {divider}
      <View style={[styles.body, { backgroundColor: bg }]}>
        <FlatList {...listProps} />
      </View>
    </View>
  )
}

export const HistoryModal = ({ Container = DefaultContainer, ...props }: HistoryModalProps) => {
  const { closeHistory, historyVisible } = useToast()

  return (
    <Container onClose={closeHistory} visible={historyVisible}>
      <HistoryContent {...props} />
    </Container>
  )
}

const styles = StyleSheet.create({
  body: {
    flex: 1
  },
  clearText: {
    color: LEVEL_COLORS.error,
    fontSize: 14,
    marginRight: 16
  },
  close: {
    fontSize: 16
  },
  container: {
    flex: 1
  },
  divider: {
    height: StyleSheet.hairlineWidth
  },
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.5
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8
  },
  indicator: {
    borderRadius: 3,
    height: 20,
    width: 4
  },
  item: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  itemCaption: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.6
  },
  itemContent: {
    flex: 1
  },
  itemTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.4
  },
  itemTitle: {
    fontSize: 14,
    lineHeight: 20
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600'
  }
})
