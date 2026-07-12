import { useEffect, useRef } from 'react'
import { Dimensions, FlatList, Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'

import { blur } from './blur'
import { bottomSheet } from './bottomSheet'
import { paper } from './paper'
import type { ToastLevel } from './Toast'
import { LEVEL_COLORS } from './Toast'
import { useFallbackColors } from './useFallbackColors'
import { useToast } from './useToast'

export type HistoryModalProps = {
  backgroundColor?: string
  levelColors?: Partial<Record<ToastLevel, string>>
  style?: ViewStyle
  textColor?: string
}

type HistoryContentProps = HistoryModalProps & { isSheet?: boolean }

const HistoryContent = ({ backgroundColor, isSheet, levelColors, style, textColor }: HistoryContentProps) => {
  const { clearHistory, closeHistory, history } = useToast()
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
    // eslint-disable-next-line react-native/no-inline-styles
    <View style={[styles.container, { backgroundColor: isSheet ? undefined : bg, paddingTop: isSheet ? 0 : insets.top }, style]}>
      <View style={[styles.header, isSheet ? undefined : styles.headerModal]}>
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
      <View style={[styles.body, { backgroundColor: bg }]}>{bottomSheet ? <bottomSheet.BottomSheetFlatList {...listProps} /> : <FlatList {...listProps} />}</View>
    </View>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BlurBackground: React.FC<any> = ({ style }) => {
  const theme = paper ? paper.useTheme() : null
  const fallback = useFallbackColors()
  const BlurViewComponent = blur?.BlurView
  if (!BlurViewComponent) return null
  const tint = (theme?.dark ?? fallback.isDark) ? 'dark' : 'light'
  return (
    <BlurViewComponent intensity={80} style={[StyleSheet.absoluteFill, style]} tint={tint}>
      <View style={[StyleSheet.absoluteFill, styles.blurOverlay, { backgroundColor: theme?.colors.surface ?? fallback.surface }]} />
    </BlurViewComponent>
  )
}

export const HistoryModal = (props: HistoryModalProps) => {
  const { closeHistory, historyVisible } = useToast()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sheetRef = useRef<any>(null)
  const insets = useSafeAreaInsets()
  const fallback = useFallbackColors()
  const bg = props.backgroundColor ?? fallback.surface
  const text = props.textColor ?? fallback.text
  const screenHeight = Dimensions.get('window').height

  useEffect(() => {
    if (!bottomSheet) return
    if (historyVisible) {
      sheetRef.current?.snapToIndex(0)
    } else {
      sheetRef.current?.close()
    }
  }, [historyVisible])

  if (bottomSheet) {
    return (
      <View pointerEvents='box-none' style={StyleSheet.absoluteFill}>
        <bottomSheet.BottomSheet ref={sheetRef} backgroundComponent={blur ? BlurBackground : undefined} backgroundStyle={blur ? undefined : { backgroundColor: bg }} enablePanDownToClose handleIndicatorStyle={{ backgroundColor: text + '44' }} index={historyVisible ? 0 : -1} onClose={closeHistory} snapPoints={[screenHeight * 0.65, screenHeight]} topInset={insets.top}>
          <HistoryContent {...props} isSheet />
        </bottomSheet.BottomSheet>
      </View>
    )
  }

  return (
    <Modal animationType='slide' onRequestClose={closeHistory} visible={historyVisible}>
      <SafeAreaProvider>
        <HistoryContent {...props} />
      </SafeAreaProvider>
    </Modal>
  )
}

const styles = StyleSheet.create({
  blurOverlay: {
    opacity: 0.5
  },
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
    paddingVertical: 8
  },
  headerModal: {
    paddingHorizontal: 8
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
