import AuthForm from '@/components/AuthForm'
import { useAuth } from '@/context/AuthContext'
import { useT } from '@/i18n'

export default function LoginScreen() {
  const { login } = useAuth()
  const t = useT()

  return (
    <AuthForm
      heading={t('auth.login.heading')}
      subheading={t('auth.login.heading')}
      submitLabel={t('auth.login.submit')}
      onSubmit={login}
      footerText={t('auth.login.footer')}
      footerLinkText={t('auth.signup.submit')}
      footerHref="/signup"
    />
  )
}
