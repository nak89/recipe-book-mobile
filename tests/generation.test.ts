import assert from 'node:assert/strict'
import test from 'node:test'

import { en, km, type StringKey } from '../src/i18n/strings'
import { formatRecipeImportReset, recipeGenerationIssue, recipeImportLimit, type RecipeGenerationIssue, type RecipeGenerationSource } from '../src/lib/generation'

test('generation recovery distinguishes invalid inputs from retryable requests', () => {
  const cases: [RecipeGenerationSource, number | undefined, boolean, RecipeGenerationIssue][] = [
    ['text', 422, false, 'text'],
    ['video', 422, false, 'video'],
    ['photo', 422, false, 'photo'],
    ['video', 415, false, 'videoFormat'],
    ['video', 413, false, 'videoSize'],
    ['photo', 413, false, 'photoSize'],
    ['photo', 415, false, 'photoRead'],
    ['text', 424, false, 'caption'],
    ['text', 400, false, 'input'],
    ['text', 413, false, 'input'],
    ['text', 401, false, 'restricted'],
    ['text', 403, false, 'restricted'],
    ['text', 429, false, 'restricted'],
    ['text', 503, false, 'unavailable'],
    ['video', 504, false, 'timeout'],
    ['text', 408, false, 'timeout'],
    ['photo', undefined, true, 'photoRead'],
    ['video', undefined, true, 'video'],
    ['video', 502, false, 'failed'],
    ['video', undefined, false, 'failed'],
  ]

  for (const [source, status, preparingMedia, expected] of cases) {
    assert.equal(recipeGenerationIssue(source, status, preparingMedia), expected, `${source} ${status} preparation=${preparingMedia}`)
  }
})

test('every generation caption ends in three dots and fits the ten-word limit in English and Khmer', () => {
  const captions = [
    'generation.recipeDraft', 'generation.recipeSteps', 'generation.recipeReview',
    'generation.videoFrames', 'generation.videoDraft', 'generation.videoSources', 'generation.videoStill',
    'generation.captionDraft', 'generation.photoSource', 'generation.photoPrepare',
    'generation.photoDraft', 'generation.photoEdit',
    'generation.weekLoad', 'generation.weekExisting', 'generation.weekFridge',
  ] as const satisfies readonly StringKey[]

  for (const [locale, copy] of [['en', en], ['km', km]] as const) {
    const segmenter = new Intl.Segmenter(locale, { granularity: 'word' })
    for (const key of captions) {
      const message = copy[key]
      assert.match(message, /[^.។]\.{3}$/u, `${locale} ${key}`)
      const wordCount = [...segmenter.segment(message)].filter(segment => segment.isWordLike).length
      assert(wordCount <= 10, `${locale} ${key} has ${wordCount} words`)
    }
  }
})

test('recipe import allowance is distinct from temporary HTTP throttling', () => {
  const retryAt = '2026-11-17T04:51:23.717Z'
  const message = 'Recipe import limit reached. Try again later.'
  const limited = { status: 429, message, retryAt }
  assert.deepEqual(recipeImportLimit({ ...limited, code: 'recipe_draft_user_limit' }), { scope: 'user', retryAt })
  assert.deepEqual(recipeImportLimit({ ...limited, code: 'recipe_draft_global_limit' }), { scope: 'global', retryAt })
  assert.deepEqual(recipeImportLimit({ status: 429, message }), { scope: 'unknown' })
  assert.equal(recipeImportLimit({ status: 429, message: 'Recipe import is busy' }), undefined)
  assert.equal(recipeImportLimit({ ...limited, status: 502 }), undefined)
  assert.equal(formatRecipeImportReset('invalid timestamp', 'en'), undefined)
  assert.equal(formatRecipeImportReset(undefined, 'km'), undefined)
  assert.equal(formatRecipeImportReset(retryAt, 'en'), formatRecipeImportReset('2026-11-17T04:52:00.000Z', 'en'))
  assert.match(formatRecipeImportReset(retryAt, 'km') ?? '', /[០-៩]/u)
})
