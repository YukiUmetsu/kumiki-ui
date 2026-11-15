# RISO27 — source-faithful, physically printed handoff film review

**ArtCraft 9.1 status:** motion inspector and two-ratio source continuity candidate; mechanical and sequential rendering gates in CI; independent human source-likeness/proportions gate **not approved**. This iteration reviews the *actual* film artifact instead of treating isolated head stills as a performance.

## Source and reference

Original authored **Courier** and **Paper Artist** are the identity sources. Their 2D front-view head shape, engravings, hair, original arms/hands, IK legs and 240-frame pose data remain the only permitted character geometry. Never pretend the repo includes a full source-backed 3/4 or profile view.

External authentic printing/animation technique studied (not copied or redistributed):
- [Zine Hug, *Crushed!* printed 21-panel contact sheet](https://zinehug.com/products/crushed-contact-sheet): neighboring drawings preserve eye/helmet silhouette and materially distinct two-ink shapes while the expression and head angle move. Principle: inspect adjacent frames, not four pretty poses.
- [Zack Lydon, *Wind*](https://www.catsuka.com/news/2024-06-23/wind-nouvelle-anim-en-riso-par-zack-lydon-imprime-par-zinehug-pour-tvpaint): consistent proportions, printed grain and secondary hair motion across a sequence. Principle: retain identity through timing and holds.
- [Ink Sundae Risograph multi-pose sketchbook](https://qdymag.com/event-story/41): coat, face and limb silhouettes stay readable in two inks while human pose varies (this source is **printed character sketches**, not a proven animation clip).
- [Zine Hug animation production archive](https://zinehug.com/pages/animation) and [Megan Chong printed animation portfolio](https://www.meganchongdesign.com/work/riso-animations): production is arranged as actual individual printable frames; rhythmic source marks and film sampling should not be replaced by screen-space random noise.

Study and source/rights observations: [reference-study](riso27-sequential-acting-reference-study.json) · [character-frame structure](riso27-sequential-acting-character-structure.json).

## Original source motion model

- **240 original source frames at 24fps = 10.0s**. Both actors keep their original body, face, knee/ankle, individual finger joints, original blue/red print masks and RISO26 graded facial spot masters.
- **Physical paper path** is `evaluateRisoHumanEnsemble(f,aspect)`: source right-hand endpoint and recipient left-hand endpoint, same outline for paper cutoff/ink, source-local compressions and articulate-digit front overprint on contact. Transfer phases are `unfurl f0–159`, `shared f160–177`, `release f178–201`, `received f202–239`. Paper starts to unfurl at **f126**, even though the phase label remains “unfurl” before then.
- Existing `HumanEnsembleActing` Storybook **same folder and ID** now contains nine source beat markers and an absolute-frame ±1 inspector, 16:9/9:16 controls, red/blue plate split, paper deformation controls, and a 24fps wall-time film player. Unlike a repeated `setInterval` callback (slows under SVG pressure), the player picks frame from monotonic elapsed source time; it **holds frame 239**, because an immediate 239→0 wrap visibly teleports the finished scene to the beginning.

## Actual Chromium render inspection — first source pass

[Full original 16:9 + 9:16 browser proof run](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43749270232), actual native SVG screenshot samples at f0,24,48,76,96,120,125,126,134,144,152,159,160,168,177,178,186,190,194,201,202,218,238,239. The film was inspected at a 24-frame contact sheet and 1× source screenshots. The animation of the original two humans is visibly authentic to its existing source paths; this does **not** mean its source anatomy matches an external real person.

**What holds:** Full original blue and red spot colors stay registered on the scene, actor faces do not evaporate, the donor/receiver paper grows continuously f126→160, the sheet remains a physical opaque object, the hand-over-paper print contact visibly holds through f177–201 and the final sheet stays in the recipient's hand after f202. The distinct eye/hair actors remain recognizably separate in 16:9.

**High-priority visual rejection:** The **9:16** opening at f0 crops part of Courier hair/ear against the left edge because portrait staging started at `x=0` and `scale=1.2`. At the actual release/received frames, the Courier advances so close to the Artist that bodies and facial silhouettes crowd together; this makes the paper contact illegible. This is a *layout and actor-placement* defect, not a demand to delete detailed hair or redraw characters.

**RISO27 corrective staging:** In portrait only, move Courier origin to **x=30**, artist to **x=405**, and preserve clear source scale at **1.1** for both. The original authored IK/source path shapes and desktop 16:9 placement remain untouched; this is an independently controllable two-subject camera/stage preset. Add a source-mesh spatial test of the original head contours at 12 milestone frames to reject any clipped head or overlapping skull. Re-render the same 9:16 reference frames; do not claim the fix until actual Chromium confirms it.

**Remaining aesthetic defects, deliberately not hidden:** Courier's locomotion still has a low, wide-legged caricature gait even while giving the paper. The original bodies have large heads and simplified coats/gloves relative to portrait references. Smoother easing or print shaders are not substitutes for better source anatomy, a stronger arrival/plant foot performance, independently measured original character proportions, and genuine side/3/4 authored art. These require a separate source-led character craft iteration, not unsupported claims of complete human quality.

## Gates and evidence

- `tests/riso27-motion-film-continuity-artcraft.test.tsx`: all original 240 absolute frames in **both** aspect ratios; phase/ownership, 24fps duration, monotonic release, donor-independent final paper geometry, full source part identity, exact replay/seek, external screen bounds and actor head isolation.
- `tests/e2e-storybook/riso21-ocular-print-artcraft.spec.ts`: Chromium actual 16:9/9:16 stage, motion film sample screenshots at all significant phase boundaries, independently rendered physical red/blue masters, source-bound actor and finger overprints; Play tests final 239 hold, deliberate replay and frame stepping.
- **Mechanical test passes are not film artistic approval**; inspect actual source screenshots and contact-sheet board before merging. A human-anatomy ArtCraft v9 measured source-mask/landmark gate is unavailable (no rights-cleared identity reference, no true original 3/4/profile). Do not invent test data or claim certification.
