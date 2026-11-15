# RISO23 — actual-render-guided facial ink topology and tonality

Date: 2026-11-15. ArtCraft v9.1 **find → inspect → dissect → specify → construct → render → compare**. Two original figures, maintained at their existing head joints. Never a source-photo likeness claim.

## Real browser baseline and failure analysis

The actual **RISO22 Chromium artifacts**, [Actions run 43736979482](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43736979482), were captured for **both original faces**, neutral/blink/speak/smile, 16:9/9:16, blue-only, red-only. Screenshot names include `landscape-pair-46.png`, `landscape-paper-artist-46.png`, `red-only-faces.png`, and `portrait-pair-46.png`.

Actual rendered observations, not a code-based quality assertion:

1. **Red-only full crop:** Red microplanes around eyes and cheek are discontinuous isolated chips/dashes. The original `eye-iris-grain` and `eye-lower-orbit-engraving` were thinner than a single 6-unit halftone cell. This is spatial sampling, **not a lack of more noise**. Critically, they look like stray freckles and *do not* follow the source print's continuous thin line art.
2. **Blue-only crop:** The two original faces remain identifiable and opaque, with independent lids/hair; there is little *meso-scale cheek/orbit volume* and broad uninked paper dominates. Increasing grain alone would flatten the source character geometry.
3. **Portrait 9:16:** The head profiles are contained, not clipped; the remaining deficiency is intrinsic tonal construction, rather than camera crop or Storybook overflow.
4. The characters are still graphically simple compared with original print references. The present patch tackles the **visible screened sampling defect and missing facial value planes**, not a wholesale portrait likeness or realistic anatomy claim.

## Actual RISO23 rendered rejection and frequency correction

The **first RISO23 live Chromium pass**, [Actions run 43737587182](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43737587182), completed and produced `landscape-pair-46.png` and `red-only-faces.png`. Direct inspection **rejected it visually** even though the browser assertion passed. At `dotCell=6`, the new broad shadow planes resolved as widely separated large vermilion circles, making both original faces look dotted with cartoon freckles. The intended zygomatic/eye socket volume was not readable, and the image looked less cohesive than the previous neutral frame.

**Cause:** Screen pitch relative to head size was still wrong, despite enlarging the physical tonal shapes. Existing global `RisoPrint` masters enforce a 3..36 design-unit cell; a tiny head ~70 design units across cannot hold a fine portrait tonal screen with 6-unit cells. The correct repair is to change actual *print frequency*, not add global blur/noise or simplify the face.

**RISO23 second candidate (under review):** enable carefully bounded **2..36** cell pitch in the same production `inspectRisoPrint` and `createRisoScreenGeometry` paths, and default the isolated two-face Storybook print to `2.0` stage units, with a dedicated `RISO23 screen pitch` comparison slider. This makes ~35 screen cells across the existing source head instead of ~12; AM dots become small enough to convey value fields. The original `RisoPrint` master is still fully deterministic and independently registered for each ink. The lower bound deliberately stops at 2 (to avoid subpixel raster instability); legacy 3..36 values and the other film demos are unaffected.

**Reviewer must compare:** `negative-control-coarse-6-unit-screen.png` to `recovered-fine-2-unit-screen.png`, and inspect the new native neutral and blink full-face screenshots at 1× and enlarged scale. This is a **new actual visual gate**, not an assumption that a lower cell count guarantees artistry.

## Art references, observed print grammar and construction evidence

| Reference | Visible craft fact and feature | New original paths / negative shortcut |
| --- | --- | --- |
| [Fish Guts Press, physical close blue/pink screened eyes](https://fishgutspress.com/collections/frontpage), artist's work, not redistributed | Dot pattern spans broad forehead, eye socket, cheek; the eye's fine line remains legible atop/beside fields of differently colored dots | Two *broad closed orbital planes*, independently drawn per actor and deposited on red `screen` master. Keep tiny engraved red lines solid. Never screen a one-cell sliver |
| [TAROT ZINE, detailed limited-color eye/brow artwork](https://www.behance.net/gallery/96806545/TAROT-ZINE), artist's work, technique study | Distinct changing-width eye contour; directional brow/eye socket linework forms anatomy rather than a random freckle cloud | Preserve the previous independently authored blue eye, canthus and lash wedges; keep short red iris/orbit marks as **continuous solid ink** |
| [*Mabeobsonyeo* Risograph by Little Kumiho](https://koguchipress.com/products/mabeobsonyeo-a3-risograph-print), published artist-owned artwork | Broad contrasting pink/blue wash planes fill forehead, temples, cheeks and jaw; detailed eye linework remains crisp above the tone | Add independent flowing closed **zygomatic** and **jaw** shaded regions, left/right asymmetric; original face remains opaque unprinted paper under the local screens |
| [Rachel Simmons, *Risography Guide*](https://static1.squarespace.com/static/5366d2b1e4b0e241736d8744/t/68418e5258e2d955bdb8b2f1/1749126761265/Risography%2BGuide.pdf), printing/process | Monochrome masters and slight registration misalignment are physical properties of successive ink passes on matte uncoated paper | Use existing independent blue/red `RisoPrint` plate masters and actual dot screens; do not simulate a postprocess full-color blur |

**Rights:** The artworks are independent third-party references for *technique*, not trace targets. The current character identities remain source-authored originals from Kumiki-UI. No copying of geometry/pixels. Individual artist credit/license verification remains a delivery consideration if artworks are ever redistributed (they are not here).

## Five-axis ArtCraft v9 construction contract

| Axis | RISO22 baseline defect | RISO23 authored geometry | Independent validation |
| --- | --- | --- | --- |
| Topology | Sparse stray red islands were *unintended*, and dark-blue eyebrow/eye forms lacked screened regional attachment | Three named **two-sided** paper-reserved facial zone paths per head: `orbital-tone-planes`, `zygomatic-tone-planes`, `jaw-shadow-planing` | Semantic head-local rig, source-contour subpaths, exterior facial edge and triangulation |
| Flow | Red specks had no clear tangents leading from eye to cheek | Orbital mark follows brow arc; cheek shadow tapers along cheek bone, jaw tone follows mandibular curve | Each actor has its own non-mirrored cubic/quadratic paths; no straight rectangular color bars |
| Weight/edge | Very fine marks were screened with 6-unit period, breaking stroke continuity | Narrow `eye-iris-grain` and `eye-lower-orbit-engraving` parts print on the **solid** red spot master, not `screen`; wider tonal planes receive dot screen | Native SVG path fill in red-only plate; negative / dual-plate stress test |
| Rhythm | Global dot texture could not substitute for anatomy and produced arbitrary isolated chips | Three broad unequal screened planes on both sides, variable widths; keep significant unprinted paper between zones | Contours occupy bounded, nonzero areas; measurable dot coverage as separate Storybook control |
| Microtexture | A 4–5-unit iris received at most one sparse `dotCell=6` point | Existing press `RisoPrint` untouched; controlled `screenDensity` and `dotGain` in Storybook preserve physical dot semantics | Chromium images at native output and red/blue separations, with direct reference-crop visual review |

## Component/API safety

- `COURIER` and `PAPER_ARTIST` still use the same original source head, face, lip, eye landmarks, rig and 240-frame film. The old named ArtCraft eye path IDs are retained and their poses remain deterministic; only their narrow red ink deposition mode changes from screen to solid.
- `RISO_COURIER_SHEET` gains six source-bound named subregions; Paper Artist's source sheet maps each of the three new parts.
- Existing **Risograph** Storybook folder is preserved, no extra story group. The two-actor portrait study now exposes `RISO23 screen coverage` as a material control, alongside inks, AM/FM, gain, aspect and four poses.
- New `tests/riso23-anatomical-ink-planes.test.tsx` checks source meshes and print mode; `tests/e2e-storybook/riso21-ocular-print-artcraft.spec.ts` renders actual before/after images and updated plate state in a narrow browser workflow.

## Explicit artistic limitations

No actual authentic print is a source-faithful *character likeness* target; high-resolution aligned crop masks, 18 landmark target measurements, 3/4 face drawing, human-anatomy v9 independent gate and a fully encoded, reviewed 240-frame animated performance remain incomplete. A CI green result proves runtime structure and screenshot availability **only**. If RISO23 renders with obtrusive red regions, obvious spot-dot aliasing, missing faces or detached hatches, it must be revised on the branch before an artistic success claim. Preserve the actual RISO22 screenshots as the pre-revision quality baseline (GitHub Actions retention is seven days).
