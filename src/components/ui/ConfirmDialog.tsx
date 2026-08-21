import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { minHeights, radius, shadow, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import { useT } from '@/i18n'

/**
 * Replaces `Alert.alert`, which doesn't exist on react-native-web. Rendering it
 * ourselves also means the confirm dialog matches the palette instead of
 * inheriting the OS look on one platform and the browser look on another.
 */
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
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
  const t = useT()
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
              <Text style={styles.cancelLabel}>{t('common.cancel')}</Text>
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
                {/* Defaulted here rather than in the signature: a default has to be
                    translated, and a parameter default can't call a hook. */}
                {confirmLabel ?? t('common.delete')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
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
  message: { ...type.bodyRead, color: c.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  button: {
    flex: 1,
    minHeight: minHeights.dialogButton,
    paddingVertical: 13,
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
  // `textInverse`, not `onPrimary`: this label sits on `danger`, not on a
  // primary fill. The two were interchangeable while `onPrimary` was white, and
  // stopped being so when it became ink — ink on light's #DC2626 is 3.68:1.
  // `textInverse` is the token that tracks the *fill* rather than the brand, so
  // it lands correctly at both ends: white on light's deep red (4.85:1), and
  // near-black on dark's lighter #F87171 (6.6:1), where white would be 2.8:1.
  confirmLabelDestructive: { ...type.bodyStrong, color: c.textInverse },
})
