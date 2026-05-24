import { Portal, useTheme } from 'react-native-paper'

import { Toaster, type ToasterProps } from './Toaster'

export const PaperToaster = (props: ToasterProps) => {
  const theme = useTheme()
  return (
    <Portal>
      <Toaster {...props} theme={theme} />
    </Portal>
  )
}
