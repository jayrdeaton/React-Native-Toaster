import { FadeInDown, FadeInUp, FadeOutDown, FadeOutUp } from 'react-native-reanimated'

export const ENTER_MS = 220
export const EXIT_MS = 160

// Reanimated names a fade after the side it comes from or goes to, not the way it moves: FadeInUp starts 25pt ABOVE its spot and moves DOWN into
// it, FadeInDown starts below and rises, FadeOutUp leaves upward and FadeOutDown downward (its Fade.ts presets). Reading them the other way round
// had a top stack's toast rise into place from below and a bottom stack's drop into place from above.
//
// A toast comes in from the edge its stack sits on (the newest is always at that edge) and goes back out toward it. The one exception is the
// farthest toast of several (see exitsOutward), which leaves away from the stack instead of sliding over the toasts nearer the edge.

export type StackPosition = 'bottom' | 'top'

/** The entering animation for anything drawn at the stack's edge: from just beyond that edge into place. */
export function toastEntering(position: StackPosition) {
  return position === 'top' ? FadeInUp.duration(ENTER_MS) : FadeInDown.duration(ENTER_MS)
}

/** The exiting animation: back toward the stack's edge, or away from it (`outward`) for the farthest of several toasts. */
export function toastExiting(position: StackPosition, outward: boolean) {
  const towardTop = position === 'top' ? !outward : outward
  return towardTop ? FadeOutUp.duration(EXIT_MS) : FadeOutDown.duration(EXIT_MS)
}

/** Whether the toast at `index` (0 = the newest, at the stack's edge) of `count` visible ones leaves away from the edge: only the farthest, and
 * only when it isn't also the one at the edge. A lone toast goes back the way it came. */
export function exitsOutward(index: number, count: number): boolean {
  return index > 0 && index === count - 1
}
