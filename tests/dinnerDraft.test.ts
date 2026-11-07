import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dinnerAlternatives, generateDinners, swapDinner, moveDinnerBetweenDays, reshuffleDinners, dinnerDropTarget } from '@/lib/dinnerDraft'
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
