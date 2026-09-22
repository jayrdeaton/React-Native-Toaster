# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# @rific/toaster

Standalone npm package. Stacking, animated toast notifications for React Native — self-contained state (Context + useReducer, no Redux), swipe-to-dismiss, keyboard-aware positioning, and toast history. Extracted from CashierFu-Utility (`../CashierFu-Utility`) where it lives as the Snackbar implementation.

Published under the `rific` npm org. Sibling package: `@rific/heatmap` (`../React-Native-Heatmap`).

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
npm version patch   # or minor / major — bumps version and creates git tag
git push --follow-tags  # triggers the publish GitHub Action
```

The publish workflow fires on `v*` tags and runs `npm publish` with provenance.

## Code Style

Enforced by ESLint + Prettier — run the linter before finishing any task.

**Prettier config:**
- Single quotes, JSX single quotes
- No semicolons
- No trailing commas
- Print width: 1000 (effectively disabled)

**ESLint rules (warnings unless noted):**
- `simple-import-sort` — imports and exports must be sorted
- `react-native/no-inline-styles` — no inline style objects
- `react-native/no-unused-styles` — no unused StyleSheet entries
- `no-console` — no console statements
- `react-hooks/rules-of-hooks` — error, not a warning
- `react-hooks/exhaustive-deps`, `react-hooks/refs`, `react-hooks/immutability`, `react-hooks/preserve-manual-memoization`, `react-hooks/set-state-in-effect`

## Architecture

### Source files (`src/`)

| File | Purpose |
|---|---|
| `Toast.ts` | Model class — `id`, `level`, `title`, `caption`, `image`, `icon`, `color`, `createdAt`. Uses `crypto.randomUUID()`, falls back to a `timestamp-sequence` string. Also exports `LEVEL_COLORS`, `ToastLevel`, `ToastOverrides` (per-toast icon/color override). |
| `ToastContext.tsx` | React context + `useReducer`. Exports `ToastProvider` (accepts optional `generateId`, `haptics`, `maxHistory`, `paper` injection) and internal `useToastContext`. Also declares the structural `HapticsModule`/`PaperModule` injection-point types. |
| `useToast.ts` | Public hook. Exposes `error/warning/info/success(title, caption?, image?, overrides?)`, `dismiss(id)`, `clear()`, `clearHistory()`, `openHistory()`, `closeHistory()`, `toasts`, `history`, `historyVisible`, `toast`. |
| `Toaster.tsx` | Visual component. Stacks toasts with absolute positioning, offsets computed by `stackLayout.ts` from each toast's real measured height. Swipe-to-dismiss via `react-native-gesture-handler`. Keyboard-aware via Reanimated's `useAnimatedKeyboard`. Renders Paper components when `paper` is injected, otherwise a plain-RN fallback. |
| `HistoryModal.tsx` | Visual component. Full toast history in a slide-up `Modal` by default; the presentation wrapper is swappable via the `Container` prop. Rendered automatically by `Toaster`, controlled via `openHistory`/`closeHistory`. |
| `useFallbackColors.ts` | Internal hook. Light/dark color set (via `useColorScheme`) used when neither an explicit color prop nor a Paper theme is supplied. |
| `stackLayout.ts` | Internal helper. `computeStackOffsets` sums each toast's measured height (falling back to `DEFAULT_ITEM_HEIGHT` before its first layout pass) plus `STACK_GAP` between toasts. |
| `swipe.ts` | Internal helper. The swipe-to-dismiss rules as tiny worklet functions: `swipeShouldDismiss(distance, width)` (past 40% of the toast's width) and `swipeExitTarget(distance, clearance)` (1.5x the clearance length, in the swipe's direction). |
| `index.ts` | Public exports: `Toast`, `ToastLevel`, `ToastOverrides`, `defaultGenerateId`, `LEVEL_COLORS`, `ToastProvider`, `ToastProviderProps`, `HapticsModule`, `PaperModule`, `Toaster`, `ToasterProps`, `PaperTheme`, `HistoryModal`, `HistoryModalProps`, `HistoryContainerProps`, `useToast`. |
| `globals.d.ts` | Type declaration for `crypto.randomUUID()` (not in ES2019 lib). |

### Peer dependencies

- `react` >=19, `react-native` >=0.76 — required
- `react-native-reanimated` ^4 — required. Animations (entering/exiting/layout transitions, swipe gesture style, keyboard-aware positioning)
- `react-native-gesture-handler` ^2 — required. Swipe-to-dismiss (`Gesture.Pan()`)
- `react-native-worklets` 0.10.x — required. Ships alongside Reanimated 4; used to schedule the swipe-dismiss callback back onto the JS thread (see Swipe-to-dismiss below)
- `react-native-safe-area-context` ^5 — required. Insets for keyboard-aware positioning and modal padding
- `expo-haptics` >=56 — optional. Injected via `ToastProvider`'s `haptics` prop for a haptic tick on the history/clear controls
- `react-native-paper` ^5 — optional. Injected via `ToastProvider`'s `paper` prop to upgrade cards/buttons/dividers/icon to Paper components and auto-wrap the stack in a Paper `Portal`

No Portal dependency when `paper` isn't injected — `<Toaster />` renders in-place as an absolutely-positioned `View`.

### Stacking behavior

`visibleToasts = toasts.slice(-limit).reverse()` — newest first in the array. Each visible toast's vertical offset comes from `computeStackOffsets` (`stackLayout.ts`), which sums each toast's real measured height (via `onLayout` → `handleMeasure`, falling back to `DEFAULT_ITEM_HEIGHT` (56px) before its first layout pass) plus a fixed `STACK_GAP` (4px) between toasts — spacing adapts to real content instead of a fixed per-toast offset, so long captions or wrapped titles never overlap. `LinearTransition` animates reflow when the stack changes.

### Auto-dismiss

Each `ToastItem` runs a `useEffect` with `setTimeout(dismiss, remaining)` where `remaining = duration - elapsed`. Elapsed is computed from `toast.createdAt`, so timers survive parent re-renders correctly.

### Swipe-to-dismiss

`Gesture.Pan()` translates the card horizontally. Release past 40% of the toast's own width (`swipe.ts`; see the local-coordinates paragraph below) → `withTiming` animates off-screen; its completion callback sets a `swipeDismissed` shared value, which a `useAnimatedReaction` watches and calls `scheduleOnRN(handleDismiss)` (`react-native-worklets`, not Reanimated's own `runOnJS`) once the animation finishes. That indirection exists to avoid a `[Worklets] Cannot copy value of type NativeWorklets` crash from calling `scheduleOnRN` inside a callback nested inside another callback — routing through a shared value keeps the call in the RN-runtime-scoped function body instead. Release below threshold → `withSpring(0)` snap-back. Opacity fades from 1 to 0.4 as the card is dragged.

## Testing

- **Framework:** Jest (via `@infinitetoken/jest-config/react-native`) + `@testing-library/react` (jsdom environment)
- **Location:** `src/__tests__/*.test.ts` and `*.test.tsx`
- **Mocks:** `src/__mocks__/` — `react-native`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-worklets`
- 47 tests across 5 suites: `useToast.test.ts` (hook behavior), `Toaster.test.tsx` (component rendering, swipe/dismiss incl. the local-coordinate swipe, keyboard-aware positioning), `stackLayout.test.ts` (offset math), `swipe.test.ts` (dismiss/exit rules), `useUpdateErrorToast.test.ts`
- When adding new hook or component behavior, add a corresponding test case

**Swipe-to-dismiss is measured in the toast's OWN coordinates (`buildSwipeGesture`), so it works inside a rotated/transformed frame with no rotation prop - on iOS and Android.** RNGH reports a pan's `translationX/Y` in WINDOW space (iOS `translationInView:window`; Android's `PanGestureHandler.onHandle` uses the untransformed event), which is the wrong axis inside a fake-landscape frame (a View turned +-90deg while the OS stays portrait-locked). `x`/`y` are relative to the view the handler is attached to and ARE computed through ancestor transforms - iOS `locationInView:recognizer.view` (UIKit converts through every ancestor layer transform), Android `GestureHandlerOrchestrator.transformEventToViewCoords` (applies each ancestor's inverse matrix) - so the distance is `e.x - startX` with no knowledge of the rotation. Verified by reading both native sources AND on the iOS simulator inside a real turned frame. **Web does NOT do this:** RNGH web derives `x` from `getBoundingClientRect()` (the axis-aligned box), so a rotated ancestor is ignored there - a web host must not rotate the toaster's ancestors. **The view the gesture is attached to must NOT move while the finger drags** (a view that follows the finger keeps `x` constant - RNGH's docs recommend the absolute values in that case), so `GestureDetector` wraps the STATIONARY wrapper in `ToastItem` (the one carrying the enter/exit animation and `onLayout`) and only the card inside is translated. Details that matter: the anchor `startX` is captured in `onStart` (pan ACTIVATION), not `onBegin` (touch-down) - Android/web re-base their translation at activation, so anchoring at touch-down made the card jump by the touch slop (~8dp) on the first update; `.maxPointers(1)` because `x` is the centroid of every finger, so a second finger landing/lifting would step it (window-space `translationX` stayed continuous) and could dismiss by accident. The dismiss reference is the toast's own laid-out width (`onLayout`, held in React state - not a shared value, since writing one from a callback trips react-hooks/immutability; the window width is the pre-layout guess), and the EXIT target uses `clearance = max(toast width, window width, window height)` so it leaves the screen even for a narrowed stack (`wrapperStyle`) or a turned frame. `src/swipe.ts` holds the tiny worklet rules (`swipeShouldDismiss`, `swipeExitTarget`). An earlier design added a `rotation` prop that projected `translationX/Y` onto the frame's axis: it needed every app to pass it and layering forbids reading a rotation package here (this package has no `@tastic/*` dependency), so it was dropped for this. The keyboard lift can't be fixed by local coordinates (the keyboard is at the PHYSICAL bottom): a host that fakes rotation should revert to an upright frame while the keyboard is up. Tests: the `swipe in the toast's own coordinates` block in `Toaster.test.tsx` (window-space `translationX/Y` are passed and must be ignored; the measured-width path is driven through the `onLayout` the reanimated mock now records) and `swipe.test.ts`.
