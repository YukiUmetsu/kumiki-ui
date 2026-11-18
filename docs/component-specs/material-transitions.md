# Material transitions (MC1.4)

**Registry item:** `material-transitions` (`registry/video/film-material.ts`). `film-document` depends on it.
FilmMatte (`film-matte.ts`) and FilmShapeWipe (`film-shape-wipe.ts`) use it.

**Storybook:** Video production → Promo Moves → *Material Transitions*. It shows four Iceland photo cards with a bleed,
a burn, a paint drip and frost; the same film with shapes opened through materials; and the noise mattes for comparison.

**Find it:** `npm run catalog:find -- --query="burn transition" --format=json` (also "ink bleed", "paint drip",
"fogged glass").

## What it does

The next scene arrives the way a real material moves. Each material is a physical front over the frame, solved once
per transition. Each frame is a pure function of the transition's progress: a **reveal mask** for the incoming scene,
plus **overlay layers** in the material's own colours and blend modes.

| Material | Physics | What you see |
|---|---|---|
| `bleed` | Ink wicks into paper. The front runs faster along the fibres (an elliptical speed, 1.35 : 1) and through open fibre channels, and its distance grows as √t (Lucas–Washburn). | A dark ink stain races out, feathered along the grain, densest at its wet edge (coffee ring). The next scene develops inside it as the ink sinks in, and the damp paper stays darker for a moment. |
| `burn` | A smouldering front moves at a steady speed through uneven paper. It stalls in dense patches and runs ahead in fingers through thin ones. | The paper scorches brown ahead of the front. An ember line glows (blackbody colours), a band of char follows with a ragged inner edge, and the char crumbles to the next scene. |
| `paint` | Paint poured along the top runs down. A viscous film on a slope breaks into fingers of one spacing, and the tips run ahead faster and faster: y = v·t + a·t²·φ(x) (Huppert 1982). | The paint is the next scene. Rounded drip heads run down, and a capillary ridge at the front catches the light, with a dark lip below it. |
| `frost` | Breath condenses on glass from where it lands. Droplets grow as t^(1/3) (breath figures). | The old scene blurs behind frosted glass with droplet catch-lights. The scenes cross while the glass is fully frosted, and the frost clears from where it formed. |

**Shapes.** With `shape` (circle, diamond, square or star), a front keeps that shape around its first origin. Only the
delay the material adds, its heterogeneous travel time minus a uniform one, roughens the edge. Use it for a circle that
burns open from a face, or a diamond that bleeds open.

## In films

```jsonc
"transition": { "kind": "matte", "texture": "bleed", "subject": "glow", "color": "#0d1a2b", "grain": 90 }
"transition": { "kind": "matte", "texture": "burn", "seed": 3 }
"transition": { "kind": "matte", "texture": "paint" }
"transition": { "kind": "matte", "texture": "frost", "subject": "window" }
"transition": { "kind": "shape", "shape": "circle", "material": "burn", "subject": "glow" }
```

- **Origins.** Bleed, burn and frost start from a subject of the outgoing scene, or from seeded points: two for bleed and
  burn, one for frost. Paint starts along the top edge.
- **Colour.** `color` sets the ink (bleed), the char (burn), the gloss (paint) or the frost's tint. `grain` sets the
  paper's fibre direction in degrees (bleed and burn; default 90, down the frame).
- **Length.** The defaults are bleed 40 frames, burn 44, paint 36 and frost 48. The timing check warns outside 0.8–2.2 s
  (bleed and burn), 0.7–1.8 s (paint) and 1–2.4 s (frost).
- **Errors.** A shape wipe with a material refuses `mark` (a picture has no measurable outline) and `paint` (paint does not
  grow a shape).
- **Reduced motion** keeps a dissolve.

## API

```ts
const plan = planMaterial({ material: "burn", seed: 3, shape: "circle", origins: [{ x: 0.6, y: 0.45 }] }, cols, rows, aspect);
const frame = materialFrame(plan, progress);   // { reveal: Uint8ClampedArray, layers: MaterialLayer[] }
inspectMaterial(spec, frames, fps, path);      // MaterialProblem[]
eikonal(speed, cols, rows, h, sources, along?, angle?);  // shortest travel time through a speed field
```

- `MaterialLayer` is `{ id, color, alpha, blend: "normal" | "multiply" | "screen", backdropBlur? }`.
- FilmStage draws each layer as a colour masked by its alpha, with its blend mode. Frost's layer also blurs what is
  behind it (`backdrop-filter`), scaled by the frame height.
- The fronts are a Dijkstra eikonal solve on a 16-direction stencil (the 8 neighbours plus the knight moves). Its
  distances stay within 3% of Euclidean in every direction, and an elliptical step cost gives paper grain.
- The stage solves fields at 384 columns, about 2.5 px per cell at 960 px. That is fine enough for single fibres
  (about three cells across) and for droplets.

## Sources

| Source | Grade | Used for |
|---|---|---|
| Lucas–Washburn capillary penetration ([summary](https://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.4everland.io/wiki/Washburn_constant.html)); faster along the fibre direction (chromatography-paper study, [White Rose](https://eprints.whiterose.ac.uk/175951/11/1-s2.0-S221418042100026X-main.pdf)) | A (classic theory), B (study) | √t front; fibre anisotropy and channels |
| Deegan et al., *Capillary flow as the cause of ring stains from dried liquid drops*, Nature 389 (1997) ([doi](https://www.doi.org/10.1038/39827)) | A | Pigment gathers at the wet edge |
| Zik, Olami & Moses, *Fingering instability in combustion*, PRL 81 (1998) ([arXiv](https://arxiv.org/abs/cond-mat/9707333)) | A | Ragged, fingering burn fronts in thin paper |
| Huppert, *Flow and instability of a viscous current down a slope*, Nature 300 (1982) ([nature](https://www.nature.com/articles/300427a0)) | A | Fingers of one spacing whose tips run ahead |
| Beysens & Knobler (1986); Viovy, Beysens & Knobler, PRA 37 (1988) ([doi](https://www.doi.org/10.1103/PHYSREVA.37.4965)) | A | Breath-figure droplets growing as t^(1/3), self-similar coalescence |
| FX1 `blackbodyRGB` (CIE 1931 colour matching) | in repo | Ember colours (sampled, so this item does not depend on the fire pack) |

## Limits

- Fronts are fields on a grid. A single fibre or droplet is about three cells, so a 4K output shows the mask's smoothing
  at close range.
- The paint drip is the analytic fingering front, not a fluid simulation. Drips do not merge or branch.
- Frost's swap happens behind frost that is fully formed but not opaque. Scenes very different in brightness show as a
  soft dissolve behind the glass.
- Glass breaking is not covered. Shards would need the outgoing scene drawn in pieces, which the stage cannot do for
  arbitrary scenes.

## Verification

- `tests/film-material.test.ts`:
  - eikonal distances within 3%, slow regions delay the front, and the grain makes an ellipse;
  - every material starts on the old scene and ends on the new with no overlay left, and is deterministic;
  - bleed's √t front, burn's char and embers, paint running top to bottom, and frost fully formed at the swap;
  - a diamond keeps its shape;
  - the material checks, and both example films compiling (with a mark refused).
- `tests/film-document.test.ts` still passes.
- `node scripts/registry-fixture.js --item=material-transitions` passes, and so does `--item=film-document`. The second
  failed on `main` before this change, on the missing `footage-react.tsx`.
- Rendered review in Storybook (Chromium, 960×540) of every material and every shape across its transition. The review
  found three problems, now fixed:
  - Ink feathering had aliased into pixel noise; fibres are now about three cells across.
  - Screened embers washed out to pink over a bright sky; the ember line is now opaque orange with a screened halo.
  - The first ink was a soft blob; ink now leads and the scene develops behind it.
