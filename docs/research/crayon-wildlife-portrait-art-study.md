# CRAYON1 naturalistic character art: The Wild Hare

Date: 2026-11-14.
Purpose: A production-ready *original source illustration* demo with anatomy,
light, restraint, visual detail and animation, as a serious alternative to
the simplified cartoon mascots and early-reading illustration examples.

## Research references

- [Nadezhda Kokorina — Portrait of a Hare in oil pastel](https://www.saatchiart.com/en-pr/art/Drawing-Portrait-of-a-hare-painting-animal-art-oil-pastel-rabbit-art/296362/9862769/view):
  side-facing hare anatomy, delicate but luminous eye, ear-direction fur.
- [Gina Hawkshaw — Hare](https://clarendonfineart.com/en-us/products/hare-1):
  warm, crisp, volumetric cheek and ear transition against spare background.
- [European Hare scientific illustration study](https://www.behance.net/gallery/26026835/European-Hare-%28scientific%29-illustration-study):
  prominent eye, skull projection, asymmetric ears and realistic muzzle.
- [Philadelphia Museum of Art — descriptive terms for art on paper](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf):
  wax-specific clumping and pickup at stroke tips.
- [Anatomy guide for rabbit heads](https://classic.leporidae.org/howtodraw.php):
  the lateral location of a rabbit's eyes, cheek volume and ear placement.

These references informed *technique and art direction*, not line tracing,
asset acquisition or reproduction of any artist's illustration.

## Original source-art design

A three-quarter hare on dark slate-blue paper, with layered main body,
cervical ruff, asymmetrically folded ears, prominent brow, a well-projected
muzzle, an amber eye with dark eyelid, layered nose/philtrum, fine whiskers,
separately colored reflected-light cheek, and a distinct cool-side shadow.

The scene deliberately does NOT give the animal a human smile, bow, glove,
coat, or simple toy foot ellipses. Anatomy, shape hierarchy and directional
fur take priority over particle noise.

- 20+ source-authored **opaque wax pigment regions** using the same
  paper-relief / variable-width nib engine as all CRAYON1 scenes.
- 10 form-directed hatching layers that follow forehead, cheek, crown,
  cervical ruff, shoulder and the individual ears.
- Discrete held-expression eyelid cues, separate delayed ear motion,
  whisker follow-through and restrained shoulder/head breathing.
- Editorial typography and a muted amber/umber/stone value hierarchy.
- Fixed absolute-frame geometry, source JSON-compatible scene grammar,
  no generated image files or third-party art.
- `detail` (0–1) changes fine hatching without modifying silhouette.
  `earMotion` (0–2) controls independently held secondary ear acting.

## Storybook and production rendering

Find **Video production / Film Looks / Crayon / Scene Engine /
Wildlife Hare Portrait**, including a portrait 9:16 version.
Controls include source frame, detail, ear motion, light/paper tooth,
material mark length, stroke order and playback.

The production film is `examples/film/crayon-wildlife-portrait.film.json`,
**240 frames (8 seconds) at 30fps**, 960 × 540 and 540 × 960.

Local commands:

```bash
npm run film:check -- examples/film/crayon-wildlife-portrait.film.json
npm run film:render -- examples/film/crayon-wildlife-portrait.film.json --frames=240 --only=landscape --out=dist/crayon-film-proof
npm run film:render -- examples/film/crayon-wildlife-portrait.film.json --frames=240 --only=portrait --out=dist/crayon-film-proof
```

The **Crayon Storybook browser and film qualification** GitHub Actions
workflow includes a *manual-only* `film=wildlife` choice that captures eight
critical motion frames and encodes both aspect ratios. No automatic expensive
Chromium/FFmpeg CI runs were re-enabled.

## Visual QA caveat

A code-rendered static silhouette mockup was inspected locally; this is not
a substitute for a real `CrayonScene` export. Artistic evaluation remains
open until the original film is inspected at its native frame rate and the
new dark-paper wax/tooth density is reviewed at 100% zoom in both aspects.
