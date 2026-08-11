/**
 * The Khmer equipment list — a *different list*, not a translation of
 * `tools.ts`, on the same reasoning as `ingredients.km.ts`. A Cambodian kitchen
 * has a ឆ្នាំងចំហុយ and a ត្បាល់បុក and no Dutch oven, and what you tap here is
 * written verbatim into your recipe, so it has to be the language you're
 * working in.
 *
 * Names are Khmer throughout. Unlike the pantry's *units*, there's no reason to
 * keep any of these Latin: a tool name goes into a free-flowing list on the
 * detail screen, not into the ingredient row's fixed-width column.
 */
import type { CommonTool } from './tools'

export const KHMER_TOOL_CATEGORIES = [
  'ឆ្នាំង និងខ្ទះ',
  'ឧបករណ៍រៀបចំ',
  'ឧបករណ៍ដុតនំ',
  'ម៉ាស៊ីន',
] as const

export type KhmerToolCategory = (typeof KHMER_TOOL_CATEGORIES)[number]

export const KHMER_TOOLS: CommonTool<KhmerToolCategory>[] = [
  // ឆ្នាំង និងខ្ទះ — pots & pans
  { name: 'ខ្ទះ', emoji: '🍳', category: 'ឆ្នាំង និងខ្ទះ' }, // frying pan
  { name: 'ខ្ទះឆា', emoji: '🥘', category: 'ឆ្នាំង និងខ្ទះ' }, // wok
  { name: 'ឆ្នាំង', emoji: '🍲', category: 'ឆ្នាំង និងខ្ទះ' }, // pot
  { name: 'ឆ្នាំងធំ', emoji: '🍲', category: 'ឆ្នាំង និងខ្ទះ' }, // large pot
  { name: 'ឆ្នាំងចំហុយ', emoji: '♨️', category: 'ឆ្នាំង និងខ្ទះ' }, // steamer
  { name: 'ខ្ទះអាំង', emoji: '🔥', category: 'ឆ្នាំង និងខ្ទះ' }, // grill pan
  { name: 'ចង្ក្រានធ្យូង', emoji: '🔥', category: 'ឆ្នាំង និងខ្ទះ' }, // charcoal stove
  { name: 'គម្របឆ្នាំង', emoji: '🍳', category: 'ឆ្នាំង និងខ្ទះ' }, // lid

  // ឧបករណ៍រៀបចំ — prep & measuring
  { name: 'កាំបិត', emoji: '🔪', category: 'ឧបករណ៍រៀបចំ' }, // knife
  { name: 'ក្តារចិត', emoji: '🪵', category: 'ឧបករណ៍រៀបចំ' }, // chopping board
  { name: 'ចាន', emoji: '🥣', category: 'ឧបករណ៍រៀបចំ' }, // bowl
  { name: 'ត្បាល់បុក', emoji: '🧉', category: 'ឧបករណ៍រៀបចំ' }, // mortar and pestle
  { name: 'ចង្រឹះ', emoji: '🧺', category: 'ឧបករណ៍រៀបចំ' }, // sieve / strainer
  { name: 'ឆ្នូត', emoji: '🧀', category: 'ឧបករណ៍រៀបចំ' }, // grater
  { name: 'កាំបិតចិតសំបក', emoji: '🥔', category: 'ឧបករណ៍រៀបចំ' }, // peeler
  { name: 'ស្លាបព្រា', emoji: '🥄', category: 'ឧបករណ៍រៀបចំ' }, // spoon
  { name: 'ស្លាបព្រាឈើ', emoji: '🥄', category: 'ឧបករណ៍រៀបចំ' }, // wooden spoon
  { name: 'វែក', emoji: '🥄', category: 'ឧបករណ៍រៀបចំ' }, // ladle
  { name: 'ដង្កាប់', emoji: '🍴', category: 'ឧបករណ៍រៀបចំ' }, // tongs
  { name: 'ឈើចាក់', emoji: '🍢', category: 'ឧបករណ៍រៀបចំ' }, // skewer
  { name: 'ជញ្ជីង', emoji: '⚖️', category: 'ឧបករណ៍រៀបចំ' }, // scale
  { name: 'ពែងវាស់', emoji: '🥛', category: 'ឧបករណ៍រៀបចំ' }, // measuring jug

  // ឧបករណ៍ដុតនំ — bakeware
  { name: 'ថាសដុតនំ', emoji: '🍪', category: 'ឧបករណ៍ដុតនំ' }, // baking tray
  { name: 'ធុងដុតនំ', emoji: '🥧', category: 'ឧបករណ៍ដុតនំ' }, // baking dish
  { name: 'ពុម្ពនំ', emoji: '🎂', category: 'ឧបករណ៍ដុតនំ' }, // cake tin
  { name: 'ក្រដាសដុតនំ', emoji: '📄', category: 'ឧបករណ៍ដុតនំ' }, // baking paper

  // ម៉ាស៊ីន — appliances
  { name: 'ឡដុតនំ', emoji: '🔥', category: 'ម៉ាស៊ីន' }, // oven
  { name: 'ម៉ាស៊ីនកិន', emoji: '🍹', category: 'ម៉ាស៊ីន' }, // blender
  { name: 'ម៉ាស៊ីនកិនសាច់', emoji: '🌀', category: 'ម៉ាស៊ីន' }, // food processor
  { name: 'ឆ្នាំងដាំបាយ', emoji: '🍚', category: 'ម៉ាស៊ីន' }, // rice cooker
  { name: 'ម៉ាស៊ីនកម្តៅ', emoji: '📻', category: 'ម៉ាស៊ីន' }, // microwave
  { name: 'ឆ្នាំងដាំទឹក', emoji: '🫖', category: 'ម៉ាស៊ីន' }, // kettle
]
