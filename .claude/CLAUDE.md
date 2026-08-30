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

`Gesture.Pan()` translates the card horizontally. Release past 40% of screen width → `withTiming` animates off-screen; its completion callback sets a `swipeDismissed` shared value, which a `useAnimatedReaction` watches and calls `scheduleOnRN(handleDismiss)` (`react-native-worklets`, not Reanimated's own `runOnJS`) once the animation finishes. That indirection exists to avoid a `[Worklets] Cannot copy value of type NativeWorklets` crash from calling `scheduleOnRN` inside a callback nested inside another callback — routing through a shared value keeps the call in the RN-runtime-scoped function body instead. Release below threshold → `withSpring(0)` snap-back. Opacity fades from 1 to 0.4 as the card is dragged.

## Testing

- **Framework:** Jest (via `@infinitetoken/jest-config/react-native`) + `@testing-library/react` (jsdom environment)
- **Location:** `src/__tests__/*.test.ts` and `*.test.tsx`
- **Mocks:** `src/__mocks__/` — `react-native`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-worklets`
- 35 tests across 3 suites: `useToast.test.ts` (hook behavior), `Toaster.test.tsx` (component rendering, swipe/dismiss, keyboard-aware positioning), `stackLayout.test.ts` (offset math)
- When adding new hook or component behavior, add a corresponding test case
