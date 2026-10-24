import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../registry/video/video-export-stage";
import { FrameAccurateClip } from "../../registry/video/frame-accurate-clip";
import { createVideoElementAdapter } from "../../registry/video/frame-clip-adapters";
import type { ClipPlacement, ClipSource } from "../../registry/video/frame-clip";

/* K1 real-source check: probed footage (H.264, HEVC, variable frame rate, rotated) drawn through
 * FrameAccurateClip at 30 fps. Media and metadata are generated locally by scripts/generate-real-source-fixtures.mjs
 * and served from /k1/ (not committed). The verifier scripts/verify-real-source-clip.mjs reads the drawn
 * barcode back to prove which source frame each output frame shows. Select a fixture with ?km_clip=<id>.
 */
const OUT_FPS = { num: 30, den: 1 };

function RealSourceClip({ startFrame }: { startFrame: number }) {
  const clipId = useMemo(() => new URLSearchParams(window.location.search).get("km_clip") ?? "cfr-h264", []);
  const [source, setSource] = useState<ClipSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState(startFrame);
  const adapter = useMemo(() => createVideoElementAdapter({ url: clip => `/k1/${clip.id}.mp4` }), []);
  // Export mode: an unverified frame is an error, so the exporter refuses instead of writing a wrong frame.
  const exporting = useMemo(() => new URLSearchParams(window.location.search).get("kmExport") === "1", []);
  useEffect(() => () => adapter.dispose?.(), [adapter]);
  useEffect(() => {
    let active = true;
    fetch(`/k1/${clipId}.clip.json`)
      .then(response => { if (!response.ok) throw new Error(`Clip metadata ${clipId} unavailable (HTTP ${response.status}).`); return response.json(); })
      .then((json: ClipSource) => { if (active) setSource(json); })
      .catch((cause: Error) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [clipId]);
  if (error) return <p role="alert" style={{ font: "500 14px/1.5 system-ui, sans-serif", padding: 16 }}>{error}</p>;
  if (!source) return <p style={{ font: "500 14px/1.5 system-ui, sans-serif", padding: 16 }}>Loading clip metadata…</p>;
  const lastTime = source.timestamps ? source.timestamps[source.timestamps.length - 1] : (source.frameCount - 1) * source.fps!.den / source.fps!.num;
  const durationFrames = Math.floor(lastTime * OUT_FPS.num / OUT_FPS.den + 1e-6) + 1;
  const placement: ClipPlacement = { id: source.id, source, startFrame: 0, durationFrames };
  const manifest: VideoExportManifest = { schemaVersion: 1, id: "real-source-" + source.id, durationFrames,
    width: source.width, height: source.height, fps: OUT_FPS };
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <FrameAccurateClip placement={placement} frame={frame} fps={OUT_FPS} adapter={adapter}
      width={source.width} height={source.height} requireExact={exporting} description={"Real footage fixture " + source.id} />
  </VideoExportStage>;
}

const meta = { title: "Video/Real Source Clip", component: RealSourceClip, parameters: { layout: "fullscreen" },
  args: { startFrame: 0 } } satisfies Meta<typeof RealSourceClip>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
