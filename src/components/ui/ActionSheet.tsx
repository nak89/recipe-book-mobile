import { Ionicons } from '@expo/vector-icons'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import NavigationButton from '@/components/ui/NavigationButton'
import { Text } from '@/components/ui/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useT } from '@/i18n'
import { contentType, radius, shadow, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

export interface SheetAction {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  destructive?: boolean
}

/**
 * Built on RN's Modal rather than a native action sheet: `ActionSheetIOS` is
 * iOS-only and `Alert` doesn't exist on react-native-web, and this app runs on
 * both. One component, one look everywhere.
 */
export default function ActionSheet({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean
  title?: string
  actions: SheetAction[]
  onClose: () => void
}) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const t = useT()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.dismiss')}>
        {/* Swallow taps on the sheet itself so they don't dismiss it. */}
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.grabber} />
          <View style={styles.header}>
            {title && <Text style={[styles.title, contentType('caption', title)]} numberOfLines={1}>{title}</Text>}
            <NavigationButton action="cancel" onPress={onClose} />
          </View>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => {
                onClose()
                action.onPress()
              }}
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            >
              <Ionicons
                name={action.icon}
                size={20}
                color={action.destructive ? c.danger : c.text}
              />
              <Text style={[styles.actionLabel, action.destructive && styles.destructive]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
    ...shadow.raised,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: c.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.md, paddingHorizontal: spacing.sm },
  title: { flex: 1, minWidth: 0, color: c.textMuted },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  actionPressed: { backgroundColor: c.surfaceAlt },
  actionLabel: { ...type.bodyLarge, color: c.text },
  destructive: { color: c.danger },
})
