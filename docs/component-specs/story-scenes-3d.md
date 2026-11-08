# Story Scenes 3D: telling a story with real objects

**Scope:** Seven scene recipes that do for 3D what `question-reveal`, `object-story` and `ray-world` do in a film: each tells one beat of a story with crafted objects, light or physics. Every recipe is a pure function of `frame`. In a film each is a `shot-3d` scene (see [Film Document → 3D shots](film-document.md#3d-shots)).

| Recipe | Component | Job |
|---|---|---|
| Shadow Reveal | `ShadowReveal` | Ask a question and turn it. A shadow reads as one thing; the pieces that cast it are another |
| Chain Reaction | `ChainReaction` | Show cause and effect. A chain printed on growing dominoes, read, then tipped |
| Physical Data | `PhysicalData` | Compare a few values. Stacks of coins or blocks, so height is felt |
| Tabletop Story | `TabletopStory` | Explain with objects. Object-story with real objects on a table |
| Scale Journey | `ScaleJourney` | Show how big. A coin to a bank, in one log-space camera move |
| Inside Out | `InsideOut` | Show what is inside. A cut takes the cover away; parts are named |
| Diorama Journey | `DioramaJourney` | Show a process as a trip. A traveller crosses a miniature world |

## Install and inspect
- Registry item: `story-scenes-3d`. Its specs and checks are in `studio-shot-model` (`story-3d-shots.ts`), which has no renderer and no npm dependencies.
- Storybook: **Video production → Story Scenes 3D**, with each recipe's craft check under it.
- Example films: [`savings-3d.film.json`](../../examples/film/savings-3d.film.json) (shadow reveal, physical data, chain reaction) and [`payment-3d.film.json`](../../examples/film/payment-3d.film.json) (inside out, diorama journey, tabletop story, scale journey).

## Shadow Reveal
- **Construction** follows shadow art:
  1. The shape (`house`, `heart`, `key`, `arrow-up`, `shield`, `lightbulb`, `question`) is rasterised on the wall.
  2. For each cell, one proof coin or wooden block hangs on the ray from the light to that cell. It sits 30% to 55% of the way from the light, so it stays out of the opening shot.
  3. Each piece is sized at 1.9 cells × its distance fraction, so neighbouring shadows overlap even at a 40° tilt.
- **What the viewer sees.** From the wall, only the shadow reads. Near the light's viewpoint, the scattered pieces line up into the shape in front of their own shadow, and a slow drift onto the light's axis closes the last of the parallax.
- **Staging.** Pieces hang on faint threads, as an installation does. The shadow comes from one warm 4K-shadow-map spot on troweled plaster.
- **Tilted pieces.** Pieces are tilted up to 40° off the light. Faces square to it all mirrored the spot back at the camera.
- `inspectShadowReveal` checks:
  - 1.5 s on the shadow before the reveal;
  - a swing of 2 s or more;
  - the question before the reveal, the answer after it;
  - 1.5 s of hold at the end.

## Chain Reaction
- **Physics.** `dominoAmplifierScene(n)` in `physics-shots.ts`, baked by `npm run physics:bake` (Rapier, deterministic) into `assets/physics/domino-amplifier-<n>.json` for 3 to 8 links.
  - Each domino is 1.35 times the last. A domino can topple one about 1.5 times its size; 1.35 keeps a margin in the solver.
  - Ratios of 1.4 and 1.45 stalled after the first contact. 1.35 with 0.55 h spacing and friction 0.35 falls fully at every length.
  - The first domino starts with its spin at frame 0, so it is seen standing before the push. The bake now applies a frame-0 spin, and the older bakes are unchanged.
- **Faces.** Each link is printed in the upper half of its face, the half the shorter domino in front never covers.
- **Camera.** It reads the faces from above, steps back to a 52° side view (the studio sweep is built to be seen from the front), then the fall plays at 0.55 speed.
- `inspectChainReaction` checks:
  - 3 to 8 links of six words or fewer;
  - reading time before the push;
  - the title after the last domino lands;
  - 1.2 s of hold at the end.

## Physical Data
- **Pieces.** One proof coin or lacquered block per `unitValue`, dropping in with gravity, three frames apart, with hand-stacked offsets. The highlighted value is gold among silver (walnut among maple).
- **Why physical.** In a small study, viewers recalled more facts two weeks later from a physical bar chart than from the same chart on a tablet: Stusak et al., CHI 2015 (n = 40, grade B). A 2024 preprint found the same retention gain (grade C). Novelty may account for part of it.
- **Labels.**
  - Each number stands on the table in front of its stack, where falling pieces never pass through it.
  - Numbers count up as the stacks grow, and appear with the first piece rather than reading $0 first.
  - The title takes the open space above (`StudioCaption position="top"`).
- `inspectPhysicalData` checks:
  - 2 to 6 values;
  - at most 60 pieces a column;
  - a warning above 24 blocks, which make a tower that leaves the frame;
  - 1.5 s on the finished stacks.

## Tabletop Story
- **Objects.** `banknote`, `cash-stack`, `coins`, `gold-bars`, `money-bag`, `credit-card`, `smartphone`, `laptop`, `padlock`, `invoice`, `paper`, `folder` and `pen`, at real size (`metersPerUnit`), each in its table pose.
- **Layouts.**
  - `row`: in the order listed.
  - `pair`: two, set apart.
  - `stack`: one on top of the next.
  - `focus`: one forward, the rest behind.
- **Motion.** Objects move in a low arc, 20 frames each, 4 frames apart. New ones are set down from above the frame, and leaving ones are lifted out of it.
- **Table.** It takes photographed walnut (`surfaceMaps`; the capture page uses Poly Haven's CC0 veneer) in a satin finish. A gloss coat smeared the softbox across the table.
- **Framing.** Each beat is framed whole, with room for labels on the table.
- **Text.** Labels sit on small chips, and captions have a soft scrim.
- `inspectTabletopStory` checks:
  - object IDs and kinds;
  - each beat's objects;
  - pairs of exactly two;
  - stacks of five or fewer;
  - captions long enough to read;
  - a moment at rest in each beat.

## Scale Journey
- **The row.** Objects stand in a row, smallest first, each 3.4 of the previous object's radii from the last. The next, larger object stays out of frame until the camera reaches it, and the last stays in frame beside it.
- **The camera** moves in log space, so each jump in size takes the same time. Small things are seen from above, which also keeps the horizon out of frame.
- **Readouts.** Each stop shows its real size and its ratio to the last (×4.9, ×13.4, ×7.5).
- **Scale figure.** A 1.75 m matte figure stands beside the first object of a person's size or larger, as architects put one in a model. This is the commonly cited fix for the classic zoom, which loses scale once the last object shrinks out of view (commentary, grade C).
- **Contact shadows.** Each object has its own; the studio's key shadow is fitted to the whole row and is too coarse for a coin.
- `inspectScaleJourney` checks:
  - 2 to 6 stops in order of size;
  - a warning for steps under 1.6 times;
  - time for each stop's move and caption.

## Inside Out
- **Cutaway.** `HeroAsset.cutaway` is new: `open(on)`, `cover` and `inside`.
- **The phone's internals**, hidden at rest:
  - a hollow frame with a midplate;
  - a battery with a printed label;
  - a logic board with shielding cans and parts;
  - the copper charging coil with its magnet ring;
  - camera modules in brackets;
  - a speaker, a haptic motor and flex cables.

  The solid frame is swapped out while the back glass still covers it.
- **The cut.** A plane in the asset's own space, carried by the turntable, clips cloned cover materials only, with a line of light on its edge.
- **Labels.** They stand in two columns just outside the subject's measured screen edge, spaced so none meet, with leader lines to each part's centre.
- `inspectInsideOut` checks:
  - half a second closed before the cut;
  - a cut of 1.2 s or more;
  - five labels or fewer, with time to read them;
  - a hold at the end.

  The film checks that the subject has a cutaway, and names the parts inside it.

## Diorama Journey
- **The miniature.** A 14 by 9 m meadow on a soil cross-section over a walnut base, with vertex-coloured turf and a fine normal map, crafted trees along the back and ends, and instanced grass and wildflowers.
- **The path.** A packed-dirt ribbon. Its tightest bend measures 0.77 m at five stations, wider than its half-width, so it never folds. A sharper first layout folded at 0.23 m and drew dark slivers.
- **Stations.** Catalog landmarks at a common 1.9 m on stone plazas with kerbs.
- **Traveller.** A glowing orb by default. The coin option rolls without slipping, but reads as a sliver edge-on.
- **Camera.** It follows on a long lens, with a tilt-shift blur (`backdrop-filter`) at the top and bottom.
- **Captions.** Each one leaves before the next station's caption, or the title, takes its place.
- `inspectDioramaJourney` checks:
  - 2 to 5 stations;
  - a walking pace between them;
  - the journey and the title fitting the scene.

## Evidence
- **Drafts.** Each recipe was rendered at 1200 × 675 at four to six frames in Playwright's Chromium with the GPU, and fixed until clean.
- **Example films.** Both were reviewed with `film:review --only=draft --gl=gpu`. Each shows 0 errors after the fixes above: a title collision, labels over falling coins, a caption over the coin house, and table labels without chips.
- **Low-contrast warnings remain.** They are text over mid-grey studio sweeps and bright scenes, kept readable with shadows, scrims and chips.
- **Storybook.** All seven stories render to `ready` with no page errors.
- **Human visual review is pending.**

## Limitations
- Only the phone has a cutaway. The laptop has no internals yet.
- Shadow Reveal pieces float on threads; they are not stacked on a support.
- The diorama's meadow is vertex-coloured, not photographed, and its landmarks are catalog objects at a common size, a board-game convention, not a true scale.
- Tabletop objects cannot overlap or lean on one another, except in `stack`.
- Chain Reaction bakes exist for 3 to 8 links; other counts need a new bake.
