# Interaction Choreography and Shot Bake

**Registry items:** `interaction-choreography`, `shot-bake`
**Source:** `registry/motion/interaction-choreography.ts`, `registry/motion/shot-bake.ts`
**Implements:** the `character-interaction` row in [10 — Character Animation](../10-character-audio.md).

## Purpose

Describe what actors do with shared objects, and get exact, repeatable frames. The evaluator owns contact. It does not draw anything.

## Interaction

```ts
const result = compileInteraction({
  schemaVersion: 1, durationFrames: 120, fps: { num: 30, den: 1 }, timing: "natural",
  actors: [{ id: "host", position: [0, 0, 0], yaw: 0, height: 1.7,
    effectors: { hand: { rest: [.2, .9, .1], shoulder: [.2, 1.4, .05], reach: .7 } } }],
  objects: [{ id: "cup", position: [.4, .9, .3], grips: { handle: [0, .05, 0] } }],
  ops: [
    { kind: "grasp", actor: "host", effector: "hand", object: "cup", grip: "handle", startFrame: 10, contactFrame: 30 },
    { kind: "place", actor: "host", effector: "hand", object: "cup", to: [.1, .9, .4], startFrame: 40, contactFrame: 70 },
    { kind: "release", actor: "host", effector: "hand", startFrame: 74, endFrame: 95 },
  ],
});
```

- An object is at rest or held by one effector. The grip stays on the hand for every held frame.
- Gaze starts before the hand. `timing` sets the lead, anticipation, overshoot and arc. It can be a name or your own profile.
- `place` accepts `releaseHeight` and `fallFrames`. Use them when an actor cannot reach the surface. The object falls the rest of the way, and the contact event fires on landing.
- `bendable` objects flex from motion and settle with a damped spring.
- Compile walks frames forward once and stores them. `evaluateInteraction` is a lookup, so any seek order is identical.
- Errors are diagnostics, not exceptions: `unknown-actor`, `unknown-effector`, `unknown-object`, `unknown-grip`, `object-not-held`, `object-already-held`, `effector-busy`, `out-of-reach`, `frame-range`.

## Shot bake

`bakeShot` joins an `InteractionPlan`, `evaluateCharacter` and a CC1 sequence into `ShotBakeV1`: one JSON document with one entry per frame. `interactionCameraTargets` gives CC1 moving subjects. Part entries are `CharacterPartState` values. The head part also has `yaw` and `pitch` degrees. Name each effector's part in `limbs`, so a held limb leaves walk cycles and gestures while IK owns it. The rig's own `variantFrom` and `variantMix` pass through. `variantFadeFrames` blends any other changed drawing in over that many frames, so an expression or blink does not pop.

CC1 uses Three.js math, so run `bakeShot` offline. Do not import it in a video export bundle.

## View angle guard

Flat art has one view. Set `maxViewAngle` on an actor, and the bake fails with `actor-view-angle` when that actor is in frame beyond that angle from its facing. `viewAngleExempt` lists frame ranges where a camera move may pass an actor. Fix a failure by moving the actor out of frame or changing the shot.

## Limits

Single-arm IK target per effector. No foot IK. Add `gait` to an actor so legs follow real ground travel: one cycle per `stride` metres, so feet do not slide and legs stop when the actor stops. Do not use a flat rig's fake-depth `walk` action in a 3D shot. No collision between objects. Reach checks run only when the actor does not move before contact.

## Evidence

`tests/interaction-choreography.test.ts`, `tests/shot-bake.test.ts`. Real render evidence belongs to the consumer's shot.
