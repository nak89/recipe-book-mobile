import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dinnerAlternatives, generateDinners, swapDinner, moveDinnerBetweenDays, reshuffleDinners, dinnerDropTarget, generateMealWeek, reshuffleMealWeek } from '@/lib/dinnerDraft'
const dates = ['2026-11-09','2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14','2026-11-15']
const options = {includeUntagged:false,allowRepeats:false}
const recipes = Array.from({length:8}, (_,i)=>({id:String(i),mealtime:'Dinner'}))
test('generates seven distinct dinners and leaves inputs untouched',()=>{
 const before=JSON.stringify(recipes);const draft=generateDinners(dates,recipes,[],options,()=>0)
 assert.equal(new Set(draft.map(x=>x.recipeId)).size,7);assert.ok(draft.every(x=>!x.kept));assert.equal(JSON.stringify(recipes),before)
})
test('preserves dinners but fills dates containing only other meal types',()=>{
 const plan=[{date:dates[2],recipeId:'2',mealtime:'Dinner'},{date:dates[0],recipeId:'0',mealtime:'Lunch'}]
 const draft=generateDinners(dates,recipes,plan,options,()=>0)
 assert.deepEqual(draft[2],{date:dates[2],recipeId:'2',kept:true,originalRecipeId:'2'});assert.equal(draft[0].kept,false);assert.equal(draft.filter(x=>x.recipeId==='2').length,1)
})
test('shows shortages, empty libraries and excluded non-dinners honestly',()=>{
 const pool=[{id:'a',mealtime:'Dinner'},{id:'b',mealtime:null},{id:'c',mealtime:'Breakfast'}]
 assert.equal(generateDinners(dates,pool,[],options).filter(x=>x.recipeId).length,1)
 assert.equal(generateDinners(dates,pool,[],{...options,includeUntagged:true}).filter(x=>x.recipeId).length,2)
 assert.ok(generateDinners(dates,[],[],options).every(x=>x.recipeId===null))
})
test('repeats are opt-in and never add breakfast',()=>{
 const draft=generateDinners(dates,[{id:'a',mealtime:'Dinner'},{id:'b',mealtime:'Breakfast'}],[],{...options,allowRepeats:true})
 assert.ok(draft.every(x=>x.recipeId==='a'))
})
test('swaps exclude other suggestions and kept dinners',()=>{
 const draft=generateDinners(dates,recipes,[{date:dates[0],recipeId:'0',mealtime:'Dinner'}],options,()=>0)
 assert.deepEqual(swapDinner(dates[0],draft,recipes,options),draft)
 const swap=swapDinner(dates[1],draft,recipes,options,()=>0);assert.notEqual(swap[1].recipeId,draft[1].recipeId);assert.equal(new Set(swap.map(x=>x.recipeId)).size,7)
 assert.equal(dinnerAlternatives(draft[0],draft,recipes,options).length,0)
})
test('a single-choice repeat draft has no fake swap action',()=>{
 const opts={...options,allowRepeats:true};const draft=generateDinners(dates,recipes.slice(0,1),[],opts)
 assert.equal(dinnerAlternatives(draft[0],draft,recipes.slice(0,1),opts).length,0)
 assert.deepEqual(swapDinner(dates[0],draft,recipes.slice(0,1),opts),draft)
})

test('allowing repeats still uses distinct recipes before repeating',()=>{
 const draft=generateDinners(dates,recipes.slice(0,3),[],{...options,allowRepeats:true},()=>0)
 assert.equal(new Set(draft.slice(0,3).map(x=>x.recipeId)).size,3)
})

test('dragging swaps days, including existing dinners, without moving their baselines',()=>{
 const draft=generateDinners(dates,recipes,[{date:dates[0],recipeId:'0',mealtime:'Dinner'}],options,()=>0)
 const moved=moveDinnerBetweenDays(dates[0],dates[5],draft)
 assert.equal(moved[5].recipeId,'0');assert.equal(moved[0].recipeId,draft[5].recipeId)
 assert.equal(moved[0].originalRecipeId,'0');assert.equal(moved[5].originalRecipeId,null)
 assert.equal(moved[0].kept,false);assert.equal(draft[0].recipeId,'0')
 const again=reshuffleDinners(moved,recipes,options,()=>0.99)
 assert.equal(again[0].recipeId,moved[0].recipeId);assert.equal(again[5].recipeId,'0')
 assert.equal(again[0].originalRecipeId,'0')
})
test('moving to an empty day moves the recipe and leaves its source empty',()=>{
 const draft=generateDinners(dates,recipes.slice(0,1),[],options,()=>0)
 const moved=moveDinnerBetweenDays(dates[0],dates[6],draft)
 assert.equal(moved[6].recipeId,'0');assert.equal(moved[0].recipeId,null)
 assert.deepEqual(moveDinnerBetweenDays(dates[0],dates[1],moved),moved)
 assert.deepEqual(moveDinnerBetweenDays(dates[6],'invalid',moved),moved)
})
test('drop targets use measured variable-height rows and reject outside drops',()=>{
 assert.equal(dinnerDropTarget([0,80,220],[80,140,90],190),1)
 assert.equal(dinnerDropTarget([0,80,220],[80,140,90],300),2)
 assert.equal(dinnerDropTarget([0,80,220],[80,140,90],-1),-1)
 assert.equal(dinnerDropTarget([0,80,220],[80,140,90],311),-1)
})

test('moving back restores original kept state without changing either baseline',()=>{
 const draft=generateDinners(dates,recipes,[{date:dates[0],recipeId:'0',mealtime:'Dinner'},{date:dates[1],recipeId:'1',mealtime:'Dinner'}],options,()=>0)
 const restored=moveDinnerBetweenDays(dates[1],dates[0],moveDinnerBetweenDays(dates[0],dates[1],draft))
 assert.equal(restored[0].kept,true);assert.equal(restored[1].kept,true)
 assert.equal(restored[0].originalRecipeId,'0');assert.equal(restored[1].originalRecipeId,'1')
})


test('lunch generation preserves lunches, uses lunch recipes and excludes breakfast and dinner', () => {
  const lunches = Array.from({ length: 8 }, (_, i) => ({ id: `l${i}`, mealtime: 'Lunch' }))
  const plan = [
    { date: dates[0], recipeId: 'l0', mealtime: 'Lunch' },
    { date: dates[1], recipeId: '0', mealtime: 'Dinner' },
    { date: dates[2], recipeId: 'breakfast', mealtime: 'Breakfast' },
  ]
  const opts = { ...options, mealtime: 'Lunch' as const }
  const pool = [...recipes, ...lunches, { id: 'breakfast', mealtime: 'Breakfast' }]
  const draft = generateDinners(dates, pool, plan, opts, () => 0)
  assert.equal(draft.length, 7)
  assert.equal(new Set(draft.map(entry => entry.recipeId)).size, 7)
  assert.ok(draft.every(entry => entry.recipeId?.startsWith('l')))
  assert.equal(draft[0].kept, true)
  assert.equal(draft[1].kept, false)
  const swapped = swapDinner(dates[1], draft, pool, opts, () => 0)
  assert.notEqual(swapped[1].recipeId, draft[1].recipeId)
  assert.ok(swapped[1].recipeId?.startsWith('l'))
  const moved = moveDinnerBetweenDays(dates[0], dates[6], swapped)
  const shuffled = reshuffleDinners(moved, pool, opts, () => 0.99)
  assert.equal(shuffled[6].recipeId, 'l0')
  assert.equal(shuffled[0].recipeId, moved[0].recipeId)
  assert.ok(shuffled.every(entry => entry.recipeId?.startsWith('l')))
  assert.equal(plan[1].recipeId, '0')
})

test('lunch shortages, untagged fallback and repeats stay explicit', () => {
  const pool = [{ id: 'lunch', mealtime: 'Lunch' }, { id: 'untagged' }, ...recipes]
  const opts = { ...options, mealtime: 'Lunch' as const }
  assert.equal(generateDinners(dates, pool, [], opts).filter(entry => entry.recipeId).length, 1)
  const fallback = generateDinners(dates, pool, [], { ...opts, includeUntagged: true }, () => 0)
  assert.equal(fallback[0].recipeId, 'lunch')
  assert.equal(fallback[1].recipeId, 'untagged')
  assert.equal(fallback.filter(entry => entry.recipeId).length, 2)
  assert.ok(generateDinners(dates, pool, [], { ...opts, allowRepeats: true }).every(entry => entry.recipeId === 'lunch'))
})


test('lunch and dinner share the no-repeat rule, including untagged recipes and existing meals', () => {
  const pool = Array.from({ length: 16 }, (_, i) => ({ id: `any${i}` }))
  const opts = { ...options, includeUntagged: true }
  const plan = [{ date: dates[0], mealtime: 'Dinner', recipeId: 'any0' }]
  const draft = generateMealWeek(dates, pool, plan, opts, () => 0)
  assert.equal(draft.Dinner[0].recipeId, 'any0')
  assert.equal(new Set([...draft.Lunch, ...draft.Dinner].map(entry => entry.recipeId)).size, 14)
  const shuffled = reshuffleMealWeek(draft, pool, opts, () => 0.99)
  assert.equal(shuffled.Dinner[0].recipeId, 'any0')
  assert.equal(new Set([...shuffled.Lunch, ...shuffled.Dinner].map(entry => entry.recipeId)).size, 14)
  const choices = dinnerAlternatives(draft.Lunch[0], draft.Lunch, pool, { ...opts, mealtime: 'Lunch', reservedRecipeIds: draft.Dinner.map(entry => entry.recipeId!) })
  assert.ok(choices.every(choice => !draft.Dinner.some(entry => entry.recipeId === choice.id)))
  const short = generateMealWeek(dates, pool.slice(0, 10), [], opts, () => 0)
  assert.equal([...short.Lunch, ...short.Dinner].filter(entry => entry.recipeId).length, 10)
  const repeats = generateMealWeek(dates, pool.slice(0, 1), [], { ...opts, allowRepeats: true }, () => 0)
  assert.ok([...repeats.Lunch, ...repeats.Dinner].every(entry => entry.recipeId === 'any0'))
})
