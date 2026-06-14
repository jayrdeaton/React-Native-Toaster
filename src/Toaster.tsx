import { type ComponentType, type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'
import { Dimensions, Image, Keyboard, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { Extrapolation, FadeInDown, FadeInUp, FadeOutDown, FadeOutUp, interpolate, LinearTransition, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'

import { haptics } from './haptics'
import { HistoryModal } from './HistoryModal'
import { paper } from './paper'
import type { Toast, ToastLevel } from './Toast'
import { LEVEL_COLORS } from './Toast'
import { useToastContext } from './ToastContext'
import { useToast } from './useToast'

const STACK_OFFSET = 56

const DEFAULT_LEVEL_ICONS: Record<ToastLevel, string> = {
  error: 'alert-circle',
  info: 'information',
  success: 'check-circle',
  warning: 'alert'
}

type IconComponentProps = { color?: string; name: string; size?: number }

function PaperIconAdapter({ color, name, size }: IconComponentProps) {
  if (!paper) return null
  return <paper.Icon color={color} size={size ?? 20} source={name} />
}

export type PaperTheme = { colors: { background: string; onSurface: string; surface: string } }

export type ToasterProps = {
  backgroundColor?: string
  duration?: number
  historyModal?: ReactNode
  Icon?: ComponentType<IconComponentProps>
  keyboardAware?: boolean
  levelColors?: Partial<Record<ToastLevel, string>>
  levelIcons?: Partial<Record<ToastLevel, string>>
  limit?: number
  onHistoryPress?: () => void
  position?: 'bottom' | 'top'
  surfaceElevation?: 0 | 1 | 2 | 3 | 4 | 5
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
  surfaceElevation?: 0 | 1 | 2 | 3 | 4 | 5
  textColor?: string
  theme?: PaperTheme
  toast: Toast
  toastStyle?: ViewStyle
}

const ToastItem = ({ backgroundColor, duration, Icon, index, isTop, levelColor, levelIcon, onDismiss, position, surfaceElevation, textColor, theme, toast, toastStyle }: ToastItemProps) => {
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
      'worklet'
      translateX.value = e.translationX
    })
    .onEnd((e) => {
      'worklet'
      if (Math.abs(e.translationX) > swipeThreshold) {
        const target = e.translationX > 0 ? screenWidth * 1.5 : -screenWidth * 1.5
        translateX.value = withTiming(target, { duration: 180 }, () => {
          'worklet'
          scheduleOnRN(handleDismiss)
        })
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

  const cardContent = (
    <>
      {icon}
      <Text numberOfLines={2} style={[styles.label, { color: effectiveText }]}>
        {toast.title ?? toast.caption}
      </Text>
    </>
  )

  return (
    <Animated.View entering={entering} exiting={exiting} layout={LinearTransition.duration(220)} style={[styles.itemContainer, marginStyle]}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={swipeStyle}>
          {paper ? (
            <paper.Surface elevation={surfaceElevation ?? 1} style={[styles.card, toastStyle, backgroundColor ? { backgroundColor } : undefined]}>
              {cardContent}
            </paper.Surface>
          ) : (
            <View style={[styles.card, styles.cardShadow, { backgroundColor: effectiveBg }, toastStyle]}>{cardContent}</View>
          )}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  )
}

export const Toaster = ({ backgroundColor, duration = 7000, historyModal, Icon, keyboardAware = true, levelColors, levelIcons, limit = 3, onHistoryPress, position = 'bottom', surfaceElevation, textColor, theme, toastStyle, wrapperStyle }: ToasterProps) => {
  const { clear, dismiss, history, historyVisible, openHistory, toasts } = useToast()
  const { paperTheme } = useToastContext()
  const resolvedTheme = theme ?? paperTheme ?? undefined
  const insets = useSafeAreaInsets()
  const knownIdsRef = useRef(new Set<string>())
  const keyboardHeight = useSharedValue(0)
  const badgeBg = resolvedTheme?.colors.surface ?? 'rgba(0, 0, 0, 0.6)'
  const badgeTextColor = resolvedTheme?.colors.onSurface ?? '#fff'
  const modalBg = backgroundColor ?? resolvedTheme?.colors.background ?? '#1c1c1e'
  const modalText = textColor ?? resolvedTheme?.colors.onSurface ?? '#fff'

  const mergedColors = useMemo(() => ({ ...LEVEL_COLORS, ...levelColors }), [levelColors])
  const effectiveIcon = Icon ?? (paper ? PaperIconAdapter : undefined)
  const effectiveLevelIcons = levelIcons ?? (paper ? DEFAULT_LEVEL_ICONS : undefined)

  const handleHistoryPress = useCallback(() => {
    if (haptics) void haptics.impactAsync(haptics.ImpactFeedbackStyle.Light)
    if (onHistoryPress) onHistoryPress()
    else {
      clear()
      openHistory()
    }
  }, [clear, onHistoryPress, openHistory])

  const handleClearPress = useCallback(() => {
    if (haptics) void haptics.impactAsync(haptics.ImpactFeedbackStyle.Light)
    clear()
  }, [clear])

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
    bottom: position === 'bottom' ? Math.max(insets.bottom, keyboardHeight.value) : undefined,
    top: position === 'top' ? insets.top : undefined
  }))

  const visibleToasts = useMemo(() => toasts.slice(-limit).reverse(), [limit, toasts])

  useEffect(() => {
    knownIdsRef.current = new Set(toasts.map((t) => t.id))
  }, [toasts])

  if (!visibleToasts.length && !historyVisible) return null

  const resolvedHistoryModal = historyModal ?? <HistoryModal backgroundColor={modalBg} levelColors={mergedColors} textColor={modalText} />

  const stack = (
    <Animated.View pointerEvents='box-none' style={[styles.stack, stackStyle, wrapperStyle]}>
      <Animated.View entering={position === 'bottom' ? FadeInUp.duration(220) : FadeInDown.duration(220)} exiting={position === 'bottom' ? FadeOutDown.duration(160) : FadeOutUp.duration(160)} layout={LinearTransition.duration(220)} style={[styles.stackControls, position === 'bottom' ? { bottom: visibleToasts.length * STACK_OFFSET + 4 } : { top: visibleToasts.length * STACK_OFFSET + 4 }]}>
        <View style={styles.stackControlsLeft}>
          {history.length > 0 ? (
            paper ? (
              <paper.Chip compact icon='history' onPress={handleHistoryPress} style={styles.chip}>
                history
              </paper.Chip>
            ) : (
              <Pressable onPress={handleHistoryPress} style={[styles.badgePill, styles.badgePillShadow, { backgroundColor: badgeBg }]}>
                <Text style={[styles.badgeText, { color: badgeTextColor }]}>history</Text>
              </Pressable>
            )
          ) : null}
        </View>
        <View style={styles.stackControlsRight}>
          {paper ? (
            <paper.Chip compact icon='close-circle-outline' onPress={handleClearPress} style={styles.chip}>
              clear
            </paper.Chip>
          ) : (
            <Pressable onPress={handleClearPress} style={[styles.badgePill, styles.badgePillShadow, { backgroundColor: badgeBg }]}>
              <Text style={[styles.badgeText, { color: badgeTextColor }]}>✕</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
      {visibleToasts.map((toast, index) => (
        <ToastItem key={toast.id} backgroundColor={backgroundColor} duration={duration} Icon={effectiveIcon} index={index} isTop={index === visibleToasts.length - 1} levelColor={mergedColors[toast.level]} levelIcon={effectiveLevelIcons?.[toast.level]} onDismiss={dismiss} position={position} surfaceElevation={surfaceElevation} textColor={textColor} theme={resolvedTheme} toast={toast} toastStyle={toastStyle} />
      ))}
    </Animated.View>
  )

  return (
    <>
      {visibleToasts.length > 0 && !historyVisible ? paper ? <paper.Portal>{stack}</paper.Portal> : stack : null}
      {resolvedHistoryModal}
    </>
  )
}

const styles = StyleSheet.create({
  badgePill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  badgePillShadow: {
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6
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
  stack: {
    left: 0,
    position: 'absolute',
    right: 0
  },
  stackControls: {
    alignItems: 'center',
    flexDirection: 'row',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 5
  },
  chip: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2
  },
  stackControlsLeft: {
    alignItems: 'flex-start',
    flex: 1,
    paddingLeft: 16
  },
  stackControlsRight: {
    alignItems: 'flex-end',
    flex: 1,
    paddingRight: 16
  }
})
