# Follow Subject Through Sections (FS1)

**Status:** First reusable cinematic scene recipe; **not** an end-to-end video production system. FS1 follows one identified visual subject through different layered environments. Unlike [ProcessJourney](process-journey.md), it does not require a graph route or depict ordered process steps. It composes explicit-frame timing and replaceable images without adding a playback loop, audio engine, camera engine or video encoder.

## Install and use

Registry ID: `follow-subject-through-sections`. Its canonical source is `registry/video/follow-subject-through-sections.ts` (pure frame evaluator) and `registry/video/follow-subject-through-sections-react.tsx` (React compositor). The `src/components/video/FollowSubjectThroughSections.tsx` file is only a local showcase alias. The registry item adds no extra dependencies beyond React, which the host already supplies.

```tsx
import { FollowSubjectThroughSections } from "./components/video/follow-subject-through-sections-react";
import { compileFollowSubjectFrame, collectFollowSubjectAssets } from "./components/video/follow-subject-through-sections";
import type { FollowSubjectSpec } from "./components/video/follow-subject-through-sections";

const spec: FollowSubjectSpec = {
  id: "example-travel", width: 1920, height: 1080, fps: { num: 30, den: 1 },
  subject: {
    id: "same-explorer", src: "/licensed/explorer.png", alt: "Explorer traveling",
    widthPercent: 22, x: 50, y: 50, licenseRef: "asset-license-explorer",
    path: [{ frame: 0, x: 42, y: 50 }, { frame: 179, x: 56, y: 48 }],
  },
  sections: [
    { id: "scene-a", frames: 90, layers: [
      { id: "sky", src: "/licensed/sky-a.png", depth: 0.2, licenseRef: "asset-license-sky" },
      { id: "foreground", src: "/licensed/front-a.png", depth: 1, licenseRef: "asset-license-front" },
    ] },
    { id: "scene-b", frames: 90, transition: "crossfade", transitionFrames: 12,
      layers: [{ id: "world", src: "/licensed/world-b.png", depth: 0.6,
        licenseRef: "asset-license-world" }] },
  ],
};

// The host supplies an absolute frame from preview, narration or export.
const sample = compileFollowSubjectFrame(spec, 94);
const assets = collectFollowSubjectAssets(spec); // image entries for VideoExportManifest.assets
const scene = <FollowSubjectThroughSections spec={spec} frame={94} />;
```

## Customization and timing

| Input | Behavior |
|---|---|
| `subject.id`, `src`, `alt` | Stable identity and accessible description; foreground is never re-created by a section change |
| `subject.path` | Optional composition-absolute keyframes, positions in output percentages and interpolated scale/rotation; one path spans all environments |
| `sections[].frames` | Exact section duration; total duration is their sum |
| `sections[].layers` | Replaceable images, independent `depth` (-3..3), `opacity`, optional rights metadata |
| `transition` / `transitionFrames` | Hard cut or whole-environment crossfade during the *incoming* section's initial frames; no added duration |
| `width` / `height` / `fps` | Output contract; author separately for 16:9 and 9:16 to preserve subject framing |
| `reducedMotion` | Environment cuts without parallax, with the subject held at its base position; timing/meaning retained |
| `backgroundColor`, React `className` / `style` / DOM props / `ref` | Composition fallback, theme hooks, integration and custom framing |

The evaluator is pure and deterministic for any integer frame (seeking backward or jumping around is safe). Out-of-range frames clamp to the first or last scene state. Validation throws actionable errors for missing IDs/assets, invalid frames, duplicate layers/sections, illegal opacity/depth, malformed FPS and nonmonotonic subject paths. The rendering layer uses viewport-relative image transforms and sufficient image overscan for all declared parallax values. The component itself owns **no** requestAnimationFrame, audio, external requests, generation or export side effects. The host must choose a frame and handle image loading.

## Export, provenance and fallback

Use `VideoExportStage` (registry ID `video-export-stage`) as the frame capture boundary. Provide the scene's dimensions, rational FPS, sum of section frames, `collectFollowSubjectAssets(spec)` in the export manifest, a controlled `frame` and an `onSeek` setter. **Each production asset must have a correct `licenseRef`**; collecting fields does not verify the license, and `VideoExportStage` handles decode/readiness rather than acquiring rights. Broken/missing image references are export-blocking and should not be silently replaced by licensed-looking content. Storybook's vector images are generated illustration placeholders, not real-world locations or licensed third-party footage.

The source specification is serializable (no executable content, React nodes or animation callbacks in the JSON). Reduce motion explicitly when the host or platform requests it; static renderers can sample a meaningful frame from every section. Production captions, narration, SFX, audio mixing and music cues are outside FS1 and belong to the host's established pipelines. CSS and image interpolation alone are not a guarantee of premium footage quality.

## Verification checklist

- Unit tests: valid/invalid specs, boundary cuts, crossfade endpoints and midpoint, monotonic paths, subject identity, overscan, random seeking and reduced-motion fallback.
- React tests: persistent subject node, whole-environment grouping, accessible scene label and portrait composition.
- Storybook: **Motion → Follow Subject Through Sections → Explorer**, with three domain-agnostic demos, aspect toggle, timeline scrubber and reduced-motion switch.
- **Still pending in this connector-only session:** clean registry install, typecheck, full Vitest suite, Storybook build, browser screenshots at first/transition/final frames, real 16:9/9:16 frame geometry and full MP4 export review. Do not treat this component as export-qualified until those pass.
