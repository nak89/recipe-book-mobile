import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { radius, shadow, spacing, type, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'

/**
 * Replaces `Alert.alert`, which doesn't exist on react-native-web. Rendering it
 * ourselves also means the confirm dialog matches the palette instead of
 * inheriting the OS look on one platform and the browser look on another.
 */
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  destructive = true,
  onConfirm,
  onCancel,
}: {
  visible: boolean
  title: string
  message?: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                destructive ? styles.confirmDestructive : styles.confirm,
                pressed && styles.pressed,
              ]}
            >
              <Text style={destructive ? styles.confirmLabelDestructive : styles.confirmLabel}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadow.raised,
  },
  title: { ...type.section, color: c.text },
  message: { ...type.body, color: c.textMuted, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  button: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  cancel: { backgroundColor: c.surfaceAlt },
  cancelLabel: { ...type.bodyStrong, color: c.text },
  confirm: { backgroundColor: c.primary },
  confirmLabel: { ...type.bodyStrong, color: c.onPrimary },
  confirmDestructive: { backgroundColor: c.danger },
  confirmLabelDestructive: { ...type.bodyStrong, color: c.onPrimary },
})
