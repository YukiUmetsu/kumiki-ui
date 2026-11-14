# WC9 — ArtCraft watercolor illustration director

**Target:** reusable source-authored watercolor animation for Kumiki UI. **Status:** implementation proof, not final artistic acceptance. This follows WC8's three example-specific studies. Read `AGENTS.md`, the [WC8 geometry audit](watercolour-wc8-artcraft-reference-geometry.md), and [watercolor roadmap](../35-material-native-film-styles-implementation-roadmap.md).

## Real visual references inspected for construction, not copying

Reference mode: **style-guided**, not pixel-matched. Use professional source paintings as a visual quality benchmark; do not trace their exact silhouettes, copy reference pixels, commit downloaded art, or claim that public display permits redistribution.

| Source | Actual visible features to study | Gap addressed / remaining |
| --- | --- | --- |
| [Pierre-Joseph Redouté, *Pasture Rose*, Cleveland Museum of Art](https://www.clevelandart.org/art/1959.15) | Rooted bifurcations, directional veining, heterogenous leaf serrations, restrained light/dark on paper | WC8 flower geometry improved; species-grade botanical rig and foliage still missing |
| [Winslow Homer, *Fishing Boats, Key West*, Metropolitan Museum of Art](https://www.metmuseum.org/art/collection/search/11120) | Breaking sail edges, anchored rope lines, distinctly weighted painted water, asymmetric whites | WC8 hull/deck construction improved; real cloth and ocean flow remain stylized |
| [John Singer Sargent, *Santa Maria della Salute*, Brooklyn Museum](https://www.brooklynmuseum.org/objects/20389) | Concentrated structural shadows, clear-edged graphite against blurred washes, deliberate light reserves | WC8 architecture constructed; facade perspective, worn surfaces, heroic depth remain |
| [J. M. W. Turner, *The Lake of Zug*, Metropolitan Museum of Art](https://www.metmuseum.org/art/collection/search/337499) | Luminous soft atmospheric washes punctuated by crisp/dry edges and retained white paper | Existing WM4–WM7 layer/physics; true capillary fibrous structure still not solved |
| [Jennifer Branch, *Great Blue Heron*](https://jenniferbranch.com/j/Paintings/Great-Blue-Heron-painting.html) | Neck anatomical continuity, long thin weight-bearing legs, intricate cool wing feather groups against warm marsh | WC9 original heron art graphed below; contemporary image is **copyrighted** and not distributed |
| [Megan Murrell, conservation illustration](https://meganmurrellart.com/conservation-illustration) | Repeating but non-identical flight feather overlap, positive/negative cattail architecture, bird silhouette and habitat hierarchy | WC9 wing detail and rooted reeds; wetland composition remains less rich |
| [The Met, watercolor technique guide](https://www.metmuseum.org/perspectives/materials-and-techniques-drawing-watercolor) | Wet/dry edge differentiation, drybrush skipping paper troughs, physical scraping/lifting and layered glazes | WC9 preserves material- and line-specific passes rather than blurring full film |
| [Curtis et al., Computer-Generated Watercolor](https://grail.cs.washington.edu/projects/watercolor/paper_small.pdf) | Edge darkening, backruns, granulation and pigment flow are distinct processes | Existing wet-field implementation only approximates physics, not chemical/scale-true simulation |

## ArtCraft v6 workflow used

The user's ArtCraft suite separates reference research, structural study, material study, animation rigging and visual fidelity. Follow **find → inspect → dissect → specify → construct → render → compare → refine**. The scope here is an **original, style-guided illustration** rather than recreation of any specific painting.

**Macro — heron and habitat:** single recognizable pointed-beak waterbird, long arched neck, broad upper back with feather depth, body mass balanced over two long planted limbs, wind-shaped reeds and atmospheric sky. Reserve wide paper-white areas.

**Meso — connected morphology:** `whole-heron → neck-root → S-neck → crown → mandibles/eye`; `shoulder → wing → overlapping feather roots → barbs`; `hip → knee → tarsus → toes`; `reed-root → stalk → side leaves → seeds`. The actual SVG paths share art-space anchors. Parent pivot motion carries its children in transformed space; it never leaves them independently floating.

**Micro — characteristic surface:** crown cap, iris/pupil/eyebrow, upper and lower mandibles, multiple neck hackles, nine curved feather shapes, thirteen interior barbs, back plumage, toe knuckles, individual reed grains, sparse water flow. These are *source-authored structures*, not seeded speckles standing in for anatomy. Drybrush, line and broad wash render separately.

### Scene structure

- **Production-ready reusable primitive:** `registry/video/watercolour-illustration.tsx`, `WatercolourIllustration`, `WatercolourArtwork`, `WatercolourArtPart`, `inspectWatercolourArtwork`, `watercolourArtPoseAt`.
- **Example, not engine code:** `src/video/watercolour-art-director-demo.ts`, a custom original wetland painting. The renderer accepts arbitrary authors' curved paths, brushes, nesting, colors, motion pivots, keyframes, framing, paper, and pigments, subject to bounds and safe SVG path syntax.
- **Film/export:** `watercolour-illustration` slot in `src/film/film-slots.tsx`; one portable 12-second film with native 960×540 or 540×960 output. No mutable random state, wall-time dependency or imported image pixels.
- **Storybook:** `Video Production → Film Looks → Watercolour & Brush → 05 Illustration Director`, alongside 01 Brush, 02 Characters, 03 Pigment, 04 Master Craft. Switch aspect, seed and paper, play/seek/reduced motion and apply validated JSON.
- **Tests:** deterministic shuffled seeks, object part hierarchy, connected anatomy, reference manifest, invalid SVG and key handling, both film ratios and production slot.

### Explicit negative controls

Reject: oval body with stick legs and dot-only eye; detached head/neck or wing; equally spaced identical feather blobs; reed pieces not rooted to stalk; uniform polygon sea and vector-like flat background; a single full-frame watercolor noise filter; forced alpha transparency that reveals background through anatomy; unlicensed reference art embedded as texture.

### Art and quality acceptance still required

1. Capture the actual Storybook screenshot and fully encoded film, in **both ratios**, at frame 0/135/265/359; view at 100% and enlarged anatomical crop. Technical tests do not certify the art.
2. ArtCraft five-axis reference-relative semantic-masked measurements for rooted topology, curved flow, feather-width rhythm, mark weighting and subpixel texture; original reference crops and independently traced masks are required. **Not measured here**, and no invented scores.
3. Correct bird neck/shoulder articulation under motion; tie foreground toes to water contact; improve plume anatomy, precise wing overlap, species-accurate shape, reeds, shoreline variation and strong focal value hierarchy.
4. Add separate botanical, human, urban/architecture, underwater and fantasy *user-authored art* studies to exercise the generic API. One bird demo does not prove every art category.
5. Benchmark dense art at 1080p/4K, profile SVG filter and pigment transport performance, render full normal-speed dual-ratio film, collect independent artist review, and preserve reference provenance.

**Implementation PR may be merged after relevant technical checks and reviewed screenshots pass as a bounded milestone. Professional watercolor equivalence remains an independent, open goal.**
