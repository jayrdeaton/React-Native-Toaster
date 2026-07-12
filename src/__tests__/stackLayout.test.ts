import { computeStackOffsets, DEFAULT_ITEM_HEIGHT, STACK_GAP } from '../stackLayout'

describe('computeStackOffsets', () => {
  it('returns empty offsets and zero total height for an empty list', () => {
    expect(computeStackOffsets([], {})).toEqual({ offsets: [], totalHeight: 0 })
  })

  it('falls back to DEFAULT_ITEM_HEIGHT for every unmeasured toast', () => {
    const ids = ['a', 'b', 'c']
    const { offsets, totalHeight } = computeStackOffsets(ids, {})
    expect(offsets).toEqual([0, DEFAULT_ITEM_HEIGHT + STACK_GAP, (DEFAULT_ITEM_HEIGHT + STACK_GAP) * 2])
    expect(totalHeight).toBe((DEFAULT_ITEM_HEIGHT + STACK_GAP) * 3)
  })

  it('uses measured heights when available and falls back for the rest', () => {
    const ids = ['a', 'b', 'c']
    const heights = { a: 80, c: 100 }
    const { offsets, totalHeight } = computeStackOffsets(ids, heights)
    expect(offsets[0]).toBe(0)
    expect(offsets[1]).toBe(80 + STACK_GAP)
    expect(offsets[2]).toBe(80 + STACK_GAP + DEFAULT_ITEM_HEIGHT + STACK_GAP)
    expect(totalHeight).toBe(80 + STACK_GAP + DEFAULT_ITEM_HEIGHT + STACK_GAP + 100 + STACK_GAP)
  })

  it('produces strictly non-overlapping cumulative offsets', () => {
    const ids = ['a', 'b', 'c', 'd']
    const heights: Record<string, number> = { a: 52, b: 90, d: 60 }
    const { offsets } = computeStackOffsets(ids, heights)
    for (let i = 0; i < ids.length - 1; i++) {
      const height = heights[ids[i]] ?? DEFAULT_ITEM_HEIGHT
      expect(offsets[i + 1]).toBeGreaterThanOrEqual(offsets[i] + height)
    }
  })
})
