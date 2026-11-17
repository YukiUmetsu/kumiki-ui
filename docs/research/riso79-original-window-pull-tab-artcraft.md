# RISO79 — Two independent original Risograph sheets, stationary die-cut cover, moving paper insert

Status: opt-in cinematic illustration mechanism. **Not a physical print/die calibration. Artistic 1×/3× screenshot acceptance remains pending until real Chromium images have been reviewed.**

## Independent photographed references (not bundled, traced or redistributed)

1. Jocelyn Tsui, *Analog Glitch* (2025), photographs of actual multicolor Risograph accordion books, artist: https://www.jocelynhyt.com/analog-glitch . Observed: bright layer-mixed screens cross fold axes; screens belong to the PRINT rather than the camera. Loose paper edges are visible independently of the ink.
2. ShigerTark, *Symbiotic/Parasitic*, direct original two-color pink/green physically printed zine photograph: https://shigertark.com/bug-riso-zine . Observed: the folded paper's outside pink stock stays opaque while green spot ink independently overlays narrow comic panel edges; delicate, variable original line weights are not one raster halftone filter.
3. Helen Lin, *Telaspecula*, original five-page Risograph-printed paper-circuit pop-up book: https://helen-lin.com/work-details/tela-specula . Observed: diecut/hand-assembled mechanical paper layers and printing are distinct manufacturing stages; the art and cut profiles should not be composited into one texture or made to animate together.
4. Becca Zerkin, *Yum! Pop-Up*, photographed printed paper birds and a hidden sliding feed tab, original work: https://www.behance.net/gallery/761903/Yum-Pop-Up . Observed: a discrete paper connector drives a particular separately cut layer; textured foreground canopy does not translate when the pull strip moves.
5. University of Michigan Library conservation photographs of 19th-century *Animated Alphabet* paper slider: https://blogs.lib.umich.edu/beyond-reading-room/get-those-books-moving-part-1 . Observed: the moving tab and transverse slats lace through paper slits. A real upper cover, moving insert and fixed aperture must remain separately represented.
6. University of Michigan Library, movable book with printed slat and front-page cutout: https://blogs.lib.umich.edu/beyond-reading-room/get-those-books-moving-part-2 . Observed: a window shows artwork PRINTED on the separately mobile sheet. An entire image should not be reprinted/morphed to simulate moving window content.
7. Smithsonian Libraries, *Paper Engineering: Fold, Pull, Pop & Turn*: https://library.si.edu/digital-library/exhibition/paper-engineering/page-turners-paper-engineering-fold-pull-pop-turn . Mechanism vocabulary only, not a provenance claim of this original 2.5D illustration.

No source photo, animated GIF, source illustration, artist linework or original print master is included in the code. All RISO79 output visual examples use independently authored Kumiki source artworks (existing RISO1/RISO75 print samples).

## Five-axis ArtCraft deconstruction → original library feature

| Axis | Image-based observation | Library obligation |
|---|---|---|
| Positive topology | The cover is one continuous print with genuine cutouts; a separately printed insert exists below the openings. | Mask the ENTIRE original cover by one shared physical white/black aperture mask. Do NOT redraw its cobalt, red, text, screens, paper pores or print registration. Clip a second intact RisoPrint to the diecuts. |
| Vector direction and flow | Slider travel is tied to straight paper slits, independent of original engraved ink strokes. | Translate the entire moving source SVG in source-sheet coordinates. Four supported pull directions with a bounded travel; no interpolation of ink paths, screen dots, typography or halftones. |
| Edge / micro-character | The paper rim has a continuous slightly convex four-corner cut, pressed dark shoulder, lighter near-face stock and exposed cellulose whiskers. | Use separate SVG rim and 88 deterministic, individually curved, source-registered fibres per opening (22 on each straight segment). No random per-frame texture and no Gaussian blur or raster masks. |
| Layer / light | Die-cut top sheet masks the insert; slight dark contact and alternating edge relief create physical depth under transparent inks. | Stable stationary cover mask, separate clipped mobile print, subtle cavity contact stroke and continuous multi-stop rim gradient. Material relief ranges from 0 to 1; 0 creates no extra cut-edge effects while retaining true holes. |
| Temporal | A hand-driven slide progresses under paper; initial/half/end frames all refer to same original images, not a digital dissolution. | Stateless absolute FilmStage 24fps, 36-frame hold → 144-frame pull → 60-frame final reveal; smoothstep motion, seek/reverse deterministic, reduced-motion resolved still. Source grain/ink never resampled. |

## Public API and source composition

- Pure module registry/video/riso-pull-tab.ts: RisoPullWindow, RisoPullDirection, risoPullWindowContour, risoPullWindowFibres, evaluateRisoPullTab and risoPullProgress.
- React registry/video/riso-pull-tab-react.tsx: RisoPullTabTheatre. Requires **two complete original RisoSheet masters** in matching dimensions and matching physical stock, one to print the stationary cover and one to print the moving insert. Also requires 1–4 nonoverlapping originally authored rectangular diecut apertures and a bounded source-space pull travel. The four original edge corners use continuous cubic turns rather than a hard square clip, and each material rim's fibre paths are independently preserved.
- No character or human-hand shapes. The viewer sees only authentic paper-engineering visual objects, not invented anatomical actors.
- Exposes seed, paperRelief, paperGrain, misregistration, and optional existing RISO75 independent drumContact. The opening/cellulose paint is independent of ink plate transforms. All materials are still native SVG with normal accessibility semantics.
- Existing Storybook group: Video production / Film Looks / Risograph → Printed Paper Pull-Tab. User-adjustable FilmStage frame, four pull directions, 1–3 illustrated diecuts, physical paper relief, screen fibre tooth, drum dryness, registration, seed, 1×/2×/3× zoom and focal XY, 16:9/9:16 and keyboard/reduced motion.
- Two original independent print masters from risoExampleSpec/risoExampleArtworks and the previously independently authored second print risoSecondSheetArtworks. Neither is regenerated during movement. Registry installation adds both source modules and no new npm dependency.

## Adversarial acceptance

1. Pure source geometry: 1–4 bounded windows with unique IDs, collision and off-stock rejection, deterministic 88 curved fibres per window, unchanged source-paths from first to last frame; four bounded pull directions; nonfinite and invalid frames fail closed.
2. Browser at real native 1× and 3×, including close-up edge, end-stop, reverse seeks, 9:16 print and reduced motion. Inspect the actual rendered values and image; a green DOM test alone is not visual approval.
3. Verify exactly one printed upper RisoPrint and one printed lower RisoPrint, with their original blue/red masters, typography, native screening, fixed paper pores, RISO75 drum contact masks and no image flattening. Cover stays stationary while insert's entire source-paper transform changes.
4. Independently install the riso-print item into a clean consumer and build Storybook.
5. Limitations are explicit: the visual model does not calculate physical slot clearance, tab friction, peel stress, card buckling, true cut-die tolerances, pigment pressure or reproducible Risograph scanner measurements. It is a visual video component until compared with a real owned print and corrected.

## Remaining next priorities

- Verify full 1×/3× printed opening readability and ratio against the independent referenced photos; adjust the original **cut geometry, optical depth, paper layering or ink composition** if it fails. Do not delete source strokes or hide printed details to make a green screenshot.
- Add individually authored eccentric/organic closed window silhouettes with validated winding + fibre position on original contour, beyond the currently deliberately rectilinear mechanism.
- Model genuinely interleaved physical slats for mechanical reveal or a paper-wheel/volvelle, with proper collision and fold proof before any 3D claims.
