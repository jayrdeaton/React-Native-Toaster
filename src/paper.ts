import type { ComponentType, ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

import type { PaperTheme } from './Toaster'

type ChipProps = { children: ReactNode; compact?: boolean; icon?: string; onPress?: () => void; style?: StyleProp<ViewStyle> }

type IconProps = { color?: string; size?: number; source: string }

type IconButtonProps = { icon: string; onPress?: () => void }

type PortalProps = { children: ReactNode }

type SurfaceProps = { children: ReactNode; elevation?: number; style?: StyleProp<ViewStyle> }

type PaperModule = {
  Chip: ComponentType<ChipProps>
  Divider: ComponentType<Record<string, never>>
  Icon: ComponentType<IconProps>
  IconButton: ComponentType<IconButtonProps>
  Portal: ComponentType<PortalProps>
  Surface: ComponentType<SurfaceProps>
  useTheme: () => PaperTheme
}

export const paper = (() => {
  try {
    return require('react-native-paper') as PaperModule
  } catch {
    return null
  }
})()
