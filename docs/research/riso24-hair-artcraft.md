# RISO24 — hair craftsmanship from actual RISO23 render rejection

**Status:** Source-authored candidate. Technical tests and browser screenshots are necessary, not sufficient for ArtCraft v9.1 independent artist acceptance.

## ArtCraft workflow and observed baseline

Used the actual ArtCraft 9.1 root and companion instructions (`art-reference-research`, `art-reference-structural-study`, `art-human-anatomy`, `art-2d-character-craft`, `art-material-study`, `art-fidelity-review`). The goal is **one real high-impact structural region**: the hair/crown on both original animated people.

**Current rendered reference:** Actual [RISO23 Chromium run 43738441409](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43738441409), particularly `landscape-pair-46.png`, `landscape-paper-artist-46.png`, and blue/red plate isolates. We inspected those **actual** PNGs at full size. The Paper Artist bob still reads as a broad smooth blue helmet with a few tiny flecks; its inner locks do not turn from scalp to temple. Courier's hat reads as one near-black overprint mass over the face with scarcely any visible directional hair/cap construction. The improved red face-plane halftone must not be mistaken for hair structure.

The existing subjects, face expressions and 240-frame rig are canonical **character identity** source. External printed artwork is **technique evidence**, never a source for tracing a person's exact face or hairstyle.

## First-hand craft reference observations

| Technique artwork, original ownership | Macro / meso / micro observations | Source-derived original implementation |
| --- | --- | --- |
| [Sarah Camilla Pekarčíková, *Jaroslav Filip* Riso portrait, Risoto](https://www.risoto.shop/products/jaroslav-filip) | Dense printable hair mass broken by organic unprinted paper strands, sweeping crown tangents, varied-width etched locks; fluorescent ink does not become a smooth digital radial gradient. | Courier: four distinct named semantic scalp/brim plate features; **5** carved crown ribbons, **2** carved welt reserves, **6** new crown engravings and **3** brim contours; actual knockout masks break red/blue overprint. |
| [Matt Sinclair, *Risograph Portraits*](https://manyformatt.com/risograph-portraits) | Dark roots converge into curls with asymmetric length/pressure, thin directional drawing above broad warm tonal masses; neither uniform parallel hair bands nor Gaussian blur. | Paper Artist: separate rooted crown flow, bob side direction, forward fringe root shadows and screened *broad* side depth; independent nonmirrored paths. |
| [Risograph portrait print, Angela Giarratana A4 listing](https://www.etsy.com/au/listing/1792373016/angela-giarratana-smosh-starkid-a4), creator unverified | Bob/ponytail hair sweeps scalp→temple→neck, varied micro linework is weighted along the silhouette; only a few bright interior strands define whole locks. | Artist's bob receives 3 cut-paper crown paths, 4 unequal side channels, 7 crown red ink ribbons, 6 descending side red ink ribbons and 5 forehead-fringe roots. |
| [Raphael Soyer, *Self-Portrait*, National Gallery of Art](https://www.nga.gov/artworks/10477-self-portrait) (lithograph, **not** Risograph) | Dense lithographic black lines can suggest volume at head/ear/neck; light is defined by structured clean paper gaps rather than missing anatomy. | Existing source contour remains unchanged; use true paper-negative channels inside authored hair, not white opaque sticker layers or transparent ink. |

Rights: Every external image is owned/controlled by its respective creator or holder; observed for style only, **not bundled** in repository. The original code paths below do not trace any depicted person. See [reference-study](riso24-hair-reference-study.json) and [character-source hierarchy](riso24-hair-character-structure.json).

## Five-axis construction lock

| ArtCraft axis | Baseline issue from real screenshot | RISO24 original geometry | Negative controls |
| --- | --- | --- | --- |
| **Topological continuity** | Solid blue/red cap and bob volumes had no separate interior flow | Negative-paper feature must carve **earlier spot ink** and be followed by physical red/blue engraving; every part belongs to the same head joint and source silhouette | Floating white stickers, global alpha haze, changing canonical outer hair silhouette, removing the original forehead |
| **Vector flow** | Dots implied grain but not the direction a hair lock grows | Crown sweeps from roots along curved skull arcs; side bob descends toward nape; asymmetrical strands taper at turns | Repeated mirrored spikes, vertical bars, geometric evenly spaced stripes |
| **Weight / edge** | The cap is near-black without readable depth and bob is cobalt-flat | Broad source solid hair mass retained, *reserved paper cutouts* create light, red fine closed ribbons create fiber, narrow blue brim engravings preserve contour stress | Full-color RGB highlights, overdrawn uniform-width hair ribs |
| **Rhythm** | Micro flecks appear arbitrary rather than grouped tufts | Every cluster has intentional 2–7 tapered strands; staggered lengths, split direction at fringe, leave unequal paper intervals | Grid noise, identical parallel polylines, uniform scallops |
| **Medium microtexture** | Grain already exists but does not rescue giant masses | Continue real 2-unit AM/FM physical plate halftone on the two broad temples; **solid** red ink on thin individual engravings to avoid sampled dot breakup | FeGaussianBlur, full-frame vector hatch overlay, transparent body |

The **original 2D head material** is deliberately preserved; this is not a new 3/4 geometry or face likeness project. There are no new bones and no invented source/photo landmarks.

### Paper carving correctness

`RisoCharacterInk` already contains a physical per-plate *source-part clearance mask*: `knockoutOnly:true` subtracts the corresponding local path from all **earlier** spot ink, while new paths painted **after** the clearance can re-ink the paper. RISO24 uses that existing production API rather than an illustration-only SVG fill. Hair components are ordered as:

- Courier: original hair/face/cap → `cap-paper-ribbons` / `cap-brim-paper-welt` paper carve → `cap-crown-engraving` / `cap-brim-engraving`.
- Paper Artist: original hair-back, face, iris, lips, hair-fringe → `hair-paper-crown` / `hair-paper-side` paper carve → `hair-crown-engravings` / `hair-side-engravings` / `hair-fringe-root-ink` / red screened temple shadows.

Because the knockout contour uses original `head` matrices, there are no freely positioned moving stickers and no anchor drift as the head turns or blinks. The face's previous opaque paper clearance is untouched, the original silhouettes/expressions are unchanged, and every ink survives isolated blue/red printing.

## First real RISO24 render → rejected → second crafted iteration

Actual head/face/hair PNGs were produced in [Chromium run 43739673937](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43739673937) (`riso24-landscape-paper-artist-46-engraved.png`, `riso24-landscape-paper-artist-46-legacy.png`, `riso24-landscape-courier-46-engraved.png`, `riso24-full-face-stress.png`). The first candidate clearly differed from baseline but **was not visually accepted**.

- **Artist bob failure:** Three broad white/pink crown arcs overlapped very wide black/red strokes and made the front scalp resemble an ornamental striped helmet; this is too repetitive and large relative to the painted hair mass. Vertical red engravings ran beyond the cobalt silhouette at the temples, so they read as detached ink bleed rather than strands.
- **Courier cap failure:** Overlarge, high-contrast white slashes produced a striped hat-like decoration instead of the reference works' hierarchical, tapering hair/crown flow.
- **Cause:** The paper-channel path offsets and red root engraving ribbons were wider than their parent scalp locks, and the side strip was too close to the outer silhouette. Adding more noise or changing the film material would not repair the topology.

**Second candidate repairs:** Narrow all three crown paper channels and their seven red companion ribbons; shift side engravings inward toward existing blue side hair; reduce scalp-temple screened outside bleed; thin the Courier white cap reserves and six red path wedges. Preserve the *same exact subpath counts*, actual knockout ink order and original source face/cap/bob silhouette. The next real Chromium pass must compare equal-view legacy/engraved screenshots to verify cleaner, rooted flow. Passing source tests alone cannot certify this correction.

## Storybook and evidence gates

No new Storybook folder or page. The existing **Video production / Film Looks / Risograph / OcularPrintCraft** story gains:

- **Crop:** whole source head, source-bound hair close-up, source-bound eye close-up.
- **Hair drawing:** RISO24 engraved candidate vs legacy original hair (remove only new ink/knockout parts; preserve the original rig and film frames).
- Existing controls: 16:9 / 9:16, neutral/blink/speak/smile, AM/FM, pitch, coverage, dot gain and blue/red/both plate isolation.

Source-mesh and print-mask tests: `tests/riso24-hair-craft-artcraft.test.tsx`. Actual Chromium screenshots and strict before/after pixel inequality: `tests/e2e-storybook/riso21-ocular-print-artcraft.spec.ts`; targeted CI is triggered by current Risograph file changes.

**Must inspect actual output:** start with hair-closeup baseline/candidate for Courier and Paper Artist at pose 46, then blink 78 and smile 198, in landscape and portrait. Compare at 1× and 3× for *crown direction, paper channel topology, cheek/forehead contamination, ink overprint amount and silhouette readability*. Reject if the blue cap or bob remains undifferentiated, if bright gouges cross the face, if engraving does not root inside hair, or if red shadow patches obscure eyes.

**Still blocked:** No rights-cleared person-specific reference face for independently measured 18-landmark anatomy, true profile/three-quarter source, v9 portrait-fidelity proof, source-aligned image masks or approved normal-speed 240-frame video. A new screenshot and passing unit tests cannot claim professional likeness or finished anime/art direction.
