import { noteIncomingRecipeShare, recipeShareEnabled } from '@/lib/incomingRecipeShare'

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (recipeShareEnabled && /^recipebookdev:\/\/expo-sharing\/?(?:[?#].*)?$/.test(path)) {
    return `/recipe/new?incomingShare=${noteIncomingRecipeShare()}`
  }
  return path
}
