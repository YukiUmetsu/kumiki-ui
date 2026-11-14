# Dragon, creature rigs and illustrated architecture — crayon-film craft study

**Date:** 2026-11-14. **Scope:** crayon material-native Film Looks in Kumiki UI.
The sources below are production talks, showreels, published animation instruction
and creature-animation case studies. They are comparison references, **not**
copyright-clear assets to copy, nor proof of independently watched full videos
at normal speed.

## References and useful craft decisions

| Reference | What the source documents | What Kumiki should reproduce *as technique* |
| --- | --- | --- |
| [Olivier Staphylas — How to Train Your Dragon Animation Development](https://vimeo.com/410611055) | Character lead describes building a chest/neck/head BodyFlap control alongside Simon Otto's wing cycles; the reel covers run, flight and performance tests. | Coupled but independently tuneable wing, chest, neck, jaw, head and tail controls; wings must not simply rotate as two rigid flaps. |
| [Evan Boucher — Dragon animation reel](https://vimeo.com/350854916) | Dragon-specific weight, custom walk cycle, additional body-muscle jiggle rig and coordinating multi-dragon staging. | Secondary masses, planted feet, staggered moving joints and multiple independently posed actors. |
| [AnimSchool — Follow Through and Overlap](https://blog.animschool.edu/2024/04/19/follow-through-and-overlap-animation-tips/) | Distinguishes lead/follow action, secondary movement and successive breaking of joints. | Delay the wing membranes, whiskers and consecutive tail segments in an absolute-frame, deterministic hierarchy. |
| [Gnomon creature walk workshop](https://www.cgchannel.com/2021/08/discover-how-to-animate-a-creature-walk-cycle-in-maya/) | Four-legged fantasy creature walk workflow includes hip/foot, wing, neck and head animation. | Do not treat a dragon as a scaled human body: articulate each fore/hind leg and preserve a believable contact line. |
| [NYFA — dragon flight mechanics](https://www.nyfa.edu/film-school-blog/maya-60-minutes-craig-caton/) | Notes overlapping outer-wing motion and imperfect natural symmetry. | Independent far/near wing tracks with deliberate phase offsets and independent squash/stretch. |
| [Cal Friesen — dragon reel / body mechanics](https://www.therookies.co/entries/34498) | Creature work documents fox-based pounce references and challenges of coordinating quadrupedal wings/tail/overlap. | Build separate pose sections for feet, wings, tail and head before refining expressive body motion. |

The original CRAYON1 rig already had parent transforms, held-frame drawings,
named facial poses, contact-pinned anchors and analytic two-bone connectors.
It did not support independent X/Y squash on each rig node or authoring a
per-part pose lag as a reusable grammar field. Also, the available original
showcase scenes featured one dominant actor with comparatively simple
environmental geometry. A full three-actor scene is the appropriate next
integration and compositional QA case.

## Delivered slice: Dragon & The Village

**Timeline:** 330 frames at 30fps (11 seconds), more dynamic than the
450-frame construction study. Storybook defaults to **1.2x** playback, while
the film renderer still evaluates exact absolute frames at native 30fps.

**Art direction:** warm ivory crayon paper; separately drawn stone and timber
clock observatory with slate spires, two different roof types, carved arch
entry, working-looking clock face, gallery balustrade, repeated stone coursing,
leaded-glass windows, cottages and pathways. Foreground character palette
remains distinguishable from lighter architectural wax.

**The dragon:** independent three-link tail rig, two asymmetrical wing
membranes with vein paths, silhouette spines, scales, four legs and separate
claws, neck and head chain, articulated jaw, horns, whiskers, eye and discrete
blink/smile keys. The second animal is a red-scarfed forest friend, whose
existing original facial artwork is reused under a separate actor identity
with new independent action. The third is an original owl with wing flaps,
facial disk, eyelids, feather tufts, talons and an independently animated
tail.

**Reusable CRAYON1 grammar:**
- `motionLagFrames: 0..24` delays only a node's own authored motion keys,
  while respecting deterministic absolute seeking. This produces overlapping
  action with no incremental spring state.
- `placement.scaleX/scaleY` and `motion[].scaleX/scaleY` (each .4–2) add
  validated, pivot-relative anisotropic deformation for breathing, wing
  folding and landing squash. Both SVG and anchor/world-space math use the
  same nonuniform scale so attachments remain coherent.
- The neutral JSON renderer and original wax material are unchanged apart
  from these opt-in controls; existing authoring works without conversion.

**Storybook:** `Video production / Film Looks / Crayon Scene Engine`
has **Dragon Village**, **Dragon Village Portrait** and a **Dragon Village Duo**
variant. The controls expose wing strength, architectural detail, follow-through
delay, palette, number of characters, paper tooth, seed, playback speed,
scrubbing, chapters and loop. A character identifier is independent of a
location, aspect ratio or colored material.

## Important limitations / next quality gates

1. The showpiece is an **authored stylized 2D rig study**. It does not implement
   true inverse-kinematics grounding for all four dragon feet, skeletal skin
   weights, wing-membrane simulation or physically realistic flight.
2. Lagged motion keys are deliberate artist-controlled *secondary action*;
   they are not simulated muscle elasticity. Contact solving, collision,
   antenna/whisker deformation and real nonuniform skinning still need work.
3. More advanced architecture should move toward reusable design grammars
   (roof courses, arches, dormers, perspective-aware tiling) instead of
   hardcoded copies of specific castle coordinates.
4. Full-length audio-synchronized, encoded 16:9 and 9:16 production film
   inspection, profiling of every frame, and explicit human artistic
   signoff remain separate from automated Storybook Chromium screenshots.
5. Future art passes should emphasize spatial hierarchy, natural foot
   contacts, controlled overlapping silhouette strokes, and hand-redrawn
   crayon variation on each exposure instead of digital grain alone.

## November 14 craft-detail pass: anatomy and surface structure

The initial Dragon Village passed deterministic correctness and real-browser
qualification but its zoomed output showed a simplified dragon flank and
comparatively schematic towers. Additional reference analysis focused on
**structural, material-specific detail**, rather than arbitrary micro-noise:

- [Monika Zagrobelna / Wacom: Dragon Anatomy](https://community.wacom.com/en-us/how-to-draw-dragon-monika-zagrobelna/):
  layered shoulders, thigh and neck muscles; wing membranes stretched between
  articulated fingers; secondary horn and tail volume. Applied as separate
  torso/flank/neck scute fields, overlapping anatomy lines, wing ribs,
  leading-edge shading, horn growth rings and cheek detail.
- [Sir John Soane's Museum: Adam Gothic Tower](https://collections.soane.org/ARC15177):
  architectural vocabulary includes lancet openings, pinnacles, crocketed
  gables, crenellations and plate tracery. Applied selectively as carved
  voussoir arches and keystone, lancet tracery, roof coursing, stone joints,
  clock ticks and timber door hardware — with intentional material hierarchy.
- [Philadelphia Museum of Art: descriptive media terminology](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf):
  wax crayon exhibits visible binder deposition and clumped/picked-up ends.
  Therefore small line overlays remain translucent, uneven, directional,
  and subordinate to paper pores rather than solid black comic outlines.
- [Carleton University: Representation of Media](https://people.scs.carleton.ca/~mould/papers/crayon.pdf):
  wax deposition, wax height, paper relief, pressure and smearing inform an
  eventual multilayer physical material renderer. **Not implemented here**;
  the current work is an economical shape-aware 2D construction system.

### Reusable geometry, not per-character hardcoding

`src/video/crayon-craft-detail-patterns.ts` provides three pure, bounded
SVG subpath constructors: interlocking hand-offset scale fields, staggered
masonry/mortar courses, and roof-tile strokes that stay within pitched
triangle bounds. Their authored density is controlled by the existing
`villageDetail` setting (0.25–1). Multiple marks are merged into a
single contour rather than hundreds of mounted React SVG nodes. The
neutral CRAYON1 grammar, actor rig transforms and wax renderer do not
need new scene-schema fields.

New details are nested under the correct rigs: scales follow the body,
wing highlights follow wing membranes, neck scutes follow neck motion,
cheek texture follows the head, and owl feathers follow the breast and
wings. Architecture overlays inherit their tower, cottage or roof
transform. This prevents textures from "floating" away during authored
character movement or camera push-ins.

### Storybook visual inspection and remaining needs

Added Film Looks stories for **Dragon Anatomy Detail** (landscape and
portrait) and **Castle Masonry Detail**. These select deterministic
close-up camera compositions, without creating separate source art or
changing the 330-frame film duration. Both detail views remove in-frame story lettering. The dragon view
isolates the dragon from buildings and other actors; the architecture
view isolates the built environment from the cast. The wide-film
version retains every original actor and architectural element. Storybook Controls expose
`shot: wide | dragon | architecture`; the close-up shots are important
because tiny markings that look impressive at 100% browser zoom can
reduce to unreadable specks in a 960×540 export.

Full 11-second encoded output and an independent art review are **not
guaranteed by Chromium stills**. A future pass should add continuity-safe
scute shading through major poses, genuine wax deposition physics, wing
skin deformation, cast-to-environment contacts, and layered parallax.
