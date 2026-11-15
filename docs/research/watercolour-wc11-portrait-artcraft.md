# WC11 — watercolor human portrait, anatomical studies and Storybook replacement

**Scope:** one *original* bust portrait built from authored code and composited with Kumiki's existing WC10 optical glazing, WM4 wet-paper underpainting and FilmStage. Existing **watercolour-actor** registry, evaluator, scripts, tests and portable film remain for backward compatibility. The obsolete toy-like **Painted Character Performance** Storybook story is deleted; **02 Painted Characters** now contains **Naturalist Portrait**, without a new top-level folder.

## Primary visual/technique research

These are **craft benchmarks, not a licensed identity reference**. No photographed sitter, master portrait pixels, downloaded brushes or traced source paths are committed. Copyright of all contemporary artist examples is retained by their authors.

| Reference, provenance | Visible craftsmanship studied | Source-to-geometry rule |
|---|---|---|
| [Mary Whyte, official paintings](https://marywhyte.com/paintings.php); [US State Department artist profile](https://art.state.gov/personnel/mary_whyte/) | Anatomically convincing people, face-led focus, textile mass, and intentional shadow grouping | Put the strongest small sharp marks at the gaze/lids, use mostly softened contour around neck and garment; explicitly construct neck/clavicle and sleeves |
| [Mary Whyte interview / *Red Hat*](https://www.artistsnetwork.com/art-techniques/art-advice-mary-whyte/) | Lost/found watercolor edges direct focal hierarchy; not all facial boundaries are inked | Hair rim and jaw are often washed planes with incomplete pencil lines; pupils and upper eyelids are deliberate, not dot eyes |
| [Charles Reid, *Natural and Authentic Watercolors*](https://www.artistsnetwork.com/art-mediums/watercolor/watercolor-charles-reid-natural-and-authentic-watercolors/) | High-value sparse strokes, spontaneous look achieved by careful measured touches, edges lost in receding shadow | Separate socket/eyelid/iris/nostril planes; one continuous compound graphite stroke per visible form, prevent universal hard cartoon outlines |
| [Charles Reid, *Portrait Painting in Watercolor*](https://books.google.com/books/about/Portrait_Painting_in_Watercolor.html?id=WD5QAAAAMAAJ) | Head proportions, light-shadow shapes, dry and wet brush work, sclera/iris occlusion | Two eyes intentionally unequal in three-quarter pose, near eye broader; nose as bridge+side+tip+nostrils; lower lip lighter than upper |
| [Ali Cavanaugh, Ellen Noël Art Museum](https://www.noelartmuseum.org/artists-a-d-permanent-collection/ali-cavanaugh); [artist's process notes](https://alicavanaugh.squarespace.com/alis-modern-fresco-technique) | Luminous, layered pigment on a light substrate; transparent local skin planes and cool reflected shadows | Nearly opaque base face to prevent see-through anatomy; apply subtle separate optically blended warm and cool glazes, preserve cheek and forehead light |
| [Michael Holter, *Bring Your Portraits to Life*](https://americanwatercolor.net/portraits-in-watercolor/); [The Met, watercolor techniques](https://www.metmuseum.org/de/perspectives/materials-and-techniques-drawing-watercolor) | Successive value glazes, fine facial landmarks, wet and dry edge differentiation | Author numbered wash planes and separate hard/drybrush passes; wet paper transport belongs to background, not a global blur across eyes |

## Anatomy construction / evidence contract

Portrait invented as one anonymous adult sitter with a subtle three-quarter head position. This is a new fictional design, **not an imitation of a specific pictured person**. Canvas-space landmarks before any format transform:

| Semantic feature | Center/control anchor (original units) | Painted construction |
|---|---|---|
| crown/hair root | (286,60) | Dark rear head mass, 4 overlapping upper/root/temple wash clumps, hairline graphite tangents |
| left/near orbit | (249,229) | Orbit wash, irregular almond sclera, upper/lower lids, contained iris, pupil and highlight |
| right/far orbit | (351,220) | Narrower aperture and slightly higher center (three-quarter perspective) |
| nose tip | (316,312) | Bridge and lit plane, dark-side plane, alar volume, two small nostril voids |
| lips | (307,364) | Irregular cupid shape, cooler thin upper lip and softer reflected lower lip, distinct mouth corners |
| chin/jaw | (292,432) | Continuous cheek-to-chin contour, reserved reflected light and broken outer line |
| neck/clavicles | (300,451) | Painted anatomical overlap with face and anchored clothing collar |
| shoulders | (115,565) and (468,558) | Garment silhouette (opaque), separate lapels and folds, asymmetry in pose |

**Macro:** One credible, expressive face with a large readable value hierarchy; editorial white paper and loose vignette remain secondary. **Meso:** no circles for eye/face construction, no generic pill limbs; jaw, ears, nose, orbital planes, multi-clump hair and collar are semantically connected. **Micro:** separate upper/lower eyelid, iris-with-lid occlusion, glints, philtrum, nose alae, hair flyaways and intermittent drybrush.

## Motion, formatting and source-compatibility

- Existing \`WatercolourIllustration\` supports arbitrary nested semantically named parts, pivot-locked head motion, independently moving eye gaze and opacity-keyed eyelid blink, deterministic absolute-frame rendering (frame 0, 140, 185, 255, 319, 359).
- 12-second FD1 film \`examples/film/watercolour-portrait.film.json\`, 960×540 and native 540×960. The editorial format uses 0.75× painterly subject scale; portrait uses 1.04×, framing head, lips, shoulders and clothing on the tall canvas rather than cropping the horizontal output.
- Source film slot \`watercolour-illustration\` accepts \`subject:"person-portrait"\`; default remains the old heron for all current WC9–10 users.
- **Storybook:** \`Video Production / Film Looks / Watercolour & Brush / 02 Painted Characters / Naturalist Portrait\`, with play/seek, 2 ratios, wet-paper seed/tooth, optical-glazing A/B, fine-feature A/B, reduced motion and editable validated JSON. No additional Storybook category.
- The removed traveller *storybook and browser test* are not product/API removals; the original traveller animation film, underlying actor definitions, tests and public slot continue working.

## Required verification

1. TypeScript and focused Vitest: inspect art safety, face parts, opacity, 2 output sizes, explicit blink frames, film backward compatibility.
2. Real browser Storybook capture at authored 140/255/319 frames, both ratios; compare optical glaze true/false, fine detail true/false, native blink.
3. Real production FilmStage PNG and short MP4 outputs from 30fps film. Visually critique portrait, face at 2× crop and hairstyle along focal facial planes.
4. ArtCraft structured fidelity: explicit spatial landmarks/proportions and topology rooted; **no automatic numerical similarity claim**, because references concern medium/technique rather than identical sitter identity.
5. Confirm the old traveller Storybook disappeared without breaking its underlying registry/film tests. Confirm large shapes do not render see-through.

**Open quality limitations:** This first code-built head study is not a certified professional watercolor painting. Real pigment particle statistics, volumetric highlights/soft shadow falloff, feature-rich hair, anatomical three-quarter plane accuracy under stronger head turns, skin-tone diversity, eyebrow microtexture and professional portrait artist critique remain. Do not claim full expressive human rigging or resemblance to any copyrighted source painting.


## Render critique #1 — release-blocking correction

Actual Chrome production film PNGs for **both** output ratios at frame 255 showed a nearly black painted face. This was not a palette preference: WC9–10's global **multiply blend mode on every wash**, even a nearly opaque base silhouette, multiplied light skin by the dark hair layer behind it. The outcome contradicted human anatomy and the requirement that foreground characters not show through. Unit geometry tests and the initial browser proof passed; this is why source-frame *visual* inspection is a separate gate.

**Fix:** \`WatercolourArtPart.composite?: "normal" | "multiply"\` with validation and browser-visible layer semantics. Keep \`multiply\` as the backwards-compatible default for translucent watercolor pigments and optical glazes, but use \`normal\` for the near-opaque base face, neck, ears, rear hair, clothing silhouette, skin light reserves, sclera, and eye highlights. Secondary glazes remain multiplied atop an already opaque local surface. Also reduced excessive cool/warm cheek overlay strength. Browser tests assert explicit normal compositing for the skin and sclera.

**Additional observed flaws:** first frame-0..35 MP4 proof was a blank paper reveal (the actual portrait begins later). The film exporter already supports \`--startFrame\`; WC11 exposes this flag through \`npm run film:render\`, allowing truthful 36-frame preview excerpts from **frames 210–245** rather than displaying empty paper as proof of person animation.

Re-review the *new* PNG before merge. Remaining painterly limits: some hair groups look like broad vector shapes, hard garment blocks, and the watercolor diffusion solver is not a physically validated pigment model.


## Render critique #2–3 — calibrating grain and eye proportion

On the second ArtCraft portrait export (Chromium 16:9 and 9:16) the opaque face problem was corrected, but facial and garment planes still read as very flat, polygonal vectors. To improve real pigment behavior without smudging eye lines, WC11 introduces an **opt-in** RGB wash granulation coefficient in \`paper.granulation\` with a fixed-source seeded noise field, bounded 0..1 and editable in Storybook. Arithmetic compositor multiplies RGB while preserving the original alpha, so opaque face construction stays opaque.

The third reference crop showed an **overly strong dark/gritty wash** that contaminated skin hue. The initial granulation curve acted like repeated darkening across multiple stacked washes. The fourth render corrected to a near-neutral centered coefficient (per channel: slope \`0.12 × granulation\`, intercept \`1 − 0.075 × granulation\`) and reduced the eyelid opening and pupil displacement. This preserved pale skin value hierarchy and improved the eye shape while retaining some paper grain. Verified in actual final frame-255 PNGs for both aspect ratios and live Storybook A/B. CI proof: [WC11 final native film/Chromium art evidence](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43656957016), and [changed-code typecheck/targeted tests](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43656960817).

**Artistic assessment:** The study is now a readable, anatomically *organized* adult portrait with functional blink and gaze, light face, pigment variation and independent hair masses. **It is not equivalent to Mary Whyte, Charles Reid or Ali Cavanaugh**: the hair silhouette, cheek patches and garment remain more geometric/flat than expert watercolor, so do not market this as a masterwork. Next technical art pass should use genuinely contour-following brush deposition, multiple layers of wash edge softness and structurally nuanced portrait shape variation; no random blanket noise to substitute for facial construction. The 12-second source film passes, but this evidence MP4 encodes a *real 1.2-second excerpt* of frames 210–245, not the entire movie.
