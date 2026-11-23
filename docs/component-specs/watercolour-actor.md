# Watercolour characters — WM3 performer integration

**Registry pack:** `watercolour-actor` (depends on the existing `character-presenter`)  
**Storybook:** none since #245 (2026-11-14) retired `Painted Character Performance`; the film slot and its unit tests remain. A moving watercolour performer is shown in `Video production / Film Looks / Universal Rig` (Watercolour look).  
**Film:** `examples/film/watercolour-character.film.json` (16:9 and 9:16)  
**Art review:** not signed off; encoded full-length 16:9/9:16 review and source-model fidelity remain open.

## Intent

WM3 is an **adapter**, not a new animation engine. It layers a reusable, frame-addressed stage actor and local watercolor material onto Kumiki's versioned `CharacterDefinition`, `CharacterInstance`, `CharacterCue`, `evaluateCharacter` and `CharacterPresenter`. All existing animation (walk poses, arm gestures, gaze targets, facial expressions, blink events, viseme/speech cues and optional image variants) stays owned by the character system. Each component can be independently authored and revised.

The stage actor provides authored feet positions, physically legible ground contact, segment-based stride counts, body lean, contact shadow, scale, rotation, facing and independently configurable drawing-on-ones/twos/threes cadence. The root position interpolates every frame while the existing rig evaluator is sampled at `rigFrame`. Stage and material responses derive only from the absolute frame and fixed parameters.

```tsx
import { WatercolourActor } from "./components/video/watercolour-actor-react";
import type { WatercolourActorTrack } from "./components/video/watercolour-actor";

const track: WatercolourActorTrack = {
  id: "traveller", stage: { width: 960, height: 540 },
  cadenceFrames: 2, stepLift: 8, leanDegrees: 2,
  keys: [
    { frame: 0, x: 430, y: 480, scale: .75, facing: "right", stepsToNext: 6 },
    { frame: 180, x: 770, y: 480, scale: .75, facing: "right" },
  ],
};

<WatercolourActor
  track={track} definition={approvedCharacter} instance={characterInstance}
  cues={storyboardCues} frame={absoluteSceneFrame}
  watercolourMaterial={{ granulation: .7, bleed: .4, tooth: .8, seed: 29 }}
  label="Character walking through a painted environment"
/>
```

The supplied instance's `instanceId` **must** equal `track.id`. The component never generates a rig, synthesizes speech, loads assets, changes a character identity, or initiates playback. Source photos and external images remain their original medium unless separately painted.

## Authenticity & accessibility

The optional `watercolourMaterial` added to `CharacterPresenter` applies fixed-seed, local SVG paper edge displacement and subtle pigment softening independently to each articulated vector drawing. A mouth drawing stays tied to the face through speech cues. These are **stylized** approximations; the implementation does *not* solve per-pixel pigment diffusion or repaint every character frame. Image assets are not misrepresented as material simulation. Keep the original approved rig, expressions and art revision pinned.

The presenter remains a single labeled image for assistive technologies; internal layers are decorative. `reducedMotion` holds the final stage pose, stops gait bounce and disables the existing rig's idle/blink animation. Text belongs in a separate protected reading layer and never inherits the painted material.

## Tests and QA

- Pure `inspectWatercolourActorTrack` and `watercolourActorAt`: key validity, facing, foot-lift, final hold, cadence and random/backwards seeks.
- Unit integration: original multi-part test performer, speech/mouth variant, gaze/blink, arm/leg cue events, per-part SVG effect and invalid material rejection.
- Production integration: one portable FD1 film, both output sizes, shared production `watercolour-actor` slot; Storybook and CLI use the same `PaintedTravellerPage`.
- Browser checkpoints: lift/stride/wave/speech/hold, exact seek replay, 16:9 and 9:16 close-up captures. Short encoded proof is only **one** export gate; visual acceptance requires a full playback review.

**Next:** add explicit hand-to-object and foot-to-ground attachment points; improved weight transfer, squash, turnarounds, secondary cloth motion, hand-painted redraw variants, realistic pigment settling and genuine wet-on-wet pigment-field compositing. These features are not claimed as complete.

**Reference research:** [Watercolour and brush film-reference study](../research/watercolour-brush-film-techniques-study.md). All demo artwork is original and does not reuse third-party film frames or music.


## Interactive Storybook production look authoring

Storybook groups the original, deterministic FD1 demonstrations under **Video Production → Film Looks → Watercolour & Brush** (the third was retired in #245):

- **Painted Film**: both brush-authored subjects, 16:9/9:16, seeded paper, tooth, water, pigment load, dry brush, brush width and color; select any frame or play the full film.
- **Any Subject Painted Film**: four independently authored subjects (nature, architecture, science, product), water, pooling, granulation, opacity, paper tooth, backrun strength, paper color and seed.
- **Painted Character Performance** (retired; film slot only): keyed motion path, feet and gait, redraw cadence, character definition (part assets, expression and viseme variants, palettes, channels), cues, instance, material seed/granulation/bleed/tooth, painted environment, visibility, title copy and reduced motion.

Each story offers a **validated advanced JSON editor** for the *complete* underlying per-subject configuration, with copy and reset. Editor changes are local to Storybook; to render with those changes outside Storybook, copy the authored JSON into a versioned application/film fixture. One film-format choice rebuilds source dimensions, clearing overrides from the other aspect. Quick controls resume from their current values when an advanced override is reset. The film clock and portable production fixtures are unaffected. See \`tests/watercolour-film-looks-parameters.test.tsx\` and \`tests/e2e-storybook/watercolour-film-looks.spec.ts\` for UI validation and playback coverage.
