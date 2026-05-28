# @rific/toaster

Stacking, animated toast notifications for React Native. Toasts stack on top of each other, auto-dismiss with a configurable timer, and swipe away horizontally. A hidden-count badge appears when the stack exceeds your limit.

## Features

- Stacking toasts from the top or bottom edge with animated entry, exit, and reflow
- Swipe-to-dismiss with spring snap-back below threshold
- Auto-dismiss with per-toast elapsed time tracking (resumable across re-renders)
- Keyboard-aware positioning — shifts above the software keyboard automatically
- Toast history (up to 100 entries, survives individual dismissals)
- Four built-in levels: `error`, `warning`, `info`, `success`
- Optional icon support via any icon library
- No Portal dependency — place `<Toaster />` wherever you want it
- Optional `react-native-paper` integration — upgrades cards, buttons, and dividers to Paper components automatically

## Installation

```sh
npm install @rific/toaster
```

### Required peer dependencies

```sh
npm install react-native-reanimated react-native-gesture-handler react-native-worklets
```

Follow the setup guides for [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started) and [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/installation). Your app root also needs `GestureHandlerRootView` from gesture-handler (typically already present if you use React Navigation).

### Optional peer dependencies

```sh
npm install react-native-safe-area-context   # safe area insets for Toaster and HistoryModal
npm install expo-haptics                      # haptic feedback on history/clear button press
npm install react-native-paper               # Paper component upgrades (see below)
```

## Setup

Wrap your app with `ToastProvider` and place `<Toaster />` wherever toasts should appear. Since there's no Portal, the component renders in-place — putting it near the root of your tree is the most common pattern.

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
  error,          // (title, caption?) => void
  warning,        // (title, caption?) => void
  info,           // (title, caption?) => void
  success,        // (title, caption?) => void
  dismiss,        // (id) => void
  clear,          // () => void — removes all visible toasts
  clearHistory,   // () => void — clears the history log
  openHistory,    // () => void — opens the history modal
  closeHistory,   // () => void — closes the history modal
  toasts,         // Toast[] — currently visible
  history,        // Toast[] — up to 100, persists across dismissals
  historyVisible, // boolean — whether the history modal is open
  toast,          // Toast | undefined — most recent
} = useToast()
```

## Toaster props

| Prop | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | `3` | Max toasts visible at once. Excess shown as "N more" badge. |
| `duration` | `number` | `7000` | Ms before each toast auto-dismisses. |
| `position` | `'bottom' \| 'top'` | `'bottom'` | Which edge to stack from. |
| `keyboardAware` | `boolean` | `true` | Shifts above the software keyboard when open. |
| `backgroundColor` | `string` | `'#2c2c2e'` | Card background color. |
| `textColor` | `string` | `'#fff'` | Card text color. |
| `levelColors` | `Partial<Record<ToastLevel, string>>` | — | Override the color per level. |
| `Icon` | `ComponentType<{ name, size?, color? }>` | — | Icon component from any vector icon library. |
| `levelIcons` | `Partial<Record<ToastLevel, string>>` | — | Icon name per level, passed to `Icon`. |
| `theme` | `PaperTheme` | — | Paper theme object (`{ colors: { surface, onSurface } }`). Derives `backgroundColor` and `textColor` when set. |
| `surfaceElevation` | `0 \| 1 \| 2 \| 3 \| 4 \| 5` | `1` | Paper `Surface` elevation. Only used when `react-native-paper` is installed. |
| `historyModal` | `ReactNode` | `<HistoryModal />` | Override the default history modal with a custom component. |
| `onHistoryPress` | `() => void` | — | Custom handler for the history button. Defaults to opening the built-in `HistoryModal`. |
| `toastStyle` | `ViewStyle` | — | Style applied to each toast card. |
| `wrapperStyle` | `ViewStyle` | — | Style applied to the outer stack container. |

### With icons

Pass any icon component that accepts `name`, `size`, and `color` props — `@expo/vector-icons`, `react-native-vector-icons`, etc.

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

### Top position

Toasts stack downward from the top edge. Entry and exit animations flip automatically — new toasts drop in from above, and the stack grows downward.

```tsx
<Toaster position='top' />
```

The `keyboardAware` prop has no effect when `position='top'` since the keyboard doesn't overlap the top of the screen.

### Portal behavior

When `react-native-paper` is installed, the toast stack is automatically wrapped in a Paper `<Portal>` so it renders above modals and other overlays. Without Paper, `<Toaster />` is an absolutely-positioned `View` that renders in-place. To lift it manually:

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
| `levelColors` | `Partial<Record<ToastLevel, string>>` | — | Override the level indicator color per level. |
| `style` | `ViewStyle` | — | Style applied to the modal container. |

When `react-native-paper` is installed, the Done button, Clear history button, and row dividers are upgraded to Paper components automatically.

## react-native-paper integration

Install `react-native-paper` as an optional peer dependency to unlock Paper-native UI throughout the package:

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
  image: string | null  // URI — renders an image instead of the level icon
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
