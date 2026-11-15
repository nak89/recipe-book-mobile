import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { StyleSheet } from 'react-native'
import { MastheadAction } from '@/components/ui/Masthead'
import { useT } from '@/i18n'
import { sizes } from '@/theme'

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export default function ProfileButton() {
  const router = useRouter()
  const t = useT()

  return (
    <MastheadAction
      onPress={() => router.push('/profile')}
      accessibilityLabel={t('nav.profile')}
    >
      <Image
        source={require('../../../assets/images/profile-romdoul.png')}
        accessible={false}
        style={styles.mark}
      />
    </MastheadAction>
  )
}

const styles = StyleSheet.create({
  mark: {
    width: '100%',
    height: '100%',
    borderRadius: sizes.hitMin / 2,
  },
})
