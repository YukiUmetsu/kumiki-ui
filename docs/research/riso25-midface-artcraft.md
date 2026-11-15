# RISO25 — original 2-ink ear, nose and speaking-mouth anatomy

**ArtCraft v9.1 source → geometry candidate.** The artifact, not the component count, determines visual acceptance. **Human-fidelity/source-image gate: NOT passed.**

## First-hand baseline

The [RISO24 screenshot artifact](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43740607065) and the previous [before/after comparison](https://github.com/YukiUmetsu/kumiki-ui/pull/403) show two retained original front-view character identities. Hair gained directional strands, but facial anatomy is still simplified. Courier’s ear is an isolated cobalt C-ring without a readable internal helix/tragus/concha. Paper Artist's blue bob occludes most of her ear. Nose and mouth landmarks are present; nasal alar relief, commissure-to-cheek lines and moving lip plane contours need more coherent anatomy and printed weight. Adding generic halftone noise would not fix these geometric gaps.

### Authentic reference/image observations

| Source | Structure observed | Constrained design decision |
| --- | --- | --- |
| [Risograph-printed Angela Giarratana portrait](https://www.etsy.com/au/listing/1792373016/angela-giarratana-smosh-starkid-a4) | Helix, antihelix, dark concha and lobule form an *attached ear*, and nasal tip, alar contour, mouth borders have different weights. Side view is **reference technique only**, not a source to fabricate our characters' missing profile. | Redraw an original front-view ear shell and add its three interior structures + lobule contour. |
| [*Screenprints 2014*, eyes, nose and lips](https://www.behance.net/gallery/21866489/Screenprints-2014) | Curved, locally concentrated stroke groups make nose bridge, nostril underside and lip transition independently readable in dense tone. The source is **screenprint, not Risograph**. | Keep tiny nasal and lip engravings **solid on individual Riso plate** rather than screen-sampling them. |
| [Fish Guts Press, Risograph eye print close-up](https://fishgutspress.com/collections/frontpage) | Two registered blue/pink inks create grainy face planes while eyelid contour is distinct from the screen and does not dissolve into freckles. | Preserve the finished RISO21 ocular source; add anatomy *between* eyes and mouth without another global texture. |
| [Sonny Ross interview](https://inkygoodness.com/features/interview-sonny-ross/) and [Risolana process](https://www.risolana.org/printing) | Limited inks require considered separation and separate physical masters, not smooth multicolor overlays. | Remain in original blue/red physical masters, preserving paper opacity, original color/registration and existing hair. |

The artworks and photos are **third-party technical references only**, not bundled, traced, recolored or redistributed. No portrait identity is inferred. See structured [reference observations](riso25-midface-reference-study.json), including rights notes.

## Face feature measurements and five-axis source lock

Canonical stage space is the source's existing **2D head-joint local frame**, not a conjectured 3D scan. Courier: frontal face spans roughly x=-33…36, y=-60…36; ear shell at x≈-42…-30, nose base around x≈8,y≈7, mouth center near (0,18). Artist: face spans x=-34…34, y=-57…31; smaller hair-occluded ear at x≈-39…-28, mouth center near (0,16). These are descriptive coordinates from the original authored source, **not anatomical population percentiles**.

| Axis | Source flaw | New source-authored geometry | Required negative check |
| --- | --- | --- | --- |
| **Topology** | Ear was an unarticulated C; nostril/cheek/mouth lacked linked subplanes. | Rewrite `ear-left` to a more continuous outer bowl with existing cheek root; independently draw `ear-helix-fold`, `ear-concha-pocket`, `ear-tragus-root` and `ear-lobule-seam`. Nasal bridge → ala → nasolabial lines → upper lip and labiomental line remain separate but locally adjacent. | No floating concha, nostril detached from nose, lobe below jaw or cheek outside original face. |
| **Tangent flow** | Small red freckles do not convey bony/muscular transition. | Curved nasal sidewall lines roll toward nostril, two asymmetric mouth-corner folds curve along the cheek; lower lip catches jaw motion. | No parallel linear cheek bars or duplicated/mirrored Courier face onto Artist. |
| **Weight/edge** | Narrow source marks were previously lost to halftone cell granularity. | All new sub-2-unit engravings are single `solid` path on physical blue/red masters. Wider existing RISO23 tonal planes remain screened. | No sampled pixel islands replacing concha/nose/lip contours. |
| **Rhythm** | Symmetric face spots and C-shaped loop look mechanical. | Distinct left/right cheek folds; upper Cupid's bow with unequal curved crests; smaller/buried Artist ear vs exposed Courier ear. | No repeated circular ear shell or procedural dotted necklace. |
| **Microtexture** | Texture cannot solve missing form. | Preserve native paper-tooth and `RisoPrint` AM/FM, two-ink dot gain, independent registration; no shader changes. | No filters, extra RGB ink, increased spot grain or airbrush. |

### Rig and print depth

Every new subpart is authored in `head` source coordinates and maps to an existing or newly registered `RisoCharacterMeshSheet` region. Original hair, eyelids, nose tip, mouth source path and their movie time keys remain intact, except **`ear-left` is deliberately remastered**; the old `ear-left` source path is preserved *only for reversible Storybook comparison*. New `upper-lip-engraving`, `nasolabial-flow` and `labiomental-crease` have matching neutral/speak/smile source subpath counts. Blink reuses correct neutral midface; source eye glyphs blink independently. Neither character gains any new bone, synthetic texture pass, or invented 3/4 view.

**One existing Storybook folder/page:** `Video production / Film Looks / Risograph / OcularPrintCraft`, now labeled RISO25; with original RISO24 hair material settings, `Ear / concha` and `Nose, cheek and mouth` source-cropped feature focuses, and a separate `RISO25 facial craft comparison` drop-down. Side-by-side 16:9 and 9:16, 4 poses, real ink separations, source-bound before/after. Existing story ID is stable.

## Independent technical/visual release plan

- `tests/riso25-midface-artcraft.test.tsx`: valid source spec/mesh, 9 semantic parts per actor, ear extent, face-region containment, two ink masters, 46/78/160/198 frame continuity, mouth expression redrawing and deterministic seek.
- Targeted real Chromium proof: `tests/e2e-storybook/riso21-ocular-print-artcraft.spec.ts` captures original-vs-RISO25 *at identical pose/camera/plate parameters* for ear and midface in both aspect families, verifies that actual pixels differ and that red-only/blue-only marks respect separate press masters. Proof artifacts must be visually inspected, not merely uploaded.
- **Visual reviewer reject if** the ear looks like extra decoration pasted onto a C-shell; if Artist concha is visible outside her hair, nose/right wing grows an isolated blob, mouth black engraving resembles a mustache, or existing facial expression loses identity. Refine actual SVG source and rerun the same browser crop.

**Not claimed:** source-identity likeness, full front+profile+3/4 anatomical correctness, v9 human anatomy proof (`human_anatomy_fidelity_gate.py` needs rights-cleared independently annotated matching reference images), rigorous 1×/3× per-source pixel SSIM, and independently critiqued normal-speed 240-frame film.
