import { km, type StringKey } from '@/i18n/strings'
import { toKhmerDigits } from '@/lib/numerals'

export type RecipeGenerationSource = 'text' | 'video' | 'photo'

export function recipeGenerationIssue(
  source: RecipeGenerationSource,
  status: number | undefined,
  preparingMedia: boolean,
) {
  switch (status) {
    case 408:
    case 504:
      return 'timeout'
    case 422:
      return source
    case 424:
      return 'caption'
    case 413:
      return source === 'text' ? 'input' : source === 'video' ? 'videoSize' : 'photoSize'
    case 415:
      return source === 'text' ? 'input' : source === 'video' ? 'videoFormat' : 'photoRead'
    case 400:
      return 'input'
    case 401:
    case 403:
    case 429:
      return 'restricted'
    case 503:
      return 'unavailable'
    default:
      if (preparingMedia && source === 'photo') return 'photoRead'
      if (preparingMedia && source === 'video') return 'video'
      return 'failed'
  }
}

export type RecipeGenerationIssue = ReturnType<typeof recipeGenerationIssue>

export function recipeImportLimit(error: { status: number; code?: string; message: string; retryAt?: string }) {
  if (error.status !== 429) return undefined
  if (error.code === 'recipe_draft_user_limit') return { scope: 'user', retryAt: error.retryAt } as const
  if (error.code === 'recipe_draft_global_limit') return { scope: 'global', retryAt: error.retryAt } as const
  if (error.message === 'Recipe import limit reached. Try again later.') return { scope: 'unknown' } as const
  return undefined
}

export function formatRecipeImportReset(retryAt: string | undefined, language: 'en' | 'km') {
  if (!retryAt) return undefined
  const time = Date.parse(retryAt)
  if (!Number.isFinite(time)) return undefined
  const minute = 60_000
  // A minute-only display must not tell the user they can retry early.
  const reset = new Date(Math.ceil(time / minute) * minute)
  if (language === 'km') {
    const month = km[`month.${reset.getMonth() + 1}` as StringKey]
    const time = `${reset.getHours()}:${String(reset.getMinutes()).padStart(2, '0')}`
    return toKhmerDigits(`${reset.getDate()} ${month} ម៉ោង ${time}`)
  }
  return new Intl.DateTimeFormat('en-AU', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(reset)
}
