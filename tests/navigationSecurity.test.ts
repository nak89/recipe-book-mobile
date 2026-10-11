import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

// Expo Router 57 requires the namespace, not its default. Pin this contract
// while using the patched decoder; an unadapted v9 breaks every route query.
const require = createRequire(import.meta.url)
const query = require('query-string')

test('patched route parser preserves named exports and Khmer/repeated query values', () => {
  const values = { q: 'អាហារ', tag: ['rice', 'fish'], empty: '' }
  assert.equal(typeof query.parse, 'function')
  assert.equal(typeof query.stringify, 'function')
  assert.deepEqual({ ...query.parse(query.stringify(values)) }, values)
  assert.equal(query.parse('q=%E0%A4%A').q, '%E0%A4%A')
})
