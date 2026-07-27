import { Ionicons } from '@expo/vector-icons'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius, shadow, spacing, type } from '@/theme'

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
                color={action.destructive ? colors.danger : colors.text}
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

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...type.caption,
    color: colors.textMuted,
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
  actionPressed: { backgroundColor: colors.surfaceAlt },
  actionLabel: { ...type.body, fontSize: 16, color: colors.text },
  destructive: { color: colors.danger },
  cancel: {
    marginTop: spacing.xs,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  cancelLabel: { ...type.bodyStrong, fontSize: 16, color: colors.text },
})
