# CP-F1 × FLORA1: five true rose interpetal contact-shadow valleys

**2026-11-17 · Status: ART HOLD / experimental.** This is a source-topology and colour-pencil occlusion study after #605 six independent center petals, #608 center diffuse values, #609 outer lamina values. The purpose is to replace the *visual impression* of equally dark concentric C outlines with **different cast contact depths**, not to flatten old details or replace pigment with a digital blur. It remains OFF by default in production drawings.

## Authenticated photographic reference & rights

| Source | Rights verified at file's own page | What is actually visible | What it does **not** establish |
|---|---|---|---|
| [*Rose Blossom Closeup.jpg*, Leyth](https://commons.wikimedia.org/wiki/File:Rose_Blossom_Closeup.jpg) · [original JPEG](https://upload.wikimedia.org/wikipedia/commons/4/48/Rose_Blossom_Closeup.jpg) | Photographer Leyth, self-uploaded **CC0 1.0**, captured 16 June 2011, Commons file 662×474. CC0 waiver is displayed in file license record. | A **pink, obliquely seen, double rose**. The front upright lip projects over darker rose-pink concave inner surfaces; the lower turn remains *lit outside* the lip. A second rolled edge on the right meets a different shadow region. Upper and lower petals are not interchangeable concentric curves. | This is an **unidentified** Rosa cultivar, not registered to the vector example in `kumiki-ui`. Cannot claim absolute anatomical landmarks, same-cultivar morphometry, physical reflectance, or motion from a single side view. |
| [*Silky red petals in close-up (Unsplash).jpg*, chuttersnap](https://commons.wikimedia.org/wiki/File:Silky_red_petals_in_close-up_(Unsplash).jpg) | Original dated 2016-12-23 (before Unsplash's 2017 license change), Commons records **CC0 1.0** under original historical terms, 6016×4016 Nikon D750 macro. | **Red** rose macro: a raised scroll's bright sharp lip borders a broad, dark, wedge-like contact valley; adjacent lower face recovers a smooth color value away from the cuticle. At least two center folds have *opposing shadow direction*. This shows why a uniformly dark outline plus a bright fiber stroke is visually incorrect. | The red macro is not the same bloom or cultivar as the pink image. There is no valid cross-photo 3D correspondence; do not infer a shared mesh or multi-view positional truth. |
| [UPOV TG/11/8 Rev. 2, Rosa petal reflex](https://www.upov.int/documents/d/upov/tg-documents-en-tg011.pdf) | Public botanical morphology descriptor; **document not redistributed**. | Cultivars can open their petals together or reflect them separately; the center and outer petal contacts are stage-dependent. | UPOV trait diagrams are not a material profile or source-pixel measuring dataset. |

Neither reference image is shipped, sampled, traced, recolored, raster-overlaid, or embedded. The Storybook tool offers a direct external attribution/source link to the pink CC0 photo only as an optional **visual comparator**; it does not load its pixels into the film. `PencilFoundationReference.rights="technique-only"` truthfully represents how the already-verified CC0 files were used here. Source coordinate axes below are original author geometry, *not* digitized photo coordinates.

## Deconstructed topology before shading

Previous [native 16:9, 9:16 and 2.15× film proof for #608](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44146515541/artifacts/14356243937) shows that the six independent solid center petals and a real scroll underturn exist, but their interpetal lines have rather similar values. In a real open pink rose, a **contact shadow is cast onto the lower physical lamina, and the foreground petal masks the source beneath it**. Painting a dark detached polygon above both petals would form a sticker. Adding the same halo to all petal edges would look like inked concentric rings.

The original six source material IDs, true painter order, three CP-F1 pigment layers each, existing broad values, fine fibres and original 45-region stack are left unchanged. The new authored shadow is painted **on the lower named material's existing source-clip** as 3 sequences of **real dry pencil**:
- buried cool-violet contact, 176–234;
- warm rose penumbra, 220–274;
- narrow near-cuticle reflected return, 263–311.

Every sequence has independent deterministic paper positions and oblique material flow along a separately authored cubic source axis (not clones). Per-field contact lengths ≈1.15–3.35 source units; hues and nib widths differ; stage-3/6 arbitrary film seeks do not respawn contacts.

| Real lower lamina | Physically later upper lamina | Shadow axis (source x,y endpoints) | Why this boundary |
|---|---|---|---|
| `inner-fold` | `rose-whorl-recess` | (220,167) to (271,178) | Lower collar shows a visible exposed strip below a raised cup; its center is partially hidden by the darker new recess. |
| `rose-whorl-recess` | `rose-whorl-left` | (240,156) to (254,171) | A steep left turn forms a short wedge of occlusion, not an all-around ring. |
| `rose-whorl-recess` | `rose-whorl-right` | (263,148) to (280,165) | Opposite right turn has *different* exit attitude, width, and coloured pencil deposition. |
| `rose-whorl-right` | `rose-whorl-scroll` | (251,150) to (274,168) | The scroll, **not the non-overlapping heart**, masks part of this right-facing curl. Prior guessed heart pairing was rejected after sampling actual source fills. |
| `heart` | `rose-whorl-scroll` | (240,165) to (261,170) | The darkest inner contact is bounded below the bent front scroll; exposed heart face remains lit outside the foreground edge. |

### Actual source geometry trial and rejection

The original parent and upper paths were rendered independently with a real SVG rasterizer, and each candidate curved contact sampled at 41 longitudinal points × five offsets (205 samples) for **lower support exposed** vs **both paths physically filled**. This is model geometry, *not measured reference photo pixels*. Initial false relationship `rose-whorl-right → heart` had **just 1 overlapping sample of 205**, making it a decorative shadow with no actual occlusion. It was rejected and replaced by `rose-whorl-right → rose-whorl-scroll`: around **43 exposed / 51 physically covered** samples (the remainder not in the lower SVG support, and therefore source-clipped). The other four source axes were also sampled: inner collar 130 exposed / 13 covered; left cup 159/46; right cup 94/87; inner heart 97/38. Real Playwright native `SVGPathElement.isPointInFill` independently rechecks all five pairings **in each output aspect ratio**. This is a geometry-specific gate; it cannot be replaced by counting traces or checking screenshot existence.

### Integration / release discipline

- New `roseContactShadowStudy=false` requires the existing `roseCenterKnotStudy=true` (and therefore true inner whorl). It may run **with or without** prior `roseCenterValueStudy`. When both opt in, original six value passes remain *prefix-identical* and contact sequences append rather than replace or conflict with full outer/front local values.
- Native Storybook, same *Video Production / Film Looks / Colour-pencil* story, has one disabled-until-parent checkbox and a CC0 source link. Parent `roseCenterKnotStudy` or `roseInnerWhorlStudy` turning OFF resets this toggle.
- Unit proof checks the five unique source relationships, exact lower/upper construction order, trace paths, safe timing/pigment budgets, equality of prior geometry, pencil material hashes and contact composition. **Region counts remain 16 inner-whorl study and 45 full botanical stack**, with the exact old 11-region source when OFF.
- Chromium captures 960×540 and 540×960 true native SVG, before/on/restored pixel identity, full 45 composition with all other optionals, both central 2.15× macro views, real fill/occlusion checks for all five contacts, f3→f6 seek, and no raster/foreign image nodes.
- **ART HOLD:** test green proves only opt-in drawing and source-specific non-regression. The rose's central scroll is not yet measured against same-cultivar multi-angle photography; midtone transitions remain cartoonish at 1×. **Do not promote to default, claim botanical realism, approve video rigging, or add thick dark graphics to conceal these problems.** Next research step is a licensed single-specimen multi-angle photo set or owned photographic shoot to establish actual covariant landmarks.
