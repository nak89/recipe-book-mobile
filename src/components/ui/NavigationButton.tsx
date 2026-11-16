import { Ionicons } from '@expo/vector-icons'
import { MastheadAction } from '@/components/ui/Masthead'
import { useT } from '@/i18n'
import { useTheme } from '@/theme'

/** The same control for leaving screens, steps, dialogs, and sheets. */
export default function NavigationButton({ action, onPress, accessibilityLabel, disabled }: {
  action: 'back' | 'close' | 'cancel'
  onPress: () => void
  accessibilityLabel?: string
  disabled?: boolean
}) {
  const t = useT()
  const { colors } = useTheme()
  const label = action === 'back' ? 'common.back' : action === 'cancel' ? 'common.cancel' : 'common.close'

  return (
    <MastheadAction
      opaque
      accessibilityLabel={accessibilityLabel ?? t(label)}
      disabled={disabled}
      onPress={onPress}
    >
      <Ionicons name={action === 'back' ? 'chevron-back' : 'close'} size={20} color={colors.text} />
    </MastheadAction>
  )
}
