import { useRouter } from 'expo-router'
import { useAuth } from '@/context/AuthContext'
import { createRecipe } from '@/lib/api'
import RecipeForm from '@/components/RecipeForm'
import type { RecipeInput } from '@/types/recipe'

export default function NewRecipeScreen() {
  const { token } = useAuth()
  const router = useRouter()

  async function handleSubmit(data: RecipeInput) {
    if (!token) return
    await createRecipe(data, token)
    // Dismiss back to the dashboard rather than opening the new recipe — the
    // list refetches on focus, so the new card is already there.
    router.back()
  }

  return <RecipeForm onSubmit={handleSubmit} submitLabel="Add recipe" />
}
