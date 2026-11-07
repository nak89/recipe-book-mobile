export interface DinnerChoice { id: string; mealtime?: string | null }
export interface DinnerEntry { date: string; recipeId: string | null; kept: boolean; originalRecipeId: string | null; manual?: boolean }
export interface DinnerOptions { includeUntagged: boolean; allowRepeats: boolean }
type Planned = { date: string; recipeId: string; mealtime: string }

export function dinnerPool(recipes: readonly DinnerChoice[], options: DinnerOptions) {
  return [...new Map(recipes.filter(r => r.mealtime === 'Dinner' || (options.includeUntagged && !r.mealtime)).map(r => [r.id, r])).values()]
}

function choose(pool: DinnerChoice[], used: Set<string>, options: DinnerOptions, random: () => number, previous?: string | null) {
  const unused = pool.filter(r => !used.has(r.id))
  const available = unused.length ? unused : options.allowRepeats ? pool : []
  const preferred = available.filter(r => r.mealtime === 'Dinner')
  const candidates = preferred.length ? preferred : available
  const varied = candidates.filter(r => r.id !== previous)
  const choices = varied.length ? varied : candidates
  return choices.length ? choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))].id : null
}

/** Automatic generation keeps existing dinners. Shortages stay explicit until repeats are allowed. */
export function generateDinners(dates: readonly string[], recipes: readonly DinnerChoice[], plan: readonly Planned[], options: DinnerOptions, random = Math.random): DinnerEntry[] {
  const existing = new Map(plan.filter(p => p.mealtime === 'Dinner' && dates.includes(p.date)).map(p => [p.date, p.recipeId]))
  const used = new Set(existing.values())
  const pool = dinnerPool(recipes, options)
  let previous: string | null = null
  return dates.map(date => {
    const kept = existing.get(date)
    const recipeId = kept ?? choose(pool, used, options, random, previous)
    if (recipeId) used.add(recipeId)
    previous = recipeId
    return { date, recipeId, kept: kept !== undefined, originalRecipeId: kept ?? null }
  })
}

export function dinnerAlternatives(entry: DinnerEntry, draft: readonly DinnerEntry[], recipes: readonly DinnerChoice[], options: DinnerOptions) {
  if (entry.kept) return []
  const used = new Set(draft.filter(other => other.date !== entry.date && other.recipeId).map(other => other.recipeId))
  return dinnerPool(recipes, options).filter(r => r.id !== entry.recipeId && (options.allowRepeats || !used.has(r.id)))
}

export function swapDinner(date: string, draft: readonly DinnerEntry[], recipes: readonly DinnerChoice[], options: DinnerOptions, random = Math.random): DinnerEntry[] {
  return draft.map(entry => {
    if (entry.date !== date || entry.kept) return entry
    const choices = dinnerAlternatives(entry, draft, recipes, options)
    const id = choose(choices, new Set(), options, random)
    return id ? { ...entry, recipeId: id } : entry
  })
}

/** Swap the recipes, never the dates or their concurrency baselines. */
export function moveDinnerBetweenDays(from: string, to: string, draft: readonly DinnerEntry[]): DinnerEntry[] {
  const source = draft.find(e => e.date === from)
  const target = draft.find(e => e.date === to)
  if (!source?.recipeId || !target || from === to || source.recipeId === target.recipeId) return [...draft]
  return draft.map(entry => {
    const recipeId = entry.date === from ? target.recipeId : entry.date === to ? source.recipeId : entry.recipeId
    if (entry.date !== from && entry.date !== to) return entry
    return { ...entry, recipeId, kept: recipeId !== null && recipeId === entry.originalRecipeId, manual: true }
  })
}

/** A reshuffle preserves deliberate placements as well as untouched plans. */
export function reshuffleDinners(draft: readonly DinnerEntry[], recipes: readonly DinnerChoice[], options: DinnerOptions, random = Math.random) {
  const pinned = draft.filter(e => (e.kept || e.manual) && e.recipeId).map(e => ({ date: e.date, recipeId: e.recipeId!, mealtime: 'Dinner' }))
  return generateDinners(draft.map(e => e.date), recipes, pinned, options, random).map((entry, index) => ({
    ...entry, originalRecipeId: draft[index].originalRecipeId, manual: draft[index].manual,
    kept: entry.recipeId !== null && entry.recipeId === draft[index].originalRecipeId,
  }))
}

/** The finger's content coordinate, with row heights measured after layout. */
export function dinnerDropTarget(tops: readonly number[], heights: readonly number[], position: number) {
  'worklet'
  if (!tops.length || position < tops[0] || position > tops[tops.length - 1] + heights[heights.length - 1]) return -1
  for (let i = tops.length - 1; i >= 0; i--) if (position >= tops[i]) return i
  return -1
}
