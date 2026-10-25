import { SwipeToDismiss } from '@rific/gestures'
import { type ComponentType, memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Image, type LayoutChangeEvent, type PressableStateCallbackType, type StyleProp, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native'
import Animated, { LinearTransition, useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { HistoryModal } from './HistoryModal'
import { exitsOutward, toastEntering, toastExiting } from './motion'
import { computeStackOffsets } from './stackLayout'
import type { Toast, ToastLevel } from './Toast'
import { LEVEL_COLORS, toastLabel } from './Toast'
import { type PaperModule, type PressableComponent, useToastContext } from './ToastContext'
import { useFallbackColors } from './useFallbackColors'
import { useToast } from './useToast'

const DEFAULT_LEVEL_ICONS: Record<ToastLevel, string> = {
  error: 'alert-circle',
  info: 'information',
  success: 'check-circle',
  warning: 'alert'
}

// A pressable toast's card dims while pressed. Opacity rather than Paper's ripple: the press wraps the card from outside (margins and all, so a
// host's own Card needn't change), and a ripple there would spread past the card's own shape.
const pressFeedback = ({ pressed }: PressableStateCallbackType) => (pressed ? styles.pressed : null)

type IconComponentProps = { color?: string; name: string; size?: number }

export type PaperTheme = { colors: { background: string; onSurface: string; surface: string } }

/** What a custom `Card` is handed: the card's own layout (a row with its padding, corner radius and side margins, `toastStyle` merged in, and
 * `backgroundColor` when that prop is set), the toast's icon and text to lay out in it, and the toast itself. */
export type ToastCardProps = {
  children: ReactNode
  style: StyleProp<ViewStyle>
  toast: Toast
}

export type ToasterProps = {
  backgroundColor?: string
  /** Draws each toast's card in place of the built-in one (a plain View, or Paper's Surface when `paper` is injected), e.g. a blur surface. */
  Card?: ComponentType<ToastCardProps>
  /** Merged over the caption's built-in style (12/16, the text color at 75% opacity). */
  captionStyle?: StyleProp<TextStyle>
  clearButton?: ReactNode
  duration?: number
  historyButton?: ReactNode
  historyModal?: ReactNode
  Icon?: ComponentType<IconComponentProps>
  keyboardAware?: boolean
  keyboardOffset?: number
  /** Merged over the title's built-in style (14/20 in the text color), e.g. to set the app's font. */
  labelStyle?: StyleProp<TextStyle>
  levelColors?: Partial<Record<ToastLevel, string>>
  levelIcons?: Partial<Record<ToastLevel, string>>
  limit?: number
  onHistoryPress?: () => void
  position?: 'bottom' | 'top'
  /** Lays the stack inside a frame of the host's own (inside the Portal when `paper` is injected, so the frame is drawn over the screen the
   * way the stack is), e.g. one turned to face a player across the table. The stack is absolutely placed against the frame's edges, using
   * the safe-area insets it reads there, so a turned frame that provides insets remapped onto its own edges lands it on the right one. Turn
   * `keyboardAware` off in a turned frame: the keyboard rises from the screen's own bottom edge, not the frame's. */
  renderFrame?: (stack: ReactNode) => ReactNode
  /** Shows only the toasts sent to this stack (`useToast`'s `overrides.stack`), for a second Toaster beside the app's main one: e.g. one
   * per player at a face-to-face table. Left out, the Toaster shows every toast sent to no stack, which is every toast unless one is
   * targeted. A stack's toasts wait while no Toaster for it is mounted, the way toasts past `limit` do (a toast's time runs from when it
   * was sent, so one older than `duration` goes the moment it would show). A Toaster with a `stack` leaves the history to the main one: it
   * draws no history modal unless `historyModal` is passed, and its clear control clears only its own stack. */
  stack?: string
  surfaceElevation?: 0 | 1 | 2 | 3 | 4 | 5
  textColor?: string
  theme?: PaperTheme
  toastStyle?: ViewStyle
  wrapperStyle?: ViewStyle
}

type ToastItemProps = {
  backgroundColor?: string
  Card?: ComponentType<ToastCardProps>
  captionStyle?: StyleProp<TextStyle>
  duration: number
  Icon?: ComponentType<IconComponentProps>
  labelStyle?: StyleProp<TextStyle>
  levelColor: string
  levelIcon?: string
  offset: number
  onDismiss: (id: string) => void
  onMeasure: (id: string, height: number) => void
  /** Leaves away from the stack's edge instead of toward it (see motion.ts's exitsOutward). */
  outwardExit: boolean
  paper: PaperModule | null
  position: 'bottom' | 'top'
  /** Handed down rather than read from context: with Paper the item renders through its Portal, outside ToastProvider. */
  Pressable: PressableComponent
  surfaceElevation?: 0 | 1 | 2 | 3 | 4 | 5
  textColor?: string
  theme?: PaperTheme
  toast: Toast
  toastStyle?: ViewStyle
}

const ToastItem = memo(({ backgroundColor, Card, captionStyle, duration, Icon, labelStyle, levelColor, levelIcon, offset, onDismiss, onMeasure, outwardExit, paper, position, Pressable, surfaceElevation, textColor, theme, toast, toastStyle }: ToastItemProps) => {
  const fallback = useFallbackColors()

  const effectiveBg = backgroundColor ?? theme?.colors.surface ?? fallback.surface
  const effectiveText = textColor ?? theme?.colors.onSurface ?? fallback.text

  const handleDismiss = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id])
  const handleLayout = useCallback((e: LayoutChangeEvent) => onMeasure(toast.id, e.nativeEvent.layout.height), [onMeasure, toast.id])

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

  const entering = toastEntering(position)
  const exiting = toastExiting(position, outwardExit)
  const marginStyle = position === 'bottom' ? { bottom: 0, marginBottom: offset } : { marginTop: offset, top: 0 }

  // A toast's own icon/color (see Toast.ts's ToastOverrides) wins over the level's shared default -
  // the achievement-badge case this exists for varies icon+color per toast even though every one
  // of them is the same 'success' level. A host's own `leading` node (e.g. an avatar) wins over
  // all of them, drawn at whatever size it is.
  const effectiveIcon = toast.icon ?? levelIcon
  const effectiveColor = toast.color ?? levelColor
  const icon = toast.leading ?? (toast.image ? <Image source={{ uri: toast.image }} style={styles.image} /> : Icon && effectiveIcon ? <Icon color={effectiveColor} name={effectiveIcon} size={20} /> : paper && effectiveIcon ? <paper.Icon color={effectiveColor} size={20} source={effectiveIcon} /> : <View style={[styles.indicator, { backgroundColor: effectiveColor }]} />)

  const { onPress } = toast
  const handlePress = useCallback(() => {
    onPress?.()
    handleDismiss()
  }, [handleDismiss, onPress])

  const cardContent = (
    <>
      {icon}
      <View style={styles.textColumn}>
        <Text numberOfLines={2} style={[styles.label, { color: effectiveText }, labelStyle]}>
          {toast.title ?? toast.caption}
        </Text>
        {toast.title && toast.caption ? (
          <Text numberOfLines={3} style={[styles.caption, { color: effectiveText }, captionStyle]}>
            {toast.caption}
          </Text>
        ) : null}
      </View>
    </>
  )

  const card = Card ? (
    <Card style={[styles.card, toastStyle, backgroundColor ? { backgroundColor } : undefined]} toast={toast}>
      {cardContent}
    </Card>
  ) : paper ? (
    <paper.Surface elevation={surfaceElevation ?? 1} style={[styles.card, toastStyle, backgroundColor ? { backgroundColor } : undefined]}>
      {cardContent}
    </paper.Surface>
  ) : (
    <View style={[styles.card, styles.cardShadow, { backgroundColor: effectiveBg }, toastStyle]}>{cardContent}</View>
  )

  return (
    <Animated.View layout={LinearTransition.duration(220)} style={[styles.itemContainer, marginStyle]}>
      <Animated.View entering={entering} exiting={exiting} onLayout={handleLayout}>
        {/* The swipe is @rific/gestures': sideways, or off the stack's edge, measured in the toast's own coordinates, its gesture on a wrapper
        that stays put while the card inside follows the finger. A pressable toast's press wraps the card (a host's own Card too, unchanged)
        inside that wrapper, so it moves with the card and a swipe never presses it: on native gesture-handler cancels the press once the pan
        takes the touch, and on the web the wrapper eats the click that ends a swipe. A tap never moves far enough to start the pan. It is the
        only pressable in the card, since react-native-web draws it as a <button> and a button can't hold another. */}
        <SwipeToDismiss edge={position} onDismiss={handleDismiss}>
          {onPress ? (
            <Pressable accessibilityLabel={toastLabel(toast)} accessibilityRole='button' onPress={handlePress} style={pressFeedback}>
              {card}
            </Pressable>
          ) : (
            card
          )}
        </SwipeToDismiss>
      </Animated.View>
    </Animated.View>
  )
})
ToastItem.displayName = 'ToastItem'

export const Toaster = ({ backgroundColor, Card, captionStyle, clearButton, duration = 7000, historyButton, historyModal, Icon, keyboardAware = true, keyboardOffset = 0, labelStyle, levelColors, levelIcons, limit = 3, onHistoryPress, position = 'bottom', renderFrame, stack: stackName, surfaceElevation, textColor, theme, toastStyle, wrapperStyle }: ToasterProps) => {
  const { clear, dismiss, history, historyVisible, openHistory, toasts } = useToast()
  const { dispatch, haptics, paper, paperTheme, Pressable } = useToastContext()
  // The stack this Toaster shows: its own name, or null (the main Toaster's, which every toast sent to no stack lands in).
  const ownStack = stackName ?? null
  const resolvedTheme = theme ?? paperTheme ?? undefined
  const insets = useSafeAreaInsets()
  const knownIdsRef = useRef(new Set<string>())
  // Frame-accurate and UI-thread only: reanimated's own native listener drives `keyboard.height`
  // continuously through the OS keyboard's actual show/hide animation. The previous approach (a
  // plain useSharedValue plus RN core's Keyboard.addListener('keyboardWillShow'/'keyboardDidShow'))
  // depended on that JS-thread event firing at all -- it reliably did not when a field already had
  // autoFocus by the time this listener's effect subscribed, leaving keyboardHeight stuck at 0 and
  // the stack rendering at just `insets.bottom` from the screen edge: behind an already-open
  // keyboard instead of above it, the exact bug keyboardAware exists to prevent.
  const keyboard = useAnimatedKeyboard()
  const [heights, setHeights] = useState<Record<string, number>>({})
  const [prevToasts, setPrevToasts] = useState(toasts)
  const fallback = useFallbackColors()
  const badgeBg = resolvedTheme?.colors.surface ?? fallback.badgeBg
  const badgeTextColor = resolvedTheme?.colors.onSurface ?? fallback.text
  const modalBg = backgroundColor ?? resolvedTheme?.colors.background ?? fallback.background
  const modalText = textColor ?? resolvedTheme?.colors.onSurface ?? fallback.text

  const mergedColors = useMemo(() => ({ ...LEVEL_COLORS, ...levelColors }), [levelColors])
  const effectiveLevelIcons = levelIcons ?? (paper ? DEFAULT_LEVEL_ICONS : undefined)

  const handleHistoryPress = useCallback(() => {
    if (haptics) void haptics.impactAsync(haptics.ImpactFeedbackStyle.Light)
    if (onHistoryPress) onHistoryPress()
    else {
      clear()
      openHistory()
    }
  }, [clear, haptics, onHistoryPress, openHistory])

  // Clears what this Toaster shows, not another stack's toasts.
  const handleClearPress = useCallback(() => {
    if (haptics) void haptics.impactAsync(haptics.ImpactFeedbackStyle.Light)
    dispatch({ stack: ownStack, type: 'CLEAR' })
  }, [dispatch, haptics, ownStack])

  const handleMeasure = useCallback((id: string, height: number) => {
    setHeights((prev) => (prev[id] === height ? prev : { ...prev, [id]: height }))
  }, [])

  const stackStyle = useAnimatedStyle(() => ({
    bottom: position === 'bottom' ? Math.max(insets.bottom, keyboardAware ? keyboard.height.value : 0) + keyboardOffset : undefined,
    top: position === 'top' ? insets.top : undefined
  }))

  // Filtered before the limit, so another stack's toasts never take this one's places.
  const visibleToasts = useMemo(
    () =>
      toasts
        .filter((t) => t.stack === ownStack)
        .slice(-limit)
        .reverse(),
    [limit, ownStack, toasts]
  )

  const { offsets, totalHeight: totalStackHeight } = useMemo(
    () =>
      computeStackOffsets(
        visibleToasts.map((t) => t.id),
        heights
      ),
    [visibleToasts, heights]
  )

  useEffect(() => {
    knownIdsRef.current = new Set(toasts.map((t) => t.id))
  }, [toasts])

  // Pruning stale `heights` entries is state derived from `toasts`, not a synchronization with an
  // external system, so it's adjusted here during render (per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // rather than in a useEffect, which would cause an extra commit-then-recommit render pass.
  if (prevToasts !== toasts) {
    setPrevToasts(toasts)
    setHeights((prev) => {
      const ids = new Set(toasts.map((t) => t.id))
      let changed = false
      const next: Record<string, number> = {}
      for (const id in prev) {
        if (ids.has(id)) next[id] = prev[id]
        else changed = true
      }
      return changed ? next : prev
    })
  }

  if (!visibleToasts.length && !historyVisible) return null

  // A three-state slot: omit the prop for the built-in control, pass `null` to hide it, or
  // pass a node to replace it outright. `??` can't express this - it treats `null` and
  // `undefined` the same, so an explicit `undefined` check is required here and below.
  const defaultHistoryButton =
    history.length > 0 ? (
      paper ? (
        <paper.Chip compact icon='history' onPress={handleHistoryPress} style={styles.chip}>
          history
        </paper.Chip>
      ) : (
        <Pressable onPress={handleHistoryPress} style={[styles.badgePill, styles.badgePillShadow, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeTextColor }]}>history</Text>
        </Pressable>
      )
    ) : null
  const defaultClearButton = paper ? (
    <paper.Chip compact icon='close-circle-outline' onPress={handleClearPress} style={styles.chip}>
      clear
    </paper.Chip>
  ) : (
    <Pressable onPress={handleClearPress} style={[styles.badgePill, styles.badgePillShadow, { backgroundColor: badgeBg }]}>
      <Text style={[styles.badgeText, { color: badgeTextColor }]}>✕</Text>
    </Pressable>
  )
  const resolvedHistoryButton = historyButton === undefined ? defaultHistoryButton : historyButton
  const resolvedClearButton = clearButton === undefined ? defaultClearButton : clearButton
  // One history for the app, drawn by the main Toaster: a stack's own Toaster draws none by default, or opening it would open one per Toaster.
  const defaultHistoryModal = ownStack === null ? <HistoryModal backgroundColor={modalBg} levelColors={mergedColors} textColor={modalText} /> : null
  const resolvedHistoryModal = historyModal === undefined ? defaultHistoryModal : historyModal

  const stack = (
    <Animated.View pointerEvents='box-none' style={[styles.stack, stackStyle, wrapperStyle]}>
      <Animated.View layout={LinearTransition.duration(220)} style={[styles.stackControls, position === 'bottom' ? { bottom: totalStackHeight + 4 } : { top: totalStackHeight + 4 }]}>
        <Animated.View entering={toastEntering(position)} exiting={toastExiting(position, false)} style={styles.stackControlsRow}>
          <View style={styles.stackControlsLeft}>{resolvedHistoryButton}</View>
          <View style={styles.stackControlsRight}>{resolvedClearButton}</View>
        </Animated.View>
      </Animated.View>
      {visibleToasts.map((toast, index) => (
        <ToastItem key={toast.id} backgroundColor={backgroundColor} Card={Card} captionStyle={captionStyle} duration={duration} Icon={Icon} labelStyle={labelStyle} levelColor={mergedColors[toast.level]} levelIcon={effectiveLevelIcons?.[toast.level]} offset={offsets[index]} onDismiss={dismiss} onMeasure={handleMeasure} outwardExit={exitsOutward(index, visibleToasts.length)} paper={paper} position={position} Pressable={Pressable} surfaceElevation={surfaceElevation} textColor={textColor} theme={resolvedTheme} toast={toast} toastStyle={toastStyle} />
      ))}
    </Animated.View>
  )

  const framed = renderFrame ? renderFrame(stack) : stack

  return (
    <>
      {visibleToasts.length > 0 && !historyVisible ? paper ? <paper.Portal>{framed}</paper.Portal> : framed : null}
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
  caption: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.75
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
  chip: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2
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
    fontSize: 14,
    lineHeight: 20
  },
  pressed: {
    opacity: 0.7
  },
  stack: {
    left: 0,
    position: 'absolute',
    right: 0
  },
  stackControls: {
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 5
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
  },
  stackControlsRow: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  textColumn: {
    flex: 1,
    gap: 2
  }
})
