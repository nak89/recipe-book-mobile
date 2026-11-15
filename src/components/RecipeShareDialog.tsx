import { useEffect, useRef, useState } from 'react'
import * as Clipboard from 'expo-clipboard'
import { Modal, Platform, Share, StyleSheet, View } from 'react-native'
import { Text, TextInput } from '@/components/ui/Text'
import PrimaryButton from '@/components/ui/PrimaryButton'
import BlankLoadingState from '@/components/ui/BlankLoadingState'
import { useT } from '@/i18n'
import { createRecipeShare, getRecipeShare, revokeRecipeShare } from '@/lib/api'
import { sharedRecipeUrl } from '@/lib/sharedRecipeLink'
import { radius, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

export default function RecipeShareDialog({ id, token, onClose }: {
  id: string
  token: string
  onClose: () => void
}) {
  const t = useT()
  const styles = useThemedStyles(makeStyles)
  const [active, setActive] = useState<boolean>()
  const [url, setUrl] = useState<string>()
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const inFlight = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    getRecipeShare(id, token, controller.signal)
      .then(result => { if (!controller.signal.aborted) setActive(result.active) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [id, token, attempt])

  async function changeLink(create: boolean) {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError(false)
    setCopied(false)
    try {
      if (create) {
        const { token: code } = await createRecipeShare(id, token)
        setActive(true)
        setUrl(sharedRecipeUrl(code))
      } else {
        await revokeRecipeShare(id, token)
        setUrl(undefined)
        setActive(false)
      }
    } catch {
      setError(true)
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  async function copyLink() {
    if (!url) return
    try {
      const success = await Clipboard.setStringAsync(url)
      setCopied(success)
      setError(!success)
    } catch {
      setCopied(false)
      setError(true)
    }
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={() => { if (!busy) onClose() }}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={styles.title}>{t('recipeShare.title')}</Text>
          <Text style={styles.body}>{t('recipeShare.notice')}</Text>
          {active === undefined && !error && <View style={styles.loading}><BlankLoadingState /></View>}
          {error && <Text accessibilityRole="alert" style={styles.error}>{t('recipeShare.failed')}</Text>}
          {active === undefined && error && (
            <PrimaryButton label={t('common.retry')} onPress={() => { setError(false); setAttempt(attempt + 1) }} />
          )}
          {active && !url && <Text style={styles.body}>{t('recipeShare.replaceNotice')}</Text>}
          {url && (
            <>
              <TextInput value={url} editable={false} selectTextOnFocus accessibilityLabel={t('recipeShare.link')} style={styles.link} />
              <PrimaryButton label={t(copied ? 'recipeShare.copied' : 'recipeShare.copyLink')} onPress={copyLink} disabled={busy} />
              {Platform.OS !== 'web' && <PrimaryButton label={t('recipeShare.sendLink')} variant="outline" disabled={busy} onPress={() => {
                void Share.share({ message: url }).catch(() => setError(true))
              }} />}
            </>
          )}
          {active !== undefined && !url && (
            <PrimaryButton label={t(active ? 'recipeShare.replace' : 'recipeShare.create')} loading={busy} onPress={() => changeLink(true)} />
          )}
          {active && <PrimaryButton label={t('recipeShare.revoke')} variant="outline" disabled={busy} onPress={() => changeLink(false)} />}
          <PrimaryButton label={t('common.done')} variant="outline" onPress={onClose} disabled={busy} />
        </View>
      </View>
    </Modal>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: c.scrimStrong, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 420, padding: spacing.lg, backgroundColor: c.surface, borderRadius: radius.lg, gap: spacing.sm },
  title: { ...type.section, color: c.text },
  body: { ...type.body, color: c.text },
  error: { ...type.body, color: c.danger },
  loading: { minHeight: 72 },
  link: { ...type.body, color: c.text, backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: spacing.sm },
})
