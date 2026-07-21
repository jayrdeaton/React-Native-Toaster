type ImpactFeedbackStyle = 'heavy' | 'light' | 'medium' | 'rigid' | 'soft'

type HapticsModule = {
  ImpactFeedbackStyle: { Light: ImpactFeedbackStyle }
  impactAsync: (style?: ImpactFeedbackStyle) => Promise<void>
}

export const haptics = (() => {
  try {
    return require('expo-haptics') as HapticsModule
  } catch {
    return null
  }
})()
