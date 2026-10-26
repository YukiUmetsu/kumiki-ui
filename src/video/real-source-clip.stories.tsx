import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../ui/button";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../registry/video/video-export-stage";
import { FrameAccurateClip } from "../../registry/video/frame-accurate-clip";
import { createVideoElementAdapter } from "../../registry/video/frame-clip-adapters";
import type { ClipPlacement, ClipSource } from "../../registry/video/frame-clip";

/* K1 real-source check: probed footage (H.264, HEVC, variable frame rate, rotated) drawn through
 * FrameAccurateClip at 30 fps. Media and metadata are generated locally by scripts/generate-real-source-fixtures.mjs
 * (`npm run video:storybook-clips`) and served from /k1/ (not committed). Every frame carries its source index as a
 * barcode, which the verifier scripts/verify-real-source-clip.mjs reads back. Select a fixture with ?km_clip=<id>.
 */
const OUT_FPS = { num: 30, den: 1 };

/** Output frames the clip covers, from its probed timestamps (variable frame rate) or its constant frame rate. */
function durationOf(source: ClipSource): number {
  const lastTime = source.timestamps
    ? source.timestamps[source.timestamps.length - 1]
    : ((source.frameCount - 1) * source.fps!.den) / source.fps!.num;
  return Math.floor((lastTime * OUT_FPS.num) / OUT_FPS.den + 1e-6) + 1;
}

const textStyle = "text-body-sm tabular-nums";

function RealSourceClip({ startFrame }: { startFrame: number }) {
  const clipId = useMemo(() => new URLSearchParams(window.location.search).get("km_clip") ?? "cfr-h264", []);
  const [source, setSource] = useState<ClipSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState(startFrame);
  const adapter = useMemo(() => createVideoElementAdapter({ url: clip => `/k1/${clip.id}.mp4` }), []);
  // Export mode: an unverified frame is an error, so the exporter refuses instead of writing a wrong frame.
  // Export mode also never autoplays, because the exporter seeks frames itself.
  const exporting = useMemo(() => new URLSearchParams(window.location.search).get("kmExport") === "1", []);
  const [playing, setPlaying] = useState(!exporting);
  useEffect(() => () => adapter.dispose?.(), [adapter]);
  useEffect(() => {
    let active = true;
    fetch(`/k1/${clipId}.clip.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error(
            `Clip metadata ${clipId} unavailable (HTTP ${response.status}). Generate the footage with: npm run video:storybook-clips`
          );
        }
        return response.json();
      })
      .then((json: ClipSource) => { if (active) setSource(json); })
      .catch((cause: Error) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [clipId]);

  const durationFrames = source ? durationOf(source) : 0;
  // Stable identity: VideoExportStage registers its API per manifest, so a new object on every frame would re-register it.
  const manifest = useMemo<VideoExportManifest | null>(() => {
    if (!source) return null;
    const duration = durationOf(source);
    return {
      schemaVersion: 1,
      id: "real-source-" + source.id,
      durationFrames: duration,
      width: source.width,
      height: source.height,
      fps: OUT_FPS,
      assets: [{ id: source.id, kind: "video", url: `/k1/${source.id}.mp4`, licenseRef: source.licenseRef }],
    };
  }, [source]);
  const placement = useMemo<ClipPlacement | null>(
    () => (source ? { id: source.id, source, startFrame: 0, durationFrames: durationOf(source) } : null),
    [source]
  );

  // Autoplay loops through the clip, so the picture visibly changes from frame to frame.
  useEffect(() => {
    if (!playing || durationFrames === 0) return;
    const timer = window.setInterval(
      () => setFrame(current => (current + 1) % durationFrames),
      (1000 * OUT_FPS.den) / OUT_FPS.num
    );
    return () => window.clearInterval(timer);
  }, [playing, durationFrames]);

  const shown = durationFrames ? Math.min(frame, durationFrames - 1) : 0;

  if (error) return <p role="alert" className="p-6 text-body-sm text-danger">{error}</p>;
  if (!source || !manifest || !placement) return <p className="p-6 text-body-sm text-muted-foreground">Loading clip metadata…</p>;

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-4 p-6 text-foreground">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-body font-medium">Real source clip</span>
          <span className={textStyle + " text-muted-foreground"}>
            {source.id} · {source.width}×{source.height} · 30 fps · {durationFrames} frames
          </span>
        </div>
        <span className={textStyle + " text-muted-foreground"}>
          Frame {shown + 1} of {durationFrames}
        </span>
      </div>

      <VideoExportStage manifest={manifest} frame={shown} onSeek={setFrame} className="w-full">
        <FrameAccurateClip
          placement={placement}
          frame={shown}
          fps={OUT_FPS}
          adapter={adapter}
          width={source.width}
          height={source.height}
          requireExact={exporting}
          description={"Real footage fixture " + source.id}
        />
      </VideoExportStage>

      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={() => setPlaying(value => !value)} aria-pressed={playing}>
          {playing ? "Pause" : "Play"}
        </Button>
        <input
          type="range"
          aria-label="Frame"
          min={0}
          max={Math.max(0, durationFrames - 1)}
          value={shown}
          onChange={event => {
            setPlaying(false);
            setFrame(Number(event.target.value));
          }}
          className="min-w-0 flex-1 accent-checked"
        />
      </div>

      <p className="text-caption text-muted-foreground">
        Each picture is painted with its source frame index as a black and white barcode, so the still shows which
        frame of the file it came from.
      </p>
    </div>
  );
}

const meta = { title: "Video production/Real Source Clip", id: "video-real-source-clip", component: RealSourceClip, parameters: { layout: "fullscreen" },
  args: { startFrame: 0 } } satisfies Meta<typeof RealSourceClip>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
