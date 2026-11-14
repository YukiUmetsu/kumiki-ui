# RISC1 — printable character rigs and original animated Risograph films

**Style:** Risograph / Risography. This is *not* an ink-wash or Chinese brush module.  
**Status:** First reusable animated-actor milestone. Code and optical-print material qualification are independent from artistic approval.  
**Registry:** `riso-character`, depends on existing `riso-print`.  
**Native API:** `registry/video/riso-performance.ts` + `registry/video/riso-performance-react.tsx`.  
**Production adapter:** `src/film/film-slots.tsx` (`riso-character-story` slot).  
**Storybook:** Video production → Film Looks → Risograph Characters → **Risograph · Printed Character Film**.  
**Fixture:** `examples/film/riso-animated-characters.film.json`.

## Why this exists

Previously `RisoPrint` could print and bridge two static posters, but the actor, body-part, facial and scenic changes needed for longer Risograph videos had to be hand-authored in bespoke React. RISC1 adds a **strict, portable, actor-independent data model**.

Characters remain **named, separately transformable, plate-colored parts**, not flattened RGB pictures with a Riso filter. The existing `RisoPrint` owns the paper, grain, screen dots, spot inks, per-plate registration and multiply overprint. RISC1 supplies new original artwork for each spot-ink plate at each requested film frame. No second film clock or backend is introduced.

## Contract

```tsx
import { RisoCharacterStage } from "./components/video/riso-performance-react";

<RisoCharacterStage spec={{
  version:1, id:"hello-riso", durationFrames:120,
  print:{
    version:1,width:960,height:540,paper:"#F3EAD8",seed:5,
    startFrame:0,passFrames:1,gapFrames:0,
    plates:[
      {id:"blue",color:"#225DA1",opacity:1,dotCell:7,dotAngle:25,registration:[0,0]},
      {id:"red",color:"#D85C43",opacity:.9,dotCell:6,dotAngle:-15,registration:[2,-1]},
    ],
  },
  actors:[{
    id:"friend",origin:[430,320],cadence:2,
    motion:[{frame:0,x:-80,y:0,rotate:0,scale:1},
      {frame:60,x:0,y:0,rotate:0,scale:1}],
    joints:[{
      id:"body",pivot:[0,0],
      marks:{blue:{d:"M-40 -60 L40 -60 L34 60 L-34 60 Z",ink:"solid"}},
    },{
      id:"head",parent:"body",pivot:[0,-90],
      marks:{red:{d:"M0 -30 a30 30 0 1 0 1 0 Z",ink:"solid"}},
      motion:[{frame:0,x:0,y:0,rotate:-10,scale:1},
        {frame:60,x:0,y:0,rotate:10,scale:1}],
    }],
  }],
  layers:[],
}} frame={72}/>;
```

### Data contract and invariants

- `RisoCharacterSceneSpec`: `version:1`, slug, `durationFrames`, valid RISO1 spec, arrays of `actors`, `layers`, and optional `camera`.
- Each actor has a stable `id`, absolute `origin`, 1–72 `joints` and optional `cadence: 1|2|3|4` (holding a character pose while camera continues smoothly). Multiple actors have independent action timelines.
- Joints specify `pivot` relative to parent, optional `parent`, `z`, base `marks` by real spot-ink plate, optional `variants` and keyed `variantKeys` for blink, mouth/viseme and silhouette redraws.
- Transform keys declare absolute `frame,x,y,rotate,scale` with `ease`: smooth, linear or hold; optional cyclic track requires the end key to equal the first at `cycleFrames`.
- Scene layers support authored SVG `path` or printed `text`, depth ordering, optional `screenSpace`, `parallax` and independent transform tracks. Camera keys define focus and zoom. This is sufficient for motion posters, educational explainers and the initial 2D shorts; later modules add clips, IK and asset/video-to-plate inputs.
- `inspectRisoCharacterScene(unknown)` validates identity, dimensions, missing/duplicate/cyclic joints, parent depth, bounded key counts, nonfinite transforms, unsafe SVG path data, unknown spot plates, caption constraints and sorted keyframes. `assertRisoCharacterScene` fails with path-specific diagnostics. Malformed input does not silently fabricate a character.
- `evaluateRisoCharacterScene(spec,frame,reducedMotion?)` is deterministic and frame-pure. Held poses and expressions never depend on prior playback order. The renderer keeps existing RISO1 print parameters and per-plate sheet registration.
- Reduced motion samples each scene's finished pose, with static authored captions and no independent timer.

### Production example

The 600-frame, four-shot, 30 FPS film contains two unrelated **original illustrations**:

1. **An Unexpected Postcard:** a courier walks into a printed landscape, looks around, blinks, waves and speaks while a sparrow flies and responds. Actor limbs, scarf, satchel, head, eyes, mouth and bird wing/beak have distinct transforms and redraws.
2. **The Midnight Garden:** a fox looks up and gestures to a moon moth as its wings flap, with the scene camera moving independently of held-cel actor animation.

Both are authored separately at 960×540 and 540×960, with a two-spot-ink palette; text and environment have distinct layers from performers. No stock characters, Lemo story arcs, scanned copyrighted images or third-party soundtrack are bundled.

```bash
npm run film:check -- examples/film/riso-animated-characters.film.json
npm run film:frame -- examples/film/riso-animated-characters.film.json --frame=170 --only=landscape --out=dist/riso-actor-proof
npm run film:frame -- examples/film/riso-animated-characters.film.json --frame=470 --only=portrait --out=dist/riso-actor-proof
npm run film:render -- examples/film/riso-animated-characters.film.json --frames=180 --only=landscape --out=dist/riso-actor-proof
node scripts/registry-fixture.js --item=riso-character
```

## Reference and review package

See [Risograph moving-image reference matrix](../research/riso-animation-performance-2026.md) for Hiromu Oka, *Chado*, *SPOTS*, and other films, their documented techniques and gaps. Public video sources were found, but direct decoded video frame-by-frame extraction was not available; do not present timing descriptions as independent measurements.

**Code gates:** deterministic seek, parent graph/loop validation, facial channel isolation, story compilation, installable registry dependency, low-cost TypeScript/unit/catalog/registry CI. **Visual gates:** true browser captures for different subjects and aspects, meaningful motion and freeze tests, normal-speed encoded MP4, scan/registration texture audit, typography legibility and grounded actor movement.

## Remaining after RISC1

- RISC2: action clip library, eased walk cycles, planted-foot IK, hand/prop targets, pose blending and action priorities.
- RISC3: audio-keyed visemes + eye/gaze cues, head turns with authored silhouette swaps, secondary cloth motion and character interaction constraints.
- RISOMAT2: paper-stock/ink density libraries, scan texture, print-feed/roller artifacts, real input video-to-print separation and an optical overprint/dot-gain upgrade.
- RISOFILM2: composable episodic scenes, recurring identities, depth/parallax/film grammar, adjustable native transition recipes, production proof with captions/sound and 30–60s scenes.

**Artistic honesty:** this first stage is a reusable architecture for performative print-style animation, not proof of feature-film-ready 2D character performance. It does not yet solve IK, voice alignment, morph topologies or a full print-and-rescan simulation.
