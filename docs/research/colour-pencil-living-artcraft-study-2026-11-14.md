# ArtCraft study — portrait, people, animals and scenery (2026-11-14)

Reference mode: **style-guided**. These are artist-owned artworks, studied for craft. No third-party image assets, extracted contours or copied paintings are checked into the repository. Source-rights approval for redistributing high-resolution crops is unavailable, so use the linked pages as the reference board rather than importing them.

## Reference board (primary sources where possible)

| Subject | Artwork / source | Studied visual construction | Craft mapping |
| --- | --- | --- | --- |
| Portrait, face | [Néstor Canavarro, Iggy Pop (artist project)](https://www.domestika.org/en/projects/387589-iggy-pop-in-colored-pencils) | Expressive eye sockets, nose highlight, asymmetric folds and selective pores; hair has real directional strokes | Separate eye white, iris, brows, nose alar, lips and face planes; a skin-stipple material with restrained low-pressure layering |
| Portrait, many faces | [Néstor Canavarro, portfolio](https://www.behance.net/gallery/53508807/Colored-Pencils-Portraits) | Real faces vary in age, skull proportions and hair/skin rhythm | No single reused circular eye or primitive nose; author landmarks before texture |
| Portrait, micro | [Jesse Lane portrait study at The Art Guild](https://www.theartguild.org/home-2/the-portrait-in-colored-pencil-workshop-with-jesse-lane-june-13-14-2020) | Thin eyelashes and hard wet glints contrast smoothly layered cheek colour | Two eyelid planes + independent iris detail and narrow glints |
| People, full environment | [Anna Hammer, Chasing Dreams (Koh-I-Noor feature)](https://www.kohinoorusa.com/anna-hammer) | Seated human body has weight, sleeve/hand occlusion, dark skirt folds and architectural scale | Bust + garment support in this pass; full-body skeleton and hand-to-cloth contact remain future work |
| Skin process | [Jasmina Susak, portraits with coloured pencils](https://www.jasminasusak.com/blog/how-to-draw-portraits-with-colored-pencils/) | Broad base tones precede targeted warm/cool detail | Material pressure/colour separation is controllable, pore-like marks stay restrained |
| Fox | [Claire Milligan red fox (reposted, provenance secondary)](https://www.pinterest.com/pin/realistic-color-pencil-animal-portraits--322570392056721110/) | Skull/neck/chest meet continuously; fox eyes sit inside dark lid values; tail and legs carry different hair length | Anatomically staged head, ear inserts, ruff, muzzle, nose, legs and tail in original fox |
| Animal eye, muzzle, ears | [Gemma Gylling wildlife methods, instructor source](https://www.craftsy.com/class/colored-pencil-techniques-for-wild-animals) | Fur growth changes direction and length around ear, cheek, chest and face | Form-aligned quadratic hair tracts, with separate ocular, nose and whisker regions |
| Animal hair | [Gayle Mason, The Cat Next Door process](https://bristle.studio/tutorials/how-to-draw-fur-with-coloured-pencils/) | Many thin directional colour layers; no uniformly sprayed static | Local root→control→tip hair guides, not global stipple |
| Wildlife and scenery | [Ann Kullberg Feb. 2026 kingfisher by Corinne Vuillemin](https://annkullberg.com/blogs/ann-muses/february-2026-showcase-colored-pencil-artwork) | Fine plumage against a less-detailed, separated habitat | Different contour and value density between focused subject and background |
| Animal in vegetation | [Ann Kullberg July 2026 hare by Jan de Ville](https://annkullberg.com/blogs/ann-muses/july-2026-showcase-colored-pencil-artwork) | Detailed animal interwoven with correctly sized flowering plants | Need credible overlap and distinct material mark scales, not a single procedural texture |
| Forest scenery | [Alena Kaygalova, Forest waterfall (artist listing)](https://www.saatchiart.com/art/Drawing-Forest-waterfall/1462763/7160431/view) | Distant thin trees, near heavy trees, stone banks and moving water | Distinct cool mountain tiers, distant canopy, nearer hierarchical conifers, winding water, rocks |
| Landscape | [Peter Weatherill, Alum Bay and the Needles](https://www.pencil-topics.co.uk/landscape-in-colored-pencil.html) | Atmospheric pale distance and saturated foreground | Near/far hue, texture density, branch size and water ripple spacing vary with depth |
| People and water | [Ann Kullberg Jan. 2025 Paraná by Néstor Canavarro](https://annkullberg.com/blogs/ann-muses/january-2025-showcase-colored-pencil-artwork) | Sun on wet skin and wave highlights belong to one scene illumination | Unify reflected glints and cast shadows under one environmental light in future passes |

The image pages do not grant reuse rights. Observations describe visible form and cited technique, not exact pixel or colour measurements. Reference-pixel fidelity is neither attempted nor claimed.

## Source / anatomy / topology plan

### Human original portrait, 22 regions
Authored object-local landmarks (not source-derived ratios): far eye (~178,205), nearer eye (~268,205), nose bridge (~238,237), alar accents (~237,265), lip center (~236,301), chin (~244,344), and skull top (~y90). A near-eye aperture is wider to describe a mild three-quarter orientation. The region manifest names back hair, coat, neck, ear, main facial plane, temple, cheek, eye whites, irises, eyebrows, nose, upper/lower lips, crown, left/right hair locks and collars. Skin gets an opaque paper-support layer and its own low-pressure stipple. Iris transparent recipe overlaps a fully opaque white, so the background cannot appear through the face. Curved hair shafts are locally rooted, contiguous paths, with independent scalp and side clumps rather than dozens of disconnected lines.

**Limits:** no genuine face likeness, normalized turnaround, precise nasolabial planes, individually articulated expression, full-body gesture, hands or fabric-contact simulation. A stylized portrait study is not human portrait photorealism.

### Red fox original anatomical plate, 21 regions
Head 105–313 x, 96–270 y; near eye ~257,194; nose ~210,232; forepaws ~y406; tail roots behind the torso. Named forms include body, separate fore/rear legs, dark long tail and pale tip, chest, neck ruff, skull, far/near ears with inset cartilage, dark eye mask, light muzzle, near/far eyes, nose and rooted whiskers. Hair tracts follow specific cheek, shoulder, body, tail and neck vector fields. The fur guides are hand-staged quadratics with bounded seeded width offsets and stable colour.

**Limits:** no true osteology, no joint/turnaround validation, whisker roots require actual macro pixel inspection, paws lack individual detailed digit geometry.

### Alpine river valley original plate, 17 regions
Sky, cool far skyline (peaks around y119–200), nearer mountains, layered forest (y240–334), meadow, bank, widening river (from ~y334), two river rocks, foreground shore, wildflowers, and **six pines**. Four near trees range 123–189 paper units high and two far trees 68–74 high. Each pine owns one trunk and fourteen attached alternating left/right branch arcs. Ripples are horizontal and increase in size toward the viewer; mountain forms are cooler/paler than foreground plants.

**Limits:** no full lighting model, perspective/river refraction verification, individual photogrammetric trees, natural branch overlap acceptance or measured image fidelity.

## Reusable craft API and negative controls

Existing generic material recipe API now offers four additional semantic, opaque profiles: skin, hair, foliage and water. Its former eleven surfaces retain their prior defaults. A sixteenth non-occluding glaze was added after visual-risk review, preventing paper-white face patches. The separate flowBundles utility takes authored root, control, tip, bounded count and spread. It rejects degenerate and non-finite guides, and emits seeded curved SVG pencil marks without timing jitter.

**Rejected shortcuts:** circles for eyes without eyelids, straight identical hair fans, uniformly spaced toe-like fox fur, detached whisker dots, tree-shaped green triangles without rooted branches, uniform high-frequency landscape noise, and a single global texture pasted over every material. Use geometry hierarchy first; texture second.

## Verification and remaining ArtCraft gates

- Regression unit tests: six landscape/portrait compositions, 16 material profiles, face landmarks/part inventory, animal part hierarchy, conifer branch topology, bounded deterministic strokes, mixed transparent/opaque regions and invalid inputs. Existing object and wildlife tests remain unchanged except where material count extends.
- Existing Storybook root: Video Production / Film Looks / Colour-pencil. One interactive **ArtCraft · Portrait, fox and landscape** story with aspect, study, pigment pressure, grain, seed, speed, absolute frame, reduced motion and local macro focus. No extra Storybook folder.
- Browser suite (manual/opt-in): six full-size and six macro screenshots, shuffled frame seek and opacity checks. The proof workflow retains manual dispatch rather than increasing routine CI cost.
- Open **ArtCraft v6 acceptance**: source and candidate crops at matched resolution, five-axis semantic masks (topology, curvature, stroke-width, motif spacing, texture frequency), independently inspected rendered contact sheet, full-speed video exports, user-independent visual review and explicit defect/fix loops. A green test run is **technical implementation only**.

Next target: revise the face's eyelid depth/nostril topology after actual macro crops; animate a complete character body with proper hand and clothing geometry; add species-specific tail/whisker direction; repair pine/river depth and sunlight in a full filmed sequence.


### ArtCraft correction during code review

The first portrait pass used the same fully opaque skin recipe for temple and cheek highlights. That would deposit a separate paper-coloured matte, risking the exact pale sticker artifacts seen in oversimplified procedural portraits. A new light-pressure **glaze** recipe has no opaque support and low opacity; the cheek and temple remain softly overpainted while the underlying solid face stays opaque. Near/far irises now contain separate pupil masses (22 named portrait parts) and small physically anchored catchlights. In the fox scene, a cast shadow was incorrectly under the opaque earth and would be erased; it has been moved above the earth and under the animal. The nose now lies over the light whisker-root muzzle patch, protecting its dark form. These repairs are code-reviewed improvements; real visual acceptance is still pending.
