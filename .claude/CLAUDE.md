# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# @rific/toaster

Standalone npm package. Stacking, animated toast notifications for React Native - self-contained state (Context + useReducer, no Redux), swipe-to-dismiss, keyboard-aware positioning, and toast history. Extracted from Utility (`../Utility`) where it lives as the Snackbar implementation.

Published under the `rific` npm org. Sibling package: `@rific/heatmap` (`../React-Native-Heatmap`). The swipe-to-dismiss is `SwipeToDismiss` from `@rific/gestures` (`../React-Native-Gestures`), lifted out of this package on 2026-10-18 (see Swipe-to-dismiss below).

## Commands

```bash
npm run lint      # ESLint + Prettier check
npm run fix       # Auto-fix lint/format issues
npm run typecheck # TypeScript type check (tsc --noEmit)
npm test          # Run all Jest tests
npm run build     # Compile to dist/
npm run verify    # lint + test + typecheck + build, in that order
```

Always run `npm run lint` before finishing any task.

## Publishing

```bash
npm version patch   # or minor / major - bumps version and creates git tag
git push --follow-tags  # triggers the publish GitHub Action
```

The publish workflow fires on `v*` tags and runs `npm publish` with provenance.

## Code Style

Enforced by ESLint + Prettier - run the linter before finishing any task.

**Prettier config:**
- Single quotes, JSX single quotes
- No semicolons
- No trailing commas
- Print width: 1000 (effectively disabled)

**ESLint rules (warnings unless noted):**
- `simple-import-sort` - imports and exports must be sorted
- `react-native/no-inline-styles` - no inline style objects
- `react-native/no-unused-styles` - no unused StyleSheet entries
- `no-console` - no console statements
- `react-hooks/rules-of-hooks` - error, not a warning
- `react-hooks/exhaustive-deps`, `react-hooks/refs`, `react-hooks/immutability`, `react-hooks/preserve-manual-memoization`, `react-hooks/set-state-in-effect`

## Architecture

### Source files (`src/`)

| File | Purpose |
|---|---|
| `Toast.ts` | Model class - `id`, `level`, `title`, `caption`, `image`, `icon`, `color`, `createdAt`. Uses `crypto.randomUUID()`, falls back to a `timestamp-sequence` string. Also exports `LEVEL_COLORS`, `ToastLevel`, `ToastOverrides` (per-toast icon/color override). |
| `ToastContext.tsx` | React context + `useReducer`. Exports `ToastProvider` (accepts optional `generateId`, `haptics`, `maxHistory`, `paper` injection) and internal `useToastContext`. Also declares the structural `HapticsModule`/`PaperModule` injection-point types. |
| `useToast.ts` | Public hook. Exposes `error/warning/info/success(title, caption?, image?, overrides?)`, `dismiss(id)`, `clear()`, `clearHistory()`, `openHistory()`, `closeHistory()`, `toasts`, `history`, `historyVisible`, `toast`. |
| `Toaster.tsx` | Visual component. Stacks toasts with absolute positioning, offsets computed by `stackLayout.ts` from each toast's real measured height. Swipe-to-dismiss via `@rific/gestures`' `SwipeToDismiss`. Keyboard-aware via Reanimated's `useAnimatedKeyboard`. Renders Paper components when `paper` is injected, otherwise a plain-RN fallback; a `Card` prop replaces either card (e.g. a blur surface), and `labelStyle`/`captionStyle` are merged over the text. |
| `HistoryModal.tsx` | Visual component. Full toast history in a slide-up `Modal` by default; the presentation wrapper is swappable via the `Container` prop. Rendered automatically by `Toaster`, controlled via `openHistory`/`closeHistory`. |
| `useFallbackColors.ts` | Internal hook. Light/dark color set (via `useColorScheme`) used when neither an explicit color prop nor a Paper theme is supplied. |
| `stackLayout.ts` | Internal helper. `computeStackOffsets` sums each toast's measured height (falling back to `DEFAULT_ITEM_HEIGHT` before its first layout pass) plus `STACK_GAP` between toasts. |
| `motion.ts` | Internal helper. The enter/exit presets: `toastEntering(position)` comes in from the stack's edge (`FadeInUp` for a top stack, `FadeInDown` for a bottom one), `toastExiting(position, outward)` goes back toward it, and `exitsOutward(index, count)` sends only the farthest of several toasts away from the edge (never a lone one). Reanimated names a fade after the side it comes from, not the way it moves: `FadeInDown` starts 25pt BELOW its spot and rises. Through 0.8.1 the toaster read them the other way round, so a top toast rose into place from below and a bottom one dropped in from above (found in Solitaire, 2026-10-17). |
| `index.ts` | Public exports: `Toast`, `ToastLevel`, `ToastOverrides`, `defaultGenerateId`, `LEVEL_COLORS`, `ToastProvider`, `ToastProviderProps`, `HapticsModule`, `PaperModule`, `Toaster`, `ToasterProps`, `ToastCardProps`, `PaperTheme`, `HistoryModal`, `HistoryModalProps`, `HistoryContainerProps`, `useToast`. |
| `globals.d.ts` | Type declaration for `crypto.randomUUID()` (not in ES2019 lib). |

### Peer dependencies

- `react` >=19, `react-native` >=0.76 - required
- `@rific/gestures` >=0.1.2 - required. Swipe-to-dismiss (`SwipeToDismiss`, see below). Not 0.1.0 or 0.1.1: on the web their built file renamed `useAnimatedStyle` to `useAnimatedStyle2`, so the Worklets plugin skipped its callback and every toast threw (fixed in 0.1.2 with explicit `'worklet'` directives)
- `react-native-reanimated` ^4 - required. Animations (entering/exiting/layout transitions, keyboard-aware positioning; `@rific/gestures` animates the swipe with it too)
- `react-native-gesture-handler` >=2 <4 - required by `@rific/gestures` (its `Gesture.Pan()`)
- `react-native-worklets` >=0.5.0 - required (developed against 0.13, the pair Reanimated 4.7 needs). Ships alongside Reanimated 4; `@rific/gestures` uses it to signal the swipe's end back to the JS thread
- `@rific/core` >=0.5.0 - required by `@rific/gestures` (`callWorkletCallback`)
- `react-native-safe-area-context` ^5 - required. Insets for keyboard-aware positioning and modal padding
- `expo-haptics` >=56 - optional. Injected via `ToastProvider`'s `haptics` prop for a haptic tick on the history/clear controls
- `react-native-paper` ^5 - optional. Injected via `ToastProvider`'s `paper` prop to upgrade cards/buttons/dividers/icon to Paper components and auto-wrap the stack in a Paper `Portal`

Nothing here imports gesture-handler, Worklets or `@rific/core` any more, but they stay peers (and devDependencies, since `tsc` type-checks `@rific/gestures`' raw source through the `react-native` condition): `@rific/gestures` needs them, and with the fleet's `legacy-peer-deps` npm never names a peer's own peers.

No Portal dependency when `paper` isn't injected - `<Toaster />` renders in-place as an absolutely-positioned `View`.

### Stacking behavior

`visibleToasts = toasts.slice(-limit).reverse()` - newest first in the array. Each visible toast's vertical offset comes from `computeStackOffsets` (`stackLayout.ts`), which sums each toast's real measured height (via `onLayout` → `handleMeasure`, falling back to `DEFAULT_ITEM_HEIGHT` (56px) before its first layout pass) plus a fixed `STACK_GAP` (4px) between toasts - spacing adapts to real content instead of a fixed per-toast offset, so long captions or wrapped titles never overlap. `LinearTransition` animates reflow when the stack changes.

### Auto-dismiss

Each `ToastItem` runs a `useEffect` with `setTimeout(dismiss, remaining)` where `remaining = duration - elapsed`. Elapsed is computed from `toast.createdAt`, so timers survive parent re-renders correctly.

### Swipe-to-dismiss

Since 2026-10-18 the swipe is `SwipeToDismiss` from `@rific/gestures` (`../React-Native-Gestures`; its CLAUDE.md and README are the reference now), lifted out of this package's 0.9.0 so Hangman's Pass & Play seats swipe away with exactly a toast's feel. `src/swipe.ts`, `useSwipeState`, `buildSwipeGesture`, the `swipeDismissed` reaction and their tests (`swipe.test.ts`, `worklets.test.ts`) moved there; `swipe.ts` went verbatim but for its comments (checked with `diff`). `ToastItem` wraps its card in `<SwipeToDismiss edge={position} onDismiss={handleDismiss}>`, inside the view carrying the enter/exit animation and `onLayout` (which feeds `onMeasure`, the stack's heights), inside the absolutely placed view with the `LinearTransition`. Nothing about the gesture is configured here, and `ToastItem` no longer tracks its own size.

What a toast gets, unchanged from 0.9.0: one axis, locked when the pan activates by how the pointer moved since touch-down: sideways, either way, dismissed past 30% of the toast's own width; or toward the stack's edge (down for bottom, up for top), dismissed past half its own height, while a drag away from that edge only moves 20% of the way. A flick dismisses either way however short: at least 500pt/s the way it was swiped, after at least 12pt, sampled from local positions against `Date.now()` and taken as 0 if the pointer was still for 80ms before lifting. Opacity fades from 1 to 0.4 nearing the dismiss distance; past it the card flies off in 180ms (`withTiming`) to 1.5x the larger of its own width and either window dimension, then the toast is dismissed; short of it, `withSpring(0)`. The flick and the up/down swipe were added 2026-10-15 (Jay: a flick shorter than 40% of the width snapped back, and an up/down drag did nothing).

What differs from 0.9.0's own copy, none of it the feel: the swipe is off until the toast's first layout (0.9.0 swiped against a guess, the window's width and the 56pt default height, until then); a toast already flying out ignores a new touch rather than letting it drag the toast back in; on the web the click that ends a swipe is swallowed, so a pressable inside a custom `Card` isn't pressed by it; and the window size comes from `useWindowDimensions` (follows a rotation) rather than `Dimensions.get` at render.

**How the swipe was worked out here** (kept because `@rific/gestures`' CLAUDE.md points to it; the code is the package's now). It is measured in the toast's OWN coordinates, so it works inside a rotated/transformed frame with no rotation prop, on iOS and Android. RNGH reports a pan's `translationX/Y` in WINDOW space (iOS `translationInView:window`; Android's `PanGestureHandler.onHandle` uses the untransformed event), which is the wrong axis inside a fake-landscape frame (a View turned +-90deg while the OS stays portrait-locked). `x`/`y` are relative to the view the handler is attached to and ARE computed through ancestor transforms (iOS `locationInView:recognizer.view`, where UIKit converts through every ancestor layer transform; Android `GestureHandlerOrchestrator.transformEventToViewCoords`, which applies each ancestor's inverse matrix), so the distance is `e.x - startX` with no knowledge of the rotation. Verified by reading both native sources AND on the iOS simulator inside a real turned frame. **Web does NOT do this:** RNGH web derives `x` from `getBoundingClientRect()` (the axis-aligned box), so a rotated ancestor is ignored there, and a web host must not rotate the toaster's ancestors. **The view the gesture is attached to must NOT move while the finger drags** (a view that follows the finger keeps `x` constant, which is why RNGH's docs recommend the absolute values in that case), so the gesture is on a stationary wrapper and only the card inside it is translated. The anchor `startX` is captured in `onStart` (pan ACTIVATION), not `onBegin` (touch-down): Android and web re-base their translation at activation, so anchoring at touch-down made the card jump by the touch slop (~8dp) on the first update. `.maxPointers(1)`, because `x` is the centroid of every finger, so a second finger landing or lifting would step it and could dismiss by accident. The flick's speed is sampled from local positions too, since the gesture's own `velocityX/Y` are window-space. The fly-out's end is signalled through a shared value that a `useAnimatedReaction` watches, calling `@rific/core`'s `callWorkletCallback` by key: handing react-native-worklets a component callback pinned every toast that ever showed. 0.8.0-0.8.2 crashed every release build on a sideways swipe: a worklet's default parameter named a module constant, which runs before the worklet unpacks its closure (the package's `worklets.test.ts` guards it). An earlier design added a `rotation` prop that projected `translationX/Y` onto the frame's axis: it needed every app to pass it and layering forbids reading a rotation package here (this package has no `@tastic/*` dependency), so it was dropped. The keyboard lift can't be fixed by local coordinates (the keyboard is at the PHYSICAL bottom): a host that fakes rotation should revert to an upright frame while the keyboard is up.

## Testing

- **Framework:** Jest (via `@infinitetoken/jest-config/react-native`) + `@testing-library/react` (jsdom environment)
- **Location:** `src/__tests__/*.test.ts` and `*.test.tsx`
- **Mocks:** `src/__mocks__/`, each mapped in `jest.config.cjs`'s `moduleNameMapper` - `react-native`, `react-native-reanimated`, `react-native-safe-area-context`, `@rific/gestures`. The gesture-handler and Worklets mocks went with the swipe (2026-10-18): nothing here loads either now, since `@rific/gestures` is mocked whole.
- 46 tests across 5 suites: `useToast.test.ts` (hook behavior), `Toaster.test.tsx` (component rendering, the swipe's wiring, the enter/exit motion, the `Card`/`labelStyle`/`captionStyle` props, Paper and haptics injection), `motion.test.ts` (enter/exit presets), `stackLayout.test.ts` (offset math), `useUpdateErrorToast.test.ts`. The `react-native` mock's `Text` renders a span carrying its flattened style (`data-rn-style`), so a test can read a title's or caption's style.
- **The swipe itself is tested in `@rific/gestures`** (its rules, the worklets-on-the-UI-thread check, the gesture's wiring). Here `SwipeToDismiss` is mocked as a div carrying the `edge` it was given (`data-edge`) and listening for a `dismiss` event, which stands for a swipe flying the toast off: `Toaster.test.tsx`'s `swipe to dismiss` block checks every card is wrapped, each with its stack's edge, and that a swipe dismisses that toast and no other.
- When adding new hook or component behavior, add a corresponding test case
