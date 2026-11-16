# ArtCraft F1 V22 — nasal wing / underplane joined native wax (2026-11-15)

**UNAPPROVED RESEARCH. PR #281 MUST REMAIN DRAFT.**

## Reference and deconstruction
- Actual CC0 original: Christopher Campbell, [Brunette woman portrait](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), source screenshot 608×1082, SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`; reviewed x340..493/y570..684, near/far cavities around x388..423 and x449..462. The source has a hooked, asymmetrical near naris and compressed far slit under projected cartilage.
- V21b exact native Chromium [run 43806659801](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43806659801), screenshot artifact **14199345079**, **ARTISTIC REJECT** on independent 1×/3× inspection: two floating dark stamps, weak columellar underplane and planar skin.
- Wax study: [Stockmar](https://www.stockmar.de/en/service/publications/?cid=1237&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_getting-started_EN.pdf) and [Philadelphia Museum of Art wax terms](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf) p.44. Original procedural wax construction; no copied raster texture.

| Axis | V22 construction | Required visual sign-off |
|---|---|---|
| Topology | Existing near/far wings, sidewall, subalar root and tip-underlight; **zero new nodes**; cavities/roof unchanged | Separate dark nostril stickers no longer visible |
| Flow | Oblique nose bridge at 35°, near alar 21°, far wing 64°; short wax nibs | Follows asymmetrical cartilaginous curve |
| Edge | Open feathered pigment; stronger underplane value localized to x378..454/y624..661 | Gradual skin-to-air shadow without pale decal |
| Pressure/rhythm | Source-aligned unequal wing dimensions and pressure values | No mirror duplication or uniform digital hatching |
| Texture | Inherited paper height and wax deposition with tapered dry tips, not photo filter | Realistic raised wax pickup at 1×/3× |

## Integration / gates
- `src/video/crayon-artcraft-f1-photometric-nose.ts` is an opt-in `source-nasal-value` built **after** V21b, retains previous variants as exact negative controls, 300-frame timeline, figure, paper, eyes, lips, hair, 18 photo landmarks.
- Same Crayon ArtCraft Adult Face Lab Storybook folder adds 3× opt-in story and selector, Vitest negative-control/source-region/SSR checks, and native Chromium A/B 1×/3× screenshot capture vs V21b.
- **Not yet artist-approved.** Download latest exact-head actual browser PNG before judging. Independent ArtCraft 9.1 18-point human anatomy / five-axis / portrait-fidelity gates remain unpassed; source x340..493/y570..684 should show no sticker silhouette. If source-fidelity degrades, reject experiment and keep default unchanged.
- Remaining: full coherent nose rather than local patches if still disconnected, source-specific oral cavity/teeth, eyes, malar/jaw/neck/hair and 300-frame normal-speed motion sign-off. No merge until source-based visual acceptance.
