# RISO18 — Original Risograph print handoff, transfer, and receiver ownership

ArtCraft v7 applied 2026-11-15. This work builds on RISO16 (one continuous printed paper contour) and RISO17 (opaque source-authored finger-over-paper ink). It introduces an original deterministic performance grammar, **not** a new generic rendering engine, photorealistic paper simulation or new human faces.

## Authentic medium and hand-contact references

| Reference (rights: study only) | Observed source details | Construction / negative control |
| --- | --- | --- |
| [Studio Rosi — *Tabak* by Kilian](https://studiorosi.de/products/tabak-by-kilian), original four-color Riso print | Hands form unequal curved enclosing loops; interior digit contours follow knuckles; the bright pale center remains unprinted and separate inks have visible registration | Keep the 7 actually authored rig-linked finger paths per actor, four **closed** contact silhouettes plus three blue engraving groups. Never fabricate extra mittens or make the body translucent |
| [The Printhaus — *Hope This Email Finds You*](https://www.theprinthaus.org/ph-courses/beginners-riso-printing), photographed authentic two-color print | Red and blue hand imagery is deliberately overprinted, with fine pressure marks, separated small motifs and opaque white paper field | Preserve physically solid paper behind printed red finger pads, independent blue line details and existing stable screened plate texture |
| [Illinois Risograph Printing Guide](https://web.faa.illinois.edu/app/uploads/sites/6/2021/05/riso_print_guide.pdf), technical print guide | Each color pass can misregister; trapping protects thin adjacent edges; overprint and knockout are distinct print decisions | Reuse `RisoPrint` existing per-plate ink registration. Paper knockout and the visible outline use the **same** changing SVG path, with 1.25-unit finger trapping |
| [MICA Riso Image Making and Printing](https://www.mica.edu/campus-life-and-resources/places-and-spaces/maker-spaces-fabrication-studios/2d-prototyping-studio/riso-image-making-and-printing/), technical process | Independent single-color masters and preprint grayscale are the cause of material layering, not a postproduction texture filter | Preserve the exact two original printable masters throughout the transfer; no RGB screenshot blend or stochastic animation flicker |

**Limit:** These are references for *material technique and static hand topology*, not a real multi-frame motion source. Gesture timing, the 45° receiving tilt and transition arcs are original art direction and must be judged from actual motion renders. No third-party art is copied/traced or bundled. No claim of source-matched five-axis metrics without licensed source masks and actual aligned final crops.

## Animated performance and topology contract

A source rig has a world-space hand root; a receiver rig has another. The paper is one connected printed shape. Its right edge reaches the receiving hand at frame 160. Rather than artificially stretching between both people's hands indefinitely, it transitions through a staged release driven by an **absolute time** and measured fixed-film hand positions. The resting material vector is the **release-frame source-to-receiver vector rotated about the receiver**. The final sheet follows the receiver alone; it cannot be yanked back by later source movement.

| Film frames (default 24 fps) | Stage / ownership | Source hand | Receiving hand | Visible physical change |
| --- | --- | --- | --- | --- |
| 0–125 | Awaiting | No sheet | No sheet | Both actors remain fully opaque |
| 126–159 | Unfurl / source | Owns growing letter | Reaches | One contour unfurls from the source; receiver edge pressure grows only near first contact |
| 160–177 | Shared / both | Finger-over-paper contact | Finger-over-paper contact | Opposing edge pinches and screened folds remain; printed letter fully extended |
| 178–201 | Release / both transferring | Grip relaxes; fingertip ink stops overprinting when letter separates | Anchors far edge | Paper free end eases smoothly to a receiver-relative inclination; no teleport or duplicate paper polygon |
| 202–239 | Received / receiver | No longer anchors/overprints sheet | Maintains actual finger contact | Receiver carries the **same** print; final free-end pose is independent of source hand |

The schedule can be authored in Storybook: donor release frame, transfer duration, and resting paper tilt. Both 16:9 and 9:16 use the same scene logic. The stage keeps physical motion deterministic while native 24-fps Storybook playback remains optional.

## ArtCraft shape/flow/stroke/texture/continuity review

1. **Topology and connection**: each actor hand is an original evaluated rig. Paper has one source-to-end bounded contour, and recipient ownership is explicit. A release does not create a detached duplicate sheet; the final contour remains connected internally, with no extra hand or separate cutout.
2. **Vector flow**: both source and receiving roots are sampled from joint hierarchy. The paper's tangent and normal already control inset, fold and hatching from RISO16. Resting angle rotates the full paper vector, so decorative marks remain material-local.
3. **Edge/pressure**: independent `sourceGrip` and `receiverGrip` values 0–1 modulate the **two ends independently**; their local short-edge widths change smoothly without flattening the authored complex contour. Relaxed glove contact never becomes digital alpha transparency.
4. **Temporal rhythm**: anticipation/unfurl → double-contact hold → easing release → follow-through held pose. `smoothstep` balances beginning and end with zero scalar slope. The paper's release baseline comes from an absolute sampled frame, never a mutable elapsed-time accumulator.
5. **Microtexture**: use already authored blue contour/fold screen, red postal stamp and fine hand engravings. Paper grain and plate misregistration remain seeded and frame-stable, not newly generated temporal noise.

## Tests, negative controls, acceptance

- `tests/riso18-paper-ownership.test.tsx`: two ratios; phase states; grip/ownership; donor-independent final position; smooth frames 159→160, 177→178, 201→202; direction change; seek determinism; 0–1 pressure bounds and invalid timing.
- Existing RISO14–17 character and paper tests still apply. The Playwright Storybook script captures critical frames across both ratios and checks that Courier's front grip **disappears** after release while Paper Artist's remains, with configurable release and angle controls.
- Negative control to reject: original RISO17 forever attaches both paper edges to living actor hands, even when the donor walks away. Another invalid implementation simply fades the donor ink over the paper while the object still tracks their wrist.
- Technical CI and Storybook source parsing do **not** equal visual fidelity, real-world grip force simulation, collision correctness, 1×/3× artistic approval or normal-speed cinematic acceptance. Those require real rendered screenshots/MP4, first-contact and release close-ups, external-source review, and independently checked film pacing.

## Next craft priorities

Physically coherent finger-gap cloth/paper compression and collision response; original human 3/4/profile anatomical source views subject to ArtCraft v7 portrait source gate; calibrated dot gain using rights-cleared physical scans; 30–60-second narrative with ambient foley and a full normal-speed two-ratio film export.
