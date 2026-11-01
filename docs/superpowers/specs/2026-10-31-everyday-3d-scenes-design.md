# Everyday 3D objects and scenes — implementation design

## Intent and first release slice

Give ContentGen a composable, frame-seekable 3D desktop storytelling vocabulary that is useful for education and documentaries, not just isolated product turntables. This first PR concentrates on the user-prioritized cinematic desk kit and three scenes. The 55-object roadmap remains a backlog, not a promise of checked-in placeholders.

## Existing foundations and choice

- **Chosen — extend crafted hero infrastructure:** Reuse `createStageSet('desk')` (walnut, leather mat, shadows), `createLaptop`, `createSmartphone`, `HeroAsset`, `composeHeroScene`, `HeroAssetViewer`, `VideoExportStage`, and existing `PhysicalBookHero3D` / paper curl. Add a handful of paper-world objects and declarative scene choreography. This keeps scale, ownership, frame timing, and video export consistent.
- **Alternative — standalone Three.js canvas/R3F scene:** Easier to draw a bespoke demo, but duplicates studio cameras, asset lifetimes, and export timing.
- **Alternative — downloaded GLB furniture collection:** Potential fidelity gain, but redistribution licenses and art-direction coherence are unverified. No third-party assets are bundled in this slice.

## Core architecture

1. `registry/craft/everyday-objects-3d.ts`: bounded, original invoice/paper, folder, pen and supporting notebook-like assembly. Semantic pivots/anchors, physical scale in meters, PBR surfaces, deterministic movement actions, resource disposal. Realistic material differentiation and readable Canvas2D face textures.
2. `registry/craft/everyday-interactions.ts`: pure frame-based `lift`, `slide`, `rotate`, `open`, and `focus` transformations, with no accumulating transforms or wall clock. Client can scrub frames in any order.
3. `registry/video/everyday-scenes-3d.ts`: serializable recipe input; compose existing desk, laptop, phone and new objects; named scene action frames and camera shots. Readable explanatory content is maintained in a screen-space layer, while objects provide physical depth.
4. `src/components/video/everyday-3d.stories.tsx`: one gallery, actions/material/lighting controls, three fully scrubbable scene variants and 16:9 / 9:16 capture routes under `Video Production/Scene Templates/3D Everyday Objects`.
5. `docs/component-specs/everyday-3d.md`: ContentGen API and design limitations. Browser-frame tests, structural tests, actual MP4 evidence, close-up inspection.

## Important limits

This is a curated P0 slice. Thin invoice type stays in a high-resolution texture or accessible screen overlay, not low-resolution physical mesh text. The existing book renderer is reused in a dedicated story; an independently articulated *closed-to-open* hardback with physically turning covers is a separate acceptance task, not silently claimed as completed. `3D` requires a real WebGL device; a failed GPU is an error, not a fake 3D fallback.

## Visual direction

Warm walnut, matte graphite, satin metal and off-white paper; soft keys and restrained rim. Objects stay still unless an action communicates a handoff or inspection. No bloom, endless turntables, floating cards, or motion-only filler. Framing leaves protected caption room in landscape and portrait.
