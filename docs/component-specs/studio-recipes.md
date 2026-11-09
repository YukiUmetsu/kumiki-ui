# Studio Recipes: finished product shots in React Three Fiber

**Scope:** Ten video recipes for crafted 3D subjects, each a pure function of `frame`, so every one scrubs, seeks and exports frame for frame. Research, sources and the full list of planned recipes are in [doc 31](../31-react-three-fiber-content-plan.md).

| Recipe | Component | Job |
|---|---|---|
| Product Hero Turn | `ProductHeroTurn` | Introduce an object. It turns into its best angle, holds, and then one claim appears |
| Light Sweep | `LightSweep` | Reveal a product. It waits in the dark; one strip light glides across it, its reflection travelling across the glass, and rests as the key |
| Part Spotlight | `PartSpotlight` | Explain one part. Push in, outline it, dim the rest, and name it with a leader line |
| Exploded View | `ExplodedView` | Show construction. Pieces slide apart along the assembly axis, hold, and nest back |
| Finish Compare | `FinishCompare` | Compare versions under identical light and an identical camera |
| Two-Angle Proof | `TwoAngleProof` | Show a mechanism from two cameras at the same moment |
| Screen Comes Alive | `ScreenComesAlive` | Demo an interface. Push into the screen, let one flow perform, and pull back |
| Step Inside | `StepInside` | Bridge chapters. The screen is a window into a world, and the camera goes through |
| Physics Point | `PhysicsPoint` | Make a point with physics. Dominoes for cause and effect, stacks for a comparison |
| Many Into One | `ManyIntoOne` | Reveal an identity. Particles gather onto the real surface, and the subject builds in under them |
| Becomes | `Becomes` | A visual simile in time. One object dissolves into particles that fly to another and build it: a bear becomes a bull |

## Install and inspect
- Registry item: `studio-recipes`. It depends on `fiber-stage` and `crafted-3d-hero`.
- The specs, camera math and craft checks are in `studio-shot-model` (`studio-shots.ts`, `light-shots.ts`, `physics-shots.ts`, `place-shots.ts`). That item has no renderer and no npm dependencies, so a film document checks a shot in Node.
- In a film, a recipe is a `shot-3d` scene. See [Film Document → 3D shots](film-document.md#3d-shots).
- Screens that perform, for `ScreenComesAlive`, are in `screen-paints.ts`. `paintWeeklyEnergyScreen` is the story's screen.
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
- **Piece labels.**
  - `labels` names pieces in a side column, shown while every piece is apart.
  - Each leader line ends near its piece's top edge. Stacked layers share a centre on screen, but their top edges are staggered.
  - Slots are taken in order of each anchor's angle as seen from the column, so the lines fan out without crossing. `stackLabels` keeps a minimum gap and keeps the column inside the frame.
  - The first try ran every line to the piece centres, which met at one point. The second ordered slots by height, and the lines crossed.
- **Several views on one canvas.** `CompareViews` draws one scene through several cameras into scissored rectangles, with shared models and materials. Each pane turns its own subject on the turntable before drawing.
- **Screen Comes Alive.** The interface is a `paint(ctx, w, h, frame)` function in 390-wide design pixels, painted through `bindScreenSurface` as a pure function of the frame. While the screen is the subject, the display takes an anti-reflective coat (low environment reflection and clearcoat), because a softbox mirrored across the interface washes it grey. Parts listed in `hide`, such as a lock-screen notification, are hidden.
- **Step Inside.**
  - `createPortal` draws the second world through the stage camera, carried through the window (the display's centre and facing) to an anchor in that world. The view through the screen therefore has true parallax.
  - When the screen fills the frame, the two pictures match, and the recipe draws the world full frame. After the crossing, `presentFullFrame` sends the world through the same texture and tone mapping as the window. Drawing it directly had lifted the dark tones about 15 levels relative to the window path (measured A/B on one frame), a 6% step. Sharing the path brought the step to 0.2% (frame 95 → 96 mean RGB 123.7 → 123.9).
  - `stepInsideState` picks the world scale, so the dolly's speed at the crossing equals the world move's starting speed. The world camera leaves level, as the window camera arrived, then eases into a 4° look down.
  - `createDuskMeadow` is a seeded golden-hour world: a gradient sky with a sun, haze, rolling hills with a worn path, backlit crafted trees, distant ridges, and instanced meadow grass and wildflowers. With `textures`, the ground is photographed CC0 grass (Poly Haven *Grass Ground*), lifted green under the haze, with a dirt path (*Dirt Floor*) blended per pixel along the path's curve, with its own normal map. The stage holds frames until the textures load. The grass is densest along the camera's route and stays within the vegetation module's vertex budget.
- **Physics Point.**
  - `npm run physics:bake` solves the scenes in `physics-shots.ts` with Rapier's cross-platform deterministic build (a dev dependency only, pinned at 0.21.0, Apache-2.0). It writes a `BakedPhysicalActionSpec` per scene to `assets/physics/`. Two runs give byte-identical files.
  - A body waiting for its release is out of the simulation and hidden (scale 0), so waiting pieces never touch.
  - Pieces are released just above where they land. The first bake dropped blocks from 1.8 m, and the stacks bounced apart.
  - Contact cues carry their impact speed, which sets each tap's gain.
  - The recipe samples the bake with `sampleBakedPhysicalTrack` at any frame.
  - `woods` gives each group photographed veneer (CC0 *Black Walnut Veneer 02* and *Ash Veneer* from Poly Haven), each with a normal map and tiled at real size. Every block starts its grain at its own offset, and the clones share one GPU texture. A finish tint deepens the raw veneer, as lacquer does, under a satin coat. A full gloss coat had mirrored a softbox across block faces as white flashes.
- **Many Into One.**
  - `sampleSurfacePoints` spreads points over the subject's visible meshes by area, with a seeded source. It sets the sampler's random generator at run time; the bundled types lack it.
  - The `assemble` particles gather onto those points. A clipping plane rising through every material builds the subject in from the bottom, while the particles fade over the same frames.
  - The contact shadow stays hidden until the subject exists.
  - Owner review (2026-11-08): more density, faster hand-over. The default is now 12,000 points (up from 1,400), with a 0.3 stagger so the shape arrives together, and a 12-frame build-in. The story gathers in 1.8 s.
  - The points are sampled in the pose the subject builds in (`spec.view.yaw`), so the cloud and the solid subject have the same outline at the hand-over. Points sampled at rest made a front-on phone of particles that turned into a phone at three-quarters (owner review, 2026-11-08).
  - Particle size is scaled to the subject's units: a subject measured in centimetres needs about 30× the scale of one in metres.
- **Becomes** (`becomes-recipe-react.tsx`, timing and checks in `becomes-shot.ts`). Object A turns into object B, a visual simile told in time (doc 32, §13: visual rhetoric raised elaboration and liking without hurting comprehension, but metaphors only help viewers who can decode them, so pick pairings the audience knows).
  - **The flow.** A dissolves from the top down under a falling clipping plane; each of its sampled surface points releases a particle when the plane passes it. The particles fly on eased arcs, up over the gap and a little to one side, to B's sampled surface, and B appears above a second plane that follows the landings down. Both surfaces are sampled in the pose the change happens in and **paired by height**, so A's top flows to B's top and the change reads as one form becoming another, not a scatter.
  - **A shared base stays.** When both assets stand on a part named as a plinth or pedestal that touches the floor, the change happens only above it: the bear's plinth carries the bull. The bases swap when B is whole, invisibly when they match. Without bases on both, each dissolves whole.
  - **A is fitted to B**: scaled to B's bounding radius and seated on B's footprint, in a wrapper the studio turns with B.
  - **Particles** are drawn by a vertex shader from their start, end and release frame, so any frame is exact in any order. They are light (additive), so they need a dark studio: on a light sweep they disappear (found on a cash-to-card trial).
  - **Timing.** Between `dissolveFrame` and `formFrame`, the dissolve sweeps A over 45% and each particle flies for 55%. Checks warn when A dissolves within 0.8 s (no first object to compare), the change takes under 1 s or over 3.5 s, B holds under 1 s, or a title enters before B is whole; they refuse an object becoming itself.
  - **Subjects** are the hero catalog's single assets (`SHOT_3D_BECOMES`): bull, bear, cash stack, banknote, coins, gold bars, money bag, payment cards, bank, laptop, smartphone, server rack, padlock and security shield. A test keeps the list equal to the catalog.
  - **Storybook, Video production → Becomes:** bear to bull ("The market turned"), padlock to shield, and laptop to server rack. Example film: `examples/film/becomes.film.json`.
  - **Render review (2026-11-09).** Frames before, during and after each change at 960×540. Fixed: the plinths dissolved and rebuilt with the animals, leaving the figure floating mid-change; cash to card was dropped (both flat and low, the card tiny, the light particles lost on a light sweep).
- **Depth precision.** Clip planes are fitted to each pose (`clipPlanes`), so layers a fraction of a millimetre apart, like a display under its glass, do not dot through each other.

## Light Sweep

The classic close-up reveal of a product film (doc 32, P1).

- **The opening.** The product waits edge-lit in a near-black room (the `sweep` studio look), with its displays off as black glass.
- **The glide.** One tall soft strip light glides around it, eased in and out. The key light rides at the strip's direction, so the shadow swings as the light passes.
- **The rest.** The strip comes to rest in front as the key. Fill and rim come up over `riseFrames`, the screen wakes (`screen: "wake"`, the default), and one claim appears.

**Why the strip is near-field.**

- **An environment map cannot do it.** It is infinitely far away, and a long lens sees a flat glass face almost orthographically, so every point mirrors the same direction. A strip in the environment can only switch the whole face on and off, in about three frames; it was tried first and rejected on the contact sheet.
- **On a set the strip is close.** It stands a metre or two from the product, so each point of the glass sees it at a different angle, and its reflection travels across the face.
- **What `strip-light.ts` does.** It adds that reflection to the subject's standard and physical materials. Each fragment's reflected ray is cast at the strip's rectangle, weighted by Fresnel (dielectrics), the base colour (metals) and the clearcoat, and widened and dimmed by roughness, as an area light's highlight is.

**Timing.**

- **The crossing.** A flat face mirrors the strip only within a few degrees, and the reflection moves twice as fast as the light. So the glide slows where the face mirrors the camera: `crossAt`, by default −2 × `yaw`, since the turntable turns the face to azimuth −`yaw`.
- **The speed profile.** It is a sine window times a Gaussian dip (`linger`, default 0.92), integrated, so there are no jolts. The dip is timed so that the strip is exactly at `crossAt` there.
- **The result.** On the example phone the band takes about 0.6 s to cross the glass.

**Checks** (`inspectStudioShot("light-sweep", …)`):

- `studio-sweep-fast`: a glide under 1.2 s, or over about 110°/s.
- `studio-sweep-slow`: over 4 s.
- `studio-dark-long`: darkness over 1.2 s.
- `studio-sweep-rests-behind`: resting behind the subject.
- `studio-sweep-short`: under 60° of travel.
- `studio-hold-short`: a hold under 1.5 s after the light settles.
- The claim's reading time.

**Assets.** `HeroAsset.display(level)` turns an asset's displays from off (0) to on (1). The phone and the laptop implement it.

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

## Light Sweep evidence (2026-11-08)

- **Tests.** `tests/light-sweep.test.ts` (11 tests) covers:
  - a monotonic glide that slows at the crossing to under 40% of its mean speed;
  - the crossing frame;
  - a dark opening, then fill and rim, then screen wake;
  - every craft check;
  - the dark room, measured at under 0.3 of the strip look's mean radiance;
  - material patching and restoring;
  - the strip's view-space placement;
  - the assets' `display`;
  - the film moments;
  - the ad reveal.
- **Contact sheets** (Storybook **Studio Recipes → Light Sweep Frames**, phone and laptop, GPU):
  - On the phone the band enters the black glass at its left edge, crosses it as a soft gradient, and leaves; then the screen wakes for the claim.
  - On the tilted laptop lid the band runs on a diagonal.
  - Faults found and fixed along the way:
    - a lit screen hid the reflection;
    - the environment strip flashed the whole face white;
    - the default crossing angle had the wrong sign (two compensating errors in the first, environment version);
    - the claim was too short to read at 180 frames.
- **Not yet done.** No owner viewing yet.

## Limitations
- **Light Sweep: one strip, no occlusion.** The near strip's reflection is not shadowed by the subject's own parts, and it does not reflect in other objects. It is drawn only on the subject's standard and physical materials.
- `explodePlan` handles stacked and side-mounted pieces. It does not plan nested mechanisms (a gear train) or curved assembly paths.
- The label check measures mesh bounding boxes. It is conservative around angled parts and does not measure silhouettes.
- The phone's front glass is built behind its display, so in its exploded view the black glass leaves before the display. That comes from the asset, not the recipe.

## Hero asset detail (owner review, 2026-11-08)
The owner's review: "phone and computer look a little cheap, especially the camera lenses". The changes below were studied against openly licensed reference photographs of current phones and laptops (Wikimedia Commons, used only as reference and not shipped).

**Phone**
- Each camera is now a built assembly (`cameraLens`), standing about 3 mm proud of the plateau:
  - a lathe-turned bezel, polished on its crown;
  - an anodized lip;
  - a gently domed cover of dark, partly transparent coated glass;
  - a matte barrel holding three coated elements, a spacer ring and the aperture.

  A transmissive cover had shown the interior as a beige blur, and a flat one mirrored a whole softbox white.
- The plateau is raised glass with a polished edge band and a frosted top. It carries a fresnel flash diffuser, a depth-sensor window and a microphone hole.
- The frame is brushed, anisotropic metal with antenna breaks.
- The camera now sits top-left seen from the back, where phones put it. The old model had it mirrored.

**Laptop**
- Bead-blasted aluminium with finer micro-roughness.
- A keyboard between two perforated speaker grilles, with printed legends painted from the key rectangles. The modifier names are brand-neutral.
- Data ports, an audio jack and a card slot.

**Second pass (2026-11-08), against eight more reference photographs (front, side, back, macro):**
- The lock screen has a vivid, generic wallpaper of layered, shaded ribbons in the accent's colour family, a status bar (signal, wifi, battery) and a heavier clock. A flat gradient was the biggest single tell.
- The frame is titanium-toned and rougher, so its side reads as metal rather than a flat bright band. The buttons are polished separately, an action button joins them, and the antenna breaks have more contrast.
- The lens coatings throw the red-purple glints seen in photographs.
- The laptop's screen bezels are thin: about 4 mm at the sides, 6.5 mm at the top for the camera, and a deeper chin. The screen is painted at the display's new aspect, so the interface isn't stretched.

**Laptop third pass (2026-11-08).** You approved the phone and said the laptop still needed work. Compared again with eight laptop photographs:
- **Screen.** It shows a desktop, not one app filling the panel: the shared ribbon wallpaper, a translucent menu bar, the app in a rounded window with a title bar and a soft shadow, and a dock of generic icon tiles.
- **Screen coating.** Low reflectance, so the softbox no longer leaves a glare spot over the interface.
- **Keys.** Near-black and closely spaced in a near-black well. They are matte with no sheen, which had turned them mid-grey under the softbox. Their legends are smaller and white.
- **Trackpad.** In the body's own finish, set off only by a thin dark seam. Owner review: it overlapped the keyboard well and cut into the bottom row. The keyboard now runs from the hinge to about the middle of the base. The trackpad (13.4 × 7.9 cm) sits centred in the palm rest, about 1 cm clear of the keys and 7 mm from the front edge.
- **Speaker grilles.** Perforations at about 1 mm pitch, because finer holes aliased into stripes at product-shot distances.
- **Lid.** The aluminium rim around the black glass is thinner.
- **Not added.** The camera notch, as too specific to one maker.
- **Owner review (2026-11-08):** after the trackpad fix, the laptop and the matched Many Into One hand-over: "looks good".

