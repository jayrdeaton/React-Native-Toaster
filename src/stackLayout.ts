export const DEFAULT_ITEM_HEIGHT = 56
export const STACK_GAP = 4

export type StackLayout = { offsets: number[]; totalHeight: number }

export function computeStackOffsets(ids: string[], heights: Record<string, number>): StackLayout {
  let cumulative = 0
  const offsets: number[] = []
  for (const id of ids) {
    offsets.push(cumulative)
    cumulative += (heights[id] ?? DEFAULT_ITEM_HEIGHT) + STACK_GAP
  }
  return { offsets, totalHeight: cumulative }
}
