import { act, fireEvent, render, screen } from '@testing-library/react'
import { type ComponentProps, type ReactNode, useEffect, useState } from 'react'
import { FadeInDown, FadeInUp, FadeOutDown, FadeOutUp } from 'react-native-reanimated'

import { lastToastMotion } from '../__mocks__/react-native-reanimated'
import { LEVEL_COLORS } from '../Toast'
import { type HapticsModule, type PaperModule, ToastProvider, type ToastProviderProps } from '../ToastContext'
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
  lastToastMotion.current = undefined
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
})

// The swipe itself is @rific/gestures' and is tested there. Its SwipeToDismiss is mocked as a div carrying the `edge` it was given, which a
// 'dismiss' event fired on stands for a swipe flying the toast off (src/__mocks__/@rific/gestures.tsx). Here: every toast's card is wrapped
// in one that also swipes off its stack's edge, and a swipe completing dismisses that toast and no other.
describe('swipe to dismiss', () => {
  const swipeOf = (title: string) => {
    const wrapper = screen.getAllByTestId('swipe-to-dismiss').find((el) => el.textContent === title)
    if (!wrapper) throw new Error(`No swipe wraps "${title}"`)
    return wrapper
  }
  const swipeAway = (title: string) => act(() => fireEvent(swipeOf(title), new Event('dismiss')))

  it("wraps each toast's card in its own swipe, off the bottom of a bottom stack", () => {
    const { getApi } = renderToaster(3)
    act(() => {
      getApi().success('First')
      getApi().success('Second')
    })

    expect(screen.getAllByTestId('swipe-to-dismiss').map((el) => [el.textContent, el.getAttribute('data-edge')])).toEqual([
      ['Second', 'bottom'],
      ['First', 'bottom']
    ])
  })

  it('swipes a top stack off the top', () => {
    const { getApi } = renderToaster(3, {}, { position: 'top' })
    act(() => getApi().success('Up'))

    expect(swipeOf('Up').getAttribute('data-edge')).toBe('top')
  })

  it('dismisses the swiped toast and no other', () => {
    const { getApi } = renderToaster(3)
    act(() => {
      getApi().success('First')
      getApi().success('Second')
      getApi().success('Third')
    })
    const [firstId, , thirdId] = getApi().toasts.map((t) => t.id)

    swipeAway('Second')
    expect(getApi().toasts.map((t) => t.id)).toEqual([firstId, thirdId])
    expect(screen.getAllByTestId('swipe-to-dismiss').map((el) => el.textContent)).toEqual(['Third', 'First'])
  })

  it('keeps each swipe on its own toast as the stack changes around it', () => {
    const { getApi } = renderToaster(3)
    act(() => getApi().success('First'))
    act(() => getApi().success('Second'))
    act(() => getApi().dismiss(getApi().toasts[1].id))
    act(() => getApi().success('Third'))
    const thirdId = getApi().toasts[1].id

    swipeAway('First')
    expect(getApi().toasts.map((t) => t.id)).toEqual([thirdId])
  })

  it('swipes a custom Card away too', () => {
    const Card = ({ children }: { children: ReactNode }) => <section>{children}</section>
    const { getApi } = renderToaster(3, {}, { Card })
    act(() => getApi().info('Custom'))

    swipeAway('Custom')
    expect(getApi().toasts).toEqual([])
  })
})

describe('enter and exit', () => {
  it('a lone toast in a top stack comes down into place from above and goes back up', () => {
    const { getApi } = renderToaster(3, {}, { position: 'top' })
    act(() => getApi().info('Hello'))
    expect(lastToastMotion.current).toEqual({ entering: FadeInUp, exiting: FadeOutUp })
  })

  it('a lone toast in a bottom stack rises into place from below and goes back down', () => {
    const { getApi } = renderToaster(3)
    act(() => getApi().info('Hello'))
    expect(lastToastMotion.current).toEqual({ entering: FadeInDown, exiting: FadeOutDown })
  })
})

describe('custom card and text styles', () => {
  it('draws each card with the Card component, handing it the card style, the content and the toast', () => {
    const cards: { level: string; style: unknown }[] = []
    const Card = ({ children, style, toast }: { children: ReactNode; style: unknown; toast: { level: string } }) => {
      cards.push({ level: toast.level, style })
      return <div data-testid='card'>{children}</div>
    }
    const { container, getApi } = renderToaster(3, {}, { Card, toastStyle: { marginHorizontal: 0 } })
    act(() => getApi().warning('Careful', 'Details'))

    expect(screen.getByTestId('card').textContent).toBe('CarefulDetails')
    expect(container.textContent).toContain('Careful')
    const last = cards[cards.length - 1]
    expect(last.level).toBe('warning')
    const flat = Object.assign({}, ...(last.style as object[]).filter(Boolean))
    expect(flat).toMatchObject({ flexDirection: 'row', marginHorizontal: 0 })
  })

  it('applies labelStyle to the title and captionStyle to the caption, over the built-in styles', () => {
    const { container, getApi } = renderToaster(3, {}, { captionStyle: { color: '#123456', fontFamily: 'Caption' }, labelStyle: { fontFamily: 'Label' }, textColor: '#fff' })
    act(() => getApi().info('Title', 'Caption'))

    const styleOf = (text: string) =>
      JSON.parse(
        Array.from(container.querySelectorAll('span'))
          .find((el) => el.textContent === text)
          ?.getAttribute('data-rn-style') ?? '{}'
      )
    expect(styleOf('Title')).toMatchObject({ color: '#fff', fontFamily: 'Label', fontSize: 14 })
    expect(styleOf('Caption')).toMatchObject({ color: '#123456', fontFamily: 'Caption', fontSize: 12 })
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
        // notifyHost calls setState on FakePortalHost, a sibling component - deferring to an
        // effect (vs. calling it inline here, during Portal's own render) avoids "Cannot update a
        // component while rendering a different component".
        useEffect(() => {
          notifyHost?.()
        })
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
