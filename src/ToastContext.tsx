import { createContext, type ReactNode, useContext, useReducer } from 'react'

import type { Toast } from './Toast'

type ToastState = {
  history: Toast[]
  toasts: Toast[]
}

type ToastAction = { toast: Toast; type: 'ADD' } | { id: string; type: 'REMOVE' } | { type: 'CLEAR' } | { type: 'CLEAR_HISTORY' }

const MAX_HISTORY = 100

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD':
      return {
        history: [action.toast, ...state.history].slice(0, MAX_HISTORY),
        toasts: [...state.toasts, action.toast]
      }
    case 'REMOVE':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }
    case 'CLEAR':
      return { ...state, toasts: [] }
    case 'CLEAR_HISTORY':
      return { ...state, history: [] }
  }
}

type ToastContextValue = {
  dispatch: React.Dispatch<ToastAction>
  state: ToastState
}

const ToastContext = createContext<ToastContextValue | null>(null)

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, { history: [], toasts: [] })
  return <ToastContext.Provider value={{ dispatch, state }}>{children}</ToastContext.Provider>
}

export const useToastContext = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
