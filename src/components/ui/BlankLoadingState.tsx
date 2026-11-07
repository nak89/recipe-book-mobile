import { StyleSheet, View } from 'react-native'
import { useT } from '@/i18n'
import { useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'

/** Local session checks and brief transitions need no visible animation. */
export default function BlankLoadingState() {
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  return <View style={styles.container} accessible accessibilityRole="progressbar" accessibilityLabel={t('common.loading')} accessibilityState={{ busy: true }} />
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
})
