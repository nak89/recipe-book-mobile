#!/usr/bin/env node
/**
 * Screenshot the running app at a spread of phone widths, in both languages.
 *
 * The point is to make a layout review something you *look at* rather than
 * something you describe: one command produces a directory of PNGs covering
 * every tab, the recipe form and a recipe detail, at the widths where things
 * actually break.
 *
 *   npm run web                       # in another terminal, must be running
 *   node tools/shoot.mjs              # English
 *   node tools/shoot.mjs --km         # Khmer
 *   node tools/shoot.mjs --out /tmp/x --widths 320,402
 *
 * Output lands in `tools/shots/<lang>/<width>/<screen>.png`, which is
 * gitignored.
 *
 * ── What this can and cannot catch ──────────────────────────────────────────
 *
 * It renders **Expo web**, not native, so it catches layout, truncation,
 * wrapping and font-family mistakes — the things that vary with width — and it
 * does not catch anything that only exists on a device: OS font scaling
 * (`allowFontScaling`, see `lib/fontScale.ts`) has no web equivalent,
 * `expo-blur` degrades to a translucent view, and `@react-native-masked-view`
 * takes the CSS `mask-image` branch. For those, screenshot a real phone.
 *
 * ── Setup ───────────────────────────────────────────────────────────────────
 *
 * Needs `playwright` and a chromium build:
 *
 *   npm i -D playwright && npx playwright install chromium
 *
 * And an account to sign in as. It walks the real first-run flow (language →
 * about → login), so the account must already exist; seed one with recipes so
 * the screens aren't all empty states:
 *
 *   curl -X POST http://localhost:3000/auth/signup -H 'Content-Type: application/json' \
 *     -d '{"email":"...","password":"..."}'
 *   # then, in recipe-book-backend, with SEED_USER_ID set to the new user's id:
 *   npx tsx prisma/seed-dummy.ts
 *
 * Credentials come from SHOOT_EMAIL / SHOOT_PASSWORD.
 */

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

const KM = argv.includes('--km')
const BASE = flag('base', process.env.SHOOT_BASE || 'http://localhost:8081')
const OUT = flag('out', join(HERE, 'shots', KM ? 'km' : 'en'))
const EMAIL = process.env.SHOOT_EMAIL
const PASSWORD = process.env.SHOOT_PASSWORD

if (!EMAIL || !PASSWORD) {
  console.error('Set SHOOT_EMAIL and SHOOT_PASSWORD to an existing account.')
  process.exit(1)
}

/**
 * The smallest phone still in use, the common 375 class, the frame the design
 * system is drawn at (`theme/index.ts` → `screen`), and a Pro Max. Override
 * with `--widths 320,402`.
 */
const ALL_WIDTHS = [
  { name: '320-se1', width: 320, height: 568 },
  { name: '375-se3', width: 375, height: 667 },
  { name: '402-ref', width: 402, height: 874 },
  { name: '430-max', width: 430, height: 932 },
]
const only = flag('widths', null)?.split(',').map((s) => s.trim())
const VIEWPORTS = only ? ALL_WIDTHS.filter((v) => only.includes(String(v.width))) : ALL_WIDTHS

const ROUTES = [
  { name: 'explore', path: '/explore' },
  { name: 'dashboard', path: '/' },
  { name: 'planner', path: '/planner' },
  { name: 'grocery', path: '/grocery' },
  { name: 'profile', path: '/profile' },
  { name: 'recipe-new', path: '/recipe/new' },
]

const settle = (ms) => new Promise((r) => setTimeout(r, ms))

async function ready(page) {
  await page.evaluate(() => document.fonts.ready).catch(() => {})
  await settle(400)
}

/**
 * Sign in by clicking, not by URL. First run is device-local (AsyncStorage
 * `onboarding.seenIntro`) and the `(auth)` guard bounces /login back to
 * /language until it is set, so the flow has to be walked.
 */
async function signIn(page) {
  const tap = async (re, ms = 2500) => {
    const el = page.getByText(re).first()
    if (await el.isVisible().catch(() => false)) {
      await el.click().catch(() => {})
      await settle(ms)
      return true
    }
    return false
  }

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await settle(7000) // first paint waits on the Metro bundle
  await ready(page)

  if (page.url().includes('/language')) await tap(KM ? /ភាសាខ្មែរ/ : /^English$/)
  for (let i = 0; i < 4; i++) {
    if (/\/signup|\/login/.test(page.url())) break
    if (!(await tap(/get started|continue|skip|next|begin|បន្ត|ចាប់ផ្ដើម|រំលង/i))) break
  }
  // Signed-out landing is /signup; `seenIntro` is set by now, so /login resolves.
  if (!page.url().includes('/login')) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }).catch(() => {})
    await settle(3000)
  }

  const inputs = page.locator('input')
  if ((await inputs.count()) >= 2) {
    await inputs.nth(0).fill(EMAIL)
    await inputs.nth(1).fill(PASSWORD)
    await settle(300)
    await page.keyboard.press('Enter')
    await settle(7000)
  }
  // A fresh account has no `onboardedAt`, so the guard pins it to /taste.
  await tap(/skip|រំលង|not now/i, 3000)
  return page.url()
}

const browser = await chromium.launch()
let shot = 0

for (const vp of VIEWPORTS) {
  const dir = join(OUT, vp.name)
  mkdirSync(dir, { recursive: true })
  console.log(`\n=== ${KM ? 'km' : 'en'} ${vp.name} (${vp.width}×${vp.height}) ===`)

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => console.log(`  [pageerror] ${String(e).slice(0, 160)}`))

  console.log(`  signed in -> ${await signIn(page)}`)

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' }).catch(() => {})
    await settle(2600)
    await ready(page)
    await page.screenshot({ path: join(dir, `${route.name}.png`) }).catch((e) => {
      console.log(`  !! ${route.name}: ${e.message}`)
    })
    console.log(`  ${route.name}.png`)
    shot++
  }

  // A real recipe: the detail hero carries the widest type in the app.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await settle(2600)
  const card = page.locator('img').nth(1)
  if (await card.isVisible().catch(() => false)) {
    await card.click().catch(() => {})
    await settle(2600)
    await ready(page)
    await page.screenshot({ path: join(dir, 'recipe-detail.png') }).catch(() => {})
    console.log('  recipe-detail.png')
    shot++
  }

  await context.close()
}

await browser.close()
console.log(`\n${shot} screenshot(s) -> ${OUT}`)
