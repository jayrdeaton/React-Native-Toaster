# @rific/react-native-toaster

Stacking, animated toast notifications for React Native. Toasts stack on top of each other, auto-dismiss with a configurable timer, and swipe away horizontally. A hidden-count badge appears when the stack exceeds your limit.

## Features

- Stacking toasts with animated entry, exit, and reflow
- Swipe-to-dismiss with spring snap-back below threshold
- Auto-dismiss with per-toast elapsed time tracking (resumable across re-renders)
- Keyboard-aware positioning — shifts above the software keyboard automatically
- Toast history (up to 100 entries, survives individual dismissals)
- Four built-in levels: `error`, `warning`, `info`, `success`
- Optional icon support via any icon library
- No Portal dependency — place `<Toaster />` wherever you want it

## Installation

```sh
npm install @rific/react-native-toaster
```

### Peer dependencies

```sh
npm install react-native-reanimated react-native-gesture-handler
```

Follow the setup guides for [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started) and [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/installation). Your app root also needs `GestureHandlerRootView` from gesture-handler (typically already present if you use React Navigation).

## Setup

Wrap your app with `ToastProvider` and place `<Toaster />` wherever toasts should appear. Since there's no Portal, the component renders in-place — putting it near the root of your tree is the most common pattern.

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ToastProvider, Toaster } from '@rific/react-native-toaster'

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

## Usage

```tsx
import { useToast } from '@rific/react-native-toaster'

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
  error,        // (title, caption?) => void
  warning,      // (title, caption?) => void
  info,         // (title, caption?) => void
  success,      // (title, caption?) => void
  dismiss,      // (id) => void
  clear,        // () => void — removes all visible toasts
  clearHistory, // () => void — clears the history log
  toasts,       // Toast[] — currently visible
  history,      // Toast[] — up to 100, persists across dismissals
  toast,        // Toast | undefined — most recent
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
| `levelColors` | `Partial<Record<ToastLevel, string>>` | — | Override the color per level. |
| `Icon` | `ComponentType<{ name, size?, color? }>` | — | Icon component from any vector icon library. |
| `levelIcons` | `Partial<Record<ToastLevel, string>>` | — | Icon name per level, passed to `Icon`. |
| `wrapperStyle` | `ViewStyle` | — | Style applied to the outer container. |

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

### Portal behavior

`<Toaster />` is an absolutely-positioned `View`. If you want it to render above modals or other overlays, wrap it yourself:

```tsx
import { Portal } from 'react-native-paper'

<Portal>
  <Toaster />
</Portal>
```

## Toast model

```ts
class Toast {
  id: string         // UUID
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
