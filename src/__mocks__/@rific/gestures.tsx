import { type ReactNode, useEffect, useRef } from 'react'

// The gesture itself is @rific/gestures' own tests'. Here SwipeToDismiss is its stationary wrapper: a div carrying the `edge` it was given
// (`data-edge`) and listening for a 'dismiss' event, which stands for a swipe flying the content off, so a test can fire it on the toast it
// wants (`fireEvent(wrapper, new Event('dismiss'))`). No `onDismiss` means no swipe, so nothing listens.
export const SwipeToDismiss = ({ children, edge, onDismiss }: { children?: ReactNode; edge?: 'bottom' | 'top'; onDismiss?: () => void }) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node || !onDismiss) return
    node.addEventListener('dismiss', onDismiss)
    return () => node.removeEventListener('dismiss', onDismiss)
  }, [onDismiss])
  return (
    <div data-edge={edge} data-testid='swipe-to-dismiss' ref={ref}>
      {children}
    </div>
  )
}
