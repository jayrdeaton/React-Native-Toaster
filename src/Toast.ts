export type ToastLevel = 'error' | 'info' | 'success' | 'warning'

export const LEVEL_COLORS: Record<ToastLevel, string> = {
  error: '#ef4444',
  info: '#3b82f6',
  success: '#22c55e',
  warning: '#f97316'
}

// Per-toast visual override, for a caller whose icon/color identity varies toast-to-toast within
// the same level (e.g. a bronze/silver/gold achievement badge) rather than following the fixed
// per-level palette every other toast of that level shares - see ToastItem's effectiveIcon/
// effectiveColor, which fall back to the level's own icon/color when either is omitted.
export type ToastOverrides = {
  color?: string
  icon?: string
}

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
  level: ToastLevel
  title: string | null

  constructor(data?: Partial<Toast>) {
    this.caption = data?.caption ?? null
    this.color = data?.color ?? null
    this.createdAt = data?.createdAt ?? new Date().toISOString()
    this.icon = data?.icon ?? null
    this.id = data?.id ?? defaultGenerateId()
    this.image = data?.image ?? null
    this.level = data?.level ?? 'info'
    this.title = data?.title ?? null
  }
}
