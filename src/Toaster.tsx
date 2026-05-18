import { type ComponentType, useCallback, useEffect, useMemo, useRef } from 'react'
import { Dimensions, Image, Keyboard, Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Extrapolation,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  LinearTransition,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated'

import type { Toast, ToastLevel } from './Toast'
import { useToast } from './useToast'

const STACK_OFFSET = 80
const BOTTOM_OFFSET = 38

const DEFAULT_LEVEL_COLORS: Record<ToastLevel, string> = {
  error: '#ef4444',
  info: '#3b82f6',
  success: '#22c55e',
  warning: '#f97316'
}

type IconComponentProps = { color?: string; name: string; size?: number }

export type ToasterProps = {
  backgroundColor?: string
  duration?: number
  Icon?: ComponentType<IconComponentProps>
  keyboardAware?: boolean
  levelColors?: Partial<Record<ToastLevel, string>>
  levelIcons?: Partial<Record<ToastLevel, string>>
  limit?: number
  position?: 'bottom' | 'top'
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
  toast: Toast
}

const ToastItem = ({ backgroundColor, duration, Icon, index, isTop, levelColor, levelIcon, onDismiss, position, toast }: ToastItemProps) => {
  const translateX = useSharedValue(0)
  const screenWidth = Dimensions.get('window').width
  const swipeThreshold = screenWidth * 0.4

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
  const exiting = position === 'bottom' ? (isTop ? FadeOutUp.duration(160) : FadeOutDown.duration(160)) : (isTop ? FadeOutDown.duration(160) : FadeOutUp.duration(160))
  const marginStyle = position === 'bottom' ? { bottom: 0, marginBottom: index * STACK_OFFSET } : { marginTop: index * STACK_OFFSET, top: 0 }

  return (
    <Animated.View entering={entering} exiting={exiting} layout={LinearTransition.duration(220)} style={[styles.itemContainer, marginStyle]}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.card, { backgroundColor: backgroundColor ?? '#2c2c2e' }, swipeStyle]}>
          {toast.image ? (
            <Image source={{ uri: toast.image }} style={styles.image} />
          ) : Icon && levelIcon ? (
            <Icon color={levelColor} name={levelIcon} size={20} />
          ) : (
            <View style={[styles.indicator, { backgroundColor: levelColor }]} />
          )}
          <Text numberOfLines={2} style={styles.label}>
            {toast.title ?? toast.caption}
          </Text>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  )
}

export const Toaster = ({ backgroundColor, duration = 7000, Icon, keyboardAware = true, levelColors, levelIcons, limit = 3, position = 'bottom', wrapperStyle }: ToasterProps) => {
  const { dismiss, toasts } = useToast()
  const knownIdsRef = useRef(new Set<string>())
  const keyboardHeight = useSharedValue(0)

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
  const hiddenCount = Math.max(0, toasts.length - visibleToasts.length)

  useEffect(() => {
    knownIdsRef.current = new Set(toasts.map((t) => t.id))
  }, [toasts])

  if (!visibleToasts.length) return null

  return (
    <Animated.View pointerEvents='box-none' style={[styles.stack, stackStyle, wrapperStyle]}>
      {hiddenCount > 0 ? (
        <Animated.View
          entering={position === 'bottom' ? FadeInUp.duration(220) : FadeInDown.duration(220)}
          exiting={position === 'bottom' ? FadeOutDown.duration(160) : FadeOutUp.duration(160)}
          layout={LinearTransition.duration(220)}
          pointerEvents='none'
          style={[styles.badge, position === 'bottom' ? { bottom: visibleToasts.length * STACK_OFFSET + 12 } : { top: visibleToasts.length * STACK_OFFSET + 12 }]}
        >
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{hiddenCount} more</Text>
          </View>
        </Animated.View>
      ) : null}
      {visibleToasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          backgroundColor={backgroundColor}
          duration={duration}
          Icon={Icon}
          index={index}
          isTop={index === visibleToasts.length - 1}
          levelColor={mergedColors[toast.level]}
          levelIcon={levelIcons?.[toast.level]}
          onDismiss={dismiss}
          position={position}
          toast={toast}
        />
      ))}
    </Animated.View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  badgeText: {
    color: '#fff',
    fontSize: 12
  },
  card: {
    alignItems: 'center',
    borderRadius: 8,
    elevation: 6,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    color: '#fff',
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  stack: {
    left: 0,
    position: 'absolute',
    right: 0
  }
})
