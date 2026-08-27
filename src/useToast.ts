import { useCallback } from 'react'

import { Toast, type ToastLevel, type ToastOverrides } from './Toast'
import { useToastContext } from './ToastContext'

export const useToast = () => {
  const { dispatch, generateId, maxHistory, state } = useToastContext()

  const add = useCallback(
    (level: ToastLevel, title: string, caption?: string, image?: string, overrides?: ToastOverrides) => {
      const toast = new Toast({ caption, color: overrides?.color, icon: overrides?.icon, id: generateId(), image, level, title })
      dispatch({ maxHistory, toast: { ...toast }, type: 'ADD' })
    },
    [dispatch, generateId, maxHistory]
  )

  const dismiss = useCallback((id: string) => dispatch({ id, type: 'REMOVE' }), [dispatch])
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), [dispatch])
  const clearHistory = useCallback(() => dispatch({ type: 'CLEAR_HISTORY' }), [dispatch])
  const openHistory = useCallback(() => dispatch({ type: 'OPEN_HISTORY' }), [dispatch])
  const closeHistory = useCallback(() => dispatch({ type: 'CLOSE_HISTORY' }), [dispatch])

  const error = useCallback((title: string, caption?: string, image?: string, overrides?: ToastOverrides) => add('error', title, caption, image, overrides), [add])
  const info = useCallback((title: string, caption?: string, image?: string, overrides?: ToastOverrides) => add('info', title, caption, image, overrides), [add])
  const success = useCallback((title: string, caption?: string, image?: string, overrides?: ToastOverrides) => add('success', title, caption, image, overrides), [add])
  const warning = useCallback((title: string, caption?: string, image?: string, overrides?: ToastOverrides) => add('warning', title, caption, image, overrides), [add])

  return {
    clear,
    clearHistory,
    closeHistory,
    dismiss,
    error,
    history: state.history,
    historyVisible: state.historyVisible,
    info,
    openHistory,
    success,
    toast: state.toasts[state.toasts.length - 1],
    toasts: state.toasts,
    warning
  }
}
