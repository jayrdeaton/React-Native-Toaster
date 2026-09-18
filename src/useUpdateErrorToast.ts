import { useCallback } from 'react'

import { useToast } from './useToast'

// Every app's UpdateDialog.tsx/SettingsDialog.tsx bridges a failed update check into a toast with
// this exact one-line closure (onError/onUpdateError depending on which shared dialog it wires
// into) — factored out here so consumers pass this straight through instead of hand-rolling both
// the closure and the message string independently.
export const useUpdateErrorToast = (title = 'Update check failed') => {
  const { error } = useToast()
  return useCallback((message: string) => error(title, message), [error, title])
}
