# WC18 — Watercolor portraits must use the real painting engines

**Audit result: FAIL for WC11–WC17 portraits.** The user's criticism was correct: the earlier rejected human faces were drawn primarily using `WatercolourIllustration` paths with `technique="wash"`, `edgeSoftness`, seeded filters, opacity and SVG gradient fills. Their apparent watercolor material was simulated postprocessed geometry, **not pressure/brush-deposited watercolor**. The deleted WC17 experimental face also used standalone paths with gradient wash options. No authentic WM1 brush surface or full WM4 subject-wet-pigment pass was part of those faces.

Do **not** claim an illustration is watercolor-painted merely because a `WatercolourArtPart` has `technique:"wash"` or a `feTurbulence` filter. Drybrush flags/filters on ordinary paths likewise do not prove brush-pressure construction.

## Real, existing library capabilities

| Subsystem | Actual executable source | Real medium behavior | Earlier face implementation |
| --- | --- | --- | --- |
| **WM1 pressure brush** | `registry/video/watercolour-brush.ts`, `watercolour-brush-react.tsx` | Timed contact points, pressure, hand speed, varied width, deposit/ribbon generation, pigment load, water, bristle gaps, paper tooth, diffusion, absorption, stable dry hold | **Not used** |
| **WM4 wet paint** | `registry/video/watercolour-wet-paper.ts`, `watercolour-wet-paper-react.tsx` | Pressure-guided pigment drops, finite-grid mobile pigment, sediment, paper wetness, edge pooling, reserves, subject paint masks and drying | **Not used** |
| **Static SVG art / illusion wash** | `registry/video/watercolour-illustration.tsx` | SVG path gradients, pigment opacity, edge pooling filter, granulation displacement and optional wet-paper overlay | **Used**, but insufficient to establish actual brushwork |
| **WM5 masked pigment** | `src/video/watercolour-master-studies.tsx` | Artist-painted source-space masks, measured pressure-guided physical pigment | Available and used for non-human subjects; not on the rejected faces |

## Corrective code: required portrait-specific production boundary

`src/video/watercolour-portrait-paint-contract.tsx` defines a **medium-native future portrait**. It renders exactly the real `WatercolourSurface` (WM1) and `WatercolourWetPaper` (WM4), not substitute SVG filters. Its validator rejects all of the following:

1. Missing WM1 brush or WM4 wet-pigment spec, or WM1 medium `ink` rather than `watercolour`.
2. Inconsistent paper dimensions, paper color, tooth or seed.
3. Missing actual water transport, pigment granulation, edge pooling or reserved paper paths.
4. Any of seven semantic regions missing: face volume, near eye, far eye, nose, mouth, hair, neck/garment.
5. Fewer than **two individually authored WM1 pressure gestures per region** or one actual WM4 deposition path per region; flat pressure and duplicate/orphan gestures are rejected.
6. Brush control points or wet deposit paths outside their explicitly authored anatomy polygon.
7. WM4 pigment area polygons differing from the same seven anatomical areas used to clip the WM1 brush ribbons.
8. No distinct wet/high-water and broken/dry-bristle mark families.
9. Attempting to render the invalid spec at all (fail before SVG render).

The renderer clips both WM1 brush marks and WM4 sediment to the **same anatomy mask**. Deposits still diffuse within the subject and drying edges still pool; this avoids the prior generic full-face texture and keeps foreground paper visibly untouched where no gesture occurred.

These are *structural, material-native requirements*, not artist approval. The synthetic seven-strip fixture in `tests/watercolour-portrait-paint-contract.test.tsx` exists **only to test the engine and misuse cases**, not to showcase a human face. The old rejected characters remain absent from Storybook and all production film slots. There is deliberately no generated new human character in this PR.

## What these changes do and do not guarantee

**Guaranteed by code/tests:** actual WM1/WM4 components are invoked, native brush pressures vary, pigment has wet/drying transport, proper paper reserves and subject topology, deterministic frame response, no fallback path-only fake portraits.

**NOT guaranteed:** realistic likeness, eye anatomy, absence of uncanny features, correct brush paint appearance at 300% crop, soft/lost watercolor edges around individual facial volumes, color harmonies, or visually acceptable original human faces. A strict technical substrate is necessary but not sufficient. The recent deleted WC17 face was visually rejected even though structural tests passed.

## Full artistic acceptance (blocked)

Before the next face is promoted to Storybook, require the [WC17 strict acceptance dossier](wc17-watercolour-face-strict-acceptance.md), including an authorized pose/anatomy reference, source-to-code semantic landmarks, seven close-up original render crops and independently reviewed material fidelity. Compare real brush direction, pressure taper, pigment density, capillary bleed, paper reserves and local watercolor edges against the reference techniques. No release on generic texture similarity or TypeScript pass alone.

**Acceptance criterion:** a new face uses WM1 and WM4 **and** visually resembles high-quality original watercolor painting at natural size and in enlarged native-pixel facial crops. Both are mandatory, and the latter is currently unsatisfied.
