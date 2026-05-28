import { FlatList, Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'

import { paper } from './paper'
import type { ToastLevel } from './Toast'
import { LEVEL_COLORS } from './Toast'
import { useToast } from './useToast'

export type HistoryModalProps = {
  backgroundColor?: string
  levelColors?: Partial<Record<ToastLevel, string>>
  style?: ViewStyle
  textColor?: string
}

const HistoryContent = ({ backgroundColor, levelColors, style, textColor }: HistoryModalProps) => {
  const { clearHistory, closeHistory, history } = useToast()
  const insets = useSafeAreaInsets()

  const mergedColors = { ...LEVEL_COLORS, ...levelColors }
  const bg = backgroundColor ?? '#2c2c2e'
  const text = textColor ?? '#fff'

  const divider = paper ? <paper.Divider /> : <View style={[styles.divider, { backgroundColor: text + '22' }]} />

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingBottom: insets.bottom, paddingTop: insets.top }, style]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: text }]}>History</Text>
        {paper ? (
          <paper.Button onPress={closeHistory}>Done</paper.Button>
        ) : (
          <Pressable hitSlop={8} onPress={closeHistory}>
            <Text style={[styles.close, { color: text }]}>Done</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        contentContainerStyle={history.length === 0 ? styles.emptyContainer : undefined}
        data={history}
        ItemSeparatorComponent={() => divider}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: text }]}>No history</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={[styles.indicator, { backgroundColor: mergedColors[item.level] }]} />
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: text }]}>{item.title ?? item.caption}</Text>
              {item.title && item.caption ? <Text style={[styles.itemCaption, { color: text }]}>{item.caption}</Text> : null}
              <Text style={[styles.itemTime, { color: text }]}>{new Date(item.createdAt).toLocaleTimeString()}</Text>
            </View>
          </View>
        )}
      />
      {history.length > 0 ? (
        <>
          {divider}
          {paper ? (
            <View style={styles.clearButton}>
              <paper.Button icon='delete-sweep' onPress={clearHistory} textColor={LEVEL_COLORS.error}>
                Clear history
              </paper.Button>
            </View>
          ) : (
            <Pressable onPress={clearHistory} style={styles.clearButton}>
              <Text style={styles.clearText}>Clear history</Text>
            </Pressable>
          )}
        </>
      ) : null}
    </View>
  )
}

export const HistoryModal = (props: HistoryModalProps) => {
  const { closeHistory, historyVisible } = useToast()
  return (
    <Modal animationType='slide' onRequestClose={closeHistory} visible={historyVisible}>
      <SafeAreaProvider>
        <HistoryContent {...props} />
      </SafeAreaProvider>
    </Modal>
  )
}

const styles = StyleSheet.create({
  clearButton: {
    alignItems: 'center',
    paddingVertical: 16
  },
  divider: {
    height: StyleSheet.hairlineWidth
  },
  clearText: {
    color: LEVEL_COLORS.error,
    fontSize: 14
  },
  close: {
    fontSize: 16
  },
  container: {
    flex: 1
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
    paddingHorizontal: 16,
    paddingVertical: 14
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
    fontSize: 18,
    fontWeight: '600'
  }
})
