# Physical paper sheet (MC1.3)

**Registry item:** `paper-sheet` (files `registry/motion/paper-sheet*.ts(x)`). PaperCraft (`paper-craft`) and Editorial
Collage (`editorial-collage`) depend on it.

**Storybook:**
- Video production → Film Looks → Paper Craft → *Physical Paper · Fold, Peel, Roll, Tear*. This is the lab: seven moves,
  eleven stocks, light, camera tilt and turn, and thickness. Below the lab, a PaperCraft diorama with physical layers.
- Video production → Film Looks → Editorial Collage → *COLLAGE1 · Physical paper lab*. This shows cutouts that fold,
  tear, peel and roll on a kraft board.

**Find it:** `npm run catalog:find -- --query="paper fold peel tear" --format=json`. Exact exports:
`npm run catalog:api -- --id=paper-sheet --format=json`.

## What it does

A sheet is the flat outline of a real paper stock. Bends and tears change it over time. Each frame resolves to
**facets**: planar pieces of the sheet. Each facet has an exact affine map from the flat sheet (the artwork's own
coordinates) into 3D. Because each map is affine, a renderer draws the original artwork on every facet with one matrix.
Thus print, photos, halftone and type fold with the paper. Facets never stretch the paper, and neighbouring facets meet
on the same line.

| Move | What the paper does |
|---|---|
| `fold` | A scored crease. The crease radius comes from the stock (about 0.1–1 mm), or you set it. |
| `bend` | The same turn, spread over a length. Use it for a soft curve, or `angle: 0` for a sheet that only sags. |
| `peel` | A stuck sheet lifts from a front that moves with `offset`. The front radius is R = √(D / 2Γ), from the stock's bending stiffness D and the adhesion Γ (`adhesion`, J/m²). |
| `roll` | A spiral from a line. Each turn sits one thickness inside the last. Move `offset` to roll up or unroll. |
| tear | A tear runs from an edge along a wandering path. Behind the tip the two sides separate. A bend with `follow` puts its line through the tip, so one side lifts as the tear runs. |

Flaps **sag under their own weight**. The sag follows the stock's elastogravity length ℓ = (D / q)^(1/3), where q is
the weight per area. Over a table edge, 100 mm of card drops 3 mm, copy paper 20 mm, newsprint 39 mm and tissue
86 mm. Floors stop a flap from going through the sheet or the surface below it. Bends **nest**: a bend with `parent`
rides on the rigid end of its parent's flap (accordions, pop-ups).

## Spec

```ts
evaluatePaperSheet(spec: PaperSheetSpec, frame: number): PaperSheetFrame
inspectPaperSheet(spec): PaperSheetIssue[]          // { path, message }, empty when valid
```

| Field | Meaning |
|---|---|
| `outline` | SVG path data or rings of points, in the artwork's coordinates (px). Holes are allowed. |
| `stock` | A name (`copy`, `newsprint`, `tissue`, `tracing`, `kami`, `washi`, `kraft`, `construction`, `cardstock`, `glossy`, `chipboard`), a full `PaperStock`, or `{ base, …overrides }`. |
| `grain` | Machine direction, degrees from +x. A sheet is stiffer when the bend runs across the grain. |
| `pxPerMm` | Real size (default 4). Sag, crease radius, fibre length and thickness use it. |
| `thickness` | Visual thickness multiplier (1 = true caliper). |
| `gravity` | World direction (default `[0, 0, -1]`, a table seen from above; PaperCraft uses `[0, 1, 0]`). |
| `support` | Height of the sheet above the surface under it, px (default 0); `null` for no surface. |
| `bends[]` | `{ id, kind, line, flap, angle, radius?, length?, offset?, adhesion?, gravity?, parent?, piece?, follow?, keys? }`. `flap` is any point on the side that moves. |
| `tears[]` | `{ id, from, to, progress?, wander?, seed?, core?, keys? }`. `from` is on or just outside the edge. If `to` is outside the sheet, the tear can run right through. `core` is a point on the side that shows the white core. |

`piece: { tear, at }` limits a bend to the side of a tear that holds the point `at`. **Keys** change `angle`,
`radius`, `length` and `offset` (bends) or `progress` (tears). Each value starts at the field's own value at frame 0.
Then it eases into each key (`easing` is any motion easing; the default is `"ease-in-out"`). Every frame evaluates on
its own, so seeking and out-of-order rendering are exact.

Axes: x right, y down (SVG), z toward the viewer. Positive angles turn toward the viewer.

## Light, view and shadows (`paper-sheet-light.ts`)

These functions do not depend on a renderer: `paperViewMatrix`, `paperFacetMatrix`, `paperFacing`, `paperShade`,
`paperSheen`, `paperShadowSlices`, `paperPenumbra` and `paperShadowColor`.

- **Light** is a key light of real angular size (`size`, degrees), a sky, and light bounced from the surface below.
  Presets: `table`, `lamp`, `soft`, `raking`, `backlit`. Shading is relative to the flat sheet, so a flat sheet looks
  exactly as drawn.
- A face turned away from the key gets the key **through the paper**, scaled by the stock's transmittance. A lifted
  thin sheet glows on its dark side, and a back-lit sheet glows from behind.
- **Shadows** are facets projected along the light. Slices by height get their own penumbra, of width 2h·tan(size/2).
  A crease casts a sharp contact shadow and a high flap a soft one. A sky (ambient-occlusion) pass darkens softly under
  anything lifted. Light that goes through the paper makes its shadow lighter and tints it with the paper's colour.
- The **view** is orthographic. `tilt` and `turn` turn it about `center`. Each facet stays affine, so SVG draws it
  exactly.

## SVG renderer (`PaperSheetSvg`)

```tsx
<PaperSheetSvg sheet={evaluatePaperSheet(spec, frame)} front={<Artwork />} color="#f6f1e4"
  light="table" view={{ tilt: 30 }} shading={1} shadow={1} showThrough={1} edges fibres />
```

- Facets draw far to near. Each draws the artwork through its own clip. Edges inside the sheet grow by a hair, so no
  anti-aliased seam shows. Each facet's content composites as one layer: Chromium clips the shapes of a group one by
  one, and that leaks the artwork's lower layers at the edge.
- The back shows `back`. By default it shows the stock's back colour, or the face colour for stock coloured through
  (for example, the white back of origami kami). On thin stock the front shows through, mirrored. It shows through
  faintly in reflected light, by (1 − opacity), and strongly when the light is behind.
- Cut and torn edges show their thickness in the core colour. Torn edges show a solid core band, a ragged
  semi-transparent feather and loose fibres at the stock's fibre length. Kozo washi sheds long fibres, and copy
  paper shows a thin ragged white edge.

## In PaperCraft and Editorial Collage

- **PaperCraft:** any `PaperCutLayer` takes `sheet: PaperSheetMotion` (`stock` defaults to `cardstock`). The outline is
  the layer's path and holes. Its height above the backing follows the same rule as its drop shadow (3.3 + depth px).
  The flat drop shadow gives way to physical shadows. Scene settings: `physical: { pxPerMm, gravity, light, view }`.
  The default light matches the drop shadows of flat layers. `paperLayerSheetSpec` and `paperCraftLight` expose the
  composed spec and light for other renderers. `PaperLayerFrame.sheet` carries the evaluated sheet.
- **Editorial Collage:** a `cutout` takes `sheet`. The stock follows `material` (paper → copy, card → cardstock, kraft,
  newsprint, tissue, glossy). The outline is the cutout's silhouette, including its fibre core. Its height follows
  `lift` the way its flat shadow did. The light follows the scene's `light` angle in the piece's own space, so physical
  and flat shadows fall the same way. Bend and tear keys use the cutout's stepped frame, so cadence on twos still
  works.

## Stocks and sources

| Stock | g/m² | µm | E MD / CD GPa | Opacity | Fibre mm | Notes |
|---|---|---|---|---|---|---|
| copy | 80 | 105 | 4.6 / 1.5 | 0.88 | 2 | ℓ 85 / 59 mm; T ≈ 0.19 |
| newsprint | 45 | 70 | 4 / 1.4 | 0.92 | 1.5 | R∞ 0.62 (grey, unbleached) |
| tissue | 17 | 35 | 1.6 / 0.8 | 0.55 | 2.5 | ℓ ≈ 3 cm; T ≈ 0.52 |
| tracing | 90 | 78 | 7 / 5 | 0.33 | 1 | T ≈ 0.71 |
| kami | 70 | 75 | 4 / 2 | 0.86 | 1.5 | white back |
| washi (kozo) | 46 | 115 | 1.8 / 1.2 | 0.62 | 10 | long feathered tear |
| kraft | 90 | 110 | 6.5 / 2.5 | 0.98 | 3 | dyed through |
| construction | 120 | 190 | 2.5 / 1.2 | 0.97 | 2 | dyed through |
| cardstock | 270 | 310 | 4 / 2 | 0.99 | 2 | white core; ℓ 160 / 127 mm |
| glossy | 230 | 240 | 5 / 3.5 | 0.99 | 1 | coated; sheen 0.55 |
| chipboard | 600 | 1000 | 2.5 / 1.5 | 1 | 1.5 | grey core |

| Source | Grade | Used for |
|---|---|---|
| PaperOnWeb, *Properties of paper* ([page](https://paperonweb.com/paperpro.htm)) | B (industry reference) | Grammage, caliper and opacity of newsprint, office, tracing and tissue; office-paper resonance stiffness MD 493 / CD 160, read as µN·m, which with plate theory gives E ≈ 4.6 / 1.5 GPa at 105 µm |
| Valmet, *L&W bending stiffness modules* ([datasheet](https://paperlabmultimedia.valmet.com/pdf/Datasheet-Bending-Stiffness-modules_D07693EN_V1.0.pdf)) | B (instrument maker) | Measuring ranges of paper and board stiffness |
| ISO 2471:2008, *Opacity (paper backing)* ([ISO](https://www.iso.org/standard/39771.html)) | A (standard) | The definition of opacity, R0 / R∞, used by Kubelka–Munk |
| Kubelka–Munk two-flux theory (T² = (a − R0)² − b², a = (1/R∞ + R∞)/2, b = (1/R∞ − R∞)/2) | A (textbook theory) | Diffuse transmittance from opacity and pad reflectance |
| Elastogravity length in thin sheets: arXiv 1809.04620 and *The physics of crêpes* (arXiv 2602.15574) ([1](https://arxiv.org/pdf/1809.04620), [2](https://arxiv.org/html/2602.15574)) | A (preprints by research groups) | ℓ = (B / ρg)^(1/3), the heavy inextensible elastica for the free flap; office paper sags past about 5 cm |
| Cerda et al., draping of sheets (summary, [Plus](https://plus.maths.org/comment/3159)) | B (summary of peer-reviewed work) | Gravity length of wrapping paper ≈ 3 cm, a check on tissue |
| Kendall peel and elastica peeling (arXiv 2012.03007, [paper](https://arxiv.org/pdf/2012.03007)) | A (preprint) | Peel energy balance; the front radius scales as √(D / Γ) |
| Hardwood and softwood fibre length (pulp-industry references, for example [PAPRI](https://ippta.co/wp-content/uploads/2020/12/Dr.-S.P.Singh-PAPRI.pdf)) | B (industry presentation) | Softwood about 3 mm, hardwood about 1 mm; length-weighted softwood 1.8–2.7 mm, hardwood 0.6–1.1 mm |
| Kozo fibre length (University of Melbourne, [paper mulberry](https://cultural-conservation.unimelb.edu.au/papermulberry.html)) | B (conservation reference) | Kozo mean 10 mm (6–20 mm); a torn fringe of about 1 mm |
| Torn-paper craft guides ([BellaOnline](https://www.bellaonline.com/article.asp?id=7760), [FaveCrafts](https://www.favecrafts.com/Techniques/Paper-Tearing)) | C (practitioners) | A tear toward you shows the white core; a right-handed tear shows it on the held (left) side |
| Hong et al., *Turning pages of 3D electronic books* (2006), and cylinder page-curl models (SPIE 2014), as cited by Eurographics 2021 ([paper](https://diglib7.eg.org/bitstream/handle/10.1111/cgf142646/v40i2pp449-460.pdf)) | B (cited at second hand) | Developable cone and cylinder page curls; here generalised to any curvature profile along a line |

The moduli of grades other than office paper, the opacity of tissue and kami, and the crease radii are estimates
(grade C). They are consistent with the measured office values and with the published gravity lengths. Override
them with measured values when you have them.

## Limits

- One bend is a generalised cylinder: the curvature runs across one straight line. Cone curls (a corner turned by
  hand) are close to a diagonal fold with a large radius, but not exact.
- A nested bend rides only on the rigid end of its parent. A bend that carries others does not sag.
- Floors are planes: the sheet's own rest plane under its flap (x < 0) and the support beyond. A flap does not collide
  with other layers or with its own curled parts.
- A tear must enter from the outline, and must not cross a hole. Only the first entry and exit split a piece. A
  partial tear splits the paper behind a line through its tip, square to the tear's overall direction.
- PaperCraft draws each layer in its own depth slot. A flap that lifts does not pass in front of layers stacked
  above it.
- In a collage, child nodes (text on a card) do not follow their parent's fold. Put printed matter in the cutout
  (`pattern`, `halftone`), or give each child its own sheet.
- The view is orthographic, so a door opened toward the viewer reads by its foreshortening and shading, not by
  perspective.

## Verification

- `tests/paper-sheet.test.tsx`: kept area and lengths through every move, seamless bands, nested attachment, sag order
  card < copy < tissue, tear pieces and fibres by stock, keys and determinism, validation paths, stock physics
  (Kubelka–Munk identities, grain), shading and shadow slices, the SVG output, PaperCraft and collage validation.
- `node scripts/registry-fixture.js --item=paper-sheet` compiles a clean consumer install.
- Rendered review in Chromium: all seven moves top-down and tilted; washi and copy tears at 3×; a seam traced to the
  rounding of facet matrices (now written to seven decimals) and to per-shape clipping (now composited); the collage
  lab; the PaperCraft diorama at frames 20, 50 and 130.
