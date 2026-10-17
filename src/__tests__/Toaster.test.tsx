import { act, fireEvent, render, screen } from '@testing-library/react'
import { type ComponentProps, type ReactNode, useEffect, useState } from 'react'
import { FadeInDown, FadeInUp, FadeOutDown, FadeOutUp } from 'react-native-reanimated'

import { lastPanCallbacks, lastPanConfig, panInstanceCount } from '../__mocks__/react-native-gesture-handler'
import { lastOnLayout, lastToastMotion } from '../__mocks__/react-native-reanimated'
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

// A swipe as the gesture runtime reports it: the pointer goes down and the pan activates at local x = `from`, then the pointer is at local x = `to`.
// `x` is relative to the view the handler is attached to (the toast's stationary wrapper); `translationX/Y` are in WINDOW space and are deliberately
// passed as `extra` so a test can say what they were. Every call happens in the same millisecond, so the pointer has no speed: only the distance counts.
const swipe = (from: number, to: number, extra: { translationX?: number; translationY?: number } = {}) => {
  lastPanCallbacks.onBegin?.({ x: from, y: 0 })
  lastPanCallbacks.onStart?.({ x: from, y: 0 })
  lastPanCallbacks.onUpdate?.({ x: to, y: 0, ...extra })
  lastPanCallbacks.onEnd?.({ x: to, y: 0, ...extra })
}

// A pan sampled over time: `points` are [ms after activation, local x, local y], after a touch-down at `down` and activation at the first point (the clock
// is Date.now, which the gesture samples for the pointer's speed). The release is at the last point, `releaseAfter` ms after it.
const timedPan = (down: [number, number], points: [number, number, number][], releaseAfter = 0) => {
  const now = jest.spyOn(Date, 'now')
  const at = (ms: number) => now.mockReturnValue(10_000 + ms)
  const [[, startX, startY], ...moves] = points
  at(0)
  lastPanCallbacks.onBegin?.({ x: down[0], y: down[1] })
  lastPanCallbacks.onStart?.({ x: startX, y: startY })
  for (const [ms, x, y] of moves) {
    at(ms)
    lastPanCallbacks.onUpdate?.({ x, y })
  }
  const [lastMs, lastX, lastY] = points[points.length - 1]
  at(lastMs + releaseAfter)
  lastPanCallbacks.onEnd?.({ x: lastX, y: lastY })
  now.mockRestore()
}

beforeEach(() => {
  panInstanceCount.current = 0
  lastPanCallbacks.onBegin = undefined
  lastPanCallbacks.onStart = undefined
  lastPanConfig.maxPointers = undefined
  lastOnLayout.current = undefined
  lastToastMotion.current = undefined
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
      swipe(0, 300)
    })

    expect(getApi().toasts.find((t) => t.id === toastId)).toBeUndefined()
  })

  it('snaps back without dismissing when a swipe stays under the threshold', () => {
    const { getApi } = renderToaster(3)
    act(() => getApi().success('Stay put'))
    const toastId = getApi().toasts[0].id

    act(() => {
      swipe(0, 20)
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
      swipe(0, -300)
    })

    const remainingIds = getApi().toasts.map((t) => t.id)
    expect(remainingIds).toEqual([secondId])
    expect(remainingIds).not.toContain(firstId)
  })
})

// The swipe is measured in the toast's OWN coordinate space (see buildSwipeGesture), so it works unchanged inside a frame turned by any
// transform - an app faking landscape by rotating a View, say - with no knowledge of the rotation: `translationX/Y` are window-space and are
// never read. The mocked window is 375 wide, so the dismiss distance is 112.5 (30%).
describe("swipe in the toast's own coordinates", () => {
  const dismisses = (from: number, to: number, extra?: { translationX?: number; translationY?: number }) => {
    const { getApi } = renderToaster(3)
    act(() => getApi().success('Swipe me'))
    const toastId = getApi().toasts[0].id
    act(() => swipe(from, to, extra))
    return getApi().toasts.find((t) => t.id === toastId) === undefined
  }

  it('never reads the window-space translation: a large translationX/Y with a small local move does not dismiss', () => {
    // What a +90 turned frame reports for a swipe along its own horizontal: the window-space translation is vertical, and local x moves.
    expect(dismisses(0, 200, { translationX: 0, translationY: 400 })).toBe(true)
    // ...and the reverse: a big window-space drag that barely moves the toast's own x is not a swipe.
    expect(dismisses(0, 20, { translationX: 400, translationY: 400 })).toBe(false)
  })

  it("is relative to where the pointer went down, not to the view's own origin", () => {
    expect(dismisses(100, 150)).toBe(false) // moved 50
    expect(dismisses(100, 300)).toBe(true) // moved 200
    expect(dismisses(300, 100)).toBe(true) // moved -200 (the other direction)
  })

  it('dismisses in either direction, past 30% of the toast width, and not before', () => {
    expect(dismisses(0, 112)).toBe(false)
    expect(dismisses(0, 113)).toBe(true)
    expect(dismisses(0, -112)).toBe(false)
    expect(dismisses(0, -113)).toBe(true)
  })

  it('accepts a single finger only, since `x` is the centroid of every finger on the view', () => {
    const { getApi } = renderToaster(3)
    act(() => getApi().success('One'))
    expect(lastPanConfig.maxPointers).toBe(1)
  })

  it("measures the dismiss distance against the toast's OWN laid-out width once it has one, rebuilding the gesture for it", () => {
    const { getApi } = renderToaster(3)
    act(() => getApi().success('Wide'))
    const toastId = getApi().toasts[0].id
    const builtBefore = panInstanceCount.current

    // A toast 800 wide (e.g. in a turned frame, where the window's width is the wrong axis): 30% is 240, not the window's 112.5.
    act(() => lastOnLayout.current?.({ nativeEvent: { layout: { x: 0, y: 0, width: 800, height: 60 } } }))
    expect(panInstanceCount.current).toBe(builtBefore + 1)

    act(() => swipe(0, 230))
    expect(getApi().toasts.find((t) => t.id === toastId)).toBeDefined() // 230 < 240
    act(() => swipe(0, 250))
    expect(getApi().toasts.find((t) => t.id === toastId)).toBeUndefined() // 250 > 240
  })

  it('ignores a layout event with no width (keeps the previous reference)', () => {
    const { getApi } = renderToaster(3)
    act(() => getApi().success('One'))
    const builtBefore = panInstanceCount.current

    act(() => lastOnLayout.current?.({ nativeEvent: { layout: { x: 0, y: 0, width: 0, height: 60 } } }))
    expect(panInstanceCount.current).toBe(builtBefore)
  })

  it('does not rebuild the Pan gesture as a swipe updates (its state lives in shared values)', () => {
    const { getApi } = renderToaster(3)
    act(() => getApi().success('One'))
    expect(panInstanceCount.current).toBe(1)

    act(() => {
      lastPanCallbacks.onStart?.({ x: 0, y: 0 })
      lastPanCallbacks.onUpdate?.({ x: 30, y: 0 })
    })
    expect(panInstanceCount.current).toBe(1)
  })
})

// A flick dismisses a toast however short it was: the pointer's speed is sampled from its own local positions against the clock, and only the speed
// at release counts.
describe('a flick dismisses', () => {
  // The pointer goes down where the pan activates unless `down` says otherwise (a tie locks the pan sideways).
  const flick = (points: [number, number, number][], releaseAfter = 0, toasterProps: Partial<ComponentProps<typeof Toaster>> = {}, down: [number, number] = [points[0][1], points[0][2]]) => {
    const { getApi } = renderToaster(3, {}, toasterProps)
    act(() => getApi().success('Flick me'))
    const toastId = getApi().toasts[0].id
    act(() => timedPan(down, points, releaseAfter))
    return getApi().toasts.find((t) => t.id === toastId) === undefined
  }

  it('a short, fast sideways flick, either way', () => {
    // 30pt in 24ms: far below the 112.5pt the distance alone needs.
    expect(
      flick([
        [0, 100, 0],
        [8, 110, 0],
        [16, 120, 0],
        [24, 130, 0]
      ])
    ).toBe(true)
    expect(
      flick([
        [0, 100, 0],
        [8, 90, 0],
        [16, 80, 0],
        [24, 70, 0]
      ])
    ).toBe(true)
  })

  it('not the same distance dragged slowly', () => {
    expect(
      flick([
        [0, 100, 0],
        [200, 110, 0],
        [400, 120, 0],
        [600, 130, 0]
      ])
    ).toBe(false)
  })

  it('not a fast move the pointer then held still before lifting', () => {
    expect(
      flick(
        [
          [0, 100, 0],
          [8, 110, 0],
          [16, 120, 0],
          [24, 130, 0]
        ],
        120
      )
    ).toBe(false)
  })

  it('not a flick back toward where it started', () => {
    // Dragged 60 out slowly, then flicked 20 back: still 40 out, moving the other way.
    expect(
      flick([
        [0, 100, 0],
        [400, 130, 0],
        [800, 160, 0],
        [808, 150, 0],
        [816, 140, 0]
      ])
    ).toBe(false)
  })

  it('not a tap whose jitter happens to be quick', () => {
    expect(
      flick([
        [0, 100, 0],
        [4, 104, 0],
        [8, 108, 0]
      ])
    ).toBe(false) // 8pt, under the 12pt minimum
  })

  it("a short flick toward the stack's edge", () => {
    // 15pt in 24ms, under the 28pt half-height the distance alone needs.
    expect(
      flick(
        [
          [0, 50, 10],
          [8, 50, 15],
          [16, 50, 20],
          [24, 50, 25]
        ],
        0,
        {},
        [50, 0]
      )
    ).toBe(true) // bottom: down
    expect(
      flick(
        [
          [0, 50, -10],
          [8, 50, -15],
          [16, 50, -20],
          [24, 50, -25]
        ],
        0,
        { position: 'top' },
        [50, 0]
      )
    ).toBe(true) // top: up
    expect(
      flick(
        [
          [0, 50, -10],
          [8, 50, -15],
          [16, 50, -20],
          [24, 50, -25]
        ],
        0,
        {},
        [50, 0]
      )
    ).toBe(false) // bottom: up is away from its edge
  })
})

// A toast can also be pushed back off the edge its stack sits on - down for the default bottom stack, up for a top one - the way a banner is
// dismissed. The axis is locked when the pan activates, by how the pointer had moved since touch-down.
describe('swipe toward the edge', () => {
  const pan = (down: [number, number], start: [number, number], end: [number, number], toasterProps: Partial<ComponentProps<typeof Toaster>> = {}, height?: number) => {
    const { getApi } = renderToaster(3, {}, toasterProps)
    act(() => getApi().success('Push me'))
    const toastId = getApi().toasts[0].id
    if (height !== undefined) act(() => lastOnLayout.current?.({ nativeEvent: { layout: { x: 0, y: 0, width: 375, height } } }))
    act(() => {
      lastPanCallbacks.onBegin?.({ x: down[0], y: down[1] })
      lastPanCallbacks.onStart?.({ x: start[0], y: start[1] })
      lastPanCallbacks.onUpdate?.({ x: end[0], y: end[1] })
      lastPanCallbacks.onEnd?.({ x: end[0], y: end[1] })
    })
    return getApi().toasts.find((t) => t.id === toastId) === undefined
  }

  it('dismisses a bottom toast pushed down past half its height, and not before', () => {
    // The default height before a layout is 56, so half is 28.
    expect(pan([50, 0], [50, 10], [50, 37])).toBe(false) // 27 past activation
    expect(pan([50, 0], [50, 10], [50, 39])).toBe(true) // 29
  })

  it('never dismisses a bottom toast pushed up, however far', () => {
    expect(pan([50, 0], [50, -10], [50, -400])).toBe(false)
  })

  it('dismisses a top toast pushed up, and never one pushed down', () => {
    expect(pan([50, 0], [50, -10], [50, -40], { position: 'top' })).toBe(true)
    expect(pan([50, 0], [50, 10], [50, 400], { position: 'top' })).toBe(false)
  })

  it("measures half the toast's OWN laid-out height", () => {
    expect(pan([50, 0], [50, 10], [50, 50], {}, 100)).toBe(false) // 40 < 50
    expect(pan([50, 0], [50, 10], [50, 70], {}, 100)).toBe(true) // 60 > 50
  })

  it('locks the axis at activation: a pan that started sideways ignores a later vertical move, and the other way round', () => {
    expect(pan([50, 0], [62, 2], [62, 300])).toBe(false) // sideways: moved 0 along x
    expect(pan([50, 0], [52, 12], [300, 12])).toBe(false) // vertical: moved 0 along y
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
