# Finance & Business Visuals + Video Export (FB1 / VE1)

**Scope:** reusable, data-faithful visual components (finance and business), in both 2D SVG and real Three.js 3D, sharing one validated model and one absolute-frame reveal policy. Four authored demo datasets, eight Storybook previews. Every example value is **illustrative**.

## Installable packs

| Registry item | Purpose | Extra runtime cost |
| --- | --- | --- |
| `domain-metric-model` | Domain truth, normalization, formatting, validations and sample data | None |
| `domain-metric-2d` | Standalone deterministic React SVG visual | None |
| `domain-metric-3d` | Real 3D materials and chart geometry + CC1-framed video-ready React stage | Three.js/camera kit only when installed |
| `video-export-stage` | Fixed-size capture contract, frame-seek handshake and readiness checks | No new dependency |

These are **separate installable packs in the same repository**, not separate packages per genre. All use the same `MetricVisualSpec`. The 3D pack is optional; installing 2D does not pull in Three.js. The CLI is repository-level development/export tooling and is intentionally **not** bundled into every consumer.

## Data model and visual grammars

- **Finance waterfall** (`kind:"waterfall"`): opening balance, signed changes, computed closing balance; positive/negative movements remain signed and are not displayed as independent totals.
- **Finance trend** (`kind:"trend"`): numeric observations in chronological author order. Explicit null gaps; explicit `scale.zero`; nonzero axes disclose truncation.
- **Business funnel** (`kind:"funnel"`): stages with nonincreasing counts. Displays actual stage counts and per-stage retention in 2D. Rejects increasing values rather than falsely describing them as a standard conversion funnel.
- **Business trend**: same trend primitive with a business KPI dataset, instead of duplicating a renderer.

```tsx
import { MetricVisual2D } from "./components/domains/metric-visual-2d";
import { MetricVisual3D } from "./components/domains/metric-visual-3d-stage";
import { FINANCE_REVENUE_BRIDGE } from "./components/domains/metric-model";

const frame = 90; // supplied by your existing player; never its own timer
const reveal = { startFrame: 8, framesPerMark: 22 };

<MetricVisual2D spec={FINANCE_REVENUE_BRIDGE} frame={frame}
  reveal={reveal} width={1280} height={720}/>;
<MetricVisual3D spec={FINANCE_REVENUE_BRIDGE} frame={frame}
  reveal={reveal} durationFrames={180} width={1280} height={720}/>;
```

Consumers can provide a compiled MG1 camera timeline to `MetricVisual3D` to coordinate with an existing explainer. Without one, the wrapper compiles a deterministic fixed CC1 camera. The Three scene exposes named marks via `userData.semanticId`, so interactions and other semantic systems can attach to real objects. The 3D overlay retains category/value labels and displays the value range; treat perspective geometry as explanatory rather than a substitute for the precise 2D chart.

**Visual guardrails:** Values must be finite, IDs stable, labels reasonably short, and waterfall endpoints unique. Missing trend observations are not zero. 2D and 3D share the same compiled values, colors by semantic meaning, axis policy and absolute-frame reveal. Motion is causal: the mark appears only after its authored start, with no idle particle effects. Current layouts target 1280×720 (minimum 600×420) and up to 10 data entries. In 2D, category, value and retention labels are measured with `FitText` (see [illustration toolkit](domain-illustration-2d.md)): they wrap or step down as a group, and a word that can't fit sets `data-km-text-overflow` instead of being clipped. Dense datasets still need shorter labels or a wider canvas. The 3D overlay is not measured.

## Export any storyboard or component as MP4

A consumer mounts `VideoExportStage` **around its actual fixed-resolution render target**. The stage advertises a versioned manifest and exposes an asynchronous `seek(frame)` to the local browser host; it waits for frame DOM, fonts, images and any WebGL canvas to be ready before capture. No new animation clock or visual recognition.

The optional page-turn book renderer declares its requested **local** frame on
`data-km-book-frame`; capture waits for its canvas's `data-km-gl-frame` to match.
This also waits through asynchronous canvas creation and works when a reel's
absolute playhead differs from the book's local playhead. Custom renderers must
resolve `prepareFrame(frame)` after their requested draw and media preparation;
the stage does not infer readiness for arbitrary canvases.

```tsx
import { useState } from "react";
import { VideoExportStage } from "./components/video/video-export-stage";

const manifest = {
  schemaVersion: 1 as const, id: "business-reel",
  width: 1280, height: 720, durationFrames: 180,
  fps: { num: 30, den: 1 },
};
function Reel() {
  const [frame, setFrame] = useState(0);
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <MetricVisual2D spec={FINANCE_REVENUE_BRIDGE} frame={frame}
      reveal={{ startFrame: 8, framesPerMark: 22 }}/>
  </VideoExportStage>;
}
```

**Local prerequisites:** `npm ci`, `npx playwright install chromium`, and FFmpeg on PATH. On macOS, e.g. `brew install ffmpeg`. Production video export is **opt-in**, not part of CI. The repo script can launch Storybook if the local iframe server is not already running.

```bash
npm run storybook
# Open the desired story and copy its ID / iframe URL.
npm run video:export -- --story=domains-finance-business--finance-waterfall-2-d --output=dist/finance.mp4
npm run video:export -- --story=domains-finance-business--business-funnel-3-d --output=dist/funnel.mp4
# Optional audio and one chapter:
npm run video:export -- --url="http://127.0.0.1:6006/iframe.html?id=domains-finance-business--finance-waterfall-2-d" --startFrame=30 --frames=90 --audio=voice.wav --output=dist/chapter.mp4
```

The exporter reads **FPS, duration and dimensions from the mounted stage**, seeks each absolute frame and captures the same fixed DOM surface. FFmpeg then encodes H.264/yuv420p MP4 with optional AAC audio, aligned to the selected frame interval. It cleans temporary PNG frames. For a standalone consumer, copy the repo's `scripts/export-video.mjs`, install `playwright` as a dev dependency, and add `"video:export": "node scripts/export-video.mjs"` to package scripts. Only localhost/loopback preview URLs are accepted.

**Important limitations:** PNG capture and encoding are sequential; this is a correctness-first exporter, not a real-time screen recorder. Video output requires the host's available Chromium/WebGL2 and system FFmpeg; this module does not download binaries, generate speech, mix complex audio tracks, or promise that all frame content is aesthetically correct. Host code must ensure 2D/3D sources evaluate from the absolute frame, with no wall-clock CSS animation. For authored ES1 sequences, use `ExplainerFrameCapture.seek` as the optional `prepareFrame` callback when stronger text/3D geometry checks are needed.

## Verification

Pure Vitest checks cover waterfall accounting, funnel monotonicity, null handling, truncated axis disclosure, 2D/3D semantic parity, deterministic seeking, scene ownership and the export manifest. Repository CI validates TypeScript, all existing tests, registry packaging and isolated clean consumer installs. Full-browser artistic inspection and actual MP4 rendering remain explicit opt-in manual steps.
