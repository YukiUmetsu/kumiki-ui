# Crayon / ArtCraft 9.1: F1 photographed orbit and brow — third source-pass

**Status: independent visual REJECT; research-only PR #281.** Do not publish character as authentic crayon portrait from CI alone. This note builds upon `crayon-artcraft-f1-eye-source-study-2026-11-15.md`; it does not replace or invalidate the F1 identity lock.

## Real source / rights / mark grammar

**Portrait structural reference:** [Christopher Campbell, 2015, CC0](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). The verified 608×1082 native source screenshot is extracted from the real browser comparison artifact in GitHub Actions `43682633614`; source SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. Source photo itself is a reference to *projected anatomy and color/value*, not permission to flatten photo pixels into a character's surface.

**Wax process references (the distinction matters):**
- [Philadelphia Museum of Art, *Guidelines for Descriptive Terminology for Works of Art on Paper*](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf): wax deposits are viscous, clump, pick up at stroke ends and catch paper tooth. Reference uses: broken side-nib fiber contacts, local accumulation, no mathematically perfect vector arcs.
- [*A Complete and Comprehensive Treatise on the Art of Crayon Portraiture in Black and White*](https://upload.wikimedia.org/wikipedia/commons/0/0f/A_complete_and_comprehensive_treatise_on_the_art_of_crayon_portraiture_in_black_and_white_%28IA_completecomprehe00croc_0%29.pdf): shadow upper iris more than bottom; the lower lid is a color transition and anatomical shadow, **not a dark outline**; blend eye-brow values outward into forehead. Historic black-and-white 'crayon' is a different tool than modern wax crayon: useful topology principle only; never assume chemical sameness.

## Source observation at actual image scale

Two exact source-space crops were independently inspected:

| Region (608×1082 source px) | Observed source anatomy | Rejected previous native mark | Current construction |
| --- | --- | --- | --- |
| Near orbit, x185–346, y450–603 | temporal eyelid shadow rises from lateral x208/y545 to heavy upper tarsal fat around x262/y510; transitions into brow, not a perfect ellipse | faded pink face, fairly flat cheek, uniform airbrushed strip | `socket-near` (irregular deep cast), `eye-orbital-undercut-near` (open pressure-glazed attached shadow) |
| Far orbit, x386–488, y422–573 | three-quarter eye shorter; eyelid vanishes under brown hair at x470; brow extends to edge | round separate far eye with very light forehead around | `socket-far` and attached `eye-orbital-undercut-far`, far brow anchor preserved |
| Near brow root, x200–325/y463–496 | broad dark hair-root mass with many overlapping short hairs, some descending at inner end | five rigid long, almost parallel painted eyebrow arcs | curved rooted `brow-superciliary-near` open wax, 5 independent groups containing 14 short source-flow cubic contacts, each with dry-wax paper-height response |
| Far brow root, x393–474/y433–468 | short slanted ridge with outer hairs partly obscured by side curtain | three identical fine concentric arch strokes | three authored groups containing seven nonuniform cubic fiber contacts |
| Near lower lid, x210–322/y546–592 | warm reddish-brown shadow is broad under iris but resolves to soft skin at cheekbone | weak smooth pink line: too small local contrast | photo-aligned `lower-lid-near` and `lower-lid-margin-near` deeper value on open grain-catching wax glazes |
| Near/far lashes | small tapered lashes *flow with upper eye contour*; no uniform repeated vertical sticks | 10 near/5 far upright digital spikes, even gaps | ten near and five far hand-authored cubic, shorter and more angled, same native dry-wax contact plus terminal pickup |

The number of fibers is not an artistic success metric. Brow fiber grouping and lash roots are authored independently from the photograph (not copied pixels); changing geometry beyond observed shapes risks another generic face.

## Construction graph and release gates

- Both sockets are paint children of `face-outline` and parent-clipped with open coverage; their undercuts must render **before** the sclera, iris and upper lid. No disconnected ellipse or source-unseen vector eye lines.
- Hair curtain remains in front of the far eyebrow/iris. Full face source landmarks remain exactly the same immutable 18 F1 points; no unrelated B1 source identity is introduced.
- Eight brow mark IDs still support existing animation and scene clients; all have multi-subpath source-guided cubic dry-wax geometry. Material deliberately preserves within-fiber rough paper contact and pen-lift: **do not** replace these with plain smooth SVG `strokeLinecap` lines.
- Test/QA: `tests/crayon-artcraft-cc0-full-face.test.tsx` asserts bilateral undercut parent/topology/paint order, grain-built brows and immutable source anatomy; `tests/e2e-artcraft/crayon-adult-face.spec.ts` emits real Chromium F1 near/far 2.95×/3× macros and 608×1082 full portrait.
- After real render: directly compare brow anatomy, lash curvature, connected dark sockets and lower-lid contrast to the *source screenshot* at 1× and 3×; run ArtCraft strict portrait/eye crop gate; verify the rest of face and both hair curtains did not regress. A technical success and a partly better SSIM cannot override ugly facial anatomy.
- **Known failures before this pass:** actual native F1 full face still visibly two-dimensional and too light; nose and cheeks are flat; mouth is featureless and cheeks/neck do not meet observed portrait geometry; eyebrows are long arches; lashes are regular dark ticks; dark brown irises remain too circular and smooth for hand-waxed detail. **No claim these are solved without fresh screenshot review.**

## Native V4 pixel review: rejected, source-led V5 correction

GitHub Actions `43744068474` rendered the actual **608×1082** CC0 F1 face and zoomed native near-eye macro from source-aligned cameras after the first orbital-darkening/eyebrow reconstruction. Inspecting the real PNG (not guessing from source code) exposed a new **artistic regression**: the F1 eye socket looked like a **hard-edged purple pentagonal sticker** on otherwise pale skin, with **brick-like dark wax stripes** masquerading as hair in the upper eyebrow. The shortened lashes remained too regularly separated and detached from realistic lash roots. This pass **must not be approved**, even though it increased local contrast. Source F1 has smoothly feathered tarsal depth, irregular hair roots and darker iris upper occlusion — no polygon patch edge.

The second, corrective **V5** geometry keeps every original F1 anatomical path, the new localized undercut layer, and all micro-hair subpaths. It **reduces only their pressure/strength and increases the wax feathering radius** to restore an attached skin transition; brow fibers become 0.25-ink-width opt-in broken wax deposits at pressure 0.48 instead of the thick 0.48-width/0.68-pressure segment bricks. The 10 near / 5 far lashes likewise shrink to 0.24 ink width at pressure 0.56/0.53. This is a correction of a verified artifact, not fewer source details or a shader-only workaround. Regression tests assert the real native failure modes (broad non-opaque feather, narrow tactile brows and restrained stylus pressure).

V5 remains **unverified until its real Chromium PNG is inspected**. In either case the full portrait, jaw and neck shape, nose and mouth value planes still fail ArtCraft's human artistic release gate.

**Release decision:** DRAFT / `!dev` / do not merge until source-relative artist acceptance, human anatomical gate, visual wax-medium craft review, and normal-speed animated playback inspection. Next after this focused orbit change: source-accurate nose/cheek dark-to-light transitions and connected jaw/neck construction; cross-sample crayon wax strokes.
