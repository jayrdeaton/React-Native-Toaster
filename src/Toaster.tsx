import { type ComponentType, useCallback, useEffect, useMemo, useRef } from 'react'
import { Dimensions, FlatList, Image, Keyboard, Modal, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { Extrapolation, FadeInDown, FadeInUp, FadeOutDown, FadeOutUp, interpolate, LinearTransition, runOnJS, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'

import { paper } from './paper'
import { initialWindowMetrics, SafeAreaProvider, useSafeAreaInsets } from './safeArea'
import type { Toast, ToastLevel } from './Toast'
import { useToastContext } from './ToastContext'
import { useToast } from './useToast'

const STACK_OFFSET = 56
const BOTTOM_OFFSET = 38

const DEFAULT_LEVEL_COLORS: Record<ToastLevel, string> = {
  error: '#ef4444',
  info: '#3b82f6',
  success: '#22c55e',
  warning: '#f97316'
}

type IconComponentProps = { color?: string; name: string; size?: number }

export type PaperTheme = { colors: { onSurface: string; surface: string } }

export type ToasterProps = {
  backgroundColor?: string
  duration?: number
  Icon?: ComponentType<IconComponentProps>
  keyboardAware?: boolean
  levelColors?: Partial<Record<ToastLevel, string>>
  levelIcons?: Partial<Record<ToastLevel, string>>
  limit?: number
  position?: 'bottom' | 'top'
  textColor?: string
  theme?: PaperTheme
  toastStyle?: ViewStyle
  wrapperStyle?: ViewStyle
}

type ToastItemProps = {
  backgroundColor?: string
  duration: number
  Icon?: ComponentType<IconComponentProps>
  index: number
  isTop: boolean
  levelColor: string
  levelIcon?: string
  onDismiss: (id: string) => void
  position: 'bottom' | 'top'
  textColor?: string
  theme?: PaperTheme
  toast: Toast
  toastStyle?: ViewStyle
}

const ToastItem = ({ backgroundColor, duration, Icon, index, isTop, levelColor, levelIcon, onDismiss, position, textColor, theme, toast, toastStyle }: ToastItemProps) => {
  const translateX = useSharedValue(0)
  const screenWidth = Dimensions.get('window').width
  const swipeThreshold = screenWidth * 0.4

  const effectiveBg = backgroundColor ?? theme?.colors.surface ?? '#2c2c2e'
  const effectiveText = textColor ?? theme?.colors.onSurface ?? '#fff'

  const handleDismiss = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id])

  useEffect(() => {
    const elapsed = Math.max(0, Date.now() - new Date(toast.createdAt).getTime())
    const remaining = Math.max(0, duration - elapsed)
    if (remaining === 0) {
      handleDismiss()
      return
    }
    const timer = setTimeout(handleDismiss, remaining)
    return () => clearTimeout(timer)
  }, [toast.id, toast.createdAt, duration, handleDismiss])

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > swipeThreshold) {
        const target = e.translationX > 0 ? screenWidth * 1.5 : -screenWidth * 1.5
        translateX.value = withTiming(target, { duration: 180 }, () => runOnJS(handleDismiss)())
      } else {
        translateX.value = withSpring(0)
      }
    })

  const opacity = useDerivedValue(() => interpolate(Math.abs(translateX.value), [0, swipeThreshold], [1, 0.4], Extrapolation.CLAMP))

  const swipeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }]
  }))

  const entering = position === 'bottom' ? FadeInUp.duration(220) : FadeInDown.duration(220)
  const exiting = position === 'bottom' ? (isTop ? FadeOutUp.duration(160) : FadeOutDown.duration(160)) : isTop ? FadeOutDown.duration(160) : FadeOutUp.duration(160)
  const marginStyle = position === 'bottom' ? { bottom: 0, marginBottom: index * STACK_OFFSET } : { marginTop: index * STACK_OFFSET, top: 0 }

  const icon = toast.image ? <Image source={{ uri: toast.image }} style={styles.image} /> : Icon && levelIcon ? <Icon color={levelColor} name={levelIcon} size={20} /> : <View style={[styles.indicator, { backgroundColor: levelColor }]} />

  return (
    <Animated.View entering={entering} exiting={exiting} layout={LinearTransition.duration(220)} style={[styles.itemContainer, marginStyle]}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={swipeStyle}>
          <View style={[styles.card, styles.cardShadow, { backgroundColor: effectiveBg }, toastStyle]}>
            {icon}
            <Text numberOfLines={2} style={[styles.label, { color: effectiveText }]}>
              {toast.title ?? toast.caption}
            </Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  )
}

type HistoryModalContentProps = {
  mergedColors: Record<ToastLevel, string>
  modalBg: string
  modalText: string
}

const HistoryModalContent = ({ mergedColors, modalBg, modalText }: HistoryModalContentProps) => {
  const { clearHistory, closeHistory, history } = useToast()
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.modalContainer, { backgroundColor: modalBg, paddingBottom: insets.bottom, paddingTop: insets.top }]}>
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, { color: modalText }]}>History</Text>
        <Pressable hitSlop={8} onPress={closeHistory}>
          <Text style={[styles.modalClose, { color: modalText }]}>Done</Text>
        </Pressable>
      </View>
      <FlatList
        contentContainerStyle={history.length === 0 ? styles.emptyContainer : undefined}
        data={history}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: modalText }]}>No history</Text>}
        renderItem={({ item }) => (
          <View style={[styles.historyItem, { borderBottomColor: modalText + '22' }]}>
            <View style={[styles.indicator, { backgroundColor: mergedColors[item.level] }]} />
            <View style={styles.historyContent}>
              <Text style={[styles.historyTitle, { color: modalText }]}>{item.title ?? item.caption}</Text>
              {item.title && item.caption ? <Text style={[styles.historyCaption, { color: modalText }]}>{item.caption}</Text> : null}
              <Text style={[styles.historyTime, { color: modalText }]}>{new Date(item.createdAt).toLocaleTimeString()}</Text>
            </View>
          </View>
        )}
      />
      {history.length > 0 ? (
        <Pressable onPress={clearHistory} style={[styles.clearHistoryButton, { borderTopColor: modalText + '22' }]}>
          <Text style={styles.clearHistoryText}>Clear history</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export const Toaster = ({ backgroundColor, duration = 7000, Icon, keyboardAware = true, levelColors, levelIcons, limit = 3, position = 'bottom', textColor, theme, toastStyle, wrapperStyle }: ToasterProps) => {
  const { closeHistory, dismiss, history, historyVisible, openHistory, toasts } = useToast()
  const { paperTheme } = useToastContext()
  const resolvedTheme = theme ?? paperTheme ?? undefined
  const knownIdsRef = useRef(new Set<string>())
  const keyboardHeight = useSharedValue(0)
  const badgeBg = resolvedTheme?.colors.surface ?? 'rgba(0, 0, 0, 0.6)'
  const badgeTextColor = resolvedTheme?.colors.onSurface ?? '#fff'
  const modalBg = backgroundColor ?? resolvedTheme?.colors.surface ?? '#2c2c2e'
  const modalText = textColor ?? resolvedTheme?.colors.onSurface ?? '#fff'

  const mergedColors = useMemo(() => ({ ...DEFAULT_LEVEL_COLORS, ...levelColors }), [levelColors])

  useEffect(() => {
    if (!keyboardAware || position !== 'bottom') return
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const showSub = Keyboard.addListener(showEvent, (e) => {
      keyboardHeight.value = e.endCoordinates.height
    })
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeight.value = 0
    })
    return () => {
      hideSub.remove()
      showSub.remove()
    }
  }, [keyboardAware, keyboardHeight, position])

  const stackStyle = useAnimatedStyle(() => ({
    bottom: position === 'bottom' ? Math.max(BOTTOM_OFFSET, keyboardHeight.value) : undefined,
    top: position === 'top' ? BOTTOM_OFFSET : undefined
  }))

  const visibleToasts = useMemo(() => toasts.slice(-limit).reverse(), [limit, toasts])

  useEffect(() => {
    knownIdsRef.current = new Set(toasts.map((t) => t.id))
  }, [toasts])

  if (!visibleToasts.length && !historyVisible) return null

  const stack = (
    <Animated.View pointerEvents='box-none' style={[styles.stack, stackStyle, wrapperStyle]}>
      {history.length > 0 ? (
        <Animated.View entering={position === 'bottom' ? FadeInUp.duration(220) : FadeInDown.duration(220)} exiting={position === 'bottom' ? FadeOutDown.duration(160) : FadeOutUp.duration(160)} layout={LinearTransition.duration(220)} style={[styles.badge, position === 'bottom' ? { bottom: visibleToasts.length * STACK_OFFSET + 12 } : { top: visibleToasts.length * STACK_OFFSET + 12 }]}>
          <Pressable onPress={openHistory} style={[styles.badgePill, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeTextColor }]}>history</Text>
          </Pressable>
        </Animated.View>
      ) : null}
      {visibleToasts.map((toast, index) => (
        <ToastItem key={toast.id} backgroundColor={backgroundColor} duration={duration} Icon={Icon} index={index} isTop={index === visibleToasts.length - 1} levelColor={mergedColors[toast.level]} levelIcon={levelIcons?.[toast.level]} onDismiss={dismiss} position={position} textColor={textColor} theme={resolvedTheme} toast={toast} toastStyle={toastStyle} />
      ))}
    </Animated.View>
  )

  const historyModal = (
    <Modal animationType='slide' onRequestClose={closeHistory} visible={historyVisible}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <HistoryModalContent mergedColors={mergedColors} modalBg={modalBg} modalText={modalText} />
      </SafeAreaProvider>
    </Modal>
  )

  return (
    <>
      {visibleToasts.length > 0 ? paper ? <paper.Portal>{stack}</paper.Portal> : stack : null}
      {historyModal}
    </>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 5
  },
  badgePill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  badgeText: {
    fontSize: 12
  },
  card: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  cardShadow: {
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6
  },
  clearHistoryButton: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16
  },
  clearHistoryText: {
    color: '#ef4444',
    fontSize: 14
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
  historyCaption: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.6
  },
  historyContent: {
    flex: 1
  },
  historyItem: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  historyTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.4
  },
  historyTitle: {
    fontSize: 14,
    lineHeight: 20
  },
  image: {
    borderRadius: 4,
    height: 20,
    width: 20
  },
  indicator: {
    borderRadius: 3,
    height: 20,
    width: 4
  },
  itemContainer: {
    left: 0,
    position: 'absolute',
    right: 0
  },
  label: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  modalClose: {
    fontSize: 16
  },
  modalContainer: {
    flex: 1
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  stack: {
    left: 0,
    position: 'absolute',
    right: 0
  }
})
