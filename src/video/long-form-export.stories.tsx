import { useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../registry/video/video-export-stage";

/* Long-form export stress test: 8 minutes at 30 fps, 1080×1920. Every frame is different (absolute
 * timecode, frame index and a travelling bar), so a stale, skipped or duplicated seek shows up in the
 * decoded output. This checks the exporter's bounded memory/disk behaviour, not visual design. Export:
 *   npm run video:export -- --story=video-long-form-export-stress--eight-minutes --output=dist/long-form.mp4 --audio=tone.wav --segmentSeconds=60
 */
const FPS = { num: 30, den: 1 };
const FRAMES = 8 * 60 * 30;
const W = 1080, H = 1920;
const MANIFEST: VideoExportManifest = { schemaVersion: 1, id: "long-form-export-stress", durationFrames: FRAMES, width: W, height: H, fps: FPS };

const timecode = (frame: number) => {
  const seconds = Math.floor(frame / FPS.num);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}.${String(frame % FPS.num).padStart(2, "0")}`;
};

const screen: CSSProperties = { position: "absolute", inset: 0, background: "#0b111c", color: "#f4f1ea", fontFamily: "system-ui, sans-serif" };

function Scene({ frame }: { frame: number }) {
  const progress = frame / (FRAMES - 1);
  return <div style={screen}>
    <div style={{ position: "absolute", left: 80, right: 80, top: 260, fontSize: 176, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{timecode(frame)}</div>
    <div style={{ position: "absolute", left: 80, top: 520, fontSize: 64, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: "#c98a3e" }}>frame {frame} / {FRAMES - 1}</div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 1000, height: 24, borderRadius: 12, background: "#243044" }}>
      <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 12, background: "#c98a3e" }} />
    </div>
    <div style={{ position: "absolute", left: 80 + progress * (W - 160) - 12, top: 990, width: 24, height: 44, borderRadius: 6, background: "#f4f1ea" }} />
  </div>;
}

function LongFormExport({ startFrame }: { startFrame: number }) {
  const [frame, setFrame] = useState(startFrame);
  return <VideoExportStage manifest={MANIFEST} frame={frame} onSeek={setFrame}>
    <Scene frame={frame} />
  </VideoExportStage>;
}

const meta = { title: "Video production/Long-form Export Stress", id: "video-long-form-export-stress", component: LongFormExport, parameters: { layout: "fullscreen" },
  argTypes: { startFrame: { control: { type: "number", min: 0, max: FRAMES - 1 } } }, args: { startFrame: 0 } } satisfies Meta<typeof LongFormExport>;
export default meta;
type Story = StoryObj<typeof meta>;
export const EightMinutes: Story = {};
