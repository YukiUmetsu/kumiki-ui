# RISO20 — reference-led AM/FM screen deposition and dot gain

Date: 2026-11-15. This increment follows RISO19's printable contact marks. Scope is **native spot-ink material**: not another image effect, character repaint, photo filter or animation engine.

## Source/reference ledger (study-only; no third-party assets bundled)

| Authentic reference | What is actually visible or described | Geometry/material rule |
| --- | --- | --- |
| [Carolyn Hawkins, *Pub Faces* Risograph](https://www.carolyn-hawkins.com/shop/pub-faces-risograph) | Orange short parallel hatch fields behind strongly defined deep-blue editorial figures, thin open contours, fine intentionally varied stroke rhythm | Preserve author-made contours and separate blue/orange spot plates. Screen detail belongs only where an ink fill asks for it, not a whole-image uniform noise field |
| [Jung Shan Chang, *A Woman Who Loves Orange Flavor*, Risolve Studio](https://risolvestudio.com/products/jung-shan-chang) | Layered red/blue/yellow/green spot colors with granular interior tone, crisp facial voids and softly graded printed surfaces | Screen density must change actual deposited ink, while solid/knockout path geometry and independent paper areas remain unchanged |
| [Ms. Registration, Risources](https://www.msregistration.studio/risources) | Distinguishes **AM** regularly placed, variable-radius halftone dots from **FM** dispersed equal-size dots; both produce printed tone, not transparent image filters | Provide AM and FM as distinct deterministic plate screen geometries; screen angle is plate-specific |
| [Risolana printing guide](https://www.risolana.org/printing) | Independent grayscale masters for each ink pass; translucent printed inks overprint, while unprinted paper is a real reserved substrate | Do not merge spot plates, move paper knockout, change hand anatomy or encode tone by opaque global RGB convolution |
| [MICA Risograph print guide](https://www.mica.edu/campus-life-and-resources/places-and-spaces/maker-spaces-fabrication-studios/2d-prototyping-studio/riso-image-making-and-printing/) | Layer registration shifts; different toner-like densities produce changes on physically fed paper | Site coordinates depend on print seed + ink plate and rotate with plate screen, never with film-frame progression |

The artworks are reference observations only. No artist image is copied, traced, embedded or represented as royalty-free. Neither a calibrated scan nor a licensed same-subject pixel-aligned source comparison is supplied.

## ArtCraft structural/material deconstruction

1. **Topology and isolation:** Existing authored source SVG paths, paper knockout and blue/red registration are left intact. Screen micro-elements are 1 periodic AM circle per tile or 0–64 FM ink dots in an 8×8 tile, each with one closed boundary; zero-density yields no dots. Foreground actors remain fully opaque paper-backed, not a multiply-transparent body.
2. **Flow:** AM forms ordered rows rotated by the existing plate's own screen angle. FM selects deterministically ranked, lightly jittered droplet positions; the second spot ink uses an independent plate seed. Macro contour vector flow comes from the existing artist-authored paths; **screen grain does not override a sleeve edge, face line, wave or fingertip**.
3. **Weight and edge:** AM radius follows square-root area coverage; physical dot gain expands the actual circle radius, with a bounded maximum. FM dots have fixed radius for a given gain and tone varies by number of selected sites. The same old physical ragged reveal, tooth-mask pores and layered printed inks remain.
4. **Rhythm:** Tone is stable at every absolute film frame. FM point ranks are nested: raising tone introduces new dots without shuffling previous deposits. Scrubbing 0→239→0 does not reseed a frame's material.
5. **Microtexture/depth:** Print paper fibres and individual sparse dropout pores are unchanged and anchored to the paper. Spot-ink overprints retain multiply compositing. This digital model does **not** certify calibrated physical CMYK/spot-color values, scanner dot gain, paper absorption, or actual Riso press proofs.

## New production API

`RisoPrint` accepts optional, bounded `screenMode="am" | "fm"`, `screenDensity={0..1}` and `dotGain={0..1}`. Defaults preserve the original one-circle AM screen, with radius **0.32 × dotCell**, and zero extra gain. Existing vector solids, dots paint token, material registration and all prior characters/films remain unchanged at defaults.

`createRisoScreenGeometry({cell,mode,density,dotGain,seed,plateIndex})` is a pure renderer-independent geometry evaluator in `registry/video/riso-screening.ts`. The three new public controls live in the **existing** `Video production / Film Looks / Risograph / Risograph · Two-Ink Printing` Storybook scene. Both aspect ratios remain available there. No new folder, dependency, renderer or engine.

## Negative-control and review gates

- AM radius at unchanged defaults **must** exactly reproduce the previous .32-cell circle.
- Density=0 must show no ink-dot fill; high density and gain may not generate nonfinite/off-tile coordinates.
- FM 25%→75% must preserve all 25% droplet locations and add sites, not redraw them; changing plate seed must not alter the geometry of another ink.
- Foreground/paper knockout and overprint semantics may not be replaced by alpha-faded body or whole-image filters.
- Existing golden examples must remain valid for both **16:9 and 9:16**.
- Focused Vitest covers these mathematical invariants and server-rendered SVG geometry. **Still required before artistic signoff:** actual Storybook Chromium screenshot/DOM review at 1× and 3×, encoded moving film evidence and independent comparison with licensed print scans. This PR must not be described as print-scan calibrated or a finished human illustration.
