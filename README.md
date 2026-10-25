# @rific/toaster

Stacking, animated toast notifications for React Native. Toasts stack on top of each other, auto-dismiss with a configurable timer, and swipe away sideways or off the edge they sit on. A hidden-count badge appears when the stack exceeds your limit.

**[Live demo](https://rific.jaydeaton.com/demos/toaster)**

## Features

- Stacking toasts from the top or bottom edge with animated entry, exit, and reflow
- Stack spacing automatically adapts to each toast's real measured height, long captions or wrapped titles never overlap the toast next to them
- Swipe-to-dismiss sideways or back off the stack's edge, with a quick flick enough on its own and a spring snap-back below threshold
- Auto-dismiss with per-toast elapsed time tracking (resumable across re-renders)
- Keyboard-aware positioning, shifts above the software keyboard automatically
- Toast history (up to 100 entries, survives individual dismissals)
- Four built-in levels: `error`, `warning`, `info`, `success`
- Optional icon support via any icon library
- Optional image support, pass an image URI to render it in place of the level icon
- Per-toast leading node (an avatar, say) drawn at its own size in place of the icon
- Per-toast tap action: a tapped toast runs it and dismisses itself, and a swipe never taps it
- No Portal dependency, place `<Toaster />` wherever you want it
- Optional `react-native-paper` integration, inject it into `ToastProvider` to upgrade cards, buttons, and dividers to Paper components

## Installation

```sh
npm install @rific/toaster
```

### Required peer dependencies

```sh
npm install @rific/core @rific/gestures react-native-reanimated react-native-gesture-handler react-native-worklets react-native-safe-area-context
```

Requires `react-native-reanimated` **v4 or newer**, with `react-native-worklets`, which ships alongside Reanimated 4. The swipe is [`@rific/gestures`](https://github.com/jayrdeaton/react-native-gestures)' `SwipeToDismiss`, which needs gesture-handler, Reanimated, Worklets and `@rific/core` too. Follow the setup guides for [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started) and [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/installation). Your app root also needs `GestureHandlerRootView` from gesture-handler (typically already present if you use React Navigation), and a `SafeAreaProvider` from `react-native-safe-area-context` somewhere above `<Toaster />` (also typically already present, React Navigation and Expo Router both set this up for you).

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
  clear,          // () => void, removes every toast, on every stack
  clearHistory,   // () => void, clears the history log
  openHistory,    // () => void, opens the history modal
  closeHistory,   // () => void, closes the history modal
  toasts,         // Toast[], currently visible
  history,        // Toast[], up to 100, persists across dismissals
  historyVisible, // boolean, whether the history modal is open
  toast,          // Toast | undefined, most recent
} = useToast()
```

### `useUpdateErrorToast`

A one-line bridge for the common "surface a failed update check as a toast" pattern - every app in the fleet that checks for OTA updates on launch wires a failed check into an `error` toast with this exact closure, so it's factored out here instead of hand-rolled per app:

```tsx
import { useUpdateErrorToast } from '@rific/toaster'

function UpdateChecker() {
  const onUpdateError = useUpdateErrorToast()

  useEffect(() => {
    checkForUpdate().catch((e) => onUpdateError(e.message))
  }, [onUpdateError])

  return null
}
```

```ts
useUpdateErrorToast(title?: string): (message: string) => void
```

`title` defaults to `'Update check failed'` - pass your own to customize the toast's heading. The returned callback is a thin wrapper over `useToast().error(title, message)`.

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
| `Card` | `ComponentType<ToastCardProps>` | - | Draws each toast's card in place of the built-in one. See [Custom card](#custom-card). |
| `labelStyle` | `StyleProp<TextStyle>` | - | Merged over the title's built-in style (14/20 in the text color), e.g. to set your app's font. |
| `captionStyle` | `StyleProp<TextStyle>` | - | Merged over the caption's built-in style (12/16, the text color at 75% opacity). |
| `wrapperStyle` | `ViewStyle` | - | Style applied to the outer stack container. |
| `stack` | `string` | - | Shows only the toasts sent to this stack, for a second Toaster beside the main one. See [A Toaster per player](#a-toaster-per-player). |
| `renderFrame` | `(stack: ReactNode) => ReactNode` | - | Lays the stack inside a frame of your own, inside the Portal when `paper` is injected, e.g. one turned to face a player. See [A Toaster per player](#a-toaster-per-player). |

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

### Swiping a toast away

A toast is dismissed by either of two swipes, locked to one axis when the pan starts:

- **Sideways**, either way, past 30% of the toast's width.
- **Toward the edge its stack sits on** (down for the default bottom stack, up for `position='top'`), past half the toast's height: the way a banner is pushed back off the screen. A drag the other way only gives a little and springs back.

A quick flick (about 500pt/s, moving the way it was swiped, at least 12pt) dismisses it either way however short it was. A pointer held still before it lifts isn't a flick. Anything less springs back.

The swipe is `SwipeToDismiss` from `@rific/gestures`, the same one other apps use to swipe their own views away, so every swipe feels alike.

### Custom card

`Card` replaces the card each toast is drawn on (a plain `View`, or Paper's `Surface` when `paper` is injected) while the toaster keeps the stacking, swiping and timing. It is handed the card's own layout style (a row with its padding, corner radius and side margins, with `toastStyle` merged in and `backgroundColor` when that prop is set), the toast's icon and text as `children`, and the `toast` itself (to vary the card by level, say). A blur surface, for example:

```tsx
import { BlurView } from 'expo-blur'
import type { ToastCardProps } from '@rific/toaster'

const BlurCard = ({ children, style }: ToastCardProps) => (
  <BlurView intensity={40} style={[style, { overflow: 'hidden' }]} tint='dark'>
    {children}
  </BlurView>
)

<Toaster Card={BlurCard} labelStyle={{ fontFamily: 'Inter-Medium' }} textColor='#fff' />
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

`levelColors`/`levelIcons` style every toast of a given level the same way. For a toast whose icon and color are its own identity rather than its level's - a badge, an achievement, a category tag - pass a fourth `overrides` argument to override just that one toast, falling back to the level's own icon/color for whichever half you omit (its other fields: `leading` and `onPress`, below, and `stack`, which sends the toast to another Toaster: see [A Toaster per player](#a-toaster-per-player)):

```tsx
success('Flawless Victory', undefined, undefined, { color: '#FFD54F', icon: 'shield-star' })
success('First Blood', undefined, undefined, { color: '#CD7F32', icon: 'sword' })
```

### A leading node (e.g. an avatar)

For something an icon name or an image URI can't draw, such as a person's avatar with their initial in their own color, pass `leading` in the overrides: an element of your own, drawn at the card's leading edge at whatever size it is, in place of the image, icon or indicator. It wins over `image`, `icon` and `color` when given; a toast without one is drawn as before.

```tsx
info('New note', 'From Sam', undefined, { leading: <PersonAvatar person={sam} size={24} /> })
```

The history list's rows keep their level's color bar (they draw no image or icon either).

### Tapping a toast

Pass `onPress` in the overrides to make a toast's card a button: a tap calls it and dismisses that toast.

```tsx
info('New note', 'From Sam', undefined, { leading: <PersonAvatar person={sam} size={24} />, onPress: () => router.push(`/apps/${appId}/notes`) })
```

- **Feedback:** the card dims while pressed (opacity, with or without Paper). It reads to a screen reader as a button labelled with its title and caption.
- **Swipes still dismiss it**, and a swipe never also taps it: the press sits inside the swipe's own wrapper, so on iOS and Android the gesture runtime cancels the press once the swipe takes the touch, and on the web the click that ends a swipe is caught before it presses. A tap never moves far enough to start a swipe.
- **A custom `Card` needn't change:** the press wraps it from outside. Keep it the only pressable in the card, though: react-native-web draws it as a `<button>`, and a button can't hold another one.
- **In the history list** the toast's row is pressable too: a tap closes the history, dismisses the toast if it's still up, and calls `onPress`, so write it to still make sense later (navigate by an id rather than act on state it captured).
- A toast without `onPress` is exactly as before: not pressable, no button role, no feedback.

### Top position

Toasts stack downward from the top edge. Entry and exit animations flip automatically, new toasts drop in from above, and the stack grows downward.

```tsx
<Toaster position='top' />
```

The `keyboardAware` prop has no effect when `position='top'` since the keyboard doesn't overlap the top of the screen.

### Inside a turned or transformed frame

Swipe-to-dismiss (`@rific/gestures`' `SwipeToDismiss`) is measured in the toast's **own** coordinate space, so on **iOS and Android** it works unchanged inside a frame that is
rotated or otherwise transformed - for example an app that stays portrait-locked at the OS level and fakes landscape by turning a `View`.
There is no prop for it and nothing to configure: the pan's distance is the change in the pointer's position *relative to the toast's own
view* (which the gesture runtime computes through every ancestor transform), not the window-space `translationX`, and the dismiss
thresholds are 30% of the toast's own laid-out width and half its height. A flick's speed is sampled from those same local positions, not
the gesture's window-space velocity. It is a single-finger gesture, and the distance is measured from where the pan activates.

On **web** this does not hold: the gesture runtime derives its coordinates from the element's axis-aligned bounding box, so a rotated
ancestor is not accounted for there - don't rotate the toaster's ancestors on web.

One thing stays tied to the physical screen: the software keyboard is always at the *physical* bottom, which is not a turned frame's
bottom edge, so `keyboardAware` lifts by the wrong edge inside a turned frame. If you fake rotation, revert the frame to upright while the
keyboard is up - then the default is correct again.

### A Toaster per player

A game played face to face, two players across a phone lying on the table, can show each player their own toasts the right way up. Send a toast to a named stack with the `stack` override, and mount a second `<Toaster stack>` for it, laid in a frame turned to face that seat:

```tsx
// Seat 2 sits across the table from seat 1, so its toasts are turned 180 degrees.
<Toaster
  clearButton={null}
  historyButton={null}
  keyboardAware={false}
  renderFrame={(stack) => <TurnedFrame rotation={180}>{stack}</TurnedFrame>}
  stack='seat-2'
/>

success('First Goal', 'Bob unlocked', undefined, { stack: 'seat-2' })
```

- **The main Toaster** (one with no `stack`) shows every toast sent to no stack, which is every toast unless one is targeted, so an app that never uses stacks is unchanged.
- **`limit` counts per Toaster**, against its own stack: another stack's toasts never take its places.
- **A stack's toasts wait** while no Toaster for it is mounted, the way toasts past `limit` do. A toast's time runs from when it was sent, so one older than `duration` goes the moment it would show. `clear()` removes every stack's toasts; a Toaster's own clear control removes only its stack's.
- **History stays the main Toaster's**: every toast is in `history`, and a Toaster with a `stack` draws no history modal unless you pass `historyModal`, so opening the history never opens one per Toaster.
- **`renderFrame`** wraps the stack inside the Toaster's Portal (when `paper` is injected), so the frame is drawn over the screen just as the stack is, and only while it has toasts. The stack is absolutely placed against the frame's edges with the safe-area insets it reads there: a turned frame should provide insets remapped onto its own edges (through `react-native-safe-area-context`'s `SafeAreaInsetsContext`), let touches through to the screen beneath it, and, turned a quarter turn, take the window's footprint turned too. Turn `keyboardAware` off in it (see the keyboard note above). On the web, see the note above on turned frames: the swipe there doesn't follow the turn.

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

A toast sent with `onPress` is a pressable row here: a tap closes the history, dismisses the toast if it's still up, and calls `onPress` (see [Tapping a toast](#tapping-a-toast)).

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
  leading: ReactNode    // drawn in place of the image/icon, null for none - see "A leading node"
  onPress: (() => void) | null  // makes the card a button - see "Tapping a toast"
  stack: string | null  // the <Toaster stack> that shows it, null for the main one - see "A Toaster per player"
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
