# README screenshots

The gallery uses real Expo web screens captured at **390 × 844**, then places an unmodified capture inside a simple dark device bezel. These are mobile-layout previews, not screenshots from an iOS or Android build.

## Refreshing the gallery

1. Run the API and Expo web locally, then sign in to an account containing sample recipes and a populated meal plan.
2. Set the browser viewport to 390 × 844. Keep the same viewport for all six shots and let fonts, food photos, and loading states settle.
3. Save JPEG captures in a temporary directory using these names:

| File | Screen |
| --- | --- |
| `explore.jpg` | Explore, with the Cambodian recipe library loaded |
| `recipes.jpg` | Personal recipe index |
| `recipe-detail.jpg` | A recipe with its photo and ingredients |
| `planner.jpg` | A day with planned meals |
| `grocery.jpg` | Ingredients derived from the same week |
| `khmer.jpg` | Explore with Khmer interface text |

Avoid account settings, emails, credentials, development overlays, and open keyboards. Do not fabricate recipe data or edit the interface inside a screenshot.

4. On macOS, add the device frames:

```bash
swift tools/frame-screenshots.swift /path/to/raw-captures docs/images
```

5. Inspect every PNG, check the gallery on GitHub, and restore any language preference changed for the capture.

The banner is a repository-owned SVG in `docs/images/kroueng-psom-banner.svg`. Food imagery shown inside the app belongs to the recipe sources credited in the app and README.

The recipe-index capture is saved as `recipes-kroueng-psom.png` to keep the rebranded image separate from older cached gallery assets.
