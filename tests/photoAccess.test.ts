import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPhotoResolver, isStoredPhoto } from '../src/lib/photoAccess'

test('only this Supabase project storage references require signing', () => {
  assert.equal(isStoredPhoto('https://p.supabase.co/storage/v1/object/public/recipe-photos/a', 'https://p.supabase.co'), true)
  assert.equal(isStoredPhoto('https://other.supabase.co/storage/v1/object/public/a', 'https://p.supabase.co'), false)
  assert.equal(isStoredPhoto('https://images.unsplash.com/photo', 'https://p.supabase.co'), false)
})

test('batches images, deduplicates repeats and isolates overlapping accounts', async () => {
  const calls: string[][] = []
  const resolve = createPhotoResolver(async (sources, token) => {
    calls.push([token, ...sources])
    return sources.map(source => ({ source, url: `${token}/${source}`, expiresAt: Date.now() + 3600000 }))
  })
  const [a, b, again, other] = await Promise.all([resolve('a', 'alice'), resolve('b', 'alice'), resolve('a', 'alice'), resolve('a', 'bob')])
  assert.equal(a.url, 'alice/a'); assert.equal(b.url, 'alice/b'); assert.equal(again.url, a.url); assert.equal(other.url, 'bob/a')
  assert.deepEqual(calls, [['alice', 'a', 'b'], ['bob', 'a']])
})

test('expired links and failed signing requests can be retried', async () => {
  let attempts = 0
  const resolve = createPhotoResolver(async sources => {
    attempts++
    if (attempts === 1) throw new Error('offline')
    return sources.map(source => ({ source, url: String(attempts), expiresAt: Date.now() + (attempts === 2 ? 1 : 3600000) }))
  })
  await assert.rejects(resolve('a', 'alice'))
  await resolve('a', 'alice')
  assert.equal((await resolve('a', 'alice')).url, '3')
})

test('simultaneous expiry shares one refresh and resolves every waiting row', { timeout: 5000 }, async () => {
  let calls = 0
  const resolve = createPhotoResolver(async sources => {
    calls++
    return sources.map(source => ({ source, url: String(calls), expiresAt: Date.now() + (calls === 1 ? 1 : 3600000) }))
  })
  await resolve('a', 'alice')
  const results = await Promise.all(Array.from({ length: 20 }, () => resolve('a', 'alice')))
  assert.equal(calls, 2)
  assert.ok(results.every(photo => photo.url === '2'))
})
