# Shanshui landscape video engine — reference-to-code craft study (2026-11-14)

## Visual targets supplied in the conversation

The three source images were inspected at their original horizontal resolutions (1280×720 and two 1672×941 images). They are *references*, not texture inputs, bundled images, tracing targets or imported scene assets.

| Supplied composition | Directly observable landmarks | Code direction |
| --- | --- | --- |
| **Image 1 — misty mountain hermit** | Small central scholar with contemplative hand gesture, pine trees on the left, bamboo on the right, thin floating cloud lines, several near and distant rock masses, a tiny pavilion, warm parchment and significant quiet mist | \`misty-hermit\`: broad negative space, atmospheric mountain silhouettes, asymmetrical pine/bamboo frame, very restrained camera drift |
| **Image 2 — riverside traveler** | A larger, slender scholar reading a scroll at the left foreground; hanging willow tree, still water, a low stone bridge, distant pavilion at the right, soft mountains, detailed near rocks, wind-suggestive flowing clothing | \`river-scholar\`: willow with drooping leaf groups, stone arch, rippled water and shoreline, warm scholar with trailing robe bands |
| **Image 3 — mountain pathway** | Tall layered peaks, pine with individually distinguishable needles at upper left, a small distant waterfall, a tiny hilltop pavilion, narrow winding rocky trail, scholar at center, right-edge bamboo, fading fog | \`mountain-trail\`: layered wet washes, slope-dependent dry \`cunfa\` texture, heavily staged old pine, path/rocks and waterfall |

### Material principles

1. **骨法用笔 and 皴法:** contours are not uniformly dark. Mountains are three separate warm wash masses with location-specific fine hemp-like contour lines and dark moss dots concentrated near the ridge.
2. **Ink's five tones:** pale distance; midtone woodland and rock; dark close branches, leaf silhouettes and figure line art. The paper stays a visible highlight.
3. **Branches must be constructed:** pine has winding trunk, structural branches and tufts of individually oriented needles; willow has independent trailing strands and individually drawn leaves; bamboo has culm bends, nodes and leaf bundles. No flat leafy decals.
4. **Hold the landscape:** mountains, path and rocks are stable at a film frame. Only the cinematic camera, bird wings, slowly moving clouds/mist, delicate leaves, water highlights and canonically rigged scholar perform.
5. **Fabric and body separate:** the scholar reuses INK4 foot-plant and split-knee constraints plus INK6 delayed cuff/hem corrections. New original sepia over-robe, sash, hair ribbons and hem each share relevant rig parents. This is a **partial refinement** of a stylized puppet, not a finished human anatomy rig.
6. **Original procedural artwork:** every foreground/background mark is a path, ellipse, gradient or seeded vector brush in code. No sampled pixels from the three supplied images are stored or rendered. No downloaded external film/stock assets.

### Implementation

- **Core score:** \`registry/video/ink-shanshui.ts\`: typed layouts, seed, detail, ink, mist, wind; independent pure scene motion at a single 0..299 absolute frame; scholar path.
- **Painter:** \`registry/video/ink-shanshui-react.tsx\`: mountain planes, internal rock hatching/dots, winding trunks, leaf clusters, rocks, stage path, lake and bridge, pavilion, clouds, bird and a stable paper-tooth filter.
- **Scholar host:** \`src/video/ink-shanshui-film.tsx\`: approved ink actor parts and action cues adapted with warm original robes and new follower parts, separate from the landscape's background brush passes.
- **Preview/export:** \`src/video/ink-shanshui.stories.tsx\`: Film Looks → Chinese Ink → Shanshui Landscapes. All controls are available in the gallery. The three export stories use the same source component, 960×540 30fps, and a frame-seek manifest.
- **Registry:** \`ink-shanshui-landscape\` installable core with existing \`ink-actor-director\` dependency.
- **Performance:** no WebGL, external image requests, runtime \`Math.random\`, time-based accumulating state, background polling, audio, third-party licenses or additional npm dependencies.

### Visual QA contract

Capture the *actual* Chromium Storybook scene at frames 125 and 210, all three variants, then produce MP4 with the existing \`video:export\` pipeline. Inspect with full-size images and ordinary-speed playback before declaring art quality.

Check: (a) the scholar's actual SVG parts appear inside the landscape rather than merely passing SSR, (b) both far/mid/near ink masses retain depth instead of merging to one brown blob, (c) the old pine needles look botanical and old bark looks cracked, (d) the willow does not resemble a fence of same-length strands, (e) the water/arch/pavilion remain legible without black outlines, (f) animation is subtle and nondestructive with backward seeking, (g) text-free full 16:9 art stays coherent.

**Not yet film-approved:** the references' human figures are more anatomically drawn, expressive and cloth-rich than the current canonical puppet. Accurate hand gesture/scroll contact, elbow geometry, turnarounds, true fluid edge bleeding and a properly art-directed portrait version are subsequent priorities. Avoid claiming photographic/painted equality on the basis of CI alone.
