import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dropIndex, move } from '@/lib/reorder'

/**
 * The two decisions a drag makes, separated from the gesture that triggers them.
 *
 * The gesture itself — worklets, `Gesture.Pan`, measured layout — can't run
 * here, and wouldn't be worth much if it could: what matters is that a row
 * lands where the finger left it, and that a list which changed mid-drag comes
 * out intact rather than mangled. Both are plain functions, so both are pinned.
 */

describe('move', () => {
  it('carries an item down the list', () => {
    assert.deepEqual(move(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd'])
  })

  it('carries an item up the list', () => {
    assert.deepEqual(move(['a', 'b', 'c', 'd'], 3, 1), ['a', 'd', 'b', 'c'])
  })

  it('moves an item to either end', () => {
    assert.deepEqual(move(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b'])
    assert.deepEqual(move(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a'])
  })

  it('leaves the list alone when the item does not move', () => {
    assert.deepEqual(move(['a', 'b', 'c'], 1, 1), ['a', 'b', 'c'])
  })

  it('never mutates the list it was given', () => {
    const original = ['a', 'b', 'c']
    const moved = move(original, 0, 2)
    assert.deepEqual(original, ['a', 'b', 'c'], 'the input was rewritten')
    assert.notEqual(moved, original, 'the same array came back')
  })

  // A drag can outlive the list it started on: a row removed by an earlier tap,
  // a re-render between the gesture starting and settling. Dropping into
  // nothing has to be a no-op — losing an ingredient here would be silent, and
  // the user would find out at the shop.
  it('returns the list unchanged for an index outside it', () => {
    assert.deepEqual(move(['a', 'b'], 5, 0), ['a', 'b'])
    assert.deepEqual(move(['a', 'b'], 0, 5), ['a', 'b'])
    assert.deepEqual(move(['a', 'b'], -1, 1), ['a', 'b'])
    assert.deepEqual(move(['a', 'b'], 0, -1), ['a', 'b'])
  })

  it('returns an empty list unchanged', () => {
    assert.deepEqual(move([], 0, 0), [])
  })
})

describe('dropIndex', () => {
  // Three 50pt rows at 0, 50 and 100. The caller passes the dragged row's
  // centre, so row 0 at rest is 25 and every number below is `y + 25`.
  const tops = [0, 50, 100]

  it('keeps a row where it started when it has barely moved', () => {
    assert.equal(dropIndex(tops, 25), 0)
    assert.equal(dropIndex(tops, 45), 0)
  })

  it('swaps once the row has travelled half its own height', () => {
    assert.equal(dropIndex(tops, 49), 0)
    assert.equal(dropIndex(tops, 51), 1)
  })

  // The same journey in reverse has to cost the same distance, or dragging up
  // feels heavier than dragging down.
  it('is symmetrical going up', () => {
    assert.equal(dropIndex(tops, 101), 2)
    assert.equal(dropIndex(tops, 99), 1)
  })

  it('clamps past either end', () => {
    assert.equal(dropIndex(tops, 400), 2)
    assert.equal(dropIndex(tops, -80), 0)
  })

  // Step cards are as tall as their instruction, so the slots a dragged card
  // crosses are not the same size as each other or as the card itself.
  it('handles rows of different heights', () => {
    const uneven = [0, 30, 130]
    assert.equal(dropIndex(uneven, 20), 0)
    assert.equal(dropIndex(uneven, 60), 1)
    assert.equal(dropIndex(uneven, 129), 1)
    assert.equal(dropIndex(uneven, 131), 2)
  })

  it('returns the first slot for an empty list', () => {
    assert.equal(dropIndex([], 40), 0)
  })
})
