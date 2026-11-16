# RISO39 — genuine opposed index/thumb joint pose, paper-edge pinch (ArtCraft v9)

**Art director scope:** The original RISO37/RISO38 live source photographed via Chromium shows four fingers extending as a parallel rake and a hooked thumb **more than one finger-length from the index tip**. The two characters are passing a printed letter, but the existing human hand IK/source part geometry lacks convincing projection of a sheet pinch. This pass changes actual **moving source bones** and physically printed red thumb attachment, not another decorative highlight or 2D photo filter.

## Actual source references, individual hand observations, rights

| Observed reference and rights | What can be observed | Source-level design requirement |
| --- | --- | --- |
| [Proko: How to Draw Hands from Imagination](https://www.proko.com/course-lesson/how-to-draw-hands-from-imagination-step-by-step/). © artist, process-study only. | Four MCP digits have staggered root positions and a three-bone fan. The mobile thumb metacarpal projects diagonally and the web changes shape when fingers close. | Keep distinct original MCP/PIP/DIP/CMC/IP bones, not one driven mitten transform; rotate only **index** into the gripping action, preserve independent other finger animation. |
| [Proko: How to Draw Hands – Muscle Anatomy](https://www.proko.com/course-lesson/how-to-draw-hands-muscle-anatomy-of-the-hand/). © artist, anatomy drawing study. | Thenar thumb muscle **originates at wrist**, extends toward index web; a pinch brings tip pad toward index contact while the thumb base retains broad palm connection. | Move real thumb IP pivot distally inside the inherited red proximal path; preserve red overlapping joint cap, blue nail attachment and source hand surface. |
| [Proko: How to Draw Hands – Details for Realistic Hands](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/). © artist, technique study. | When pressing a slim object, the curved index finger may fully flex at PIP/DIP; palmar pads compress, dorsal plane stretches and nail bed follows the distal wedge. | Key the **existing** index PIP/DIP to clinical ANAT1-bounded near-grip flexion rather than 36% shallow rake, keeping RISO38 physically printed distinct phalanges. |
| [Business Hand Holding Blank Paper, stock visual](https://www.gettyimages.com/). Getty/photographer rights; not downloaded or reproduced. | Four digits can appear partly behind the white sheet while radial thumb opposes the index area; cuff and upper forearm retain physical connection. | Frame actual 16:9/9:16 full-figure handoff and compare native source grip, not just isolated 6× ink stamp. |
| [Lale Westvind, *Grip vol. 1*, authentic printed Risograph](https://www.perfectly-acceptable.com/item/grip/). © artist, material-only inspiration. | Crisp spot ink can cross fingers while each hand silhouette remains an intentional, legible shape; physical print registration is material response, not a fake disconnected line. | Preserve the RisoPrint two separate inks and paper knockout, independent blue / red masters and real high-frequency screen. |

**References are technique references only.** No third-party image is traced, copied into source SVG, downloaded as a runtime texture or asserted to depict the exact Kumiki hand.

## Structural diagram and constraints

Original source axes: palm-local +x radial across the glove, +y down finger-length; opposite hands mirror index MCP/phalange flexion signs; source frame 160 donor right, 166 receiver left. PIP is a distinct joint between the proximal and intermediate red silhouettes, DIP is a distinct joint between middle and distal; thumb IP is a separate bone carrying its own red pad and moving blue nail.

- **Old source defect**: thumb IP pivot local `(±3.3,-1.15)` relative CMC, i.e. above the base instead of toward the paper and index. This placed the 5.6-unit distal pad high on the radial edge, visually a detached/hook-like spur.
- **New original source**: thumb IP pivot `(±3.3,+2.15)`; same real offset radius, 2.4-unit hidden red caps, bounded ANAT1 thumb IP rotation and physical detailed thumb pad.
- **Old source index**: donor MCP −7°, receiver +7° at contact and index PIP only `ANAT1 pinch × .36`, DIP `× .36 × .66` — close to an extended, parallel printed rake.
- **New anatomy action**: index MCP donor −29°, receiver +29° with 1.3 source-unit inward grip contact shift *near the real thumb web*, and distinct keyed release 178f. The real index PIP reaches up to 94% of its ANAT1 clinical flex maximum (cap 104°), the DIP up to 87.5% of ROM maximum (cap 70°); both remain bounded, and original source red knuckle/nail linked to actual changing joint.
- The original middle/ring/little finger fan and all figure IK and page/letter ownership are not reauthored. The 0–239 character film clock and two output ratios remain.
- **Independent image/check requirement**: ink clearance must stay connected; new closest red thumb/index tips should approach compared with relaxed frame but not be mistaken for actual physical 3D grasp or tactile pressure.

## ArtCraft five axes

1. **Topology:** real originally connected palm→MCP→PIP→DIP/fingertip, thumb CMC→IP→distal pad. 12 non-uniform solid vermilion finger sections and thumb's distinct two regions remain.
2. **Flow:** index bone loops toward thumb via a rounded C-shaped gesture with entirely independent joint rotations; source proximal bony and palmar fat profiles from RISO38 and blue drawn RISO37 crease flow remain intact.
3. **Weight:** no opacity fade or RGB overlays. Thin paper is represented by the existing physical paper knockout; all glove material keeps `red solid` with actual RisoPrint gain and registered cobalt pressure.
4. **Timing:** donor peaks f156–160, receiver f160–166, release begins f178, settle f198; actual source bones deform on every interpolated frame, not click-switched screenshots.
5. **Texture:** RisoPrint spot-ink dot gain, independent plate registration, original red phalanx scallops, distinct blue C/Q nail/tendon engravings and grain remain. No invented third plate.

## Instrumentation / release

- `src/video/riso39-opposed-paper-pinch.ts` reports **real evaluated FK/IK world tip-to-tip distance** using actual moving thumb IP and index DIP joint matrices, plus real red SVG silhouette edge gap and local MCP/PIP/DIP joint flexion. It is a transparent 2D-projection QA proxy, not a claim of correct unseen third-dimensional hand.
- Existing original human hand Storybook exposes `data-km-riso39-...` actual contact numbers and physical red/blue print, no new gallery.
- Tests assert original source IK validity, source-red continuity, ANAT1 joint flex boundaries, motion-driven contact vs rest, absence of cross-finger source-axis self-intersections, and all meaningful release frames.
- Native Chromium proof captures actual f0/f160/f166/f178/f186/f198 ink masters and both whole-film 16:9 and 9:16 views.

**Unresolved:** precise 3/4 thumb-index opposition, sheet edge bending and pressure, realistic palm tissue squash and individual photographic likeness remain unverified. The v9 human anatomy landmark+mask fidelity gate requires comparable source and target images with independently annotated evidence, unavailable here. Do not certify from passing unit/print tests alone. Release remains visually held pending Chromium review.
