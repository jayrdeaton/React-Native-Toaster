import { act, render } from '@testing-library/react'
import React from 'react'

import { lastPanCallbacks, panInstanceCount } from '../__mocks__/react-native-gesture-handler'
import { ToastProvider } from '../ToastContext'
import { Toaster } from '../Toaster'
import { useToast } from '../useToast'

type ToastApi = ReturnType<typeof useToast>

const renderToaster = (limit = 3) => {
  let api: ToastApi | null = null
  const Harness = () => {
    api = useToast()
    return <Toaster limit={limit} />
  }
  render(
    <ToastProvider>
      <Harness />
    </ToastProvider>
  )
  return () => api as ToastApi
}

beforeEach(() => {
  panInstanceCount.current = 0
  lastPanCallbacks.onEnd = undefined
  lastPanCallbacks.onUpdate = undefined
})

describe('Toaster', () => {
  it('does not throw across rapid toast churn (add beyond limit, dismiss, clear)', () => {
    const getApi = renderToaster(3)
    expect(() => {
      act(() => {
        for (let i = 0; i < 10; i++) getApi().success(`Toast ${i}`)
      })
      act(() => getApi().dismiss(getApi().toasts[0].id))
      act(() => getApi().clear())
    }).not.toThrow()
  })

  it('memoizes the Pan gesture instead of rebuilding it on unrelated re-renders', () => {
    const getApi = renderToaster(3)

    act(() => getApi().success('First'))
    expect(panInstanceCount.current).toBe(1)

    // Adding a second toast re-renders Toaster and every visible ToastItem
    // (new offsets/isTop), but must not rebuild the first toast's gesture.
    act(() => getApi().success('Second'))
    expect(panInstanceCount.current).toBe(2)

    act(() => getApi().success('Third'))
    expect(panInstanceCount.current).toBe(3)
  })

  it('dismisses the correct toast when a swipe exceeds the threshold', () => {
    const getApi = renderToaster(3)
    act(() => getApi().success('Swipe me'))
    const toastId = getApi().toasts[0].id

    expect(lastPanCallbacks.onEnd).toBeDefined()
    act(() => {
      lastPanCallbacks.onEnd?.({ translationX: 300 })
    })

    expect(getApi().toasts.find((t) => t.id === toastId)).toBeUndefined()
  })

  it('snaps back without dismissing when a swipe stays under the threshold', () => {
    const getApi = renderToaster(3)
    act(() => getApi().success('Stay put'))
    const toastId = getApi().toasts[0].id

    act(() => {
      lastPanCallbacks.onEnd?.({ translationX: 20 })
    })

    expect(getApi().toasts.find((t) => t.id === toastId)).toBeDefined()
  })
})
