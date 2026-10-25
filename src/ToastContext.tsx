import { type ComponentType, createContext, type Dispatch, type ReactNode, useContext, useReducer } from 'react'
import { Pressable as NativePressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'

import { defaultGenerateId, type Toast } from './Toast'
import type { PaperTheme } from './Toaster'

type ChipProps = { children: ReactNode; compact?: boolean; icon?: string; onPress?: () => void; style?: StyleProp<ViewStyle> }

type IconProps = { color?: string; size: number; source: string }

type IconButtonProps = { icon: string; onPress?: () => void }

type PortalProps = { children: ReactNode }

type SurfaceProps = { children: ReactNode; elevation?: 0 | 1 | 2 | 3 | 4 | 5; style?: StyleProp<ViewStyle> }

export type PaperModule = {
  Chip: ComponentType<ChipProps>
  Divider: ComponentType<Record<string, never>>
  Icon: ComponentType<IconProps>
  IconButton: ComponentType<IconButtonProps>
  Portal: ComponentType<PortalProps>
  Surface: ComponentType<SurfaceProps>
  useTheme: () => PaperTheme
}

// expo-haptics's real ImpactFeedbackStyle is a TS enum, not a plain string union - typing
// this any-shaped keeps `haptics={ExpoHaptics}` structurally assignable without importing
// the peer's real types (this only ever round-trips a value the injected module itself
// provided, via `haptics.impactAsync(haptics.ImpactFeedbackStyle.Light)`).
/* eslint-disable @typescript-eslint/no-explicit-any */
export type HapticsModule = {
  ImpactFeedbackStyle: { Light: any }
  impactAsync: (style?: any) => Promise<void>
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** A drop-in for React Native's `Pressable`, handed its props unchanged (`onPress`, `onPressIn`, a `style` callback, accessibility props),
 * e.g. `@rific/feedback-press`'s, which adds a haptic on touch-down. */
export type PressableComponent = ComponentType<PressableProps>

type ToastState = {
  history: Toast[]
  historyVisible: boolean
  toasts: Toast[]
}

// CLEAR's `stack` limits it to one Toaster's toasts (null being the main one's); left out, it clears every toast.
type ToastAction = { maxHistory: number; toast: Toast; type: 'ADD' } | { id: string; type: 'REMOVE' } | { stack?: string | null; type: 'CLEAR' } | { type: 'CLEAR_HISTORY' } | { type: 'OPEN_HISTORY' } | { type: 'CLOSE_HISTORY' }

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD':
      return {
        ...state,
        history: action.maxHistory === 0 ? state.history : [action.toast, ...state.history].slice(0, action.maxHistory),
        toasts: [...state.toasts, action.toast]
      }
    case 'REMOVE':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }
    case 'CLEAR':
      return { ...state, toasts: action.stack === undefined ? [] : state.toasts.filter((t) => t.stack !== action.stack) }
    case 'CLEAR_HISTORY':
      return { ...state, history: [] }
    case 'OPEN_HISTORY':
      return { ...state, historyVisible: true }
    case 'CLOSE_HISTORY':
      return { ...state, historyVisible: false }
  }
}

type ToastContextValue = {
  dispatch: Dispatch<ToastAction>
  generateId: () => string
  haptics: HapticsModule | null
  maxHistory: number
  paper: PaperModule | null
  paperTheme: PaperTheme | null
  /** The injected `pressable`, or React Native's own. */
  Pressable: PressableComponent
  state: ToastState
}

const ToastContext = createContext<ToastContextValue | null>(null)

export type ToastProviderProps = {
  children: ReactNode
  generateId?: () => string
  /** Injects expo-haptics for the light haptic tick on the history/clear stack controls. Pass `import * as Haptics from 'expo-haptics'`; omit to skip haptics entirely. Ignored when `pressable` is given, which owns press feedback then. */
  haptics?: HapticsModule
  maxHistory?: number
  /** Injects react-native-paper so Toaster/HistoryModal render Paper components instead of their plain RN fallback. Pass `import * as RNPaper from 'react-native-paper'`; omit to keep the zero-dependency fallback UI. */
  paper?: PaperModule
  /** Draws every press Toaster/HistoryModal make (a pressable toast, its history row, the fallback history/clear pills and history header
   * buttons) through this component in place of React Native's `Pressable`, e.g. `@rific/feedback-press`'s for a haptic on touch-down.
   * Paper's own controls come from `paper`. With this set, `haptics` is ignored, so no press ticks twice. */
  pressable?: PressableComponent
}

export const ToastProvider = ({ children, generateId = defaultGenerateId, haptics, maxHistory = 100, paper, pressable }: ToastProviderProps) => {
  const [state, dispatch] = useReducer(reducer, { history: [], historyVisible: false, toasts: [] })
  const paperTheme = paper ? paper.useTheme() : null
  // An injected pressable gives its own feedback, so the history/clear tick steps aside rather than firing on top of it
  const resolvedHaptics = pressable ? null : (haptics ?? null)
  return <ToastContext.Provider value={{ dispatch, generateId, haptics: resolvedHaptics, maxHistory, paper: paper ?? null, paperTheme, Pressable: pressable ?? NativePressable, state }}>{children}</ToastContext.Provider>
}

export const useToastContext = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
