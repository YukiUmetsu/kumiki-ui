import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { evaluateCutPlan } from "../../registry/motion/cut-director";
import type { CutLayer } from "../../registry/motion/cut-director";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../registry/video/video-export-stage";
import { FreezeFrameFocus } from "../../registry/video/freeze-frame-focus-react";
import { validateFreezeFocus } from "../../registry/video/freeze-frame-focus";
import { createVideoElementAdapter } from "../../registry/video/frame-clip-adapters";
import { EconomicChartView } from "../../registry/infographic/economic-react";
import { EXPLANATION_FPS, EXPLANATION_FRAMES, EXPLANATION_IDS } from "./clip-explanation-data";
import {
  EXPLANATION_FOCUS, EXPLANATION_PROFILES, explanationChart, explanationChartBox, explanationChartPlacement, explanationPlan,
} from "./clip-explanation-layout";
import type { ExplanationProfile, ExplanationProfileId } from "./clip-explanation-layout";

/* K2/K3 clip-to-explanation reference. One composition, three independently authored profiles (16:9, 9:16, 1:1):
 * a real decoded clip freezes on the parcel label, callouts address the same stable subject, and the same parcel
 * hands off to a sourced cost chart whose values are marked illustrative. Layout rules: clip-explanation-layout.ts.
 * Each profile declares its platform preset, so the exporter refuses a render at the wrong size:
 *   npm run video:export -- --url="http://127.0.0.1:6006/iframe.html?id=video-clip-explanation-k2--landscape&viewMode=story&kmExport=1" --preset=youtube --output=dist/k3-youtube.mp4
 */
const CLIP_URL = new URL("./assets/conveyor-1080p.webm", import.meta.url).href;

/** One adapter per mounted story; disposed on unmount so video elements do not leak between stories. */
function useClipAdapter() {
  const adapter = useMemo(() => createVideoElementAdapter({ url: () => CLIP_URL }), []);
  useEffect(() => () => adapter.dispose?.(), [adapter]);
  return adapter;
}

function Film({ profile, frame, exporting }: { profile: ExplanationProfile; frame: number; exporting: boolean }) {
  const adapter = useClipAdapter();
  const plan = useMemo(() => explanationPlan(profile), [profile]);
  const state = evaluateCutPlan(plan, frame);
  const box = explanationChartBox(profile);
  const place = explanationChartPlacement(profile);
  const shot = (layer: CutLayer): ReactNode => {
    if (layer.shotId === EXPLANATION_IDS.scanShot) {
      return <FreezeFrameFocus spec={EXPLANATION_FOCUS} frame={layer.localFrame} fps={EXPLANATION_FPS} adapter={adapter}
        width={profile.width} height={profile.height} framing={profile.framing} requireExact={exporting}
        typography={profile.typography} style={{ position: "absolute", inset: 0 }}
        description="Parcel 7-3 on a conveyor; its shipping label passes the scanner" />;
    }
    // Payoff: the chart reveals at an absolute frame. The frame carries the card colour, and the chart's content is
    // centred in the frame, horizontally and vertically.
    const chart = explanationChart(profile, layer.localFrame);
    return <div data-k2-chart={EXPLANATION_IDS.chart} style={{ position: "absolute", inset: 0, background: chart.background }}>
      <div style={{ position: "absolute", left: place.left, top: place.top, width: box.width, height: box.height }}>
        <EconomicChartView chart={chart} />
      </div>
    </div>;
  };
  return <div style={{ position: "relative", width: profile.width, height: profile.height, background: "#0b111c", overflow: "hidden" }}>
    {state.layers.map((layer, i) => <div key={`${layer.shotId}-${i}`} data-k2-layer={layer.shotId}
      style={{ position: "absolute", inset: 0, opacity: layer.opacity }}>{shot(layer)}</div>)}
  </div>;
}

function ClipExplanation({ profileId, startFrame }: { profileId: ExplanationProfileId; startFrame: number }) {
  const profile = EXPLANATION_PROFILES[profileId];
  const exporting = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("kmExport") === "1";
  const [frame, setFrame] = useState(startFrame);
  const manifest: VideoExportManifest = { schemaVersion: 1, id: "clip-explanation-" + profile.id, durationFrames: EXPLANATION_FRAMES,
    width: profile.width, height: profile.height, fps: EXPLANATION_FPS, preset: profile.preset };
  const film = <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <Film profile={profile} frame={frame} exporting={exporting} />
  </VideoExportStage>;
  if (exporting) return film;
  const problems = validateFreezeFocus(EXPLANATION_FOCUS, EXPLANATION_FPS,
    [{ width: profile.width, height: profile.height, framing: profile.framing }]);
  const shot = evaluateCutPlan(explanationPlan(profile), frame).shotId;
  const scale = 0.3;
  return <section style={{ padding: 20, display: "grid", gap: 12, font: "400 14px/1.5 system-ui, sans-serif" }}>
    <p style={{ margin: 0 }}>{profile.label} · {profile.width}×{profile.height} · preset {profile.preset}</p>
    <label>Frame {frame} · {shot}
      <input aria-label="Seek" type="range" min={0} max={EXPLANATION_FRAMES - 1} value={frame} onChange={event => setFrame(Number(event.target.value))} style={{ width: "100%" }} />
    </label>
    <div style={{ width: profile.width * scale, height: profile.height * scale, overflow: "hidden", borderRadius: 12 }}>
      <div style={{ width: profile.width, height: profile.height, transform: `scale(${scale})`, transformOrigin: "0 0" }}>{film}</div>
    </div>
    <ul>{problems.map((d, i) => <li key={i}><strong>{d.code}</strong> — {d.message}</li>)}</ul>
  </section>;
}

const meta = { title: "Video/Clip Explanation (K2)", component: ClipExplanation, parameters: { layout: "fullscreen" },
  argTypes: { profileId: { control: "inline-radio", options: Object.keys(EXPLANATION_PROFILES) },
    startFrame: { control: { type: "number", min: 0, max: EXPLANATION_FRAMES - 1 } } },
  args: { profileId: "youtube-shorts", startFrame: 0 } } satisfies Meta<typeof ClipExplanation>;
export default meta;
type Story = StoryObj<typeof meta>;
/** 9:16 vertical (the K2 reference). */
export const Default: Story = {};
/** 16:9 landscape, authored independently. */
export const Landscape: Story = { args: { profileId: "youtube" } };
/** 1:1 square, authored independently. */
export const Square: Story = { args: { profileId: "social-square" } };
