import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSessionResource } from '../src/lib/sessionResource'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

test('shares an initial request and caches a successful empty response', async () => {
  const resource = createSessionResource<string[]>()
  const request = deferred<string[]>()
  let calls = 0
  const fetcher = () => { calls++; return request.promise }
  const first = resource.load('alice', fetcher)
  const duplicate = resource.load('alice', fetcher)
  assert.equal(resource.peek('alice'), undefined)
  assert.equal(first, duplicate)
  request.resolve([])
  await first
  assert.equal(calls, 1)
  assert.deepEqual(resource.peek('alice'), [])
})

test('keeps cached content available during revalidation and after a network error', async () => {
  const resource = createSessionResource<string[]>()
  await resource.load('alice', async () => ['amok'])
  const next = deferred<string[]>()
  const refresh = resource.load('alice', () => next.promise)
  assert.deepEqual(resource.peek('alice'), ['amok'])
  next.resolve(['amok', 'lok lak'])
  await refresh
  await assert.rejects(resource.load('alice', async () => { throw Error('offline') }))
  assert.deepEqual(resource.peek('alice'), ['amok', 'lok lak'])
  await resource.load('alice', async () => ['fresh'])
  assert.deepEqual(resource.peek('alice'), ['fresh'])
})

test('a successful mutation invalidates the snapshot and prevents older reads restoring it', async () => {
  const resource = createSessionResource<string[]>()
  await resource.load('alice', async () => ['old recipe'])
  const old = deferred<string[]>()
  const pending = resource.load('alice', () => old.promise)
  resource.clear()
  assert.equal(resource.peek('alice'), undefined)
  await resource.load('alice', async () => ['edited recipe'])
  old.resolve(['old recipe'])
  await pending
  assert.deepEqual(resource.peek('alice'), ['edited recipe'])
})

test('account switches cannot expose or restore another session’s recipes', async () => {
  const resource = createSessionResource<string[]>()
  const old = deferred<string[]>()
  const pending = resource.load('alice', () => old.promise)
  await resource.load('bob', async () => ['bob recipe'])
  assert.equal(resource.peek('alice'), undefined)
  assert.equal(resource.peek(null), undefined)
  old.resolve(['alice recipe'])
  await pending
  assert.deepEqual(resource.peek('bob'), ['bob recipe'])
  assert.equal(resource.peek('alice'), undefined)
})

test('sign-out clears cached data and rejects late cache writes', async () => {
  const resource = createSessionResource<string[]>()
  const old = deferred<string[]>()
  const pending = resource.load('alice', () => old.promise)
  resource.clear()
  old.resolve(['private recipe'])
  await pending
  assert.equal(resource.peek('alice'), undefined)
})
