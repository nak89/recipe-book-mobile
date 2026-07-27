import AuthForm from '@/components/AuthForm'
import { useAuth } from '@/context/AuthContext'

export default function LoginScreen() {
  const { login } = useAuth()

  return (
    <AuthForm
      heading="Welcome back"
      subheading="Sign in to get cooking."
      submitLabel="Log in"
      onSubmit={login}
      footerText="Need an account?"
      footerLinkText="Sign up"
      footerHref="/signup"
    />
  )
}
