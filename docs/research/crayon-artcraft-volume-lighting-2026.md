# ArtCraft underpainting: volume and wax contact (2026-11-14)

**Status:** working source and browser proof, visual approval **blocked**.

## Why the previous finish was still wrong

The preceding stage removed excessive incidental noise, but left a
uniform peach underpainting, identical values on every side of the
face, and low-contrast anatomy. In real illustrated wax and pastel
portraiture, broad color masses are deposited before texture details,
and the light/shadow relationship is present **even when tiny strokes
are not yet drawn**.

Reference/craft sources:

- [Art Prof, Oil Pastel Portrait Drawings](https://artprof.org/learn/tutorials-media/drawing/oil-pastel-portrait-drawings/)
  documents side-nib massing, varied pressure, layered pigmentation
  and shaded eye whites.
- [Royal Talens: Building a Portrait in Soft Pastel](https://www.royaltalens.com/blogs/pastels/building-a-portrait)
  studies short subsequent marks and controlled mixing of hue masses.
- [Kassia Rico, Portraits 2013 Crayon](https://www.behance.net/gallery/14450891/Portraits-2013-Crayon/modules/124832885)
  provides a technique benchmark for warm cheeks against violet shadow
  without uniform flat vector fill.
- The user's provided adult character reference crop remains the preferred
  craftsmanship benchmark and is **not** redistributed into the package.

## Code and exact quality goal

New serializable `underpaintGradient` is restricted to
`coverage:"opaque"`. The three-pigment field uses a local radial
light source on the editable wax silhouette, then dense wax marks and
anatomical glazes still deposit above it. **This is a deliberate
rendering approximation, not a physics simulation of pigmented wax.**

The lit cranial plane has a warm ochre deposit, the receding cheek
and jaw receive a cool low-chroma half-tone, and the sclera is softly
shaded underneath its lid, following the cited observations. The hair
receives root darkness and the coat a lighter shoulder plane. The
original default remains completely unmodified, with no gradient defs
or changes to the full-opacity underpaint path.

Accepted source fields:

```ts
underpaintGradient:{
  light:"#f3ccab",shadow:"#ad7e78",
  focusX:0.34,focusY:0.28,radius:1.06
}
```

Ranges: focus coordinates each 0..1, radius 0.2..1.5, six-hex
colors only. The source validator refuses malformed fields and nonopaque
shapes. The layer is clipped to its own native animated geometry.
The renderer's existing pore mask does not punch opacity holes into
the underpaint; optional `markStrength` controls visible incidental
marks without altering the original source geometry.

## Fail-open warnings are prohibited

- A valid source document and successful unit tests are **not**
  ArtCraft visual signoff.
- Gradients can look digitally airbrushed without directional wax strokes.
  Audit 1x/3x nose, cheek, eye and garment crops before any public gallery.
- Do not paint a global gradient over the whole SVG: relative light fields
  must follow **each specific facial or cloth mass**.
- Existing rejected character stories and the test portrait remain hidden
  under the single Crayon Storybook tree.
