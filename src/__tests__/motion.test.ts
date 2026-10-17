import { FadeInDown, FadeInUp, FadeOutDown, FadeOutUp } from 'react-native-reanimated'

import { exitsOutward, toastEntering, toastExiting } from '../motion'

// The mock's presets are plain objects whose duration() returns the object itself, so the preset a helper picked can be compared directly.
describe('toast motion', () => {
  it('comes in from the edge the stack sits on: from above for a top stack, from below for a bottom one', () => {
    expect(toastEntering('top')).toBe(FadeInUp)
    expect(toastEntering('bottom')).toBe(FadeInDown)
  })

  it('leaves back toward that edge', () => {
    expect(toastExiting('top', false)).toBe(FadeOutUp)
    expect(toastExiting('bottom', false)).toBe(FadeOutDown)
  })

  it('leaves away from the edge when outward', () => {
    expect(toastExiting('top', true)).toBe(FadeOutDown)
    expect(toastExiting('bottom', true)).toBe(FadeOutUp)
  })

  it('goes outward only for the farthest of several toasts, never for a lone one', () => {
    expect(exitsOutward(0, 1)).toBe(false)
    expect(exitsOutward(0, 3)).toBe(false)
    expect(exitsOutward(1, 3)).toBe(false)
    expect(exitsOutward(2, 3)).toBe(true)
  })
})
