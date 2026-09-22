// The swipe-to-dismiss rules, kept as tiny worklet functions so they are unit-testable without a gesture runtime. `distance` is how far
// the pointer has moved along the toast's OWN x axis since it went down (see Toaster.tsx's buildSwipeGesture for how that is measured),
// `width` is the toast's own laid-out width.

/** A swipe past this fraction of the toast's width dismisses it. */
export const SWIPE_DISMISS_FRACTION = 0.4
/** A dismissed toast flies out to this multiple of its width, in the direction it was swiped. */
export const SWIPE_EXIT_FACTOR = 1.5

export function swipeShouldDismiss(distance: number, width: number): boolean {
  'worklet'
  return Math.abs(distance) > width * SWIPE_DISMISS_FRACTION
}

/** `clearance` is the length that must be cleared to leave the screen - the toast's own width, or the larger window dimension when the stack is narrower
 * than the screen or the frame is turned. */
export function swipeExitTarget(distance: number, clearance: number): number {
  'worklet'
  return distance > 0 ? clearance * SWIPE_EXIT_FACTOR : -clearance * SWIPE_EXIT_FACTOR
}
