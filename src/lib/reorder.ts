/**
 * Moving one item of a list to another index.
 *
 * Split out of the drag gesture on purpose: the gesture is worklets, layout
 * measurement and platform behaviour, none of which can be asserted in a test
 * that runs under plain Node — and the part that actually decides what the
 * recipe ends up saying is this, which can.
 *
 * The order matters beyond the screen. A step list is a sequence of
 * instructions, and `stepNumber` is written from the array index on save; an
 * ingredient list is now stored against `Ingredient.position`, assigned the
 * same way. So a wrong answer here is a recipe that reads wrong, not a display
 * glitch.
 */

/**
 * `list` with the item at `from` moved to `to`, as a new array.
 *
 * Out-of-range indices return a copy rather than throwing. A drag can end on a
 * list that changed under it — a row deleted by the same finger's earlier tap,
 * a re-render between the gesture starting and settling — and dropping into
 * nothing is a no-op, not a crash. `from === to` also returns a copy, so
 * callers can hand the result straight to `setState` without checking first.
 */
export function move<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  if (!Number.isInteger(from) || !Number.isInteger(to)) return next
  if (from < 0 || from >= next.length) return next
  if (to < 0 || to >= next.length) return next
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/**
 * Which slot a dragged row has been carried into.
 *
 * `tops` holds each row's distance from the top of the list, in the order the
 * rows are drawn; `centre` is the **centre** of the row being dragged, after
 * the gesture's translation. The answer is the slot that centre now sits in.
 *
 * Taking the centre rather than the top is what makes the two directions
 * symmetrical. A row swaps with its neighbour once it has travelled half a
 * row — down or up, and with rows of different heights, because "half" is
 * measured against the row that is moving rather than against a fixed step.
 * Comparing tops instead lands the swap a whole row late going up and
 * instantly going down, which reads on a phone as the list resisting one
 * direction.
 *
 * Anything above the first row or below the last clamps, so a finger that runs
 * off the end of the list drops into the end of it.
 */
export function dropIndex(tops: readonly number[], centre: number): number {
  // Runs on the UI thread inside the drag gesture, so it has to be a worklet —
  // and on the JS thread in `tests/reorder.test.ts`, which is why it is this
  // function rather than a copy of it living in the gesture. Without the
  // Reanimated plugin the directive is an inert string, so the test is
  // unaffected by it.
  'worklet'
  let index = 0
  for (let i = 0; i < tops.length; i++) {
    if (centre >= tops[i]) index = i
  }
  return index
}
