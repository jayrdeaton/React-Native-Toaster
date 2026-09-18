import { act, renderHook } from '@testing-library/react'
import React from 'react'

import { ToastProvider } from '../ToastContext'
import { useToast } from '../useToast'
import { useUpdateErrorToast } from '../useUpdateErrorToast'

const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(ToastProvider, null, children)

describe('useUpdateErrorToast', () => {
  it('raises an error toast titled "Update check failed" with the message as caption', () => {
    const { result } = renderHook(() => ({ toast: useToast(), updateError: useUpdateErrorToast() }), { wrapper })
    act(() => result.current.updateError('Network request failed'))
    expect(result.current.toast.toasts[0].level).toBe('error')
    expect(result.current.toast.toasts[0].title).toBe('Update check failed')
    expect(result.current.toast.toasts[0].caption).toBe('Network request failed')
  })

  it('accepts a custom title', () => {
    const { result } = renderHook(() => ({ toast: useToast(), updateError: useUpdateErrorToast('Sync failed') }), { wrapper })
    act(() => result.current.updateError('Timed out'))
    expect(result.current.toast.toasts[0].title).toBe('Sync failed')
  })
})
