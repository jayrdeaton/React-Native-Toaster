# TODO

## Move off gesture-handler's deprecated `Gesture` builder

Shipped 2026-10-16 with the peer range raised to `react-native-gesture-handler >=2.0.0 <4.0.0` so Expo SDK 58 apps (gesture-handler 3.3) can use it, but the code still uses the builder API (`Gesture.Pan()` in the swipe-to-dismiss handling), which 3.x marks deprecated and says it will remove. Move to the 3.x hooks (`usePanGesture`) with `GestureDetector`; that makes 3.0 the peer floor, so release it as a minor once every consumer is on SDK 58.

## Check gestures on a device under gesture-handler 3

The tests mock `react-native-gesture-handler` (`src/__mocks__/react-native-gesture-handler.ts`), so they passed against 3.3 without running it. Before relying on it, try swiping a toast away (up and sideways) and tapping one in an SDK 58 dev build.

## React Native 0.88 strict types

Checked 2026-10-16 with only the `react-native` condition: this package's own source has no strict-type errors. Nothing to do here beyond dropping the deferral when `@infinitetoken/tsconfig` does.
