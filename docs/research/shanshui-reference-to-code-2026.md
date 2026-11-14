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


## Teacher artwork / exact-figure study (second source-grounded pass)

On 2026-11-14, the three full-resolution user-uploaded paintings were reopened
and studied as separate figure references:

| Source art (kept out of the public repository) | Figure and face characteristics | Sampled visible figure box (image px) | Skull:figure height (projected) |
| --- | --- | --- | --- |
| \`chinese art(1).jpeg\` — 1280×720 | Older scholar with **moustache and beard**, bent shoulders, hand at chin, slightly forward upper body, narrower low cuff; face is only ~50 px across and is uncertain | x=600, y=345, w=157, h=296 | 66/296 = **0.223** |
| \`ChatGPT Image Nov 14, 2026, 11_57_14 AM-2(1).png\` — 1672×941 | Young reader with **no beard**, long dark ribbon, small narrow chin, slanted eye-lids, BOTH hands holding an open scroll, long hanging cuffs | x=377, y=292, w=210, h=514 | 71/514 = **0.138** |
| \`ChatGPT Image Nov 14, 2026, 11_57_14 AM-1(1).png\` — 1672×941 | Young mountain walker with **no beard**, chin-resting near hand, downcast eyes, large gathered sleeve, trailing ribbons and trailing hem | x=895, y=342, w=239, h=481 | 77/481 = **0.160** |

These rectangles/landmarks are **manual art-direction estimates** from the
visible pixels, not exact anatomy or a trained face detection model. Three-quarter
perspective, foreshortening and occluded joints cannot be reconstructed without
new views. No invisible knee or ankle position was invented. The small first
figure has noticeably lower feature certainty. The two young men are not
designated as the same identity or as different camera views of one character.

### Reusable comparison and render integration

- \`registry/character/figure-proportion-study.ts\`: a typed, reusable image-space
  landmark/region mesh with pixel tolerances, visibility/occlusion, 20 projected
  measurement ratios, normalization, error handling, and side-by-side comparisons.
  It does **not** infer hidden depth or fabricate body joints.
- \`src/video/ink-shanshui-teacher-mesh.ts\`: three **different** manually
  measured source studies, preserving face, hair, eyes, brows, nose, mouth,
  shoulders, elbows/cuffs, hand and feet visibility; independent source image
  dimensions. The original generic puppet's 260×340 illustration is recorded
  as a fourth **student baseline**, not reinterpreted as a teacher.
- \`src/video/ink-shanshui-face-plates.ts\`: **new original code-drawn**
  elderly/reader/walker facial cels, including separately designed eyes,
  expressions, noses, brows, mouth visemes, top knots, hair ribbons, and a beard
  on the elderly actor **only**. These are rig-attached art assets and do not
  interfere with the existing speech/blink/gaze evaluator.
- \`src/video/ink-shanshui-film.tsx\`: \`makeShanshuiScholar(detail,contrast,scene)\`
  now uses the teacher's projected skull/figure ratio relative to the legacy
  puppet baseline to compute bounded, **per-scene head hierarchy rest scale**.
  This is a conservative rest-pose fit and does NOT solve neck construction,
  character anatomy or fully reference-accurate expressions by itself.
  The instance/definition pin matching profile-specific revisions.
- \`src/video/ink-shanshui-proportion.stories.tsx\`: a **Storybook art
  laboratory** under Video production → Film Looks → Chinese Ink. It displays
  the three reference mesh overlays, selectable face/body/sleeve/robe regions,
  real reported ratios and uncertainty. A user can choose their **local teacher
  image** with a browser file input; its temporary blob URL overlays the stored
  pixel-coordinates and is never uploaded or added to git. The schematic works
  without that file.

### Engineering vs visual acceptance

Engine tests should check that all three studies are valid, visible ratio
differences are measured, hidden joints are not invented, the elderly actor
retains a beard, both younger actors have none, the head/rest transformations
differ by scene, and all source identity/animation parts remain executable
without replacing the canonical rig. Playwright should inspect both the art
lab and the rendered film. **Passing these checks is not artistic approval.**
The current puppet still needs real 3/4 turnarounds, a correct anatomical
shoulder/sleeve/hand hierarchy, actual visible scroll grasp, true cloth-fold
deformation and improved original hand-painted face contours.
