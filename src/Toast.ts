export type ToastLevel = 'error' | 'info' | 'success' | 'warning'

export const LEVEL_COLORS: Record<ToastLevel, string> = {
  error: '#ef4444',
  info: '#3b82f6',
  success: '#22c55e',
  warning: '#f97316'
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
  createdAt: string
  id: string
  image: string | null
  level: ToastLevel
  title: string | null

  constructor(data?: Partial<Toast>) {
    this.caption = data?.caption ?? null
    this.createdAt = data?.createdAt ?? new Date().toISOString()
    this.id = data?.id ?? defaultGenerateId()
    this.image = data?.image ?? null
    this.level = data?.level ?? 'info'
    this.title = data?.title ?? null
  }
}
