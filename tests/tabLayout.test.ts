import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tabLayout } from '@/lib/tabLayout'
const names = ['explore', 'index', 'planner', 'grocery']
test('all four destinations appear when only Recipes has been visited', () => {
  const result = tabLayout(names, [{name: 'index', key: 'recipes-live'}], 'recipes-live')
  assert.deepEqual(result.routes.map(r => r.name), names)
  assert.equal(result.routes[1].key, 'recipes-live')
  assert.equal(result.index, 1)
})
test('visiting tabs in a different order preserves pager positions and selection', () => {
  const result = tabLayout(names, [{name:'grocery',key:'g'}, {name:'index',key:'i'}, {name:'explore',key:'e'}, {name:'planner',key:'p'}], 'p')
  assert.deepEqual(result.routes.map(r => r.key), ['e','i','p','g'])
  assert.equal(result.index, 2)
})
test('a recreated route key selects the same declared tab', () => {
  assert.equal(tabLayout(names, [{name:'explore',key:'new-e'}], 'new-e').index, 0)
})
