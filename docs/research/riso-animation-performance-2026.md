# Risograph moving-image research — performance, print mechanics, and narrative grammar

**Date:** 2026-11-14  
**Scope:** Extend the merged RISO1 printing and transition system, **not ink wash**. Reference works remain external, credited research. Nothing from them is copied into production assets.

## Distinct reference films and production techniques

| Reference | What is documented / observable from available source | Production capability suggested |
| --- | --- | --- |
| [Hiromu Oka — HODO STATION opening](https://vimeo.com/639447319) ([Eizo100 production details](https://eizo100.jp/en/video/52457)) | 18-second sequence created by printing and scanning every digitally authored frame. Six different paper stocks, imperfect registration, graphic metamorphoses and rhythmic edit language. | **Paper-stock/per-shot changes**, separate ink plates, controlled irregular registration and frame-specific print wear; narrative scene and camera orchestration instead of a static poster. |
| [Hiromu Oka — creative process interview](https://www.youtube.com/watch?v=U0WwaiZqVF0) ([process notes](https://www.itsnicethat.com/articles/hiromu-oka-hodo-station-process-animation-051222)) | Frames prepared as print sheets, actual physical printing/scanning and subsequent animation assembly. | Optional scanned-frame/video sequence ingestion with per-frame aligned plate metadata; in native simulation, print imperfections must be stable under seek but may vary when a new sheet is explicitly printed. |
| [Yiqin Ma — SPOTS (2026)](https://vimeo.com/1234898709) | Four-color Risograph film, **115 distinct frames** printed on three sheets, then cut and reassembled. Visual transitions morph patterned skin, organic spots and fruit. | **Morphable authored silhouettes**, sparse held poses, color passes, shape/texture correspondence across frames. |
| [Dominica Harrison — Chado](https://vimeo.com/391834727) | Story-driven film uses both digital character animation and Risograph printing. Child, dog and family members act through a changing emotional narrative. | Generic hierarchical **multi-actor character rigs**, facial/eye/viseme pose swaps, gesture clips, overlapping actions and narrative staging. |
| [Jen Schier — After Later](https://www.jenschier.com/work/music/after-later-risograph-animated-music-video) | Music video: filmed musician, separated monochrome frames, printed frame sheets and stop-animated music performance. | Rotoscope/image-sequence-compatible plate adapter, **audio-synced mouth and gesture cues**, robust frame cadence and instrument interactions. |
| [John Kitses — Riso Animations](https://kitses.com/risograph-animations/) | Scanned watercolor scene with characters independently cut, reanimated, and recomposited, then separated into print colors and reprinted. | Actors and scenic plates need **separate transforms, z-order and camera/parallax**, not text hard-coded into each print. |
| [Philip Bell — Risograph Motion](https://philipbell.art/risograph-motion.html) | Procedurally animated 3D forms printed, scanned and reassembled; two-color overlays, paper crinkles/streaks, enlarged grain. | 2D/3D-to-print bridge; per-frame print wear, textural closeups and depth-inspired motion. |
| [Reya Ahmed — The Margins of Memory](https://vimeo.com/835229330) | Three animated shorts assembled from existing Risograph prints on childhood memory and changing environments. | Longer-form edited **shot collections**, temporal design vocabulary beyond cycling print-pass transitions. |
| [Mette Virala — Riso Maker](https://www.mettevirala.com/en/works/riso-maker/) | Video input separated into up to four spot colors; one can change dot pitch, dot gain, motion cadence, registration, paper grain and feed flaws. | Separate future **video-to-plate conversion** from native authored vector performance; exposure cadence, dot gain and profile controls. |
| [Adobe Live — Split Happens!](https://www.youtube.com/watch?v=kH6GO6hKVqs) | Demonstrates Photoshop channel separation and reassembly in After Effects (published chapter markers for import, plate extraction, recolor and halftone). | Output separable spot-ink plates and reusable screen presets; avoid "color overlay" masquerading as real plate separation. |

**Source-evidence limit:** These observations are grounded in the public descriptions, production articles and any available visual references. No unrestricted frame-by-frame decoding of the third-party Vimeo/YouTube films has been performed in the current execution environment. Do not invent numerical camera frequencies, fps, or exact timecodes from unread streams.

## Missing behavior in current RISO1 after PRs #151/#152

RISO1 currently composes fixed authored SVG spot-ink artwork and print-pass / paper-feed / overprint transitions. The demo subjects are graphic posters, not general films. Main missing capabilities:

1. **Multi-actor performance:** canonical identity, independent hierarchical limbs/heads, expressive facial poses, blink, talk, gaze, acting cadence on twos or threes, stable frame seeking, simultaneous actors and props.
2. **Generic scene/shot vocabulary:** data-authored actors, stationary backgrounds, signs/labels, foreground/midground parallax, camera pan/zoom, per-element depth and visibility, cross-shot state continuity.
3. **Native shape morph and deformation:** coordinated part topology and animation; looping gestures and nonhuman body plans without changing every renderer.
4. **Riso print physics:** actual print-then-scan variability, ink starvation, dot gain, roller/feed streaks, overprint-specific print density and reusable paper stocks rather than random full-screen effects.
5. **Transitions with narrative meaning:** plate addition/removal, sheet slide, print reveal, characters stepping across panels, zoom into halftone, traveling object/prop handoffs. Preserve typography readability.
6. **Film grammar and automation:** composable timeline action clips, story planning, edits to music/voice, portrait and landscape re-composition, strict accessible/copyright-safe source material.
7. **Production quality:** 30–60s multi-scene proof, normal-speed MP4 in both aspects, fast frame seek and acceptable long-form rendering cost; quality audit for temporal popping, parallax drift, paper crawling, unreadable small type, limb disconnects.

## Implementation ladder (self-contained milestones)

**RISO-CHAR1 (current PR):** A validated, data-only hierarchical actor/scene contract, keyed poses and held-cel cadence, facial variant swaps, independent actors/scenery, camera animation and a scene adapter using existing RISO1 plates. Storybook must play and scrub in 16:9 and 9:16. Provide two unrelated original subjects to demonstrate reusability. No new renderer or independent clock.

**RISO-CHAR2:** IK for foot/hand contacts, gait/action clips and state blending; blink/gaze/viseme tracks, grounded step cycle and prop ownership with shot continuity. More complex character turns require authored shape-swap variants.

**RISO-MAT2:** Print/scan layer with paper stocks, predictable frame-indexed offset profiles, dot gain, ink-starvation masks, roller wear; opt-in full-size clip/video-to-plate input.

**RISO-STAGE2:** Multi-shot narrative planner: scenery depth and character staging, actor actions, cinematographic camera keys, native plate transitions and sound cues. Produce a 30–60 second animated short, distinctly directed, with no reused reference-story arcs.

## Acceptance requirements

- Test JSON validation, duplicate IDs, parent cycles, missing plates, invalid paths, sorted keys, end-frame holds, pose cadence, seek order, reduced motion, and viewport independence.
- Review both normal and reduced-motion Storybook, browser pixels at 0/onset/mid/end and after reverse seek, and a genuine encoded FilmStage MP4.
- Verify no characters, screen captures, copyrighted prose/music or video frames are copied from references; artwork is original.
- Senior code review must include recursion bounds, path sanitization, clip/loop edge conditions, registry installation and FilmStage slot integration.
- **Visual status is separate from code status**. An installable rig foundation does not equal a completed film-grade animator until actual moving examples pass review.
