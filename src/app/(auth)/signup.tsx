import AuthForm from '@/components/AuthForm'
import { useAuth } from '@/context/AuthContext'
import { useT } from '@/i18n'

export default function SignupScreen() {
  const { signup } = useAuth()
  const t = useT()

  return (
    <AuthForm
      heading={t('auth.signup.heading')}
      subheading={t('auth.signup.heading')}
      submitLabel={t('auth.signup.submit')}
      onSubmit={signup}
      footerText={t('auth.signup.footer')}
      footerLinkText={t('auth.login.submit')}
      footerHref="/login"
    />
  )
}
