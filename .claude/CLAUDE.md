# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# @rific/react-native-toaster

Standalone npm package. Stacking, animated toast notifications for React Native — self-contained state (Context + useReducer, no Redux), swipe-to-dismiss, keyboard-aware positioning, and toast history. Extracted from CashierFu-Utility (`../CashierFu-Utility`) where it lives as the Snackbar implementation.

Published under the `rific` npm org. Sibling package: `@rific/react-native-heatmap` (`../React-Native-Heatmap`).

## Commands

```bash
npm run lint      # ESLint + Prettier check
npm run fix       # Auto-fix lint/format issues
npm run typecheck # TypeScript type check (tsc --noEmit)
npm test          # Run all Jest tests
npm run build     # Compile to dist/
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

**ESLint rules (warnings):**
- `simple-import-sort` — imports and exports must be sorted
- `react-native/sort-styles` — StyleSheet keys must be sorted alphabetically
- `react-native/no-inline-styles` — no inline style objects
- `react-native/no-unused-styles` — no unused StyleSheet entries
- `no-console` — no console statements

## Architecture

### Source files (`src/`)

| File | Purpose |
|---|---|
| `Toast.ts` | Model class — `id`, `level`, `title`, `caption`, `image`, `createdAt`. Uses `crypto.randomUUID()`. |
| `ToastContext.tsx` | React context + `useReducer`. Exports `ToastProvider` and internal `useToastContext`. |
| `useToast.ts` | Public hook. Exposes `error/warning/info/success(title, caption?)`, `dismiss(id)`, `clear()`, `clearHistory()`, `toasts`, `history`, `toast`. |
| `Toaster.tsx` | Visual component. Stacks toasts with absolute positioning + `marginBottom: index * STACK_OFFSET`. Swipe-to-dismiss via `react-native-gesture-handler`. Keyboard-aware via RN `Keyboard` API + Reanimated shared value. |
| `index.ts` | Public exports: `Toast`, `ToastLevel`, `ToastProvider`, `Toaster`, `ToasterProps`, `useToast`. |
| `globals.d.ts` | Type declaration for `crypto.randomUUID()` (not in ES2019 lib). |

### Peer dependencies

- `react`, `react-native`
- `react-native-reanimated` ^3 — animations (entering/exiting/layout transitions, swipe gesture style)
- `react-native-gesture-handler` ^2 — swipe-to-dismiss (`Gesture.Pan()`)

No `react-native-paper`, no `react-native-svg`, no Portal dependency.

### Stacking behavior

`visibleToasts = toasts.slice(-limit).reverse()` — newest first. Each `ToastItem` is `position: absolute, bottom: 0` with `marginBottom: index * STACK_OFFSET` (80px). Oldest toast is visually topmost. `LinearTransition` animates reflow when the stack changes.

### Auto-dismiss

Each `ToastItem` runs a `useEffect` with `setTimeout(dismiss, remaining)` where `remaining = duration - elapsed`. Elapsed is computed from `toast.createdAt`, so timers survive parent re-renders correctly.

### Swipe-to-dismiss

`Gesture.Pan()` translates the card horizontally. Release past 40% of screen width → `withTiming` off-screen → `runOnJS(dismiss)`. Release below threshold → `withSpring(0)` snap-back. Opacity fades from 1→0.4 as the card is dragged.

## Testing

- **Framework:** Jest + ts-jest + `@testing-library/react` (jsdom environment)
- **Location:** `src/__tests__/*.test.ts`
- **Mocks:** `src/__mocks__/` — `react-native`, `react-native-reanimated`, `react-native-gesture-handler`
- Tests cover the hook only (`useToast`) — component rendering is not tested
- When adding new hook behavior, add a corresponding test case
