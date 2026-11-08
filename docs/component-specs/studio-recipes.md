# Studio Recipes: finished product shots in React Three Fiber

**Scope:** Nine video recipes for crafted 3D subjects, each a pure function of `frame`, so every one scrubs, seeks and exports frame for frame. Research, sources and the full list of planned recipes are in [doc 31](../31-react-three-fiber-content-plan.md).

| Recipe | Component | Job |
|---|---|---|
| Product Hero Turn | `ProductHeroTurn` | Introduce an object. It turns into its best angle, holds, and then one claim appears |
| Part Spotlight | `PartSpotlight` | Explain one part. Push in, outline it, dim the rest, and name it with a leader line |
| Exploded View | `ExplodedView` | Show construction. Pieces slide apart along the assembly axis, hold, and nest back |
| Finish Compare | `FinishCompare` | Compare versions under identical light and an identical camera |
| Two-Angle Proof | `TwoAngleProof` | Show a mechanism from two cameras at the same moment |
| Screen Comes Alive | `ScreenComesAlive` | Demo an interface. Push into the screen, let one flow perform, and pull back |
| Step Inside | `StepInside` | Bridge chapters. The screen is a window into a world, and the camera goes through |
| Physics Point | `PhysicsPoint` | Make a point with physics. Dominoes for cause and effect, stacks for a comparison |
| Many Into One | `ManyIntoOne` | Reveal an identity. Particles gather onto the real surface, and the subject builds in under them |

## Install and inspect
- Registry item: `studio-recipes`. It depends on `fiber-stage` and `crafted-3d-hero`.
- Storybook: **Video production → Studio Recipes**. Each story shows the recipe with the output of `inspectStudioShot` under it.
- Catalog: `npm run catalog:find -- --query="product turntable"` finds them, with their jobs, rules and settings.

## Minimal usage
~~~tsx
import { createSmartphone } from "@/components/domains/technology-3d";
import { ProductHeroTurn } from "@/components/visual/studio-recipes-react";
import { inspectStudioShot } from "@/components/visual/studio-shots";

const spec = { durationFrames: 210, yawFrom: -80, yawTo: -32, settleFrame: 72, offsetX: .24,
  claim: { text: "Built to be held", sub: "Machined aluminium, glass on both sides", enter: 80 } };
inspectStudioShot("hero-turn", spec); // [] when the timing and text pass

<ProductHeroTurn frame={frame} fps={{ num: 30, den: 1 }} create={() => createSmartphone()} spec={spec} studio={{ look: "strip" }} />
~~~

## How it works
- **Turntable, not orbit.** The camera stays facing the studio, and the subject turns about its own centre, with its contact shadow turning under it (`useStudio().turn`). The seamless sweep stays behind the subject from every angle, and the light glides across the surfaces as the subject turns, which is how product films are shot. Every recipe's pose function returns `{ pose, turn }`.
- **Studio looks.** `createHeroStudio` takes `look`:
  - `softbox`, the default and unchanged;
  - `strip`, two tall strips that draw highlight lines down metal and glass;
  - `rim`, a dark stage drawn by edge light;
  - `high-key`, bright and nearly shadowless.

  Each look sets the reflected softboxes and the key, fill, rim, kicker and sweep levels together.
- **Part highlight.** `createPartHighlight` marks the part in the stencil buffer, then draws a screen-space line and a faint halo only around it, over everything. The line stays visible where a part sits flush on a surface. The part gets private copies of its materials, so dimming the rest never dims a part that shares a material with the body.
- **Rendered-bounds text check.** `PartSpotlight` projects every mesh of the subject each frame and compares the label's box with them. It writes the result on the label as `data-km-text-overlap`. An automated check reads it at the rendered size.
- **Exploded plan.** `explodePlan` works from the real geometry, not the padded studio bounds:
  - Pieces at a side edge (buttons, ports) move straight out.
  - The other pieces are layers, ranked along the thinnest axis and spread to equal gaps either side of the anchor nearest the middle.
  - Pieces at the same depth share a rank.

  Framing widens from the assembled extents to the exploded extents.
- **Several views on one canvas.** `CompareViews` draws one scene through several cameras into scissored rectangles, with shared models and materials. Each pane turns its own subject on the turntable before drawing.
- **Screen Comes Alive.** The interface is a `paint(ctx, w, h, frame)` function in 390-wide design pixels, painted through `bindScreenSurface` as a pure function of the frame. While the screen is the subject, the display takes an anti-reflective coat (low environment reflection and clearcoat), because a softbox mirrored across the interface washes it grey. Parts listed in `hide`, such as a lock-screen notification, are hidden.
- **Step Inside.**
  - `createPortal` draws the second world through the stage camera, carried through the window (the display's centre and facing) to an anchor in that world. The view through the screen therefore has true parallax.
  - When the screen fills the frame, the two pictures match, and the recipe draws the world full frame.
  - `stepInsideState` picks the world scale, so the dolly's speed at the crossing equals the world move's starting speed. The world camera leaves level, as the window camera arrived, then eases into a 4° look down.
  - `createDuskMeadow` is a seeded golden-hour world: a gradient sky with a sun, haze, rolling hills with a worn path, backlit crafted trees, distant ridges, and instanced meadow grass and wildflowers. The grass is densest along the camera's route and stays within the vegetation module's vertex budget.
- **Physics Point.**
  - `npm run physics:bake` solves the scenes in `physics-shots.ts` with Rapier's cross-platform deterministic build (a dev dependency only, pinned at 0.21.0, Apache-2.0). It writes a `BakedPhysicalActionSpec` per scene to `assets/physics/`. Two runs give byte-identical files.
  - A body waiting for its release is out of the simulation and hidden (scale 0), so waiting pieces never touch.
  - Pieces are released just above where they land. The first bake dropped blocks from 1.8 m, and the stacks bounced apart.
  - Contact cues carry their impact speed, which sets each tap's gain.
  - The recipe samples the bake with `sampleBakedPhysicalTrack` at any frame.
- **Many Into One.**
  - `sampleSurfacePoints` spreads points over the subject's visible meshes by area, with a seeded source. It sets the sampler's random generator at run time; the bundled types lack it.
  - The `assemble` particles gather onto those points. A clipping plane rising through every material builds the subject in from the bottom, while the particles fade over the same frames.
  - The contact shadow stays hidden until the subject exists.
  - Particle size is scaled to the subject's units: a subject measured in centimetres needs about 30× the scale of one in metres.
- **Depth precision.** Clip planes are fitted to each pose (`clipPlanes`), so layers a fraction of a millimetre apart, like a display under its glass, do not dot through each other.

## Contracts
- Text never enters before the camera settles. Each text beat stays up long enough to read: about three words a second plus 0.8 s. `inspectStudioShot` reports breaks as `studio-text-before-settle` and `studio-text-short`.
- Turns above 30°/s get a warning, and above 45°/s an error. Holds under 1.5 s are an error.
- `FiberStage` gains `shadows` (filtered PCF) and a stencil buffer.

## Accessibility
- Each recipe has a `label`, and a default describes the shot. Text is real DOM, sized from the frame height (`cqh`), with `tone` for pale backdrops.
- For reduced motion, render the hold frame. Every recipe has a still, readable frame after the camera settles.

## Evidence
- Seek checks: Storybook frames were reached by scrubbing out of order, and each frame waited on `data-km-fiber-drawn`.
- Rendered in Playwright's default Chromium, full page. Centre-pixel alpha is 255 on every recipe.
- The spotlight label reports `data-km-text-overlap="false"` at the poster frame.
- **Human visual review is pending.** Code checks and screenshots do not certify the look.

## Limitations
- `explodePlan` handles stacked and side-mounted pieces. It does not plan nested mechanisms (a gear train) or curved assembly paths.
- The label check measures mesh bounding boxes. It is conservative around angled parts and does not measure silhouettes.
- Step Inside: at the crossing, the mean brightness steps about 6% (measured from frame 95 to 96: RGB means 138/112/83 to 130/107/80). The cause is not found yet. It falls at the dolly's fastest moment.
- The phone's front glass is built behind its display, so in its exploded view the black glass leaves before the display. That comes from the asset, not the recipe.
