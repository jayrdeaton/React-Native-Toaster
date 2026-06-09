export const bottomSheet = (() => {
  try {
    const bs = require('@gorhom/bottom-sheet') as typeof import('@gorhom/bottom-sheet')
    return {
      BottomSheet: bs.default,
      BottomSheetFlatList: bs.BottomSheetFlatList
    }
  } catch {
    return null
  }
})()
