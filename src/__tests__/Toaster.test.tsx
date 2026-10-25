import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { type ComponentProps, type ReactNode, useEffect, useState } from 'react'
import { Pressable, type PressableProps } from 'react-native'
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

// `overrides.onPress` makes a toast's card a button: a tap calls it and dismisses the toast. The press sits inside the swipe's wrapper and
// outside the card (a host's own Card too), so it moves with the card, and the swipe's own guard keeps a swipe from pressing it (on native
// gesture-handler cancels the press once the pan takes the touch, on the web the wrapper eats the click; both @rific/gestures'). The mocked
// Pressable is a div with its role and label that a click presses (src/__mocks__/react-native.tsx). The mocked Modal draws the history list
// whether open or not, so a card's button is looked for inside its own swipe.
describe('pressable toasts', () => {
  const swipeOf = (title: string) => {
    const wrapper = screen.getAllByTestId('swipe-to-dismiss').find((el) => el.textContent?.startsWith(title))
    if (!wrapper) throw new Error(`No swipe wraps "${title}"`)
    return wrapper
  }

  it('calls onPress and dismisses that toast when its card is tapped', () => {
    const onPress = jest.fn()
    const { getApi } = renderToaster(3)
    act(() => {
      getApi().info('Other')
      getApi().info('New note', 'From Sam', undefined, { onPress })
    })
    const otherId = getApi().toasts[0].id

    act(() => {
      fireEvent.click(within(swipeOf('New note')).getByRole('button', { name: 'New note, From Sam' }))
    })
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(getApi().toasts.map((t) => t.id)).toEqual([otherId])
  })

  it('leaves a toast without onPress unpressable', () => {
    const { getApi } = renderToaster(3)
    act(() => getApi().info('Plain', 'Caption'))

    expect(screen.queryByRole('button')).toBeNull()
    act(() => {
      fireEvent.click(swipeOf('Plain'))
    })
    expect(getApi().toasts).toHaveLength(1)
  })

  it('never presses a toast that is swiped away', () => {
    const onPress = jest.fn()
    const { getApi } = renderToaster(3)
    act(() => getApi().info('New note', undefined, undefined, { onPress }))

    act(() => fireEvent(swipeOf('New note'), new Event('dismiss')))
    expect(onPress).not.toHaveBeenCalled()
    expect(getApi().toasts).toEqual([])
  })

  it("wraps a custom Card in the press, inside the swipe's wrapper, as the card's only button", () => {
    const Card = ({ children }: { children: ReactNode }) => <section data-testid='card'>{children}</section>
    const { getApi } = renderToaster(3, {}, { Card, position: 'top' })
    act(() => getApi().info('New note', undefined, undefined, { onPress: jest.fn() }))

    const buttons = within(swipeOf('New note')).getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(within(buttons[0]).getByTestId('card').textContent).toBe('New note')
  })

  it('dims a pressed card', () => {
    const { getApi } = renderToaster(3)
    act(() => getApi().info('New note', undefined, undefined, { onPress: jest.fn() }))

    const button = within(swipeOf('New note')).getByRole('button', { name: 'New note' })
    expect(JSON.parse(button.getAttribute('data-rn-style') ?? '{}').opacity).toBeUndefined()
    expect(JSON.parse(button.getAttribute('data-rn-pressed-style') ?? '{}').opacity).toBe(0.7)
  })

  it('closes the history and does what the toast did when its history row is tapped, and leaves other rows unpressable', () => {
    const onPress = jest.fn()
    const { getApi } = renderToaster(3)
    act(() => {
      getApi().info('Plain')
      getApi().info('New note', 'From Sam', undefined, { onPress })
    })
    act(() => getApi().openHistory())

    // The stack is hidden while the history is open, and the mocked Modal draws its content, so the history row is the only button.
    expect(screen.getAllByRole('button').map((el) => el.getAttribute('aria-label'))).toEqual(['New note, From Sam'])
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'New note, From Sam' }))
    })
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(getApi().historyVisible).toBe(false)
    expect(getApi().toasts.map((t) => t.title)).toEqual(['Plain'])
  })
})

// `overrides.leading` is a node of the host's own (e.g. an avatar) drawn at the card's leading edge in place of the image, icon or indicator.
describe('leading node', () => {
  const iconPaper: PaperModule = {
    Chip: () => null,
    Divider: () => null,
    Icon: ({ color, source }) => <span>{`${source}:${color}`}</span>,
    IconButton: () => null,
    Portal: ({ children }) => <>{children}</>,
    Surface: ({ children }) => <>{children}</>,
    useTheme: () => ({ colors: { background: '#fff', onSurface: '#000', surface: '#eee' } })
  }
  const avatar = <b data-testid='avatar'>S</b>

  it('draws the leading node in place of the icon and the image', () => {
    const { getApi } = renderToaster(3, { paper: iconPaper })
    act(() => getApi().info('New note', undefined, 'https://example.com/sam.jpg', { icon: 'note', leading: avatar }))

    const card = screen.getByTestId('swipe-to-dismiss')
    expect(within(card).getByTestId('avatar').textContent).toBe('S')
    expect(card.textContent).toBe('SNew note')
    expect(card.querySelector('img')).toBeNull()
  })

  it('keeps the image and the icon for a toast without one', () => {
    const { container, getApi } = renderToaster(3, { paper: iconPaper })
    act(() => {
      getApi().info('Photo', undefined, 'https://example.com/photo.jpg')
      getApi().info('Note', undefined, undefined, { icon: 'note' })
    })

    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/photo.jpg')
    expect(screen.getByText(`note:${LEVEL_COLORS.info}`)).toBeTruthy()
    expect(screen.queryByTestId('avatar')).toBeNull()
  })
})

// A Toaster with a `stack` shows only the toasts sent there (`overrides.stack`), e.g. one per player at a face-to-face table, each laid in a
// frame turned to face its seat (`renderFrame`); the main Toaster (no `stack`) keeps every other toast, which is every toast an app sent
// before stacks existed. Each Toaster's stack is laid in a test-id'd frame here, since the mocked Views draw no element of their own.
describe('stacks', () => {
  const stackPaper: PaperModule = {
    Chip: ({ children, onPress }) => (
      <button onClick={onPress} type='button'>
        {children}
      </button>
    ),
    Divider: () => <hr />,
    Icon: () => null,
    IconButton: () => null,
    Portal: ({ children }) => <div data-testid='portal'>{children}</div>,
    Surface: ({ children }) => <>{children}</>,
    useTheme: () => ({ colors: { background: '#fff', onSurface: '#000', surface: '#eee' } })
  }
  const framed = (name: string) => (stack: ReactNode) => <div data-testid={`frame-${name}`}>{stack}</div>
  const main: ComponentProps<typeof Toaster> = { renderFrame: framed('main') }
  const seatTwo: ComponentProps<typeof Toaster> = { renderFrame: framed('seat-2'), stack: 'seat-2' }

  const renderToasters = (toasters: ComponentProps<typeof Toaster>[], providerProps: Partial<Omit<ToastProviderProps, 'children'>> = {}) => {
    let api: ToastApi | null = null
    const Harness = ({ list }: { list: ComponentProps<typeof Toaster>[] }) => {
      api = useToast()
      return (
        <>
          {list.map((props, i) => (
            <Toaster key={props.stack ?? `main-${i}`} {...props} />
          ))}
        </>
      )
    }
    const { container, rerender } = render(
      <ToastProvider {...providerProps}>
        <Harness list={toasters} />
      </ToastProvider>
    )
    return {
      container,
      getApi: () => api as ToastApi,
      setToasters: (list: ComponentProps<typeof Toaster>[]) =>
        rerender(
          <ToastProvider {...providerProps}>
            <Harness list={list} />
          </ToastProvider>
        )
    }
  }
  const titlesIn = (frame: string) =>
    within(screen.getByTestId(`frame-${frame}`))
      .getAllByTestId('swipe-to-dismiss')
      .map((el) => el.textContent)

  it('shows each toast on the Toaster for its stack, and every untargeted one on the main Toaster', () => {
    const { getApi } = renderToasters([main, seatTwo])
    act(() => {
      getApi().error('Update failed')
      getApi().success('First Goal', undefined, undefined, { stack: 'seat-2' })
    })

    expect(titlesIn('main')).toEqual(['Update failed'])
    expect(titlesIn('seat-2')).toEqual(['First Goal'])
  })

  it("counts each Toaster's limit against its own stack", () => {
    const { getApi } = renderToasters([
      { ...main, limit: 2 },
      { ...seatTwo, limit: 2 }
    ])
    act(() => {
      getApi().info('Main')
      for (const title of ['One', 'Two', 'Three']) getApi().success(title, undefined, undefined, { stack: 'seat-2' })
    })

    expect(titlesIn('main')).toEqual(['Main'])
    expect(titlesIn('seat-2')).toEqual(['Three', 'Two'])
  })

  it("holds a stack's toasts until a Toaster for it mounts", () => {
    const { container, getApi, setToasters } = renderToasters([main])
    act(() => getApi().success('First Goal', undefined, undefined, { stack: 'seat-2' }))
    expect(container.textContent).not.toContain('First Goal')

    setToasters([main, seatTwo])
    expect(titlesIn('seat-2')).toEqual(['First Goal'])
  })

  it('lays the stack in renderFrame, inside the Portal when paper is injected', () => {
    const { getApi } = renderToasters([seatTwo], { paper: stackPaper })
    act(() => getApi().success('First Goal', undefined, undefined, { stack: 'seat-2' }))

    const frame = within(screen.getByTestId('portal')).getByTestId('frame-seat-2')
    expect(
      within(frame)
        .getAllByTestId('swipe-to-dismiss')
        .map((el) => el.textContent)
    ).toEqual(['First Goal'])
  })

  it('clears only its own stack from its clear control', () => {
    const { getApi } = renderToasters([main, seatTwo], { paper: stackPaper })
    act(() => {
      getApi().info('Main')
      getApi().success('First Goal', undefined, undefined, { stack: 'seat-2' })
    })

    act(() => {
      fireEvent.click(within(screen.getByTestId('frame-seat-2')).getByText('clear'))
    })
    expect(getApi().toasts.map((t) => t.title)).toEqual(['Main'])
  })

  it('leaves the history to the main Toaster: a stack draws no history modal unless one is passed', () => {
    const { container, getApi } = renderToasters([{ ...main, historyModal: null }, seatTwo], { paper: stackPaper })
    act(() => getApi().success('First Goal', undefined, undefined, { stack: 'seat-2' }))
    act(() => getApi().openHistory())

    // The mocked Modal draws its content whether open or not, so a history modal anywhere would list the toast.
    expect(container.textContent).not.toContain('First Goal')
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
    // The mocked View renders children with no wrapping DOM element and the mocked Text and
    // Pressable wrap theirs (see src/__mocks__/react-native.tsx), so the fallback chips' text
    // can't be told apart by element here. Check the rendered text directly instead.
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

// `pressable` stands in for React Native's Pressable everywhere the package draws one, e.g. @rific/feedback-press's for a haptic on
// touch-down. This one hands the (mocked) Pressable every prop it's given and notes each press before passing it on, as feedback-press
// fires its haptic and then calls through. The mock only clicks, so a press here is the click; feedback-press itself fires on press-in.
describe('injected pressable', () => {
  const feedback = jest.fn()
  const FeedbackPressable = ({ onPress, ...props }: PressableProps) => (
    <Pressable
      {...props}
      onPress={(event) => {
        feedback()
        onPress?.(event)
      }}
    />
  )

  // The mocked Modal draws the history whether open or not, so a pressable toast's history row carries the same label as its card
  const cardOf = (name: string) => within(screen.getByTestId('swipe-to-dismiss')).getByRole('button', { name })

  beforeEach(() => feedback.mockClear())

  it('presses a pressable toast through it, which still calls onPress and dismisses the toast', () => {
    const onPress = jest.fn()
    const { getApi } = renderToaster(3, { pressable: FeedbackPressable })
    act(() => getApi().info('New note', 'From Sam', undefined, { onPress }))

    const button = cardOf('New note, From Sam')
    expect(JSON.parse(button.getAttribute('data-rn-pressed-style') ?? '{}').opacity).toBe(0.7)
    act(() => {
      fireEvent.click(button)
    })
    expect(feedback).toHaveBeenCalledTimes(1)
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(getApi().toasts).toEqual([])
  })

  it('draws the fallback clear and history pills through it', () => {
    const { getApi } = renderToaster(3, { pressable: FeedbackPressable })
    act(() => getApi().success('First'))
    act(() => {
      fireEvent.click(screen.getByText('✕'))
    })
    expect(feedback).toHaveBeenCalledTimes(1)
    expect(getApi().toasts).toEqual([])

    act(() => getApi().success('Second'))
    act(() => {
      fireEvent.click(screen.getByText('history'))
    })
    expect(feedback).toHaveBeenCalledTimes(2)
    expect(getApi().historyVisible).toBe(true)
  })

  it("draws the history's rows and fallback header buttons through it", () => {
    const onPress = jest.fn()
    const { getApi } = renderToaster(3, { pressable: FeedbackPressable })
    act(() => getApi().info('New note', undefined, undefined, { onPress }))
    act(() => getApi().openHistory())

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'New note' }))
    })
    expect(feedback).toHaveBeenCalledTimes(1)
    expect(onPress).toHaveBeenCalledTimes(1)

    act(() => getApi().success('Another'))
    act(() => getApi().openHistory())
    // The mocked Modal draws its content whether open or not, so the header's buttons are there to press.
    act(() => {
      fireEvent.click(screen.getByText('Clear'))
    })
    expect(feedback).toHaveBeenCalledTimes(2)
    expect(getApi().history).toEqual([])
  })

  it('leaves the haptics tick off when both are given, so a press gives feedback once', () => {
    const impactAsync = jest.fn().mockResolvedValue(undefined)
    const { getApi } = renderToaster(3, { haptics: { ImpactFeedbackStyle: { Light: 'light' }, impactAsync }, pressable: FeedbackPressable })
    act(() => getApi().success('First'))
    act(() => {
      fireEvent.click(screen.getByText('✕'))
    })
    expect(feedback).toHaveBeenCalledTimes(1)
    expect(impactAsync).not.toHaveBeenCalled()
  })

  it("presses a toast through it with Paper too, and leaves Paper's own controls to `paper`", () => {
    const paper: PaperModule = {
      Chip: ({ children, onPress }) => (
        <button onClick={onPress} type='button'>
          {children}
        </button>
      ),
      Divider: () => <hr />,
      Icon: () => null,
      IconButton: () => null,
      Portal: ({ children }) => <>{children}</>,
      Surface: ({ children }) => <>{children}</>,
      useTheme: () => ({ colors: { background: '#fff', onSurface: '#000', surface: '#eee' } })
    }
    const { getApi } = renderToaster(3, { paper, pressable: FeedbackPressable })
    act(() => getApi().info('New note', undefined, undefined, { onPress: jest.fn() }))

    act(() => {
      fireEvent.click(cardOf('New note'))
    })
    expect(feedback).toHaveBeenCalledTimes(1)
    act(() => getApi().info('Plain'))
    act(() => {
      fireEvent.click(screen.getByText('clear'))
    })
    expect(feedback).toHaveBeenCalledTimes(1)
    expect(getApi().toasts).toEqual([])
  })
})
