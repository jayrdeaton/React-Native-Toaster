import { act, renderHook } from '@testing-library/react'
import React from 'react'

import { ToastProvider } from '../ToastContext'
import { useToast } from '../useToast'

const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(ToastProvider, null, children)

const wrapperWithMaxHistory =
  (maxHistory: number) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(ToastProvider, { children, maxHistory })

describe('useToast', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    expect(result.current.toasts).toEqual([])
    expect(result.current.history).toEqual([])
  })

  it('adds a toast via error()', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => result.current.error('Something went wrong'))
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].level).toBe('error')
    expect(result.current.toasts[0].title).toBe('Something went wrong')
  })

  it('adds a toast with caption', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => result.current.warning('Watch out', 'Details here'))
    expect(result.current.toasts[0].caption).toBe('Details here')
  })

  it('adds a toast with an image', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => result.current.success('Uploaded', 'Photo saved', 'https://example.com/photo.jpg'))
    expect(result.current.toasts[0].image).toBe('https://example.com/photo.jpg')
  })

  it('adds a toast with a per-toast icon/color override', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => result.current.success('Flawless Victory', undefined, undefined, { color: '#FFD54F', icon: 'shield-star' }))
    expect(result.current.toasts[0].icon).toBe('shield-star')
    expect(result.current.toasts[0].color).toBe('#FFD54F')
  })

  it('defaults icon/color to null when no override is given', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => result.current.success('Done!'))
    expect(result.current.toasts[0].icon).toBeNull()
    expect(result.current.toasts[0].color).toBeNull()
  })

  it('records toast in history', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => result.current.success('Done!'))
    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0].level).toBe('success')
  })

  it('dismiss removes toast but keeps history', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => result.current.info('Info'))
    const id = result.current.toasts[0].id
    act(() => result.current.dismiss(id))
    expect(result.current.toasts).toHaveLength(0)
    expect(result.current.history).toHaveLength(1)
  })

  it('clear removes all toasts but keeps history', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => result.current.error('Error 1'))
    act(() => result.current.error('Error 2'))
    act(() => result.current.clear())
    expect(result.current.toasts).toHaveLength(0)
    expect(result.current.history).toHaveLength(2)
  })

  it('clearHistory empties history but keeps toasts', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => result.current.warning('Warning'))
    act(() => result.current.clearHistory())
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.history).toHaveLength(0)
  })

  it('history respects default maxHistory cap of 100', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    for (let i = 0; i < 105; i++) {
      act(() => result.current.info(`Toast ${i}`))
    }
    expect(result.current.history).toHaveLength(100)
  })

  it('historyVisible starts as false', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    expect(result.current.historyVisible).toBe(false)
  })

  it('openHistory sets historyVisible to true', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => result.current.openHistory())
    expect(result.current.historyVisible).toBe(true)
  })

  it('closeHistory sets historyVisible back to false', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => result.current.openHistory())
    act(() => result.current.closeHistory())
    expect(result.current.historyVisible).toBe(false)
  })

  it('maxHistory={0} disables history tracking', () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrapperWithMaxHistory(0) })
    act(() => result.current.info('Toast'))
    expect(result.current.history).toHaveLength(0)
    expect(result.current.toasts).toHaveLength(1)
  })

  it('maxHistory caps history at the given limit', () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrapperWithMaxHistory(5) })
    for (let i = 0; i < 8; i++) {
      act(() => result.current.info(`Toast ${i}`))
    }
    expect(result.current.history).toHaveLength(5)
  })

  it('throws when used outside ToastProvider', () => {
    expect(() => renderHook(() => useToast())).toThrow('useToast must be used within a ToastProvider')
  })
})
