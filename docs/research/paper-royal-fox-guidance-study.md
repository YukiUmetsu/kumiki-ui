# Fox guidance: motion study and staging diagnosis

Status: research and diagnosis, **not** an approved animation or a completed ArtCraft motion gate.

## References inspected

- [Lubo Ondrasko, red fox looking for a mouse](https://commons.wikimedia.org/wiki/File:Red_fox_(Vulpes_vulpes)_looking_for_a_mouse.webm), 2014, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The Commons record reports automated license verification but notes that additional copyright issues need human review. Original WebM SHA-256: `d4f83ce4218eb58f259d3b8b7ed53b61650faad567e037e54d75b464bcd51c0b`. A sampled overview and a 3 fps crop of approximately 12–18 seconds were inspected. The fox moves in profile with alternating foreleg positions, a relatively level spine, a low head and trailing tail. Grass occludes feet and the subject is small: these samples do not establish precise paw contacts, joint angles, or natural-speed gait timing. This is a hunting approach, not a reference for leading a person.
- [Gabriele Brancati, fox in slow motion](https://www.pexels.com/video/fox-slow-motion-15795015/), [Pexels license](https://www.pexels.com/license/). Downloaded file SHA-256: `94b2697db76fd316e8a496e1470a63c4ea2f9dcb55cc6f70993aeb63576be255`. A 1 fps sheet shows the fox approaching in three-quarter view, with alternating visible forelegs. The source is explicitly slow motion, so its playback timing is not a natural gait clock; it does not establish a lateral walk.
- [Gabby, *The Fox and the Crow* puppet study](https://medium.com/@gacker/project-3-9d40230086e3). The inspected seated paper fox has a continuous torso, curled tail, hinged foreground foreleg and a distinct jaw. Its image SHA-256 is `7fc8cd05150cda6d772a224ce4a7d18b233f8c9615759e89dddf7d6695cf5e76`. Rights are unverified; it is linked only as a construction reference, not included in the project. This is a still, not a walk-cycle reference.

No reference pixels or traced contours are distributed here. The sources inform separate questions: live-animal movement, paper overlap and staging. None alone validates an original paper walk or the intended narrative.

## Existing act-two diagnosis

At commit `e475ed6a`, sampling `evaluatePaperCraft` for the layered scene with seed 37 and motion 1 shows the fox body pivot moving from x=120 to 148 in landscape while the prince coat pivot moves from x=665 to 613 over local frames 0–239. In portrait the corresponding positions are 100→128 and 370→318. The characters approach from opposite directions; these pivot measurements do not prove foot contact or visual legibility. The current fox has two broad leg sheets attached to the translating body, without independently animated stride joints. Moving the whole fox farther therefore risks visible foot sliding. Existing portrait framing also risks overlap with the prince's boots and foreground scenery.

## Next construction decision

Find a permitted side-view reference with sufficiently visible feet and independently record support and swing intervals, then produce a source-informed part and pivot plan that preserves the fox's detailed silhouette and stock overlaps. Test foot position in scene coordinates through declared support intervals and inspect both aspect ratios at motion extremes and normal speed. Design a shared direction, readable spacing and a deliberate look or cue between the actors. The portrait scene already reaches the 128-layer limit, so resolve the layer budget without deleting detail or silently raising the limit. A staged still, the motion evidence, and independent visual review are required before treating the guidance beat as finished.
