# Crayon ArtCraft F1 — V65 dark oral cavity and tactile vermilion

**Status:** opt-in `!dev` hypothesis; ART HOLD; not approved for release.

## Source and medium references

- Anatomy reference: Christopher Campbell, CC0 1.0, frozen 608×1082 browser capture, SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. It is a source screenshot, not the original camera JPEG.
- Style references remain the local user-provided `crayon_reference_study/face.png`, `adults.png`, `fabric.png` and `expression.png`, documented in [the reference-led portrait study](crayon-artcraft-reference-led-portrait-2026.md). They are not copied into the repository.
- Medium evidence: [Philadelphia Museum of Art, *Descriptive Terminology for Works of Art on Paper*, Fig. 49](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf); [Stockmar, *Wax Crayons: Techniques and Tips*](https://www.stockmar.de/dk/service/brochurer/?cid=1367&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_techniques-and-tips_work-material_EN.pdf); and [Rudolf, Mould & Neufeld, *A Bidirectional Deposition Model of Wax Crayons*](https://doi.org/10.1111/j.1467-8659.2005.00826.x). The renderer remains an authored wax approximation, not a physical deposition-state solver. See [the real-stroke reference study](crayon-real-stroke-reference-study-2026-11-15.md).

## V64 exact-head rejection

The native 1×/3× review from [PR browser proof run 44227119216](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44227119216), artifact [14393184858](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44227119216/artifacts/14393184858), exposed a measurable local defect. The source mouth has a dark central cavity with a connected, low-contrast enamel glimpse. V64 narrowed the aperture and reduced bright enamel, but the 3× capture still showed a pale central arch, almost no dark cavity, and overly smooth vermilion.

The exact native ROI was `[385,725,70,25]` on the same 608×1082 canvas:

| Image | Dark pixels (luminance <65) | Bright neutral pixels (luminance >175, chroma <70) |
| --- | ---: | ---: |
| Frozen source | 293 | 0 |
| V63 baseline | 6 | 264 |
| V64 candidate | 0 | 176 |

V64's bright-enamel reduction was real, but its dark cavity was worse than V63. The native test correctly failed at the dark-pixel assertion; the threshold was not relaxed. The V64 screenshot SHA-256 was `f518a5508ed62869c84b012e662d58d4e6796a162cf5cb189416966c556f2e46`.

## V65 construction

V65 is a reversible continuation of V64. It changes only existing oral wax nodes:

- Reverses the cavity's underpaint value hierarchy: a deep claret center, a warmer lifted rim, high-pressure opaque stroke-built deposit, retained paper tooth and a narrow feathered contact edge.
- Reduces the connected enamel underlayer from a broad pale band to a thinner source-following arch.
- Lowers the tooth planes' value without removing their individual shapes or the connected underlayer.
- Reduces excessive lip blur so upper/lower vermilion edges retain visible wax contact.
- Strengthens the lower-lip directional ribs with varied curved passes rather than adding unrelated speckle.

The aperture path itself, its parent clipping, source camera, paper, seed, timing, eye/nose/hair geometry and all non-mouth elements remain unchanged. V63 and V64 remain explicit native negative controls.

## Native acceptance protocol

The PR workflow retains the independent V63 baseline proof; the V65 source-native A/B test compares V64 and V65 on the same commit, source, 608×1082 canvas and frame 299, with 3× mouth inspections and a V60 SHA-bound sidecar for V65. Acceptance requires:

- V65 dark-pixel count to exceed V64 by more than 10 pixels in the fixed mouth ROI; the independent V63 baseline remains recorded above.
- V65 bright-neutral pixels not to exceed V64.
- Eye, nose and hair control regions to remain pixel-identical between V64 and V65.
- The 3× mouth crop to retain the narrow oblique aperture, connected enamel and textured vermilion without a sticker-like edge.

These are local regression gates, not a portrait-fidelity score.

## ArtCraft v9.1 release gates still open

The V60 worksheet is provenance only: the V65 native candidate begins at **0/18 independently observed landmarks**. The ArtCraft v9.1 human-anatomy gate also requires independently annotated semantic masks and matched-view anatomy evidence; those are not yet supplied. Full 300-frame normal-speed review and independent artist approval are pending. The full portrait still has larger face-plane, nose and hair-form defects outside this mouth-only iteration.

**ART HOLD. No merge or release approval.**
