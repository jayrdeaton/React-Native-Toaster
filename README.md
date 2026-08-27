# @rific/toaster

Stacking, animated toast notifications for React Native. Toasts stack on top of each other, auto-dismiss with a configurable timer, and swipe away horizontally. A hidden-count badge appears when the stack exceeds your limit.

## Features

- Stacking toasts from the top or bottom edge with animated entry, exit, and reflow
- Stack spacing automatically adapts to each toast's real measured height, long captions or wrapped titles never overlap the toast next to them
- Swipe-to-dismiss with spring snap-back below threshold
- Auto-dismiss with per-toast elapsed time tracking (resumable across re-renders)
- Keyboard-aware positioning, shifts above the software keyboard automatically
- Toast history (up to 100 entries, survives individual dismissals)
- Four built-in levels: `error`, `warning`, `info`, `success`
- Optional icon support via any icon library
- Optional image support, pass an image URI to render it in place of the level icon
- No Portal dependency, place `<Toaster />` wherever you want it
- Optional `react-native-paper` integration, inject it into `ToastProvider` to upgrade cards, buttons, and dividers to Paper components

## Installation

```sh
npm install @rific/toaster
```

### Required peer dependencies

```sh
npm install react-native-reanimated react-native-gesture-handler react-native-worklets react-native-safe-area-context
```

Requires `react-native-reanimated` **v4 or newer** (the toast stack uses `react-native-worklets`, which ships alongside Reanimated 4). Follow the setup guides for [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started) and [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/installation). Your app root also needs `GestureHandlerRootView` from gesture-handler (typically already present if you use React Navigation), and a `SafeAreaProvider` from `react-native-safe-area-context` somewhere above `<Toaster />` (also typically already present, React Navigation and Expo Router both set this up for you).

### Optional peer dependencies

```sh
npm install expo-haptics                      # haptic feedback on history/clear button press
npm install react-native-paper               # Paper component upgrades (see below)
```

Neither is auto-detected, pass them to `ToastProvider` (see below) and Toaster/HistoryModal pick them up automatically. Omit either and you get a working fallback: plain `View`/`Pressable` UI without Paper, no haptic tick without expo-haptics.

## Setup

Wrap your app with `ToastProvider` and place `<Toaster />` wherever toasts should appear. Since there's no Portal, the component renders in-place: putting it near the root of your tree is the most common pattern.

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ToastProvider, Toaster } from '@rific/toaster'

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProvider>
        <YourApp />
        <Toaster />
      </ToastProvider>
    </GestureHandlerRootView>
  )
}
```

`ToastProvider` accepts an optional `generateId` prop if you need to control how toast IDs are generated. By default IDs use `crypto.randomUUID()` when available and fall back to a `timestamp-sequence` string.

```tsx
<ToastProvider generateId={() => myIdLibrary.generate()}>
```

Inject `react-native-paper` and/or `expo-haptics` to upgrade the built-in UI, both are optional, and Toaster/HistoryModal render a working plain-RN fallback (no Paper components, no haptic tick) when omitted:

```tsx
import * as Haptics from 'expo-haptics'
import * as RNPaper from 'react-native-paper'

<ToastProvider haptics={Haptics} paper={RNPaper}>
```

### ToastProvider props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | - | |
| `generateId` | `() => string` | `crypto.randomUUID()` fallback | Controls how toast IDs are generated. |
| `haptics` | `HapticsModule` | - | Injects `expo-haptics` for the light haptic tick on the history/clear stack controls. Pass `import * as Haptics from 'expo-haptics'`, omit to skip haptics entirely. |
| `maxHistory` | `number` | `100` | Max entries kept in `history`. `0` disables history tracking. |
| `paper` | `PaperModule` | - | Injects `react-native-paper` so Toaster/HistoryModal render Paper components instead of their plain RN fallback. Pass `import * as RNPaper from 'react-native-paper'`, omit to keep the zero-dependency fallback UI. |

## Usage

```tsx
import { useToast } from '@rific/toaster'

function SaveButton() {
  const { success, error } = useToast()

  const handleSave = async () => {
    try {
      await save()
      success('Saved')
    } catch (e) {
      error('Save failed', 'Check your connection and try again')
    }
  }

  return <Button onPress={handleSave} title='Save' />
}
```

### All hook methods

```ts
const {
  error,          // (title, caption?, image?, overrides?) => void
  warning,        // (title, caption?, image?, overrides?) => void
  info,           // (title, caption?, image?, overrides?) => void
  success,        // (title, caption?, image?, overrides?) => void
  dismiss,        // (id) => void
  clear,          // () => void, removes all visible toasts
  clearHistory,   // () => void, clears the history log
  openHistory,    // () => void, opens the history modal
  closeHistory,   // () => void, closes the history modal
  toasts,         // Toast[], currently visible
  history,        // Toast[], up to 100, persists across dismissals
  historyVisible, // boolean, whether the history modal is open
  toast,          // Toast | undefined, most recent
} = useToast()
```

## Toaster props

| Prop | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | `3` | Max toasts visible at once. Excess shown as "N more" badge. |
| `duration` | `number` | `7000` | Ms before each toast auto-dismisses. |
| `position` | `'bottom' \| 'top'` | `'bottom'` | Which edge to stack from. |
| `keyboardAware` | `boolean` | `true` | Shifts above the software keyboard when open. |
| `keyboardOffset` | `number` | `0` | Extra bottom spacing added on top of the keyboard-aware inset (bottom position only). |
| `backgroundColor` | `string` | `'#2c2c2e'` | Card background color. |
| `textColor` | `string` | `'#fff'` | Card text color. |
| `levelColors` | `Partial<Record<ToastLevel, string>>` | - | Override the color per level. |
| `Icon` | `ComponentType<{ name, size?, color? }>` | - | Icon component from any vector icon library. |
| `levelIcons` | `Partial<Record<ToastLevel, string>>` | - | Icon name per level, passed to `Icon`. |
| `theme` | `PaperTheme` | - | Paper theme object (`{ colors: { background, surface, onSurface } }`). Derives `backgroundColor` and `textColor` when set. |
| `surfaceElevation` | `0 \| 1 \| 2 \| 3 \| 4 \| 5` | `1` | Paper `Surface` elevation. Only used when `paper` is injected into `ToastProvider`. |
| `historyModal` | `ReactNode` | `<HistoryModal />` | Override the default history modal with a custom component. Pass `null` to render nothing. |
| `onHistoryPress` | `() => void` | - | Custom handler for the built-in history button. Defaults to opening the built-in `HistoryModal`. Ignored if `historyButton` is set, since you own the press handling then. |
| `historyButton` | `ReactNode` | built-in chip/pill, hidden until `history` has entries | Replace the "history" stack control with your own node. Pass `null` to hide it. |
| `clearButton` | `ReactNode` | built-in chip/pill | Replace the "clear" stack control with your own node. Pass `null` to hide it. |
| `toastStyle` | `ViewStyle` | - | Style applied to each toast card. |
| `wrapperStyle` | `ViewStyle` | - | Style applied to the outer stack container. |

`historyButton`/`clearButton`/`historyModal` are three-state slots: omit the prop for the built-in control, pass `null` to hide it, or pass your own node to replace it. A custom node is responsible for its own press handling and haptics - pull `clear`/`openHistory` off `useToast()`.

### With icons

Pass any icon component that accepts `name`, `size`, and `color` props (`@expo/vector-icons`, `react-native-vector-icons`, etc.).

```tsx
import { MaterialCommunityIcons } from '@expo/vector-icons'

<Toaster
  Icon={MaterialCommunityIcons}
  levelIcons={{
    error: 'close-circle',
    warning: 'alert',
    info: 'information',
    success: 'check-circle'
  }}
/>
```

### Captions and images

When both a title and caption are provided, the card shows the title as the primary line and the caption as a secondary line beneath it: no truncation to a single line. Each toast's rendered height is measured automatically, so a long caption never overlaps the toast stacked next to it.

```tsx
success('Photo uploaded', 'Compressed and saved to your library', 'https://example.com/photo.jpg')
```

Passing an `image` URI renders it in a small square in place of the level icon.

### Custom colors

```tsx
<Toaster
  levelColors={{
    error: '#dc2626',
    warning: '#d97706',
    info: '#2563eb',
    success: '#16a34a'
  }}
/>
```

### Per-toast icon/color overrides

`levelColors`/`levelIcons` style every toast of a given level the same way. For a toast whose icon and color are its own identity rather than its level's - a badge, an achievement, a category tag - pass a fourth `overrides` argument to override just that one toast, falling back to the level's own icon/color for whichever half you omit:

```tsx
success('Flawless Victory', undefined, undefined, { color: '#FFD54F', icon: 'shield-star' })
success('First Blood', undefined, undefined, { color: '#CD7F32', icon: 'sword' })
```

### Top position

Toasts stack downward from the top edge. Entry and exit animations flip automatically, new toasts drop in from above, and the stack grows downward.

```tsx
<Toaster position='top' />
```

The `keyboardAware` prop has no effect when `position='top'` since the keyboard doesn't overlap the top of the screen.

### Portal behavior

When `paper` is injected into `ToastProvider`, the toast stack is automatically wrapped in a Paper `<Portal>` so it renders above modals and other overlays. Without it, `<Toaster />` is an absolutely-positioned `View` that renders in-place. To lift it manually:

```tsx
import { Portal } from 'react-native-paper'

<Portal>
  <Toaster />
</Portal>
```

## HistoryModal

`HistoryModal` displays the full toast history in a slide-up modal. It is rendered automatically by `<Toaster />` and controlled via `openHistory` / `closeHistory` from the hook. You can also render it independently if you manage the `onHistoryPress` prop yourself.

```tsx
import { HistoryModal } from '@rific/toaster'

<HistoryModal
  backgroundColor='#1c1c1e'
  textColor='#fff'
  levelColors={{ error: '#dc2626' }}
/>
```

### HistoryModal props

| Prop | Type | Default | Description |
|---|---|---|---|
| `backgroundColor` | `string` | `'#2c2c2e'` | Modal background color. |
| `textColor` | `string` | `'#fff'` | Text and divider color. |
| `levelColors` | `Partial<Record<ToastLevel, string>>` | - | Override the level indicator color per level. |
| `style` | `ViewStyle` | - | Style applied to the modal container. |
| `Container` | `ComponentType<HistoryContainerProps>` | vanilla `Modal` | Swap out the presentation wrapper (see below). |

When `paper` is injected into `ToastProvider`, the Done button, Clear history button, and row dividers are upgraded to Paper components automatically.

### Custom Container (e.g. a bottom sheet)

`HistoryModal` has no dependency on any sheet library: it renders a vanilla `Modal` by default. If you want a bottom-sheet presentation instead, pass your own `Container` component built on whatever library you like, e.g. the sibling package [`@rific/drawer`](https://www.npmjs.com/package/@rific/drawer), whose standalone `Drawer` component takes `open`/`onClose`/`children`, a near-exact match for `Container`'s own contract:

```tsx
import { Drawer } from '@rific/drawer'
import type { HistoryContainerProps } from '@rific/toaster'

const DrawerContainer = ({ children, onClose, visible }: HistoryContainerProps) => (
  <Drawer open={visible} onClose={onClose} side='bottom' height={600}>
    {children}
  </Drawer>
)

<HistoryModal Container={DrawerContainer} />
```

`Container` receives `visible`, `onClose`, and `children` (the history list content); it's responsible for showing/hiding itself however it likes.

## react-native-paper integration

Inject `react-native-paper` into `ToastProvider` (`<ToastProvider paper={RNPaper}>`) to unlock Paper-native UI throughout the package. It's never auto-detected, so nothing changes until you pass it:

| Without Paper | With Paper |
|---|---|
| Plain `View` cards | `Surface` with configurable elevation |
| Plain `Pressable` buttons | `Button` and `IconButton` |
| Manual `borderBottom` dividers | `Divider` component |
| Manual portal wrapping | Automatic `Portal` wrapping |
| No icon adapter | `Icon` adapter wired automatically |

Pass a `theme` prop to `<Toaster />` to derive colors from your Paper theme automatically:

```tsx
import { useTheme } from 'react-native-paper'

function Root() {
  const theme = useTheme()
  return <Toaster theme={theme} />
}
```

## Toast model

```ts
class Toast {
  id: string         // crypto.randomUUID() when available, otherwise `${Date.now()}-${seq}`
  level: ToastLevel  // 'error' | 'warning' | 'info' | 'success'
  title: string | null
  caption: string | null
  image: string | null  // URI, renders an image instead of the level icon
  icon: string | null   // per-toast icon override - see "Per-toast icon/color overrides"
  color: string | null  // per-toast color override - see "Per-toast icon/color overrides"
  createdAt: string     // ISO timestamp
}
```

## Publishing

Tag a release to trigger the publish workflow:

```sh
npm version patch   # or minor / major
git push --follow-tags
```

## License

MIT
