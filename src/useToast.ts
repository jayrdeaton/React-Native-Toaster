import { useCallback } from 'react'

import { Toast, type ToastLevel } from './Toast'
import { useToastContext } from './ToastContext'

export const useToast = () => {
  const { dispatch, generateId, state } = useToastContext()

  const add = useCallback(
    (level: ToastLevel, title: string, caption?: string) => {
      const toast = new Toast({ caption, id: generateId(), level, title })
      dispatch({ toast: { ...toast }, type: 'ADD' })
    },
    [dispatch, generateId]
  )

  const dismiss = useCallback((id: string) => dispatch({ id, type: 'REMOVE' }), [dispatch])
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), [dispatch])
  const clearHistory = useCallback(() => dispatch({ type: 'CLEAR_HISTORY' }), [dispatch])

  const error = useCallback((title: string, caption?: string) => add('error', title, caption), [add])
  const info = useCallback((title: string, caption?: string) => add('info', title, caption), [add])
  const success = useCallback((title: string, caption?: string) => add('success', title, caption), [add])
  const warning = useCallback((title: string, caption?: string) => add('warning', title, caption), [add])

  return {
    clear,
    clearHistory,
    dismiss,
    error,
    history: state.history,
    info,
    success,
    toast: state.toasts[state.toasts.length - 1],
    toasts: state.toasts,
    warning
  }
}
