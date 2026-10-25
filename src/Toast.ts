import type { ReactNode } from 'react'

export type ToastLevel = 'error' | 'info' | 'success' | 'warning'

export const LEVEL_COLORS: Record<ToastLevel, string> = {
  error: '#ef4444',
  info: '#3b82f6',
  success: '#22c55e',
  warning: '#f97316'
}

// Per-toast options. `icon`/`color` are for a caller whose icon/color identity varies toast-to-toast
// within the same level (e.g. a bronze/silver/gold achievement badge) rather than following the fixed
// per-level palette every other toast of that level shares - see ToastItem's effectiveIcon/
// effectiveColor, which fall back to the level's own icon/color when either is omitted. `leading`
// is a node of the host's own (e.g. a person's avatar) drawn at the card's leading edge, at its own
// size, in place of the image, icon or indicator. `onPress` makes the card a button: a tap calls it
// and dismisses the toast. `stack` sends the toast to the <Toaster stack> of that name instead of
// the app's main one (see Toaster.tsx's `stack` prop): e.g. a second Toaster turned to face a
// player across the table.
export type ToastOverrides = {
  color?: string
  icon?: string
  leading?: ReactNode
  onPress?: () => void
  stack?: string
}

/** What a screen reader reads for a pressable toast (its card, or its row in the history): the title and caption. */
export const toastLabel = (toast: Pick<Toast, 'caption' | 'title'>): string => [toast.title, toast.caption].filter(Boolean).join(', ')

let _seq = 0
export const defaultGenerateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${++_seq}`
}

export class Toast {
  caption: string | null
  color: string | null
  createdAt: string
  icon: string | null
  id: string
  image: string | null
  /** Drawn at the card's leading edge in place of the image, icon or indicator (null for none). */
  leading: ReactNode
  level: ToastLevel
  /** Called when the card is tapped, which also dismisses the toast; null leaves the card unpressable. */
  onPress: (() => void) | null
  /** The <Toaster stack> that shows it, null for the main Toaster (one with no `stack`). */
  stack: string | null
  title: string | null

  constructor(data?: Partial<Toast>) {
    this.caption = data?.caption ?? null
    this.color = data?.color ?? null
    this.createdAt = data?.createdAt ?? new Date().toISOString()
    this.icon = data?.icon ?? null
    this.id = data?.id ?? defaultGenerateId()
    this.image = data?.image ?? null
    this.leading = data?.leading ?? null
    this.level = data?.level ?? 'info'
    this.onPress = data?.onPress ?? null
    this.stack = data?.stack ?? null
    this.title = data?.title ?? null
  }
}
