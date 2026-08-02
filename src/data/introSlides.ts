/**
 * The pre-auth intro carousel. Copy, kickers and the italic emphasis are final
 * and come from the design handoff — the wording is the design here, not
 * placeholder text, so treat a change to it as a design change.
 *
 * Photography is the one part of the handoff that didn't exist: the mock shows
 * a striped placeholder and lists three shots still to be taken. These are
 * stand-ins from Unsplash chosen against that brief, and every id is one
 * already in use by `seed-dummy.ts`, so they are known to resolve. Replacing
 * them with a real shoot means editing three strings here and nothing else.
 */
export interface HeadlineSegment {
  text: string
  /** Exactly one word per headline is italic. It's emphasis, not decoration. */
  italic?: boolean
}

export interface IntroSlide {
  kicker: string
  headline: HeadlineSegment[]
  body: string
  photo: string
  /** What the shot should eventually be, kept next to the stand-in it replaces. */
  photoBrief: string
}

const photo = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=80`

export const INTRO_SLIDES: IntroSlide[] = [
  {
    kicker: '01 — YOUR SHELF',
    headline: [{ text: 'Every recipe you\n' }, { text: 'actually', italic: true }, { text: ' cook.' }],
    body: 'One book for the screenshots, the scribbles and the ones your mum reads down the phone.',
    photo: photo('photo-1504674900247-0877df9cc836'),
    photoBrief: 'A full kitchen table mid-meal, warm daylight.',
  },
  {
    kicker: '02 — BY TIME OF DAY',
    headline: [{ text: 'Breakfast, lunch,\n' }, { text: 'dinner, ' }, { text: 'snack', italic: true }, { text: '.' }],
    body: 'You choose by the hour on the clock, not by course. So that’s how the book is filed.',
    photo: photo('photo-1498654896293-37aacf113fd9'),
    photoBrief: 'Four plates representing four times of day.',
  },
  {
    kicker: '03 — WHEN NOTHING APPEALS',
    headline: [{ text: 'Let the book\n' }, { text: 'pick', italic: true }, { text: ' for you.' }],
    body: 'One tap on shuffle and you’re cooking something you’d forgotten you loved.',
    photo: photo('photo-1467003909585-2f8a72700288'),
    photoBrief: 'A single dish, close and appetising.',
  },
]
