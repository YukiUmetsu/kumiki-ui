# ArtCraft — Colour-pencil character rebuild

**Date:** 2026-11-14. Reference mode: style-guided, not pixel matched. No reference art, traced imagery, source crops or proprietary work is shipped. All silhouette geometry is independently authored.

## Artist reference board and construction evidence

| ID | Primary artwork / licence | Visible construction to learn | Implemented geometric constraint |
| --- | --- | --- | --- |
| F1 | [Jo Walker, Fox in the Snow](https://www.jowalkerart.co.uk/product-page/fox-in-the-snow-original-drawing), rights reserved | Full-body fox with horizontal back, tapering muzzle, independent legs, tall asymmetric ears, dark lower legs and bushy trailing tail. Deliberately **not** an anthropomorphic standing fox | New fox silhouette is quadrupedal; long tapered muzzle, pointed ear roots and dark toe contact; near forepaw lift is brief, far leg planted |
| F2 | [Ruff Sketchings, Fox portrait](https://www.ruffsketchings.com/productpage/fox-original-artwork), rights reserved | Amber eye within directional brow hair, dense tapered cheek and white ruff strands; black wedge nose on a long pale muzzle | Separate head, ear inserts, muzzle, nose and eye; locally authored multi-curve hair-flow tracts |
| F3 | [Gemma Gylling, wolf wildlife coloured-pencil demonstration](https://gemmagylling.com/wp-content/uploads/2021/05/WolfArticle-10-2019.pdf), copyright retained | Deliberate light pigment layers accumulate volume; short fine hairs vary by growth direction and contrast | Tail, torso, cheek, ear, throat and limb fibre vectors are distinct and reproducible; no random full-screen fur shader |
| K1 | [Claire Milligan, original kingfisher and other birds](https://www.clairemilliganart.com/originalsforsale), rights reserved | Long dark pointed bill, compact teal head, asymmetric blue feather groups, copper-orange chest and branch gripping | New kingfisher with head, orange cheek/breast, black eye, spear beak, separate wings, tail and two-toed SVG subpath feet |
| K2 | [Andrew Forkner, kingfisher coloured-pencil construction](https://www.andrewforkner.co.uk/kingfisher-coloured-pencil/), rights reserved | Seven sequential anatomical stages: outline, beak/eye, head, upper wing, breast/primaries, back/tail, branch/finish | Progressive graphite, underpainting, individual fibre groups and subtle eye glint; wing/foot poses use absolute frames |
| K3 | [Corinne Vuillemin, Kingfisher, Ann Kullberg February 2026](https://annkullberg.com/blogs/ann-muses/february-2026-showcase-colored-pencil-artwork), rights reserved | High-contrast focal eye, paper scratches in feather directions, saturated blue separated from orange flank | Distinct colour-family regions, clipped curved graphite barbs, opaque body under finished pigments |
| K4 | [Leontine van Vliet, coloured-pencil kingfisher wing tutorial](https://www.youtube.com/watch?v=HV3Fc-Ro6RY), rights reserved | Primary/secondary feathers share a flowing shaft and do not form a uniformly solid blue wing | Near/far wing groups have independent layered pigment and attached curved fibre tracts, including hero-detail mode |

Only observed craftsmanship is transferred. Source pixel similarity is not claimed or measured; image redistribution licence is unavailable.

## Old characters removed

The former **8-part upright fox** (round head, humanlike arm, simple brown face and two block legs) and **7-part round generic blue bird** have been deleted from the original character scene. The old 20-part copper songbird in the Wildlife Storybook has also been removed. The old import path continues to export the **new** character scene, with no legacy geometry and no replacement Storybook folder. Existing CP1/CP2/CP3 and FD1 runtime/film interfaces are retained.

## New actor structure and joint graph

**Fox — 12 parts:** tail, attached white tail-tip, far-foreleg, torso, near-hindleg, near-foreleg, ruff, head, ear-interiors, muzzle, nose, eye. Coordinates are original actor-local authoring values, not measurements copied from a reference. Torso approximately x41–194 / y88–193; pointed skull x145–246 / y19–151; near eye x199–222 / y90–112; elongated muzzle/nose to x249; forepaws to y224. Tail extends to x-40, with stable plumage and heel roots. Fox gestures: tail pivot (72,137), forepaw shoulder (154,158), head (169,123), eye (209,100). Parent hierarchy preserves ear/eye/muzzle attachment during head tilts and blinks.

**Kingfisher — 11 parts:** tail, far-wing, torso, breast, near-wing, wing-coverts, head, cheek, beak, feet, eye. Long bill spans approximately x19–108 with 24px depth; skull y45–128; wing root (139,122); feet extend to y228 and overlap a separate static branch. The independent far wing lies behind torso; near wing inherits torso motion, while cheek, beak and eye inherit head, without double animation. Hero Wildlife uses the same actor factory (single source of anatomy) plus additional authored crown and covert fibre guides.

**Scene budget:** 12 fox + 11 kingfisher + 1 scenery = exactly 24 regions, which keeps the CP1 paper renderer within its validated limit. Wildlife uses 11 kingfisher + 4 scenery = 15. Each part has paper-backed opaque support and rooted coloured-pencil fibre texture. An independent pigmented tail-tip and separate overlapping wing coverts were added after a neutral silhouette proof exposed cartoon-like merged regions. The ensemble's old tutorial mountains/sun were removed for a clean paper-white stage and a grounded branch.

**Animations:** Fox lifts one forepaw around frames 199–251 while its other foot is planted; swishes tail around 181–275 and tilts head around 194–252. Kingfisher sweeps two wings around 173–236, tilts its head, and blinks using vertical eye squash only. All motion is evaluated from absolute frame keys, with stable paper-bound pigment; no playback state or random movement in the art engine.

## Reference-to-geometry negative controls

- Reject upright cartoon fox anatomy, disconnected cheek fibres, circular flat head, triangular fake mouth, moving foot during a planted hold, and transparent/see-through body shapes.
- Reject circular generic bird, short triangular beak, single opaque blue oval wing, paper-backdrop-through-iris, unsupported tails, wing feather tracts detaching at extreme poses.
- Compare actual full frame plus annotated 2–4x crops of fox eye/ear/muzzle, wing/eye/branch/perch. For each feature check source expectation, source rights, rendered outcome, difference, cause and attempted fix.
- Neither a green CI result nor presence of SVG paths establishes fine-art craftsmanship. ArtCraft v6 five-axis local topology, curvature, width and texture comparisons are **pending** because authorized, aligned source crops and real Chromium screenshot reviews are still unavailable in this task.

## Verification and remaining defects

Focused typecheck, Storybook source preflight, actor/wildlife Vitest and original FilmStage portable JSON equality are automated PR gates. Local opt-in Playwright now captures full-stage 16:9 and 9:16 frames and macro crops for eye and wings; no costly CI browser requirement has been added.

Open craft priorities: independently inspect actual 1x/4x rasterized character art, refine fox paw digits and muzzle, add depth-correct feather coverts at extreme poses, capture full-speed video, measure ArtCraft topology/detail axes against user-licensed source crops, and verify portrait overlays in both formats. **Not artistically approved yet.**

## Follow-up: anatomical detail integration (2026-11-14)

The earlier rebuilt side-view animals remain the source-of-truth; the new fourth fox leg is housed as a separate occluded path in the planted far-leg pigment region, the open muzzle detail carries rooted whiskers beyond the fur clip, and bird feet now have syndactyl structure with keratin scales and small hallux/anterior hooks. The near wing has seven individually authored quadratic rachis+barb families; four more live in the separate coverts. This changes **details, not CP3 part count**. The macro and reference evidence ledger is [ArtCraft micro-anatomy](colour-pencil-anatomy-microdetail-artcraft-2026-11-14.md). This work improves anatomical logic but does not certify resemblance to any source artwork.
