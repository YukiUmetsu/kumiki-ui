import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClipTimeline2D } from "../../registry/visual/clip-timeline";
import type { ClipTimelineColors } from "../../registry/visual/clip-timeline";
import { Waveform2D, illustrativePeaks } from "../../registry/visual/waveform";
import type { WaveformColors } from "../../registry/visual/waveform";

// Illustrative peaks and an invented 12-second clip: nothing here is read from an audio file.
const DURATION = 12;
const PEAKS = illustrativePeaks(96, 7);
const LIGHT_WAVE: Partial<WaveformColors> = {};
const DARK_WAVE: Partial<WaveformColors> = { bar: "#5f7391", played: "#8dc6f3", selection: "rgba(141, 198, 243, 0.16)", playhead: "#edf3fc" };
const LIGHT_TIMELINE: Partial<ClipTimelineColors> = {};
const DARK_TIMELINE: Partial<ClipTimelineColors> = { track: "#253448", kept: "#8dc6f3", handle: "#edf3fc", dimmed: "rgba(14, 22, 34, 0.55)", ruler: "#b2c4dc", label: "#edf3fc", playhead: "#efb389" };

const page = (dark: boolean): CSSProperties => ({ padding: 20, borderRadius: 16, background: dark ? "#182332" : "#f4f6f9", color: dark ? "#edf3fc" : "#243347", font: "15px/1.5 Geist, Inter, system-ui, sans-serif", display: "grid", gap: 22 });
const note: CSSProperties = { margin: 0, fontSize: 13, opacity: 0.75 };

function Clip({ title, caption, trimStart, trimEnd, playhead, dark = false, width = 640 }: {
  title: string; caption: string; trimStart?: number; trimEnd?: number; playhead?: number; dark?: boolean; width?: number;
}) {
  const start = trimStart ?? 0, end = trimEnd ?? DURATION;
  return <figure style={{ margin: 0, display: "grid", gap: 8, maxWidth: width }}>
    <figcaption style={{ display: "grid", gap: 2 }}>
      <strong style={{ fontSize: 16 }}>{title}</strong>
      <span style={note}>{caption}</span>
    </figcaption>
    <Waveform2D peaks={PEAKS} width={width} height={80} ariaLabel="Illustrative waveform of an example clip" progress={playhead !== undefined ? playhead / DURATION : undefined}
      selection={{ start: start / DURATION, end: end / DURATION }} colors={dark ? DARK_WAVE : LIGHT_WAVE} />
    <ClipTimeline2D duration={DURATION} trimStart={start} trimEnd={end} playhead={playhead} width={width} height={120}
      colors={dark ? DARK_TIMELINE : LIGHT_TIMELINE} />
  </figure>;
}

function TrimDemo({ dark = false }: { dark?: boolean }) {
  return <div style={page(dark)}>
    <Clip dark={dark} title="Keep 00:02.0 to 00:08.0" caption="The kept part is highlighted; the dimmed parts are removed by the trim." trimStart={2} trimEnd={8} />
    <Clip dark={dark} title="Full clip, playhead at 00:04.0" caption="No trim yet. The playhead marks the current position." playhead={4} />
  </div>;
}

function EdgeDemo() {
  return <div style={page(false)}>
    <Clip title="Short trim in the middle" caption="Both labels move outward; they never overlap." trimStart={5} trimEnd={6} />
    <Clip title="Trim starting near the beginning" caption="The In label moves inside when there is no room to the left." trimStart={0} trimEnd={1.5} />
  </div>;
}

function NarrowDemo() {
  return <div style={page(false)}>
    <Clip title="Narrow column" caption="The same drawing, scaled to a 260-unit column." trimStart={2} trimEnd={8} width={260} />
  </div>;
}

const meta = { title: "Video production/Audio Trim Timeline", id: "visual-audio-trim-timeline", component: ClipTimeline2D, parameters: { layout: "padded" }, tags: ["autodocs"],
  args: { duration: DURATION, trimStart: 2, trimEnd: 8, width: 640, height: 120 } } satisfies Meta<typeof ClipTimeline2D>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Trim: Story = { render: () => <TrimDemo /> };
export const DarkTheme: Story = { name: "Dark theme", render: () => <TrimDemo dark /> };
export const EdgeCases: Story = { name: "Edge cases", render: () => <EdgeDemo /> };
export const NarrowColumn: Story = { name: "Narrow column", render: () => <NarrowDemo /> };
