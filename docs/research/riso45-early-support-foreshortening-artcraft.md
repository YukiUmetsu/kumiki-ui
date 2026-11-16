# RISO45 — supporting finger foreshortening before the paper is received

Continuation from merged RISO43–44 #456. **Source-drawing iteration**, not a picture filter, copied character, removed microdetail or flattened vector. Existing original RISO44 full-film native Chromium f160 (actual 16:9 screenshot, see run `43808914231`) shows the receiving hand's middle/ring/little fingers extending beyond the physical page like three red rake tines; the index correctly prints above while the opposed red thumb prints behind the page. The RISO42 support finger PIP/DIP bones do curl, but the receiver's **+6 frame delay** means the support fingers are still extended while the sheet first touches them at f160. They only finish curling at f166, after the paper has already arrived. This is a storytelling/anatomical timing defect, not missing visual ink.

## Reference-led construction (not traced)

| Reference | Actual observed lesson | Original RISO45 source intervention |
| --- | --- | --- |
| [Proko — Details for Realistic Hands](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/) (copyright artist, technique study) | Thin edge pinch involves radial thumb/index and supporting three fingers folding gradually into palm. Intermediate PIP and distal DIP have distinct staggered angle, not a held straight rake. | Strengthen each source digit's PIP/DIP bend separately and close support bones **before** index finishes f166 precision pinch. |
| [Proko — Muscle Anatomy of the Hand](https://www.proko.com/course-lesson/how-to-draw-hands-muscle-anatomy-of-the-hand/) (copyright artist) | Cupped little and ring fingers project shorter and more curved than index; thenar thumb web remains in a separately opposed plane. | Keep thumb IP and RISO43 physical 2-ink z-order unchanged; no artificial red overlay over paper. |
| [Kumiki ANAT1 HAND_POSES.grip](../../registry/anatomy/anatomy-pose.ts), original repo source | Five digit clinical ROM constraints and asymmetric real 2-bone wrist/finger hierarchy. | Raise existing support PIP gain slightly, DIP separately, within 60% original joint limit and without changing source joint lengths or red path geometry. |
| [RISO43 actual generated 16:9 close-up](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43808914231) (original work) | At 1× the red support tines protrude beyond receiver edge, even though true index–paper red contact is connected. | Retarget support only: left support PIP/DIP reach full curl f160, index source remains 6 frames delayed and physically bridges real paper at f166. |

## ArtCraft medium fidelity and source geometry

1. **Topology:** preserve all three-stage **closed red physically printed phalanx SVGs** and attached cobalt nail/tendon source drawing per support digit (9 moving red sections per hand). No detached replacement path, no actor alpha overlay. Preserve original named IK skeleton and source-scale transforms.
2. **Volume:** middle PIP ≈38°, ring ≈42°, little ≈46° at contact, distinct DIP flexions 19–26°; not identical or anatomically impossible copied bends. Source motion only, the existing textured cobalt/red C/Q Bézier contour geometry remains untouched. Old 32–45° PIP with late receiver index timing made the outside tines.
3. **Paper contact/occlusion:** original RISO40 page edges stay at exact real thumb-IP/index-DIP midpoint; RISO41 physical red pad gap controls screen pressure; merged RISO43 index-above, thumb/support-below physical letter stack remains. All source-closed SVG intersections with the actual curved film page in RISO44 QA remain true.
4. **Temporal rhythm:** support anticipates f146 and arrives full fold f160 (first receiver physical contact). Independently delayed actual index pinch remains full f166; late motion f186/205/239 unmodified. The source 24fps figure animation and original 2-frame screen sampling remain.
5. **Medium/microtexture:** two genuine spot inks with independent screening, exact vector trajectories and paper pores, no Gaussian flattening, red patch sticker or new palette. Preserve all previous original face/hair and hand source detail.

## Verification / constraints

- `src/video/riso31-finger-phalanges.ts`: source joint gain and per-digit receiver support timing only.
- `tests/riso45-support-digit-foreshortening.test.ts`: checks observed live support f154→f160→f166 pose, original ANAT1 clinical bounds, *every* two-frame source fan clearance for both actors/hands, 12 real red-digit sections and real physical RISO44 source-index–paper contact at f160/f166 in **both film ratios**.
- RISO32–44 inherited tests run in scoped CI with full Storybook native Chromium images, separate real RED/BLUE plates and 16:9/9:16 whole-film f0..239.
- **Artistic release still needs visual review:** compare f156,160,166 in full film and f160/166 6.2× hand workbench. Numeric ANAT1 ROM cannot by itself certify photographic three-quarter hand anatomy, correct individual landmarks, or actual pressure force. No comparable annotated photographic source exists; do not claim world-class hand likeness from green CI.

The ArtCraft skill package is not discoverable among installed skills in this chat runtime; this specific iteration uses its recorded repo craft/visual fidelity criteria rather than pretending the packaged skill has been executed.

## Native screenshot iteration — genuine drawn MCP angle correction

The first native RISO45 result (CI `43809960455`, f160) showed that simply increasing true ANAT1 PIP/DIP flex and making the support finger curl arrive f160 rather than f166 was visually *nearly identical* to the RISO43 rake. Do not call a change artistic improvement without comparing actual pixels at full film scale. The three upright fingers were controlled more strongly by **projected MCP pose** than by PIP/DIP alone.

Original Paper Artist MCP source joints therefore get **three distinct** radial/source-space bends by first paper contact, in its actual actor skeleton rather than on pasted hands: middle +34°, ring +30°, little +26° added to their original moving keys, easing from a true neutral f146 anticipation. Their source MCP roots spread by +3/1.25/0 local x at peak so index/middle red contours keep a separate paper-white corridor. The source two-frame fan contract detected collision at f140 and later f152 before both fixes: fixing true key timing and original MCP-root abduction—not lowering test thresholds—removed the defects. The Courier's non-gripping left hand was deliberately left unchanged, preserving distinct performer gestures and content continuity.

Final f160 before/after crops were independently inspected using native Chromium proof `43811336245`; the receiver's three-finger fan is more horizontally projected into the short page-edge region, retaining visible 2-spot red segmented digits and deliberate negative-space gaps, but **the upper 3-digit silhouette remains overly splayed** and the thumb/index still looks like a stylized claw rather than a convincing photographically grounded folded hand. This PR is acceptable as a bounded original-ANAT1 2D timing/foreshortening source improvement, **not** the definitive figure drawing. Future original draw pass: sustained thumb-index side-contact volume, individualized short 3/4 finger turnover, paper-edge occlusion of support tips, and independent photographic landmarks. Do not smudge/delete source linework, relabel a redraw as photorealistic or weaken the axis gap source test to make it green.

This source-specific fix retains 40 originally authored hand parts, the original paper geometry and all nested physical ink screens; the visible original Storybook title is updated to RISO45 without a new gallery.
