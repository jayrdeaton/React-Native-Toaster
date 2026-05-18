export type ToastLevel = 'error' | 'info' | 'success' | 'warning'

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
    this.id = data?.id ?? crypto.randomUUID()
    this.image = data?.image ?? null
    this.level = data?.level ?? 'info'
    this.title = data?.title ?? null
  }
}
