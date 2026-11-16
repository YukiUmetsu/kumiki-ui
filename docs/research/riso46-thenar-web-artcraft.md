# RISO46 ArtCraft source study — original sculpted radial thumb / palmar web

**Status: original source-art candidate; no independent photographic anatomy or artistic release approval.** Continuation of the merged, screenshot-reviewed RISO45 (#457), which still presents a rake-like recipient finger fan and an angular thumb/index knot at the 6.2× native physical-print close-up. Do not mistake a new path count for fidelity.

## Source board (technique study only; no third-party pixels embedded)

1. [Evan M. Cohen — *Bloom* risograph, printed by Risolve Studio](https://evanmcohen.bigcartel.com/product/bloom): original hands reach and turn into botanical stems; varying wrist pressure, alternating positive fingertip pads and purposeful paper-white interdigit corridors. Distinct spot colors stay visibly separate at crossings. **Observation:** a web is an S-shaped volume transition, not a triangle, and distal fingers need unequal silhouette flow.
2. [Kat Schneider — *Pride & Prejudice Hands*, mini Risograph](https://www.katschneider.com/store/prideandprejudice-hands): compact negative-space hand gesture with anatomical knuckle steps; ink dense at structural edges and quiet at the inner palm. **Observation:** macro palm/cuff contour remains readable before decorative texture.
3. [MICA — *Risograph File Prep*](https://www.mica.edu/campus-life-and-resources/places-and-spaces/maker-spaces-fabrication-studios/printmaking-studio/risograph-file-prep/): each color is a distinct grayscale stencil master; physically printed tone comes from area coverage, not an RGB opacity slider. **Implementation:** retain the original cobalt + vermilion separated spot masters and AM-screened light/mid engraving. No generic bitmap noise.
4. [University of Illinois — *Risograph Print Guide*](https://web.faa.illinois.edu/app/uploads/sites/6/2021/05/riso_print_guide.pdf): successive ink passes drift; trapping, knockout and overprinting produce specific edge behaviors. **Implementation:** retain original white-web reserve, calibrated print misregistration, original RISO43–44 index-above/thumb-below opaque page sandwich.
5. [Proko — *Details for Realistic Hands*](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/) and [*Muscle Anatomy of the Hand*](https://www.proko.com/course-lesson/how-to-draw-hands-muscle-anatomy-of-the-hand/): thenar eminence rises from thumb CMC and merges with the palmar metacarpal arch; a thumb-index commissure curves inward while the radial thumb opposes the index. **Implementation:** edit *original* CMC red silhouette and add observed, side-specific thumb-borne ink ribbons; no borrowed photographic likeness.

## Five-axis drawing deconstruction and decisions

| Gate | Observed problem in real RISO45 | Authored correction | Negative control |
| --- | --- | --- | --- |
| Topology | Original thumb base is a sharp 2–3 cubic wedge; blue thenar engraved on palm only. | Redraw actual proximal thumb as a contiguous, 4–5-C organic shoulder and re-entrant tendon region; add two changing *thumb-joint* source contours and one separately rooted palm-web recess. | Thumb/palm must never become a pasted, viewport-anchored sticker. |
| Forms/depth | Opposing 2D tip pads read as triangular knot against the page. | Three distinct form bands (CMC red screened load, lightly engraved radial tendon, short darkened palm S-recess) under existing independent red IP + blue nail sources. | Do not promise photoreal 3/4 hand or smudge the remaining visible rigid joint forms. |
| Vector rhythm | Parallel horizontal fingers and equal geometric strips create an artificial rake. | Long C-shaped radial flow along the thumb, shorter countercurved web incision and two very small terminal crease gestures; courier sharper, artist softer; opposite hands independently curved. | Avoid same-shape fan stamps, ink-only noise, overdraw that erases existing detail. |
| Material/edge | Display-only gradients or blur would break actual printable two-master structure. | *Only* original cobalt/vermilion screenTone light/mid paths, retained original paper and halftone; preserve printed stencil edge and registration controls. | No third color, bitmap source, opacity trick, drop shadow or flattened SVG. |
| Animation | Hand rotates during paper delivery and would detach unjointed drawings. | New thumb ribbons inherit the real moving `left/right-thumb` joint; web returns to `left/right-hand`, evaluated at original f0..239 on exact 2-frame print cadence. | No local animation clock; no change to original IP/contact/ownership keys. |

## Direct source impact

- `src/video/riso32-thumb-ip.ts`: replace just the two old proximal red 2D thumb outlines with more anatomical multi-plane rounded originals. Distal thumb IP geometry, all existing actor/print details and timing preserved.
- `src/video/riso46-thenar-web.ts`: three new physically printed side/actor-specific authored source paths per original hand; seven or more C turn segments per set. Explicit source inspector verifies joint attachment, exact source identity, real stamped two plates and inherited motion.
- `src/video/riso-hand-artcraft.ts`: append new artwork without deleting legacy RISO30–45 etching, nails, PIP/DIP regions, flex/pressure marks or full film.
- `src/video/riso30-human-hands-studio.tsx`: same existing Risograph Storybook hand workbench, with real source geometry/plate/transform QA attributes and existing frame, zoom, both-plates/split-plates, screen density and actor/hand controls.
- `tests/riso46-thenar-web.test.ts`: source assets, per-actor/hand topology, all original 120 sampled 2-frame cels, two spots, and both film ratios across six pinch stages. Existing full RISO32–45 suite and native Playwright screenshot workflow must pass.

## Release gate and remaining work

1. **Functional**: clean TypeScript, RISO46 + earlier suite, full original Storybook/native Chromium, 16:9 and 9:16 stage f0/f126/f156/f160/f166/f177/f202/f239. Never weaken existing 3-source-unit interdigit gap or true paper-contact tests.
2. **Independent visual**: inspect **actual** native zoom 1× full film and 6.2× hand in both physical split masters, side-by-side with RISO45 f160/f166, at least two seeds/registration states. Reject if the extra web reads as an isolated dark marker, thumb knot remains a claw, or silhouettes seem pasted.
3. **Artist status**: the source-first change is provisional until inspection; **do not merge solely because CI is green**. No verified matched-view three-quarter photo landmarks were supplied. Future RISO47 should reconstruct the broader support metacarpal mass and source 3/4 foreshortening, not pile ink on a bad shape. Hold independent visual and rendering QA before claiming character completion.

This source study describes observed techniques; no source image is redistributed, used as a stroke texture or traced.
