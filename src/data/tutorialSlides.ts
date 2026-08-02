/**
 * The optional tutorial, shown last and skippable from the first frame.
 *
 * These are the design's own coach-mark mockups: the dashboard dimmed, with a
 * spotlight over the control being explained and a captioned card baked into
 * the artwork. That means the teaching copy and the step counter live *in the
 * image*, and the screen around them draws nothing but the button off the last
 * slide — deliberately, so a caption can never drift out of step with the
 * picture it describes.
 *
 * The files are the supplied screenshots with the mock device chrome cropped
 * off (status bar, dynamic island, home indicator) so they don't render as a
 * phone inside a phone. They run full-bleed and square-cornered for the same
 * reason: an inset, rounded frame puts the device chrome straight back. Source
 * geometry is 804 × 1558, marginally wider than a phone, so fitting one to the
 * screen leaves a thin band of `bg` above and below rather than a border.
 */
export interface TutorialSlide {
  image: number
  /** Not rendered — the caption is part of the artwork. This is the alt text. */
  label: string
}

/**
 * The screen behind the artwork, sampled from the artwork itself.
 *
 * The images are 804 × 1558 — very slightly wider than a phone — so fitting one
 * to the screen always leaves a band above and below it. Cropping the sides to
 * fill instead would take ~6% off each edge, which eats into the caption card
 * and the spotlight. Painting the band the colour of the artwork's own edge is
 * the way to have both: the screenshots are a dimmed dashboard, and the top and
 * bottom rows of all three are a uniform `#504E4D` of that dimming, so the band
 * and the picture become indistinguishable.
 *
 * Not a theme token, and not themed: it's a measurement of these three files,
 * it changes when they do, and it stays put in dark mode for the same reason
 * the light-theme screenshots do. Re-sample it if the artwork is ever redone.
 */
export const TUTORIAL_BACKDROP = '#504E4D'

export const TUTORIAL_SLIDES: TutorialSlide[] = [
  {
    image: require('../../assets/onboarding/tutorial-1.png'),
    label: 'Find any recipe fast — search across names, cuisines and ingredients, or filter by meal.',
  },
  {
    image: require('../../assets/onboarding/tutorial-2.png'),
    label: 'Tap the heart to keep a recipe in your favourites.',
  },
  {
    image: require('../../assets/onboarding/tutorial-3.png'),
    label: 'Shuffle picks a recipe for you, and the plus button adds a new one.',
  },
]
