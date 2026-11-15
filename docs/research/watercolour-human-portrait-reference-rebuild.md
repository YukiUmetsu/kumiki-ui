# WC13 — Reference-led watercolor human reconstruction

Status: Original code-drawn portrait reconstruction committed. Normal-speed film visual acceptance **not yet verified**.

## Reference board (sources viewed; no artist pixels copied)

| Source artwork | Craft observation / reusable principle |
| --- | --- |
| [John Singer Sargent, Betty Wertheimer Salaman](https://jssgallery.org/Paintings/Wertheimer_Paintings/BettyWertheimerSalaman.html) | Light across unified face planes, paper reserves, exceptionally deliberate eyelid and dark hair accents |
| [Sargent, seated woman](https://za.pinterest.com/pin/art-ideas--63894888470533353/) | Fabric folds follow tension and gravity; accents only where needed |
| [Agnès Cécile, close-up watercolor portrait](https://www.pinterest.com/pin/agnes-cecile--289145238577589657/) | Precise irises and mouth landmarks against loose lost-and-found cheek, forehead and temple |
| [Agnès Cécile, pink and cool portrait washes](https://www.pinterest.com/pin/140526450859877146/) | Layered cool/warm pigments and useful paper negative space |
| [Charles Reid, portrait painting](https://www.artistsnetwork.com/art-mediums/watercolor/watercolor-charles-reid-natural-and-authentic-watercolors/) | Sparse decisive strokes; hard light-facing edges and soft shadow transitions |
| [David McEown, wildlife and landscape](https://davidmceown.com/workshops-online/wildlife-and-landscape-in-watercolour) | Different genres demand independent contour / textural grammars |
| [Computer-Generated Watercolor, Curtis et al.](https://grail.cs.washington.edu/projects/watercolor/paper_small.pdf) | Edge darkening, granulation, optical glazes, dry brush and wet-on-wet should have distinct behavior |

These images are for study only. Copyright remains with their creators. No traced paths, photos or third-party source textures are bundled in the repository.

## ArtCraft structural worksheet

Figure hierarchy: continuous garment/shoulders → neck → opaque hair back → cranium → temple, orbit, zygomatic, muzzle, jaw → lid-aperture-clipped sclera, iris and pupil → nose dorsum, alar, lip and chin → directional hair and clothing folds.

| Region | Required topology and construction | Reject |
| --- | --- | --- |
| Facial planes | Cranium, jaw, ears and skin underpainting share a coherent volume; soft cheek and temple loss of edge | Generic flat oval, transparent head or hair showing through skin |
| Eyes | Asymmetric lid opening with iris clipped inside, eyelid crease and tear corner; mapped to both eye landmarks | Cartoon circle eyes or exposed pupils on a blink |
| Nose and mouth | Nose bridge/wing/tip have connected value groups; upper and lower lip differ, corners restrained | Triangular nose, capsule smile, dark constant outline |
| Hair | Continuous scalp mass with hair strokes following root-to-temple flow, occluding face correctly | Repeated parallel stripe noise and detached ribbons |
| Clothing | Garment volume connects to shoulders; collar anchored to neck, folds stem from seams and gravity | Floating flat sleeves or misplaced folds |
| Mature sitter | Separate scalp silhouette, beard volume, aged crease hierarchy and shirt | Recolored duplicate face |

Adversarial baseline: a single ellipse face, two ellipse eyes, one dark hair blob and transparent garment would pass smoke checks but fail anatomy, topology, occlusion and watercolor material. The new portrait source intentionally does not reuse the former human figure.

## Original rebuilt figures

- Sitter A: luminous adult portrait, grown hair masses, soft jaw and cheek planes, draped collar.
- Sitter B: mature adult with separate head/hair contour, grey strands, age creases, beard volume and distinct clothing.

Both use the same generic serializable watercolor illustration renderer, not a one-off browser filter. Local foundational face/neck/hair/coat paints are opaque; transparent pigment is applied **only to subsequent planes**. Painting is revealed on an absolute frame clock.

## Film and Storybook

Storybook remains under **Video Production / Film Looks / Watercolour & Brush / 02 Painted Characters**; a sitter selector exposes both new paintings and preserves 9:16 and 16:9, frame seek, play, material/detail controls, reduced motion and validated authoring JSON.

The production film slot now takes person-portrait plus sitter-a or sitter-b. An omitted sitter defaults to the first figure; invalid sitter strings are rejected. Blink and gaze animate independently of the head, while paper grain remains deterministic.

## Remaining verification and gaps

1. Compare native-resolution screenshots at frames 0, 112, 185, 256, 340 (both ratios), plus 2x face/eye/hair crops, with references **for craft only**.
2. Watch actual normal-speed MP4 from both sitters and formats for rigging and registration. Automated tests cannot certify artistic quality.
3. Apply ArtCraft semantic-contour and attached-flow/topology measurements with manually annotated reference and render crops; do not invent scores or masks.
4. Still needed for a truly universal watercolor engine: editable user SVG silhouettes; spatially aware wet paint simulation/rewetting; general character animation; fur/stone/foliage/fabric-specific grammars; multi-shot direction and transitions; 4K profiling and visual regression.
