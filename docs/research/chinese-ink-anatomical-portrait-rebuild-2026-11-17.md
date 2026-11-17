# ANAT2 — Chinese ink original human portrait redraw (2026-11-17)

**Scope:** two entirely new code-painted characters in `src/video/ink-anatomical-portrait.tsx` and three new Storybook views. This study does NOT import, resize, trace, or patch the existing Shanshui character source shapes. The existing PR #466 landscape, river-scholar and its unfinished reference review remain unchanged. These are independent new candidate figures.

**Status: ART HOLD.** Code-authored anatomical plausibility is not equivalent to art-historical likeness or real dry-brush authenticity. A passing browser test or a frame screenshot alone is not artistic acceptance. Keep #466 draft until actual same-camera historical comparison and film-scale acceptance.

## Authentic source-image observations (before redrawing)

| Observed historical source | Link | Visual / topological evidence | Specific drawing decision |
|---|---|---|---|
| Zeng Jing, *Portrait of Pan Qintai* (1621), University of Michigan Museum of Art | https://umma.umich.edu/objects/portrait-of-pan-qintai-1966-1-110/ | Facial eyes, frontal bone and nasal tip are constructed by accumulated nearly transparent wash; linear edges are extremely soft. The robe is deliberately sparse relative to facial precision. | Separate periocular, nasal bridge, forehead and malar washes; leave optical paper in middle planes instead of a smooth digital gradient. |
| Zeng Jing, Ming scholar portrait, Qingdao Art Museum educational collection | https://www.qdsmsg.cn/h-nd-178.html | Eyebrows and nose stay fine while broad fabric sheets are lightly delineated. The pale face is distinct from the solid scholar cap. A continuous external head contour is not a uniform black sticker. | Paint cap and hair behind a new craniofacial silhouette; reserve fine eyebrow and eyelid strokes, keep cloth folds pressure variable. |
| Ren Bonian / Ren Yi, expressive smiling figure (auction object photograph, 1891) | https://www.sothebys.com/en/auctions/ecatalogue/2012/fine-classical-chinese-paintings-n08835/lot.677.html | Smiling cheek masses press toward eyes and the mouth; dark scarf and eyebrows follow different brush pressures. Cloth folds widen and contract in active movement. | ACTUAL vertex-driven AU6 cheek and AU12 mouth, eyelid occlusion and beard/hair detail; independently layered collar folds rather than uniform strokes. |
| Ren Bonian collection, Central Academy of Fine Arts Museum | https://www.cafamuseum.org/en/exhibit/detail/871 | Distinct people have distinct head ratios and character; calligraphic garment marks use larger brush energy than facial contour. | Two independently parameterized ANAT1 face identities; differing hair, hats, beard, clothing and projection. |
| Ren Yi, *Herdboy and Buffalo*, Metropolitan Museum | https://www.metmuseum.org/art/collection/search/49463 | Colored wash and loose impressionistic brush rhythm coexist with precise subject-attached lines. | Independently draw wet and dry mark families with asymmetrical, subject-bound vectors. |

These photographs are **visual-study links only**, not redistributed, embedded, or claimed as permissively licensed image assets. No photograph was traced. The result cannot yet be called an accurate reconstruction of any particular sitter or painting.

## Geometric construction from first principles

- **ANAT1 base:** `createFace` and `FACE_LANDMARKS` from the repository's measured 468-vertex MediaPipe-mask scaffold. Each portrait begins with its *own* distinct eye spacing, nose width/length, lower-face length, and bizygomatic width. The skull-cap and ear are constructed separately because ANAT1's mask excludes skull, ears and hair. Source dataset licensing lives in the ANAT1 registry.
- **3/4 projection:** 19° (scholar), 27° (elder). Project raw x/y/z millimetre points into a consistent local 540×620 SVG image plane rather than adjusting existing Shanshui paths. A Catmull–Rom-to-cubic interpreter retains vertices from actual ANAT1 features; upper/lower eyes and upper/lower lips are separate continuous loops.
- **Vertex-native EXPR1:** `expressEmotion` directly modifies the fitted mask's vertices; actual projected ocular, brow, cheek and lip topology follows the action. `expressionMarks` adds low-opacity glabellar, nasolabial and orbital marks only from activated units. The canvas renders the same features at intensity 0, .25, .5, .75 and 1 and supports animation timeline playback at 24 fps.
- **Real paper reserve:** the paper is exposed by a real clipped eye aperture, not an overpainted white eye sticker. Iris interiors are clipped by the *current* upper/lower eyelid polygons. Two overlapping forehead glazes, two independent cheeks (5 main fields + 9 microstrokes each), face-shadow contacts, beard strands, variable hat/hair fibers, garment folds, and a low-strength alpha paper-fiber pass are independent material deposits.
- **Distinct identities:** the young scholar uses tight eye spacing, a narrower nose, shorter lower third, tied dark hair and black scholar cap; the elder has a broader nose, longer lower third, wider cheekbones, grey hair break-up and individual split beard hairs. Their robes have separately constructed neckline folds.
- **Semantic SVG:** source-space `data-km-ink-*` groups expose anatomy, eyes, brows, mouth, robe, cheek layers and ear. Accessible Storybook controls switch live production components rather than swapping screenshots.

### Anatomical caution

The ANAT1 face dataset is a generic scaffold, not proof of any specific ancestry, individual likeness, attractive-face norm, or historical sitter. No preset should be used to imply an identity. The ANAT1 mask omits the outer ear, cranium, and shoulders; new contours for those parts are an **artist-authored approximation** and must undergo manual image reference review. EXPR1 action units are also illustrative estimates, not calibrated motion-capture displacements.

## Native one-to-one ArtCraft visual findings (2026-11-17 follow-up)

Real Chromium portrait PNGs reviewed from workflow [44131278583](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44131278583) and subsequent exact-head screenshots. Technical passing checks do NOT establish quality. The previous camera yielded a visually implausible oversized balloon-shaped head, tiny modern beret, incoherent outer-eye-to-nose wedge, nearly absent beard at 1×, deep business-suit V neckline, and mouth shading too geometrically regular. The face occupied most of the shoulder width while a documented late-Ming hanging-scroll sitter's face is much smaller relative to robe and broad sleeves. This is the reason for the subsequent art-only corrections rather than shipping the images.

**Primary documented painting:** Zeng Jing, *Portrait of Pan Qintai* (1621), University of Michigan Museum of Art. The public-domain high-resolution faithful photographic reproduction (1,997×2,929) is at https://commons.wikimedia.org/wiki/File:Zeng_Jing_(Tseng_Ching)_-_Portrait_of_Pan_Qintai_-_Google_Art_Project.jpg (Public Domain Mark 1.0). In this full painting, headcloth rises in an upright taper, malar/ocular relief is translucent, the robe shoulders are many head-widths across, facial ink is much finer than the sparse confident garment contours, and facial hair consists of narrow individual tapered strokes. The component is an original illustrated candidate, **not a reconstruction of Pan Qintai**.

**Corrections applied:** perceptually measured head-to-robe ratio uses a 0.69 face/cap/beard scale around a fixed collar contact rather than flattening ANAT1; smooth millimetre-mask lower-third squeeze corrects the previous extended chin; scholar and elder caps are cut as separate folded Ming silhouettes rather than semicircular berets; 93 individually flowing hairs plus five separate tapering locks replace the elder's faint chin stamp; age-related orbital creases attach to canthi and cheekbones; lower-lid break, nose wash and brow pressure are softened. All previous independent paint passes, observed paper fibre and EXPR1 facial motion remain live. Synthetic A/B upload fixtures remain interaction tests **only**.

**Still not passed:** original PD portrait matching at common face-to-body crop and true film-scale image quality. Old Shanshui cast is not replaced. Do not merge while the visual hold remains.

## Actual acceptance gates

1. Storybook **ANAT2 Independent Portrait Rebuild**: both character controls, five facial expressions, face microscope, 0–100% expression intensity, fibre detail and 24-fps motion slider work in Chromium. Check that eyebrows and mouth change from the *same* face, not cutout stickers; 0 and 96 return identical SVG geometry.
2. Unit gates: ANAT1 landmark geometry differs between individuals; fixed-zero ACT activation returns neutral; actual vertex response in brow/lid/cheek/mouth; dense independently authored paint layers; finite paths and stable identifiers.
3. **Unmet independent art comparison:** collect side-by-side real original-image portrait *face crops* with the **same view/scale** as ANAT2, then judge actual silhouettes, actual face volume (1×/3×), eye/naris/lip transitions, cap/robe/skin contact, and whether the new paper effect reads as unnatural uniform noise. An exact physical Chinese ink painting is not yet verified by the generated raster.
4. **Unmet full-film proof:** place the new candidate head and costume into a 960×540 original Shanshui film and verify 96 consecutive frames, movement in perspective, lip visemes, blinking and head continuity. Until this happens, the component is an optional standalone figure-study, *not* the production character replacement.
5. **Existing blockers:** original Fuchun geography, foreground rock, dry hemp and pine brush ecology; previous reader malar/forehead/lip realism. ANAT2 does not remove or override those blockers.

### Next priority

Manual source-matched face and garment review with an authentic higher-resolution licensed or PD artwork crop. If visually approved, build a dedicated actor rig adapter (head turn, blink, explicit visemes, robe folds), then compare independently against old film characters and *only then* consider replacing a production slot. Keep current character data intact until that gate is passed.
