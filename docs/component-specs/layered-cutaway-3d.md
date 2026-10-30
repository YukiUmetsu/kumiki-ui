# Layered Cutaway — material anatomy

One curated Storybook entry: **Video production / Scene Templates / Layered Cutaway**.
The old Motion examples remain addressable as hidden QA fixtures; they are not
additional public examples. The demo is a ten-second, 30 fps study with 16:9,
9:16, English/Japanese, play/pause/seek and a reduced-motion hold.

Install `layered-cutaway`. Existing `LayeredCutawayScene` retains its 2D renderer;
import `LayeredCutaway3D` from `components/video/stages/layered-cutaway-3d` for
this optional WebGL rendering. It uses the same `SceneTemplateSpec<"layered-cutaway">`,
absolute `frame` and `reducedMotion`, and forwards div props, className, style
and ref. The pack now includes the existing `crafted-3d-hero` dependency.

The original assembly has an open optical frame, dielectric pane, separately
modeled copper fins, a circuit carrier with traces and ceramic components,
recessed screw slots and a vented chassis. Names/IDs/notes come from the supplied
layers. This is an **illustrative authored assembly**, not a scan or a claimed
cross-section of a particular product. Swapping copy does not establish a real
product's internal construction. No external model, texture or audio is bundled.

A single normalized action unseals the assembly from 18–60% of its duration.
Parts stay on their mounting axes, then hold for inspection. The camera changes
only five degrees during opening; text stays in a separate measured reading
region. Portrait uses a vertical hero followed by a two-column key. Metal,
copper, ceramic, substrate and glass have different physical material responses.
Missing WebGL produces the existing HeroAssetViewer actionable error, not a
pretend mesh fallback.

Export this **same story** with `kmExport=1`; append `portrait=1` for 1080×1920.
Landscape is 1920×1080. Export and preview use the same frame and spec.

## Current evidence

Two look iterations were actually rendered. The first exposed clipped geometry
and screws unsupported by the interior plates. The second widened the frame,
corrected mounting support and reduced the studio background brightness.
Landscape start/action/hold and Japanese portrait screenshots were inspected.
A browser-measured portrait text-bounds check passed. Existing mesh/seek tests
were updated for physical part groups (rather than the former bare slab meshes),
not expanded with new unit tests. The clean consumer compiled 3 items / 39 files.

Human normal-speed review remains pending. Silent visual study; audio direction
and supplied-product geometry are separate authoring work. Detailed export
commands and final technical evidence are recorded in the docs/23 execution log.
