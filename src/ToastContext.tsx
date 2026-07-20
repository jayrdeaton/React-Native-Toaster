import { createContext, type Dispatch, type ReactNode, useContext, useReducer } from 'react'

import { paper } from './paper'
import { defaultGenerateId, type Toast } from './Toast'
import type { PaperTheme } from './Toaster'

type ToastState = {
  history: Toast[]
  historyVisible: boolean
  toasts: Toast[]
}

type ToastAction = { maxHistory: number; toast: Toast; type: 'ADD' } | { id: string; type: 'REMOVE' } | { type: 'CLEAR' } | { type: 'CLEAR_HISTORY' } | { type: 'OPEN_HISTORY' } | { type: 'CLOSE_HISTORY' }

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
      return { ...state, toasts: [] }
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
  maxHistory: number
  paperTheme: PaperTheme | null
  state: ToastState
}

const ToastContext = createContext<ToastContextValue | null>(null)

export const ToastProvider = ({ children, generateId = defaultGenerateId, maxHistory = 100 }: { children: ReactNode; generateId?: () => string; maxHistory?: number }) => {
  const [state, dispatch] = useReducer(reducer, { history: [], historyVisible: false, toasts: [] })
  const paperTheme = paper ? paper.useTheme() : null
  return <ToastContext.Provider value={{ dispatch, generateId, maxHistory, paperTheme, state }}>{children}</ToastContext.Provider>
}

export const useToastContext = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
