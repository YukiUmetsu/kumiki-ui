# Material transitions (MC1.4)

**Registry item:** `material-transitions`. `film-document` depends on it. FilmMatte (`film-matte.ts`) and FilmShapeWipe
(`film-shape-wipe.ts`) use it.

| File | What it holds |
|---|---|
| `registry/video/film-material.ts` | The materials' entry point: `planMaterial`, `materialFrame`, `inspectMaterial`, and the four front materials |
| `registry/video/material-kit.ts` | The frame contract (`MaterialFrame`, layers, vectors, warps), noise, easing and polygon helpers |
| `registry/video/material-glass.ts` | `refract` and `shatter` |
| `registry/video/material-paper.ts` | `peel`, `tear` and `fold` |
| `registry/video/material-liquid.ts` | `ripple` and `melt` |
| `registry/video/film-warp.ts` | Warps encoded for SVG `feDisplacementMap` (two exact 8-bit passes) |
| `registry/video/film-material-react.tsx` | Drawing a frame in the DOM: the warp filter, vector overlays, clip paths |
| `registry/video/material-sound.ts` | Each material's recorded sounds and when they play (no imports, so scripts read it) |

**Storybook:** Video production → Promo Moves → *Material Transitions*. The four Iceland photo cards play each film,
picked with **Compare**:

- bleed, burn, paint and frost;
- glass: refract and shatter;
- paper: peel, tear and fold;
- liquid: ripple and melt;
- shapes opened through materials;
- the noise mattes, for comparison.

**Find it:** `npm run catalog:find -- --query="glass shatter" --format=json` (also "burn transition", "ink bleed",
"paint drip", "fogged glass", "page curl", "paper tear", "water ripple", "melt transition").

## What it does

The next scene arrives the way a real material moves. Each material is solved once per transition. Each frame is a
pure function of the transition's progress, so the same seed and size give the same frames, and any frame renders on its
own.

| Material | Physics | What you see |
|---|---|---|
| `bleed` | Ink wicks into paper. The front runs faster along the fibres (an elliptical speed, 1.35 : 1) and through open fibre channels, and its distance grows as √t (Lucas–Washburn). | A dark ink stain races out, feathered along the grain, densest at its wet edge (coffee ring). The next scene develops inside it as the ink sinks in. |
| `burn` | A smouldering front moves at a steady speed through uneven paper. It stalls in dense patches and runs ahead in fingers through thin ones. | The paper scorches ahead of the front. An ember line glows (blackbody colours), a band of char follows, and the char crumbles to the next scene. |
| `paint` | A viscous film running down a wall breaks into fingers whose tips run ahead (Huppert 1982; Troian et al. 1989). A reduced front model, column by column: the leading ridge holds a volume that sets its speed (u ∝ h²), fluid drains sideways toward the columns that lead, fresh paint arrives from behind and some is left as a film, and surface tension smooths the front and sets the drip spacing. | The paint is the next scene. The poured edge starts uneven and nearly straight, breaks into drips about halfway down, and the leading drips take their neighbours' paint, so drips merge and the leaders run far ahead. A capillary ridge at the front catches the light. |
| `frost` | Breath condenses on glass from where it lands. Droplets grow as t^(1/3) (breath figures). | The old scene blurs behind frosted glass with droplet catch-lights. The scenes cross while the glass is fully frosted, and the frost clears. |
| `refract` | A sheet of reeded glass passes close to the lens. Each flute is a cylindrical lens: Snell's law at its curved face (n = 1.52, steepest face 32°, below the 41° critical angle) bends the view toward its crest. Fresnel loss rises on the steep faces. | Every flute shows a magnified strip of what lies behind. The cut between the scenes is soft and lies behind the glass, so each flute shows a different mix and the change comes in stepped strips. The sheet slows over the middle of the frame. At speed the flutes smear (a 180° shutter at 30 fps), the polished edges show as a dark band with a bright line, and each crest catches the light. |
| `shatter` | A pane struck at a point cracks radially out to its edges, with concentric cracks between the radials (a struck plate; Vandenberghe, Vermorel & Villermaux 2013). The cracks cross the pane in under a millisecond. | Ten to thirteen radial cracks and rings about 1.85× apart, with some secondary radials and forks. The impact point is crushed white. The shards hold and slip a little, then fall under gravity for a pane about 1.35 m tall, the loosened ones near the impact first. They tumble, drift back from the lens and glint as their faces turn (Fresnel rises toward grazing). A loose shard's ground edge is a narrow bevel of glass: light through it bends inward, so the picture near the edge is drawn from a little further in (wider as the shard tilts), and the edge shows the glass's own green. Each shard carries its piece of the outgoing scene; the incoming scene is behind the glass. Every shard has left the frame by the last frame. |
| `peel` | The page curls back from a corner around a cylinder whose radius grows as more of the page lifts (the cylinder page curl) and lies back over itself. | Seen from above, the curl and the flap show the page's back. That is paper, with the print showing through faintly and mirrored (thin stock passes about a tenth of the light, Kubelka–Munk). The curl is shaded as a cylinder lit from the upper left. The flap casts a soft shadow on the page, and the lifted curl shades the page beneath. |
| `tear` | The page is ripped from the top edge to the bottom along a rough, self-affine path (rupture lines in paper have a roughness exponent near 0.65). The tear runs faster as it goes. | Behind the tip the halves open into a V, hinged at the tip; below it the page is still whole. When the tear reaches the bottom, the halves are pulled apart and away. One torn edge shows the paper's white core and loose fibres; the other shows the paper's thickness in shadow. Both halves cast soft shadows on the page beneath. |
| `fold` | The page is folded like a letter: the right half lifts about a vertical crease and, seen through a normal lens (camera 2.4 frame heights away), swings over onto the left; then the bottom half of the folded page swings up onto the top; then the quarter-size packet is lifted, turned and thrown off. Each face maps to the page by an exact homography. | Past 90° each flap shows the page's back: paper, with the print faintly through it, mirrored. Each face is lit by its tilt (Lambert, light from the upper left). A lifted flap casts a soft shadow that widens with its height, and each crease catches a line of light. The next scene is under the page from the first fold on. |
| `ripple` | A drop lands on water. The surface is the Cauchy–Poisson response to it: η(r, t) = ∫ η̂(k) J₀(kr) cos(ωt) e^(−2νk²t) k dk with ω² = gk + (σ/ρ)k³ (water at 20 °C). Short ripples outrun long ones and die faster. | Rings spread at the real speeds of capillary–gravity waves. The frame is scaled so that the drop's main packet (about 9 mm waves at 0.32 m/s) reaches the far corner near the end. The surface's slope bends the view and catches the light. First the drop's splash, at its real speed (Worthington 1908; Rein 1993): a crown rises at the crater's rim with irregular beads, spray flies out and lands in ringlets, the crater closes into a central jet, and the jet's tip falls back as a second, small splash. At 30 fps that is about nine frames. The next scene shows inside the main packet, which breaks the seam into rings. Ahead of the fastest ripples the water is still, and the rings calm over the last frames. |
| `melt` | The picture is a layer of wax on a warm wall. A viscous film on a vertical wall drains with a speed that grows with depth and thins fastest at the top (Jeffreys 1930). Its wet edge is the same fingering front as paint. | The picture sags and stretches from the top. A wet edge runs down the frame with drips that appear, compete and merge; drip columns stretch more, and the last of the wax hangs in the columns that lag. Above the edge the film has drained too thin to see. The meniscus at the edge catches the light, and the next scene is behind the melt. |

**Shapes.** With `shape` (circle, diamond, square or star), a bleed, burn or frost front keeps that shape around its first
origin. Only the delay the material adds roughens the edge. Use it for a circle that burns open from a face, or a diamond
that bleeds open.

## In films

```jsonc
"transition": { "kind": "matte", "texture": "bleed", "subject": "glow", "color": "#0d1a2b", "grain": 90 }
"transition": { "kind": "matte", "texture": "refract", "direction": "up" }
"transition": { "kind": "matte", "texture": "shatter", "subject": "glow", "seed": 4 }
"transition": { "kind": "matte", "texture": "peel", "direction": "right" }
"transition": { "kind": "matte", "texture": "tear", "seed": 3 }
"transition": { "kind": "matte", "texture": "fold" }
"transition": { "kind": "matte", "texture": "ripple", "subject": "glow" }
"transition": { "kind": "matte", "texture": "melt" }
"transition": { "kind": "shape", "shape": "circle", "material": "burn", "subject": "glow" }
```

- **Origins.** `subject` sets where a bleed, burn or frost starts, where the pane is struck (`shatter`) or where the drop
  lands (`ripple`). Without it, the origins are seeded points.
- **Direction.** `refract`: the way the glass travels (default `right`). `peel`: the way the curl travels, from the
  opposite corner (default `left`, from the bottom right). Other materials warn that they take no direction.
- **Colour.** `color` sets the ink, the char, the gloss, the frost's tint, the glass's tint, the light on the cracks,
  the paper's back (peel) or core (tear), or the light on the water and the melt.
- **Length.** Defaults, in frames at 30 fps: bleed 40, burn 44, paint 36, frost 48, refract 34, shatter 44, peel 36,
  tear 42, fold 48, ripple 40, melt 48. The timing check warns outside a range for each material, for example 1 to 2.2 s for a
  shatter (shards need about 0.6 s to fall a frame height).
- **Errors.** A shape wipe takes only bleed, burn or frost. It refuses `mark` (a picture has no measurable outline) and
  any other material.
- **Reduced motion** keeps a dissolve.

## Sounds

With an accent kit (`audio.accents.kit`), a material transition makes its material's own recorded sound in place of a
whoosh. It does this whether or not `on` is `"moves"`, because the sound belongs to the material, not to the edit. An
authored `accent` still wins. `film:render` finds each sound in the catalog, so the kit needs no extra files.

| Material | Sounds, and when (as a share of the transition) |
|---|---|
| `shatter` | `glass-shatter-pane` from the first frame; `glass-debris-tinkle` at 0.42, as the pieces land (about 0.6 s later) |
| `burn` | `match-strike-flare` from the first frame; `fire-paper-crackle` from 0.12 |
| `frost` | `breath-exhale-soft` from the first frame |
| `bleed` | `drop-water-small` from the first frame |
| `ripple` | `drop-water-full` from the first frame |
| `paint` | `liquid-syrup-pour` from 0.02 |
| `melt` | `liquid-syrup-ooze` from 0.15 |
| `peel` | `paper-page-turn-1`, peaking at 0.45 as the flap passes fastest |
| `tear` | `paper-tear-fast` from 0.1, as the tear gets going |
| `fold` | `paper-fold` peaking at 0.38 and at 0.7, as each flap lands; `paper-page-turn-1` peaking at 0.86, as the packet is tossed |
| `refract` | None of its own. It travels past like a pass-by, so it gets the film's whoosh, also with `on: "moves"`. |

The new recordings are CC0, from Freesound, read through earshot on the trimmed files:

| Id | Source | earshot reading |
|---|---|---|
| `glass-shatter-pane` | *window break with axe glass shatter* by kyles ([452667](https://freesound.org/people/kyles/sounds/452667/)) | "glass clinking", z +3.47; AST "Breaking"; p_real 0.994; 10% of its energy below 150 Hz |
| `glass-debris-tinkle` | *Breaking_Mirror* by LazyLids ([369070](https://freesound.org/people/LazyLids/sounds/369070/)) | "a triangle hit" z +3.39, "ice cubes in a glass" z +3.35; p_real 0.995 |
| `match-strike-flare` | *Match - Strike and Light 02* by JarredGibb ([248236](https://freesound.org/people/JarredGibb/sounds/248236/)) | "a match being struck", z +4.72; p_real 0.988 |
| `fire-paper-crackle` | *light fire in wood stove with match strike paper burn* by kyles ([453472](https://freesound.org/people/kyles/sounds/453472/)), the paper burning | "a crackling fire", z +3.71; p_real 0.905 |
| `breath-exhale-soft` | *Exhale* by otherthings ([65619](https://freesound.org/people/otherthings/sounds/65619/)) | matches "a person breathing out a long soft exhale", z +3.99 over a whoosh and a drawn sword; p_real 0.969 |
| `liquid-syrup-pour` | *syrup hands slop* by joshs ([320041](https://freesound.org/people/joshs/sounds/320041/)) | "a liquid bloop" z +3.23; p_real 0.997; high-passed at 180 Hz (36% → 11% below 150 Hz) |
| `liquid-syrup-ooze` | the same recording, a slower section | "a squishy wet squelch", z +4.55; matches "a thick viscous liquid squelching and oozing", z +3.56; p_real 0.999 |

Paper sounds (`paper-page-turn-1`, `paper-tear-fast`) and water drops were already in the catalog (see
[paper sheet](paper-sheet.md)).

## API

```ts
const plan = planMaterial({ material: "shatter", seed: 4, seconds: 44 / 30, origins: [{ x: 0.5, y: 0.45 }] }, cols, rows, aspect);
const frame = materialFrame(plan, progress);   // MaterialFrame
inspectMaterial(spec, frames, fps, path);      // MaterialProblem[]
encodeWarp(frame.warpOut, cols, rows, width, height); // EncodedWarp for feDisplacementMap
```

A `MaterialFrame` is everything a renderer needs. Coordinates are in frame heights (x from 0 to the aspect, y from 0
to 1), and grids are `cols × rows` cells.

| Field | Meaning |
|---|---|
| `reveal` | The incoming scene's opacity per cell. |
| `layers` | Raster overlays: a colour through an alpha grid, with a blend mode. Frost's layer also blurs what is behind it (`backdropBlur`, with a `veil`). |
| `vectors` | Crisp overlays: rings of points, filled (flat or with a linear gradient) or stroked, with a blend mode, an optional blur, per-ring alphas, and `outside` rings they must not cover (a shadow on the page beneath, not on the paper). |
| `warpOut`, `warpIn` | The scene drawn displaced: a backward map `dx, dy` (a cell shows the scene's picture from x + dx), with an optional `owner` per cell (pieces that move separately; −1 draws nothing), `cover`, and a blur with a mask (motion blur through moving glass). |
| `outClip` | The outgoing scene shows only inside these rings: crisp edges for shards, torn halves and a peeling page. |
| `incomingBelow` | The incoming scene lies under the outgoing one, which breaks, tears, peels or drains away. |
| `outMatrix` | An exact transform of the whole outgoing layer. The warp is then in the layer's own coordinates and holds only what the transform cannot (melt's even stretch). |

## Rendering warps

`feDisplacementMap` reads each displacement from one 8-bit channel, so one pass is precise to scale / 255. That is fine
for glass and water, which bend the picture by a few dozen pixels. It is not fine for a shard that falls a frame height,
which would jitter by several pixels. `encodeWarp` uses two passes for large warps:

1. a fine pass with the small rest of the displacement, then
2. a coarse pass whose displacement is exactly representable and constant over each piece.

At a pixel x of piece p the passes show S(x + Q_p + d(x + Q_p)), so the fine map is written where the coarse step lands.
Pieces are the warp's `owner` regions, cut into tiles. Pieces whose landing areas overlap are coloured into separate
filter branches. Each branch is masked to its pieces, and the branches add up (laying one over another would leave a seam
of lost alpha). Each piece's coarse step reaches a few cells past its edge, so neighbouring branches agree under the
mask's soft edge. A piece's step keeps its in-frame cells landing on the map.

`MaterialWarpFilter` draws the encoded warp as an SVG filter, plus hidden images of its maps. The video exporter waits
for those images to decode, so every frame renders the same in any seek order.

## Sources

| Source | Grade | Used for |
|---|---|---|
| Lucas–Washburn capillary penetration ([summary](https://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.4everland.io/wiki/Washburn_constant.html)); faster along the fibre direction (chromatography-paper study, [White Rose](https://eprints.whiterose.ac.uk/175951/11/1-s2.0-S221418042100026X-main.pdf)) | A (classic theory), B (study) | Bleed: √t front, fibre anisotropy |
| Deegan et al., *Capillary flow as the cause of ring stains from dried liquid drops*, Nature 389 (1997) ([doi](https://www.doi.org/10.1038/39827)) | A | Bleed: pigment at the wet edge |
| Zik, Olami & Moses, *Fingering instability in combustion*, PRL 81 (1998) ([arXiv](https://arxiv.org/abs/cond-mat/9707333)) | A | Burn: ragged, fingering fronts |
| Huppert, *Flow and instability of a viscous current down a slope*, Nature 300 (1982) ([nature](https://www.nature.com/articles/300427a0)) | A | Paint and melt: fingers of one spacing whose tips lead |
| Troian, Herbolzheimer, Safran & Joanny, *Fingering instabilities of driven spreading films*, Europhys. Lett. 10, 25 (1989) | A | Paint and melt: the capillary ridge at a driven film's front, and the band of drip spacings that grows |
| Beysens & Knobler (1986); Viovy, Beysens & Knobler, PRA 37 (1988) ([doi](https://www.doi.org/10.1103/PHYSREVA.37.4965)) | A | Frost: breath-figure droplets growing as t^(1/3) |
| FX1 `blackbodyRGB` (CIE 1931 colour matching) | in repo | Burn: ember colours |
| Snell's law and the Fresnel equations (any optics text, for example Hecht, *Optics*) | A (textbook) | Refract: the bend through each flute, and the loss on its steep faces |
| Vandenberghe, Vermorel & Villermaux, *Star-shaped crack pattern of broken windows*, PRL 110, 174302 (2013) ([HAL](https://hal.archives-ouvertes.fr/hal-00857239)); summary in Physics World ([article](https://physicsworld.com/a/glass-obeys-a-cracking-good-law/)) | A (paper), B (summary) | Shatter: radial cracks to the edges, circumferential cracks between them, a count that grows with impact speed |
| Hong et al., *Turning pages of 3D electronic books* (2006), and cylinder page-curl models, as cited by Eurographics 2021 ([paper](https://diglib7.eg.org/bitstream/handle/10.1111/cgf142646/v40i2pp449-460.pdf)) | B (cited at second hand) | Peel: the cylinder curl |
| Kubelka–Munk two-flux theory, as in the paper-sheet spec ([paper-sheet](paper-sheet.md)) | A (textbook theory) | Peel: print showing through the page's back |
| Bouchbinder, Procaccia & Sela, *Statistical physics of fracture surfaces morphology*, J. Stat. Phys. 125 (2006) ([arXiv](https://arxiv.org/pdf/cond-mat/0510368)). Its discussion of rupture lines in paper cites roughness exponents near 0.64 to 0.67, after Kertész, Horváth & Weber (1993) and Santucci et al. | A (paper), B for the cited values | Tear: a self-affine path, Hurst exponent 0.65 |
| Torn-paper craft guides, as in the paper-sheet spec | C (practitioners) | Tear: the white core on the edge torn toward the viewer |
| Lamb, *Hydrodynamics* (1932), §266–267 (waves from a local disturbance) and §348 (viscous damping); capillary-wave dispersion ([summary](https://en.wikipedia.org/wiki/Capillary_wave)): minimum phase speed about 23 cm/s at 1.7 cm on water | A (classic text), B (summary) | Ripple: the dispersion relation, the Cauchy–Poisson rings, damping e^(−2νk²t) |
| Worthington, *A Study of Splashes* (1908); Rein, *Phenomena of liquid drop impact on solid and liquid surfaces*, Fluid Dyn. Res. 12 (1993) | A | Ripple: the crown, its rim beads, the crater, the central jet and its falling tip, and their timescales |
| Jeffreys, *The draining of a vertical plate*, Proc. Camb. Phil. Soc. 26 (1930), and its use in later drainage studies ([NSF](https://par.nsf.gov/servlets/purl/10268476)) | A | Melt: a film that thins fastest at the top, h ∝ √(νy / gt) |

## Limits

- Fronts and warps are grids. The stage scales the grid with the output: cells of about 2.5 px, from 384 columns at
  960 px to 768 at 1920 px, capped at 1024 columns (3.75 px cells at 4K). Cell-sized details (droplets, paint wobble)
  scale with the grid, so a larger output draws the same material, only sharper. Piece edges are crisp where a clip
  ring or a vector line draws them.
- Paint and melt run a reduced front model (one ridge volume per column), not a full thin-film simulation of the wall.
  Drips appear, compete and merge, but they do not split, and the film behind the front is not simulated.
- Frost's swap happens behind frost that is fully formed but not opaque. Scenes very different in brightness show as a
  soft dissolve behind the glass.
- Glass and paper follow the editing convention that the outgoing picture is on the glass or the page. A shard carries
  its piece of the picture and bends the light at its edge, but it does not show the incoming scene through itself.
- The ripple's frame scale is chosen so the main packet crosses the frame in the transition's time, so a longer
  transition shows a larger patch of water. Waves follow linear deep-water theory, with no breaking. The splash is
  drawn from above as light (crown, beads, jet); its droplets do not refract the picture.
- Warps cost a few milliseconds a frame for the plan and the maps, plus the browser's SVG filter. A shatter in flight
  uses up to several filter branches.

## Verification

- `tests/film-material.test.ts`:
  - eikonal distances within 3%, slow regions delay the front, and the grain makes an ellipse;
  - every front material starts on the old scene and ends on the new with no overlay left, and is deterministic;
  - bleed's √t front, burn's char and embers, paint running top to bottom, and frost fully formed at the swap;
  - the paint and melt front: flat at first, five or more drips by half way, no more drips at the end than half way
    (they merge), leaders at least 0.3 frame heights ahead, and the same front for the same seed;
  - a diamond keeps its shape;
  - the warp encoder against a model of the browser's two 8-bit passes, on the stage's 384-column grid: rigid pieces
    land within 0.1 px and a smooth warp within 0.3 px (one pass would be off by up to 1.7 px and 0.7 px);
  - refract bends the view and changes the scenes behind it; shatter's cracks run first, its shards fall, and all have
    gone by the end;
  - peel shows the flap and its back, and the page is gone at the end; tear opens behind its tip, the page below the tip
    stays whole, and the halves leave the frame; fold shows the page's back, uncovers the right half after the first
    fold, leaves under 30% of the frame after the second, and is gone at the end;
  - the ripple's revealed radius grows in step with time (group velocity), the water ahead is still, and it calms at the
    end; melt drains from the top first and leaves nothing on screen at the end;
  - the same coverage, within 3%, on a 384- and a 768-column grid for every material, and frost droplets that keep
    their size in the frame;
  - every material sound is a recorded CC0 catalog sound that may ship; a shatter places the break on its first frame
    and the landing pieces at 0.42; refract gets a whoosh with accents on moves only; an authored accent wins;
  - the material checks, and every example film compiling (with a mark refused).
- `npm run film:seek -- examples/film/material-glass.film.json --only=draft --frames=240,110,240,236,110,240`: the
  same pixels in any seek order and on a fresh page.
- `npm run film:render -- <film> --only=draft --audio-only` for the four material films, then earshot `timeline` with
  the transitions as cues. Each shatter's break lands within 1 ms of its first frame (AST "Breaking"), each drop within
  1 ms, and each refract's whoosh peaks at its middle. The burn reads as a strike then "paper rustling", and the frost
  as "breath". The review swapped two takes: a page turn that ended in a slap (a curl never lands) and a slime take
  that read as clicks.
- Rendered review in Storybook (Chromium, 960×540) of every material across its transition. The review found and fixed
  these problems:
  - Ink feathering had aliased into pixel noise; fibres are now about three cells across.
  - Screened embers washed out to pink over a bright sky; the ember line is now opaque orange with a screened halo.
  - The first ink was a soft blob; ink now leads and the scene develops behind it.
  - The first shatter drew a dense web of cracks; the pattern is now sparse, as on a struck pane.
  - Shards from outside the frame drew empty outlines; shards are now cut to the frame.
  - Branches laid over one another left a faint grid of seams; they now add up.
  - The ripple's first rings bent the picture too hard and its far tail roughened text; the bend saturates and the water
    ahead of the waves is still.
  - The first melt stretched into streaks with block artefacts; the even stretch is now an exact layer transform, and
    the drips are narrow and uneven.
