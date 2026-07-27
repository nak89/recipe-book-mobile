import AuthForm from '@/components/AuthForm'
import { useAuth } from '@/context/AuthContext'

export default function SignupScreen() {
  const { signup } = useAuth()

  return (
    <AuthForm
      heading="Create your recipe book"
      subheading="Save what you cook, all in one place."
      submitLabel="Sign up"
      onSubmit={signup}
      footerText="Already have an account?"
      footerLinkText="Log in"
      footerHref="/login"
    />
  )
}
