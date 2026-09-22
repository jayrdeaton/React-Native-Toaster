import { SWIPE_DISMISS_FRACTION, SWIPE_EXIT_FACTOR, swipeExitTarget, swipeShouldDismiss } from '../swipe'

describe('swipeShouldDismiss', () => {
  it('dismisses strictly past the fraction of the toast width, in either direction', () => {
    const width = 300
    const threshold = width * SWIPE_DISMISS_FRACTION
    expect(swipeShouldDismiss(threshold, width)).toBe(false) // exactly at the threshold does not
    expect(swipeShouldDismiss(threshold + 1, width)).toBe(true)
    expect(swipeShouldDismiss(-threshold, width)).toBe(false)
    expect(swipeShouldDismiss(-(threshold + 1), width)).toBe(true)
    expect(swipeShouldDismiss(0, width)).toBe(false)
  })

  it("scales with the toast's own width: the same drag dismisses a narrow toast but not a wide one", () => {
    expect(swipeShouldDismiss(100, 200)).toBe(true) // 100 > 80
    expect(swipeShouldDismiss(100, 400)).toBe(false) // 100 < 160
  })
})

describe('swipeExitTarget', () => {
  it('flies out to a multiple of the clearance length, in the direction of the swipe', () => {
    expect(swipeExitTarget(120, 300)).toBe(300 * SWIPE_EXIT_FACTOR)
    expect(swipeExitTarget(-120, 300)).toBe(-300 * SWIPE_EXIT_FACTOR)
  })
})
