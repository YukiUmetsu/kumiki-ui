# ArtCraft — Watercolour-pencil / coloured-pencil fox and human facial rebuild

**Date:** 2026-11-14. **Mode:** technique-guided original work, not a trace of an artist's portrait. **Status:** implemented code candidate; independent visual acceptance awaits actual browser/film crops.

## Reference board and technique observations

| Reference | Direct source | What is visible / useful to translate | Original Kumiki implementation |
| --- | --- | --- | --- |
| Fox profile, professional coloured pencil | [Ruff Sketchings, *Fox*](https://www.ruffsketchings.com/productpage/fox-original-artwork) | Orbital lid encloses an almond eye; rust/cream cheek transition is stratified; fur direction fans radially from muzzle into longer neck fibres; snout tapers and nose catches narrow light | Fox's two local orbital masses, organic jaw/cheek planes, shorter curved cheek fibres, narrowed upper-lid lines and independently rooted whiskers |
| Alert forward fox, pastel-colour pencil | [STABILO COTHELLO fox artwork, Japan](https://www.stabilo.com/jp/%E3%82%A2%E3%82%A4%E3%83%86%E3%83%A0/%E8%89%B2%E5%A1%97%E3%82%8A%E7%94%A8%E3%83%9A%E3%83%B3/%E8%89%B2%E9%89%9B%E7%AD%86/%E3%82%AB%E3%83%BC%E3%83%96%E3%82%AA%E3%83%86%E3%83%AD/) | Independent dark eye sockets, pupils with tiny specular points, articulated ear inserts and directional fur under the eyes | Continuous dark horizontal fox face mask rejected; amber irises and darker pupil/catchlight aligned under brows; finer ear-cartilage lines |
| Human portrait, traditional coloured pencil | [Elena Pancorbo, portfolio](https://www.elenapancorbo.com/) | Eyelids wrap eye globes; shadow under brow becomes a cheek plane; nose alar/midline is softly modelled; hair falls in grouped locks; full sclera is not a flat white disc | Both apertures drawn narrower; sclera muted; iris and pupil partially occluded; layered lids, brow hair, cartilage, nostril and subtle mouth shapes |
| Human skin and facial expression craft | [Veronica Winters, portrait drawing guide](https://veronicasart.com/realistic-colored-pencil-portrait-drawing-guide/) | Strong directional-value hierarchy and gradual skin hue shifts; realistic contours emerge from planes, not heavy outlines | Jaw/temple/malar planes softened with pressure-bounded warm/cool pencil hatches; lip contrast reduced |
| Realistic human portrait technique | [Karen Hull, *Realistic Portraits in Colored Pencil*](https://www.oreilly.com/library/view/realistic-portraits-in/9781633227286/xhtml/intro.xhtml) | Facial features/expressions, micro texture and hair require close individual observation | Static face-first feature construction followed by existing dry-pigment detail pass; no claim of matching artist likeness |
| Watercolour-pencil process | [Derwent Academy: Watercolour Skintones](https://derwentstorage.blob.core.windows.net/academy/App_Files/pdf/977-Academy-Watercolour-Skintones-Projects.pdf), [STAEDTLER watercolor-pencil technique](https://www.staedtler.com/us/en/discover/painting-with-watercolor-pencils-all-about-applications-techniques-and-inspirations/) | Dampened colour blocks and wet-on-dry layers model broad volume; after fully drying, sharp pencil adds detail | Existing soft glaze over opaque base + discrete dry construction strokes is *visual approximation*, **not a physical rewetting simulation** |

Rights: these artworks and tutorials are **viewing references only**. No source pixel, tracing contour, copyrighted original composition, or artist artwork is included. Illustrations remain original and reusable.

## Source → contour map (authored local coordinates, not claimed source measurements)

### Human original study

- Overall cranial volume ~x133–325, y90–345; asymmetrical temple/cheek/jaw rather than a symmetric oval.
- Far orbit x157–192, y196–214; near orbit x240–286, y195–219. Both are narrow, softly shaded almond apertures with top-lid partial iris occlusion, lower lash shadow and small warm sclera.
- Brows are short curved hair fans above orbital ridge, not two opaque brush stickers.
- Bridge/ala ~x225–257, y191–278, with separate nostril, highlight and plane-release strokes rather than a simple polygonal nose.
- Philtrum/mouth ~x206–264, y289–316; less saturated lip base with thin contact line; avoid a flat bright lipstick strip.
- Face pigment: opaque underlay to avoid seeing through, soft glazed temple/cheek value shifts, then dry graphite/coloured-pencil marks. Existing hair/collar body parts retained.

### Red fox — frontal static study

- Existing original x120–305 skull, triangular ear attachments and four-legged study remain recognisable.
- Two distinct muted dark eye sockets replace one broad horizontal mask; visible amber irises with layered lid, pupil, small catchlight.
- Muzzle now grades from orange side fur to warm cream jaw, with smaller nostril bevel, lips and whisker-root cues.
- Fur growth guides attach to cheeks, neck and ears, not random dots; individual whiskers intentionally project beyond the fully opaque muzzle.
- Main render path stays within previous 21 drawing regions and palette-controlled surface recipe.

### Red fox — rigged side-view character

- The existing head/eye/muzzle parts retain their parent pivots, blink keys, tail motion, actor IDs and 24-region ensemble limit.
- Added orbital ridge, lower eye shadow, head volume marks, three supporting muzzle contours and nasal cartilage details.
- The eye remains opaque and its eyelid/catchlight details are allowed beyond the globe clip; pose transforms remain deterministic.

## ArtCraft five-axis mapping and acceptance limits

1. **Topology:** all eyes rest on an opaque head, muzzle overlays lower skull, whisker roots emerge at the cheek and ear inserts attach to head; no newly floating face geometry.
2. **Flow:** eyelid curvature follows almond apertures; brow and cheek hairs follow named local flow curves.
3. **Line weight:** lids > lower shadows > freckle/fur micro-accents, with different per-part opacity; avoid one black outline width.
4. **Rhythm:** asymmetric eyelid/brow shapes, mixed fur-guide lengths, non-identical near and far eye and ear proportions.
5. **Texture:** layered pigmented dry strokes, softened skin glaze and the paper-tooth renderer; fidelity to physical water-soluble pigment remains unproven.

**Technical gates:** `tests/colored-pencil-living-studies.test.tsx` and `tests/colored-pencil-ocular-detail.test.tsx` check structure, finite valid regions, solid face support, deterministic seek and actor inheritance. Existing Storybook `Video Production/Film Looks/Colour-pencil` keeps all pages, with a new Face area selector *inside* the existing Living Subjects atelier. Browser screenshots must show landscape and portrait heroes, plus eyes/nose/mouth macros for fox and person.

**Visual blockers to judge separately:** skin could remain too vector-clean; eye expression, fox muzzle depth and hair clumps may be below real illustration quality. Compare rendered 1× scene and 3× macros with linked visual references, not line count. Do not claim photorealism without independent normal-speed film and crop review.
