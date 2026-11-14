# Native subtractive sgraffito for CRAYON1 wax pigments

Date: 2026-11-14. Art direction: detailed, grown-up crayon illustration
with layered hand-worked surfaces rather than a generic digital texture.

## Reference review

- [Richard Hull / Western Exhibitions](https://westernexhibitions.com/exhibition/5488/):
  heavily layered crayon drawings are combed and scratched to reveal
  earlier wax colors. Hair-like stroke groups stay rhythmically coherent.
- [Stockmar — wax crayon scraping technique](https://www.stockmar.de/en/service/publications/articles/576/?cid=1237&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_getting-started_EN.pdf):
  a sharp scraping tip exposes the underlying colored medium and lifts
  upper wax. Mark width/pressure can vary between a fine point and
  a narrow blade.
- [Faber-Castell — sgraffito](https://www.faber-castell.com/-/media/Faber-Castell-new/PDF/en/Goldfaber-Online-brochure-A5-English.ashx?sc_lang=en-Glob):
  dark pigment layered over light, then removed in selective paths
  to reveal high-contrast stripes.
- [Philadelphia Museum of Art](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf):
  wax binds pigment cohesively but deposits unevenly. Scratching removes
  deposited wax; it is not the same as drawing an opaque white highlight.

## Previous engine weakness

The CRAYON1 wax region used ordinary pale stroke overlays marked as
scratches. They visually resemble highlights but **do not remove** the
upper wax; no underlying color was revealed. Simply adding more bright
lines to the hare face or ear creates a flat digital filter.

## Implementation

- `CrayonSgraffito` is a strict source-serializable record
  `{d, width, first, last}`. Paths are bounded SVG, width 0.2–12px,
  with safe integer absolute film frames. Engraving can start **only after
  the wax-color deposition ends**. The scene validator rejects wrong
  ordering or a time outside the source film.
- The existing **page-tooth SVG mask** is the correct place for physical
  pigment subtraction: a bounded black scratch path is laid *after* the
  wax-tooth coverage pattern, cancelling only the top textured wax group.
  The full-coverage first pigment remains painted **outside the mask**,
  so the exposed material shows the buried base wax color and never
  becomes background transparency.
- The scratch path is animated from frame `first` to `last` using the
  existing deterministic source-frame progress; forwards and backwards
  seeking reproduces the same carved marks.
- The original naturalistic hare has fine selective scratchwork within
  the ear fold, warm cheek, and cervical ruff wax layers. Each is
  sparse, directionally coherent and related to the form.
- New Storybook:
  **Video production / Film Looks / Crayon / Material Studies /
  Sgraffito Carved Wax Vs Intact**. The *same seeded character* has
  unmodified top wax on the left and subtractively scraped pigment on
  the right. Controls allow exact frame seeking and material pressure.
- Tests assert that the top mask gets a black subtractive path,
  that the unmasked undercoat is still opaque, that earlier frames
  contain no scratches, that reverse seeks are deterministic,
  that invalid widths/paths/times fail, and that the real Storybook
  scene shows a true A/B (not two copies).

## Art direction limitations

This is a **two-layer optical model** of wax removal, not a measured
three-dimensional wax-ridge cutting simulation. It does not move the
crumbled wax to the scratch edge, deform thick material or model a
scraper's changing contact force. No external artist art, textures,
or screenshots are included. Full browser and normal-speed movie
review remains separate from type/unit test success.
