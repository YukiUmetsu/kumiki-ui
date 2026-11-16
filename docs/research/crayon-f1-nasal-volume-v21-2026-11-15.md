# Crayon F1 ArtCraft V21 — source-projected nasal wax volume (2026-11-15)

**UNAPPROVED EXPERIMENT.** PR #281 stays DRAFT. No likeness or real-time-animation acceptance is claimed.

## Authentic references and rights

- Source identity: [Christopher Campbell, *Brunette woman portrait*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), October 2015, CC0 1.0. Frozen 608×1082 browser image (not original camera JPEG), SHA-256: f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2. Pixel evidence: [source run 43682633614](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614), artifact 14148787169. Photo used for hand-authored source coordinates, NOT bundled as raster texture.
- Material: [Philadelphia Museum of Art: wax crayon pickup and clumping, p.44](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf); [Rudolf et al., wax crayon smear and raised-paper force model](https://people.scs.carleton.ca/~mould/papers/crayon.pdf). [Kassia Rico, 2013 portraits in traditional wax crayons](https://www.behance.net/gallery/14450891/Portraits-2013-Crayon/modules/124832885) studied for source-specific cross-contour colored marks; no artworks traced, imported, or distributed.
- Previous source-native Chromium reference: [V20b run 43799650025](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43799650025), PNG artifact 14196032734. Actual rendering shows detached dark nasal cavities on planar face, despite a shared SVG cartilage curve.

## Five-axis deconstruction and anatomical anchors

| Axis | Source photo | V21 native art construction | Artistic gate |
| --- | --- | --- | --- |
| Shape continuity | Root (357,531) → dorsum (372,570) → bulb (409,612), near wing (381,627), far (454,619), septal turn (431,646) | 13 existing named CRAYON1 wax planes authored as source-projected cubic contours, no new skin disks, no dropped original features | PENDING actual native 1× inspection |
| Stroke flow | Oblique bone-to-tip shading, rounded near ala, compressed far side | Hand-chosen wax directions: 57° root, 59° dorsum, -18° bulb, 27° near, 65° far | PENDING |
| Edge hierarchy | Diffuse skin/cartilage transition; hard dark edges only inside receding air-space | Open source skin underglazes with feathered cross-fiber contact; original precise joined shadow rims remain | PENDING |
| Width and spacing | Near wing is visibly broader, far wing narrower; unequal color and shadow pressure | Independent near/far paths, pigment families, pressure and spacing (5.2–6.8 px) | PENDING |
| Microtexture | Raised, clumped wax deposits over variable paper height, translucent second pass | Inherited CRAYON1 dry nib, native wax pickup, actual paper relief, no filter or new photo element | PENDING |

## Source and prior-candidate color observations

Means of independently sampled source and V20b Chromium screenshot on identical 608×1082 pixels, rounded. These are rectangular diagnostic means and include mixed colors, not segmentation masks:

| Region | Rectangle (x1,y1,x2,y2) | Source RGB | V20b RGB |
| --- | --- | --- | --- |
| Dorsum | 367,554,434,620 | 214,178,164 | 205,168,151 |
| Near wing wall | 360,609,391,650 | 212,164,142 | 192,153,139 |
| Septal underplane | 412,627,451,664 | 149,107,93 | 190,150,135 |
| Near recess | 389,628,415,645 | 83,38,29 | 141,103,94 |

The numerical gaps motivate modeling bone, sidewall, and alar color as attached value planes, not simply drawing darker floating holes.

## Code, Storybook, tests, outstanding criteria

- New opt-in source-nasal-volume midface form builds AFTER V20b, preserving its exact far and near cavity/rim cubic boundaries. Exactly 13 preexisting wax elements are reauthored. No new nodes, no other facial modifications, no changed face identity, negative controls, paper, camera, or 300-frame duration.
- Existing Crayon ArtCraft Adult Face Lab gains 3× source nose macro and full-face stories and one selector option. Unit cases cover scene and native SSR, guard malformed anatomy and repeated passes, verify side asymmetry, source ordering, and negative-control preservation. Chromium A/B renders same-frame 1× and 3× against previous candidate and 3× frame 210.
- **HARD STOP:** V21 screenshot source registration, independent ArtCraft 9.1 unmodified portrait and ANAT1 human anatomy gates, five-axis hand-art review, and 300-frame real-speed acting quality remain unverified. Technical proof or screenshot production does NOT certify realistic crayon portrait. Keep PR in draft and do not merge.
- Next priority: examine actual identical-resolution 1× photos and macro 3×, fix residual dark sticker effect and wax layering; independently score candidate vs source. After a natural nose passes, correct mouth/teeth, eyelid/iris, cheek/skull, jaw/neck, hair and animation.


## Independent actual V21 native browser visual rejection — 2026-11-15

Exact [run 43805244661](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43805244661), artifact 14198985779. Chromium produced source-registered 608×1082 1× and 3× A/B frame299 and a frame210 material-progress sample. All Chromium cases passed structurally. Independently inspecting source vs actual pixels, **V21 is rejected**: root/near sidewall turned into a long muddy diagonal dry-hatch smear not present in the real three-quarter photograph, while nostrils still look like detached shaded stamps. The far nostril and graphic lips/eye/scalp were not corrected. Textural anatomy failed despite deterministic rendering.

Simple diagnostic (scikit-image RGB SSIM on exact matching native screenshot; this is NOT the unmodified ArtCraft 9.1 gate):

| Region | V20b | V21 (rejected) | Expected threshold of official portrait gate |
| --- | ---: | ---: | ---: |
| Full 608×1082 | 0.362006 | 0.360766 | ≥0.85 |
| Nose x340–493/y570–684 | 0.562831 | 0.527002 | 1× artist sign-off also required |
| Broad sidewall x340–413/y534–645 | 0.659273 | 0.576006 | Source-specific matched anatomy required |
| Dorsum x367–434/y554–620 | 0.693739 | 0.632173 | Source-specific matched anatomy required |
| Septal underplane x412–451/y627–664 | 0.519475 | 0.488100 | Source-specific matched anatomy required |

Independent RGB MAE: sidewall 21.6→27.3 (worse), near recess 49.1→39.6 (improved), full image still ~84.2. None supports releasing a realistic portrait.

V21 source and Storybook tests: new CRAYON1 Vitest cases PASS, TypeScript and Storybook source guard PASS; broad mixed suite 662 passed/16 failed (13 pre-existing RISO23/26/30/31 assertions and 3 unrelated timeout cases). No new Crayon failure detected. Native drawing grammar PASS.

### Corrective V21b on current draft head

Reduce broad dark bridge/sidewall stroke force, remove erroneous 148px left-cheek stripe and locally constrain warm sidewall, restore reddish near/far alar flesh while maintaining all 13 semantic shapes, subtle grain, exact V20 recess controls, and unchanged photo source/film. New browser proof must independently compare V20b / V21b in natural 1×/3× pixels and reject again if disconnected. This is a corrective source-volume iteration, not a finished face.
