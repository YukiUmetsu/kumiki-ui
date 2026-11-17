# RISO65 — source-native Risograph registration/trapping preflight

**Status:** original editable digital two-ink register study. *No human-hand work.* This is a preflight **displacement budget**, not a guaranteed physical trapping implementation or a calibrated printing simulation.

## Reference / ArtCraft five-axis deconstruction

- University of Illinois, `Registration/Trapping` printer guide: https://web.faa.illinois.edu/app/uploads/sites/6/2021/05/riso_print_guide.pdf — successive separate ink passes can drift; registration crosses and artist-provided expanded trapping can reduce paper-white seams. Independent pressure contours must not be fused for style.
- Fashion Institute of Technology print-preparation guide: https://www.fitnyc.edu/documents/printfx/pfx-guide-riso.pdf — one grayscale master per ink, overprint vs knockout, deliberate trapping and imperfect second-pass registration.
- Ora Labora photographed blue/red real print: https://oralaborastudio.es/risografia/ — separate blue and red fields have independent imperfect edges, and dark optical overprints form where physical ink meets. Study edge displacement and source topology, never copy the illustration.
- Système Sensible print macro: https://www.systemesensible.fr/imprimerie_riso.html — the paper substrate lives *inside* small stencil openings; cannot be simulated by stretching a raster sticker.

**Topological continuity:** Preserve all 20 original cubic source strokes, their parent pressure envelopes, 19 witness marks per master, nine vermilion echoes, hundreds of paper-white winding splinters and the sheet's pores. Registration must translate the **entire completed second plate**, not warp individual source vertices or drop dry-fibre holes.

**Vector flow:** Original cobalt and red strokes own their independent trajectories and pressure distributions. Sampling frame 40 vs 200 changes authored source paths; changing plate offsets does not change any path data or pressure curve.

**Edge specificity:** Watch the narrow vermilion-to-cobalt overprint borders and real native evenodd paper reservations at 1× and 3×. The two passes can misalign in both x and y; avoid generic Gaussian blur, false RGB ghosting or fractional blending of a flattened final image.

**Depth / material:** Original RISO1 SVG compositing preserves separate ink opacity/multiply, the same fixed paper mask and 450 paper fibers + 330 paper pores. A panel isolation control demonstrates each color on paper, not a colorized screenshot.

**Temporal:** The source frame is an absolute 0..239 state; a separate constant offset belongs to the physical paper/master, not to the film's camera or accumulating preview time. Random seeks back to the same frame must be identical.

## Implementation

- `RisoBrushArt.secondPlateRegistration` is an *optional* [-12,12] pixel [x,y] override on the existing second spot master. The default remains exactly [0.65,-0.45] so RISO62/63/64 output is unchanged. This does not reorder passes, resize curves, drop texture, or change screen patterns.
- `evaluateRisoRegistration(spec,variance,trapAllowance)` is a reusable pure RISO1 preflight, using the exact existing `plateRegistration` evaluator. It returns per-plate resolved transforms, all unordered pairwise displacement vectors, worst Euclidean displacement and declared trap allowance excess. Works on two and three spot master films, rejects malformed specs and parameters.
- New `Risograph · Registration Preflight` state under the existing Film Looks/Risograph Storybook folder compares original vs independently offset second master. Aspect, ink isolation, x/y, source frame, seed, paper tooth, 1×/3× and numeric declared trap allowance are keyboard-adjustable. Same detailed original SVG geometry is used on both sides, not duplicated art assets.
- Tests explicitly compare unchanged source path serialization before/after register changes, two/three master budgets and rewind invariance. Chromium samples A/B at 1×/3× in both aspects.

## Important limitations and next priorities

1. This numeric budget is **not actual contour trapping**. It has no geometric adjacency test and it does not expand/choke the original vector silhouettes. An allowance higher than a displacement does not prove the print has no white seams.
2. Independent physical press scans, paper-color calibration, roller marks and actual measured register distribution are absent. Do not claim physical press fidelity or brand-authorized output.
3. Next non-hand priority: construct optional actual, topology-preserving trapping/choke at specifically measured *shared* stencil boundaries; a generic SVG dilation could close dry-brush negative-space fibres and must be rejected.
4. Compare original source-registered 1×/3× Chromium screenshots against photographed authentic print textures, not only unit/CI success. User/artist signoff remains separate.
5. After art approval, consider adding exportable per-master grayscale separations and print margin/bleed validation as separate standalone PRs. No implicit PDF capability or physical production claim here.
