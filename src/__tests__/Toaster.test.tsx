import { act, fireEvent, render, screen } from '@testing-library/react'
import { type ComponentProps, type ReactNode, useEffect, useState } from 'react'

import { lastPanCallbacks, panInstanceCount } from '../__mocks__/react-native-gesture-handler'
import { type HapticsModule, type PaperModule, type ToastProviderProps, ToastProvider } from '../ToastContext'
import { LEVEL_COLORS } from '../Toast'
import { Toaster } from '../Toaster'
import { useToast } from '../useToast'

type ToastApi = ReturnType<typeof useToast>

const renderToaster = (limit = 3, providerProps: Partial<Omit<ToastProviderProps, 'children'>> = {}, toasterProps: Partial<ComponentProps<typeof Toaster>> = {}) => {
  let api: ToastApi | null = null
  const Harness = () => {
    api = useToast()
    return <Toaster limit={limit} {...toasterProps} />
  }
  const { container } = render(
    <ToastProvider {...providerProps}>
      <Harness />
    </ToastProvider>
  )
  return { container, getApi: () => api as ToastApi }
}

beforeEach(() => {
  panInstanceCount.current = 0
  lastPanCallbacks.onEnd = undefined
  lastPanCallbacks.onUpdate = undefined
})

describe('Toaster', () => {
  it('does not throw across rapid toast churn (add beyond limit, dismiss, clear)', () => {
    const { getApi } = renderToaster(3)
    expect(() => {
      act(() => {
        for (let i = 0; i < 10; i++) getApi().success(`Toast ${i}`)
      })
      act(() => getApi().dismiss(getApi().toasts[0].id))
      act(() => getApi().clear())
    }).not.toThrow()
  })

  it('memoizes the Pan gesture instead of rebuilding it on unrelated re-renders', () => {
    const { getApi } = renderToaster(3)

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
    const { getApi } = renderToaster(3)
    act(() => getApi().success('Swipe me'))
    const toastId = getApi().toasts[0].id

    expect(lastPanCallbacks.onEnd).toBeDefined()
    act(() => {
      lastPanCallbacks.onEnd?.({ translationX: 300 })
    })

    expect(getApi().toasts.find((t) => t.id === toastId)).toBeUndefined()
  })

  it('snaps back without dismissing when a swipe stays under the threshold', () => {
    const { getApi } = renderToaster(3)
    act(() => getApi().success('Stay put'))
    const toastId = getApi().toasts[0].id

    act(() => {
      lastPanCallbacks.onEnd?.({ translationX: 20 })
    })

    expect(getApi().toasts.find((t) => t.id === toastId)).toBeDefined()
  })

  it('dismisses via the swipe-completion signal exactly once, leaving other toasts untouched', () => {
    // Regression test for the swipe-dismiss completion path: the withTiming callback only
    // flips a shared value, and a separate useAnimatedReaction is what calls scheduleOnRN
    // (see the comment in Toaster.tsx). This exercises that whole chain end to end and
    // guards the dismissed/wasDismissed edge-detection against firing more than once or for
    // the wrong toast.
    const { getApi } = renderToaster(3)
    act(() => {
      getApi().success('First')
      getApi().success('Second')
    })
    const [firstId, secondId] = getApi().toasts.map((t) => t.id)

    // visibleToasts renders newest-first, so ToastItem mounts in reverse chronological
    // order and the *last* Gesture.Pan() to register - the one lastPanCallbacks holds - is
    // the oldest (first-added) toast.
    act(() => {
      lastPanCallbacks.onEnd?.({ translationX: -300 })
    })

    const remainingIds = getApi().toasts.map((t) => t.id)
    expect(remainingIds).toEqual([secondId])
    expect(remainingIds).not.toContain(firstId)
  })
})

// react-native-paper/expo-haptics are no longer auto-detected via require() - the
// require()-in-try/catch pattern doesn't survive Metro resolving the "react-native" export
// condition to an ESM build (see the comment in Toaster.tsx and package.json). Consumers now
// inject already-imported modules via ToastProvider props instead.
describe('optional peer injection (paper/haptics)', () => {
  const fakePaper: PaperModule = {
    Chip: ({ children, onPress }) => (
      <button onClick={onPress} type='button'>
        {children}
      </button>
    ),
    Divider: () => <hr />,
    Icon: () => null,
    IconButton: ({ icon, onPress }) => (
      <button onClick={onPress} type='button'>
        {icon}
      </button>
    ),
    Portal: ({ children }) => <>{children}</>,
    Surface: ({ children }) => <>{children}</>,
    useTheme: () => ({ colors: { background: '#fff', onSurface: '#000', surface: '#eee' } })
  }

  it('renders the plain fallback UI when no paper module is provided', () => {
    // The mocked View/Text/Pressable render children with no wrapping DOM element (see
    // src/__mocks__/react-native.tsx), so text ends up as bare, unwrapped text nodes -
    // getByText can't match an element boundary here. Check the rendered text directly instead.
    const { container, getApi } = renderToaster(3)
    act(() => getApi().success('Plain'))

    expect(container.textContent).toContain('✕')
    expect(container.textContent).not.toContain('clear')
  })

  it('renders Paper components and fires the injected haptics callback when both are provided', () => {
    const impactAsync = jest.fn().mockResolvedValue(undefined)
    const fakeHaptics: HapticsModule = { ImpactFeedbackStyle: { Light: 'light' }, impactAsync }

    const { getApi } = renderToaster(3, { haptics: fakeHaptics, paper: fakePaper })
    act(() => getApi().success('Styled'))

    expect(screen.queryByText('✕')).toBeNull()
    const clearButton = screen.getByText('clear')

    act(() => {
      fireEvent.click(clearButton)
    })
    expect(impactAsync).toHaveBeenCalledWith('light')
  })

  it('uses a per-toast icon/color override instead of the level default', () => {
    const overridePaper: PaperModule = {
      ...fakePaper,
      Icon: ({ color, source }) => <span>{`${source}:${color}`}</span>
    }
    const { getApi } = renderToaster(3, { paper: overridePaper })
    act(() => getApi().success('Flawless Victory', undefined, undefined, { color: '#FFD54F', icon: 'shield-star' }))

    expect(screen.getByText('shield-star:#FFD54F')).toBeTruthy()
  })

  it('falls back to the level default icon/color when no override is given', () => {
    const overridePaper: PaperModule = {
      ...fakePaper,
      Icon: ({ color, source }) => <span>{`${source}:${color}`}</span>
    }
    const { getApi } = renderToaster(3, { paper: overridePaper })
    act(() => getApi().success('Plain success'))

    expect(screen.getByText(`check-circle:${LEVEL_COLORS.success}`)).toBeTruthy()
  })

  it('hides the history and clear stack controls when historyButton/clearButton are null', () => {
    const { getApi } = renderToaster(3, { paper: fakePaper }, { clearButton: null, historyButton: null })
    act(() => getApi().success('First'))

    expect(screen.queryByText('history')).toBeNull()
    expect(screen.queryByText('clear')).toBeNull()
  })

  it('replaces the history and clear stack controls with custom nodes', () => {
    const { container, getApi } = renderToaster(3, { paper: fakePaper }, { clearButton: 'nuke-it', historyButton: 'past-toasts' })
    act(() => getApi().success('First'))

    expect(container.textContent).toContain('past-toasts')
    expect(container.textContent).toContain('nuke-it')
    expect(screen.queryByText('history')).toBeNull()
    expect(screen.queryByText('clear')).toBeNull()
  })

  it('shows history entries in the default history modal when opened', () => {
    const { container, getApi } = renderToaster(3, { paper: fakePaper })
    act(() => getApi().success('First'))
    act(() => getApi().openHistory())

    expect(container.textContent).toContain('First')
  })

  it('renders nothing for the history modal slot when historyModal is null', () => {
    // HistoryModal's item text renders through the plain react-native Text mock (no wrapping
    // DOM element - see the "plain fallback UI" test above), so check raw text content rather
    // than queryByText, which can't match a bare text node either way.
    const { container, getApi } = renderToaster(3, { paper: fakePaper }, { historyModal: null })
    act(() => getApi().success('First'))
    act(() => getApi().openHistory())

    expect(container.textContent).not.toContain('First')
  })

  // Regression test for a real bug: react-native-paper's actual Portal doesn't render
  // children in place, it hands them to a PortalHost/PortalManager that lives wherever
  // PaperProvider mounted it - typically an ancestor of ToastProvider, not a descendant of
  // it. So a component that calls useToastContext() itself (instead of receiving `paper` as
  // a prop) throws once it's rendered through the portal, even though it's written inside
  // <ToastProvider> in JSX. ReactDOM.createPortal wouldn't reproduce this (it preserves
  // context through the DOM boundary); this fake Portal instead hands children to a
  // sibling-of-ToastProvider host component, matching react-native-paper's real behavior.
  it('renders toast cards via a Portal whose host sits outside ToastProvider, without throwing', () => {
    let portalChildren: ReactNode = null
    let notifyHost: (() => void) | null = null

    const FakePortalHost = () => {
      const [, forceUpdate] = useState(0)
      useEffect(() => {
        notifyHost = () => forceUpdate((n) => n + 1)
        return () => {
          notifyHost = null
        }
      }, [])
      return <>{portalChildren}</>
    }

    const portalPaper: PaperModule = {
      ...fakePaper,
      Portal: ({ children }) => {
        portalChildren = children
        notifyHost?.()
        return null
      }
    }

    let api: ToastApi | null = null
    const Harness = () => {
      api = useToast()
      return <Toaster limit={3} />
    }

    let container: HTMLElement
    expect(() => {
      ;({ container } = render(
        <>
          <ToastProvider paper={portalPaper}>
            <Harness />
          </ToastProvider>
          <FakePortalHost />
        </>
      ))
      act(() => (api as ToastApi).success('Outside the provider tree'))
    }).not.toThrow()

    expect(container!.textContent).toContain('Outside the provider tree')
  })
})
