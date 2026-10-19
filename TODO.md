# TODO

## Move off gesture-handler's deprecated `Gesture` builder

Moved to `@rific/gestures` with the swipe (2026-10-18): its `SwipeToDismiss` builds the pan with `Gesture.Pan()`, which gesture-handler 3.x marks deprecated and says it will remove. The move to the 3.x hooks (`usePanGesture`) happens there; nothing here uses gesture-handler directly any more. The peer range stays `react-native-gesture-handler >=2.0.0 <4.0.0` until that package raises its own.

## Check gestures on a device under gesture-handler 3

The tests mock `@rific/gestures` whole, so they never run gesture-handler. Before relying on it, try swiping a toast away (up and sideways) and tapping one in an SDK 58 dev build, now through `@rific/gestures`.

## React Native 0.88 strict types

Checked 2026-10-16 with only the `react-native` condition: this package's own source has no strict-type errors. Nothing to do here beyond dropping the deferral when `@infinitetoken/tsconfig` does.
