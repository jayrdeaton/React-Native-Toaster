import { callWorkletCallback, useWorkletCallback } from '@rific/core'
import { type ComponentType, memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, Image, type LayoutChangeEvent, Pressable, type StyleProp, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { Extrapolation, interpolate, LinearTransition, type SharedValue, useAnimatedKeyboard, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'

import { HistoryModal } from './HistoryModal'
import { exitsOutward, toastEntering, toastExiting } from './motion'
import { computeStackOffsets, DEFAULT_ITEM_HEIGHT } from './stackLayout'
import { releaseVelocity, sampleVelocity, SWIPE_DISMISS_FRACTION, SWIPE_EDGE_DISMISS_FRACTION, swipeEdgeDrag, swipeExitTarget, swipeIsVertical, swipeShouldDismiss } from './swipe'
import type { Toast, ToastLevel } from './Toast'
import { LEVEL_COLORS } from './Toast'
import { type PaperModule, useToastContext } from './ToastContext'
import { useFallbackColors } from './useFallbackColors'
import { useToast } from './useToast'

const DEFAULT_LEVEL_ICONS: Record<ToastLevel, string> = {
  error: 'alert-circle',
  info: 'information',
  success: 'check-circle',
  warning: 'alert'
}

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
  surfaceElevation?: 0 | 1 | 2 | 3 | 4 | 5
  textColor?: string
  theme?: PaperTheme
  toast: Toast
  toastStyle?: ViewStyle
}

// Swipe-to-dismiss measured in the toast's OWN coordinate space, not the window's.
//
// A pan's `translationX/Y` are reported in WINDOW space, but `x`/`y` are relative to the view the handler is attached to - and UIKit/Android
// compute that through every ancestor transform. So a toast rendered inside a turned frame (an app that fakes landscape by rotating a View
// while the OS stays portrait-locked, or any other transformed ancestor) is swiped along ITS OWN axes with no knowledge of the rotation:
// the distance is `x` (or `y`) now minus at activation. That only works if the view the gesture is attached to does not itself move while the
// finger drags (a view that follows the finger keeps `x` constant - which is why RNGH's docs recommend the absolute values in that case), so
// the detector wraps the STATIONARY wrapper in ToastItem below, and only the card inside it is translated.
//
// A swipe goes one of two ways, locked when the pan activates by how the pointer had moved since touch-down (`onBegin`): sideways, either
// direction, past SWIPE_DISMISS_FRACTION of the toast's width; or toward the edge the stack sits on (up for `position='top'`, down for
// 'bottom' - the way a banner is pushed back off the screen), past SWIPE_EDGE_DISMISS_FRACTION of its height, while a drag the other way
// only gives a little (swipeEdgeDrag). Either way a flick dismisses it too, however short (swipeShouldDismiss): its speed is sampled from the
// same local positions with the clock (`Date.now()`, which the UI runtime has), because the gesture's own `velocityX/Y` are window-space.
//
// Details that matter: (1) the anchor is captured when the pan ACTIVATES (`onStart`), not at touch-down: Android and web re-base their own
// translation at activation, so anchoring there makes the card track the finger from 0 on every platform instead of jumping by the touch slop
// (~8dp) on the first update. (2) `maxPointers(1)`: `x` is the centroid of every finger on the view, so a second finger landing or lifting
// would step it discontinuously (window-space `translationX` stayed continuous across pointer changes) and could dismiss the toast by accident.
// `clearance` is how far the exit target must reach to leave the screen whatever the toast's size (see swipeExitTarget).
type SwipeState = {
  beginX: SharedValue<number>
  beginY: SharedValue<number>
  lastDistance: SharedValue<number>
  lastMoveAt: SharedValue<number>
  startX: SharedValue<number>
  startY: SharedValue<number>
  translateX: SharedValue<number>
  translateY: SharedValue<number>
  velocity: SharedValue<number>
  vertical: SharedValue<boolean>
}

// The pan's own state, all on the UI thread. Every shared value is stable for the toast's lifetime, so the object is too.
function useSwipeState(): SwipeState {
  const beginX = useSharedValue(0)
  const beginY = useSharedValue(0)
  const lastDistance = useSharedValue(0)
  const lastMoveAt = useSharedValue(0)
  const startX = useSharedValue(0)
  const startY = useSharedValue(0)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const velocity = useSharedValue(0)
  const vertical = useSharedValue(false)
  return useMemo(() => ({ beginX, beginY, lastDistance, lastMoveAt, startX, startY, translateX, translateY, velocity, vertical }), [beginX, beginY, lastDistance, lastMoveAt, startX, startY, translateX, translateY, velocity, vertical])
}

function buildSwipeGesture(swipe: SwipeState, swipeDismissed: SharedValue<boolean>, width: number, height: number, edge: number, clearance: number) {
  return Gesture.Pan()
    .maxPointers(1)
    .onBegin((e) => {
      'worklet'
      swipe.beginX.value = e.x
      swipe.beginY.value = e.y
    })
    .onStart((e) => {
      'worklet'
      swipe.vertical.value = swipeIsVertical(e.x - swipe.beginX.value, e.y - swipe.beginY.value)
      swipe.startX.value = e.x
      swipe.startY.value = e.y
      swipe.lastDistance.value = 0
      swipe.lastMoveAt.value = Date.now()
      swipe.velocity.value = 0
    })
    .onUpdate((e) => {
      'worklet'
      const distance = swipe.vertical.value ? e.y - swipe.startY.value : e.x - swipe.startX.value
      const now = Date.now()
      const elapsed = now - swipe.lastMoveAt.value
      if (elapsed > 0) {
        swipe.velocity.value = sampleVelocity(swipe.velocity.value, distance - swipe.lastDistance.value, elapsed)
        swipe.lastDistance.value = distance
        swipe.lastMoveAt.value = now
      }
      if (swipe.vertical.value) swipe.translateY.value = swipeEdgeDrag(distance, edge)
      else swipe.translateX.value = distance
    })
    .onEnd((e) => {
      'worklet'
      const velocity = releaseVelocity(swipe.velocity.value, Date.now() - swipe.lastMoveAt.value)
      const done = (finished?: boolean) => {
        'worklet'
        if (finished) swipeDismissed.value = true
      }
      if (swipe.vertical.value) {
        // Measured toward the edge, so the dismiss rule only ever fires that way.
        const toward = (e.y - swipe.startY.value) * edge
        if (toward > 0 && swipeShouldDismiss(toward, height, velocity * edge, SWIPE_EDGE_DISMISS_FRACTION)) swipe.translateY.value = withTiming(swipeExitTarget(edge, clearance), { duration: 180 }, done)
        else swipe.translateY.value = withSpring(0)
      } else {
        const distance = e.x - swipe.startX.value
        if (swipeShouldDismiss(distance, width, velocity)) swipe.translateX.value = withTiming(swipeExitTarget(distance, clearance), { duration: 180 }, done)
        else swipe.translateX.value = withSpring(0)
      }
    })
}

const ToastItem = memo(({ backgroundColor, Card, captionStyle, duration, Icon, labelStyle, levelColor, levelIcon, offset, onDismiss, onMeasure, outwardExit, paper, position, surfaceElevation, textColor, theme, toast, toastStyle }: ToastItemProps) => {
  const swipe = useSwipeState()
  const { translateX, translateY } = swipe
  // The toast's own size: the reference for the dismiss distances and the exit target. It starts at the window's width and the stack's default
  // item height - sensible guesses until the first layout - and is replaced by the real laid-out size.
  const [size, setSize] = useState(() => ({ height: DEFAULT_ITEM_HEIGHT, width: Dimensions.get('window').width }))
  const { height, width } = size
  // Which way is "back off the screen" along the toast's own y axis.
  const edge = position === 'top' ? -1 : 1
  // The exit target must clear the screen even when the stack is narrower than it (wrapperStyle) or the frame is turned (window width and height swap),
  // so it is measured against the larger of the toast's own width and either window dimension.
  const { height: windowHeight, width: windowWidth } = Dimensions.get('window')
  const clearance = Math.max(width, windowWidth, windowHeight)
  const fallback = useFallbackColors()

  const effectiveBg = backgroundColor ?? theme?.colors.surface ?? fallback.surface
  const effectiveText = textColor ?? theme?.colors.onSurface ?? fallback.text

  const handleDismiss = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id])
  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { height: laidOutHeight, width: laidOutWidth } = e.nativeEvent.layout
      if (laidOutWidth > 0) setSize((prev) => (prev.width === laidOutWidth && (laidOutHeight <= 0 || prev.height === laidOutHeight) ? prev : { height: laidOutHeight > 0 ? laidOutHeight : prev.height, width: laidOutWidth }))
      onMeasure(toast.id, laidOutHeight)
    },
    [onMeasure, toast.id]
  )

  // scheduleOnRN should be called from a worklet declared in the RN-runtime-scoped function
  // body, not from one manufactured deeper inside another callback - signalling completion
  // through a shared value and reacting to it here keeps that shape. This alone was NOT what
  // fixed the "[Worklets] Cannot copy value of type `NativeWorklets`" crash that used to
  // happen on every GestureDetector mount, though - that was a package-export-routing bug
  // (Metro was resolving the CJS build, whose bundler mangles `scheduleOnRN` into namespace
  // member access the Worklets Babel plugin can't recognize as forwardable). See package.json
  // ("react-native" condition -> dist/index.mjs) and https://github.com/software-mansion/react-native-reanimated/discussions/8811
  const swipeDismissed = useSharedValue(false)

  // The reaction below is held by this component, so it must not hand react-native-worklets one of the
  // component's own callbacks (the native side keeps it as a GC root for as long as the worklet lives,
  // which pinned every toast that ever showed). It calls the module-level callWorkletCallback by key.
  const dismissKey = useWorkletCallback(handleDismiss)
  useAnimatedReaction(
    () => swipeDismissed.value,
    (dismissed, wasDismissed) => {
      if (dismissed && !wasDismissed) scheduleOnRN(callWorkletCallback, dismissKey)
    }
  )

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

  // The swipe's state is stable, so the gesture is only rebuilt when the toast's size, edge or clearance changes - never as a swipe updates.
  const gesture = useMemo(() => buildSwipeGesture(swipe, swipeDismissed, width, height, edge, clearance), [clearance, edge, height, swipe, swipeDismissed, width])

  // Fades to 0.4 as the drag nears the distance that dismisses it, whichever way it goes.
  const opacity = useDerivedValue(() => {
    const progress = Math.max(Math.abs(translateX.value) / (width * SWIPE_DISMISS_FRACTION), Math.max(0, translateY.value * edge) / (height * SWIPE_EDGE_DISMISS_FRACTION))
    return interpolate(progress, [0, 1], [1, 0.4], Extrapolation.CLAMP)
  })

  const swipeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }]
  }))

  const entering = toastEntering(position)
  const exiting = toastExiting(position, outwardExit)
  const marginStyle = position === 'bottom' ? { bottom: 0, marginBottom: offset } : { marginTop: offset, top: 0 }

  // A toast's own icon/color (see Toast.ts's ToastOverrides) wins over the level's shared default -
  // the achievement-badge case this exists for varies icon+color per toast even though every one
  // of them is the same 'success' level.
  const effectiveIcon = toast.icon ?? levelIcon
  const effectiveColor = toast.color ?? levelColor
  const icon = toast.image ? <Image source={{ uri: toast.image }} style={styles.image} /> : Icon && effectiveIcon ? <Icon color={effectiveColor} name={effectiveIcon} size={20} /> : paper && effectiveIcon ? <paper.Icon color={effectiveColor} size={20} source={effectiveIcon} /> : <View style={[styles.indicator, { backgroundColor: effectiveColor }]} />

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

  return (
    <Animated.View layout={LinearTransition.duration(220)} style={[styles.itemContainer, marginStyle]}>
      {/* The detector wraps the STATIONARY wrapper (which also carries the enter/exit animation and the layout measurement); only the card inside is
      translated by the swipe. See buildSwipeGesture for why the gesture's own view must not move. */}
      <GestureDetector gesture={gesture}>
        <Animated.View entering={entering} exiting={exiting} onLayout={handleLayout}>
          <Animated.View style={swipeStyle}>
            {Card ? (
              <Card style={[styles.card, toastStyle, backgroundColor ? { backgroundColor } : undefined]} toast={toast}>
                {cardContent}
              </Card>
            ) : paper ? (
              <paper.Surface elevation={surfaceElevation ?? 1} style={[styles.card, toastStyle, backgroundColor ? { backgroundColor } : undefined]}>
                {cardContent}
              </paper.Surface>
            ) : (
              <View style={[styles.card, styles.cardShadow, { backgroundColor: effectiveBg }, toastStyle]}>{cardContent}</View>
            )}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  )
})
ToastItem.displayName = 'ToastItem'

export const Toaster = ({ backgroundColor, Card, captionStyle, clearButton, duration = 7000, historyButton, historyModal, Icon, keyboardAware = true, keyboardOffset = 0, labelStyle, levelColors, levelIcons, limit = 3, onHistoryPress, position = 'bottom', surfaceElevation, textColor, theme, toastStyle, wrapperStyle }: ToasterProps) => {
  const { clear, dismiss, history, historyVisible, openHistory, toasts } = useToast()
  const { haptics, paper, paperTheme } = useToastContext()
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

  const handleClearPress = useCallback(() => {
    if (haptics) void haptics.impactAsync(haptics.ImpactFeedbackStyle.Light)
    clear()
  }, [clear, haptics])

  const handleMeasure = useCallback((id: string, height: number) => {
    setHeights((prev) => (prev[id] === height ? prev : { ...prev, [id]: height }))
  }, [])

  const stackStyle = useAnimatedStyle(() => ({
    bottom: position === 'bottom' ? Math.max(insets.bottom, keyboardAware ? keyboard.height.value : 0) + keyboardOffset : undefined,
    top: position === 'top' ? insets.top : undefined
  }))

  const visibleToasts = useMemo(() => toasts.slice(-limit).reverse(), [limit, toasts])

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
  const resolvedHistoryModal = historyModal === undefined ? <HistoryModal backgroundColor={modalBg} levelColors={mergedColors} textColor={modalText} /> : historyModal

  const stack = (
    <Animated.View pointerEvents='box-none' style={[styles.stack, stackStyle, wrapperStyle]}>
      <Animated.View layout={LinearTransition.duration(220)} style={[styles.stackControls, position === 'bottom' ? { bottom: totalStackHeight + 4 } : { top: totalStackHeight + 4 }]}>
        <Animated.View entering={toastEntering(position)} exiting={toastExiting(position, false)} style={styles.stackControlsRow}>
          <View style={styles.stackControlsLeft}>{resolvedHistoryButton}</View>
          <View style={styles.stackControlsRight}>{resolvedClearButton}</View>
        </Animated.View>
      </Animated.View>
      {visibleToasts.map((toast, index) => (
        <ToastItem key={toast.id} backgroundColor={backgroundColor} Card={Card} captionStyle={captionStyle} duration={duration} Icon={Icon} labelStyle={labelStyle} levelColor={mergedColors[toast.level]} levelIcon={effectiveLevelIcons?.[toast.level]} offset={offsets[index]} onDismiss={dismiss} onMeasure={handleMeasure} outwardExit={exitsOutward(index, visibleToasts.length)} paper={paper} position={position} surfaceElevation={surfaceElevation} textColor={textColor} theme={resolvedTheme} toast={toast} toastStyle={toastStyle} />
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
