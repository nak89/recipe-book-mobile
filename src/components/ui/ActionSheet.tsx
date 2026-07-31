import { Ionicons } from '@expo/vector-icons'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { radius, shadow, spacing, type, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'

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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss">
        {/* Swallow taps on the sheet itself so they don't dismiss it. */}
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.grabber} />
          {title && (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
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
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.cancel, pressed && styles.actionPressed]}
          >
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
  title: {
    ...type.caption,
    color: c.textMuted,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  actionPressed: { backgroundColor: c.surfaceAlt },
  actionLabel: { ...type.body, fontSize: 16, color: c.text },
  destructive: { color: c.danger },
  cancel: {
    marginTop: spacing.xs,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: c.surfaceAlt,
  },
  cancelLabel: { ...type.bodyStrong, fontSize: 16, color: c.text },
})
