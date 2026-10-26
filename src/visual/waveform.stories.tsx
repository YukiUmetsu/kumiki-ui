import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Waveform2D, illustrativePeaks } from "../../registry/visual/waveform";
import type { WaveformColors } from "../../registry/visual/waveform";

// Illustrative peaks: generated for the demo, not read from any audio file.
const PEAKS = illustrativePeaks(96, 7);
const LIGHT: Partial<WaveformColors> = {};
const DARK: Partial<WaveformColors> = { bar: "#5f7391", played: "#8dc6f3", selection: "rgba(141, 198, 243, 0.16)", playhead: "#edf3fc" };

const page = (dark: boolean): CSSProperties => ({ padding: 20, borderRadius: 16, background: dark ? "#182332" : "#f4f6f9", color: dark ? "#edf3fc" : "#243347", font: "15px/1.5 Geist, Inter, system-ui, sans-serif", display: "grid", gap: 18 });
const note: CSSProperties = { margin: 0, fontSize: 13, opacity: 0.75 };

function Example({ title, caption, dark = false, width = 640, ...props }: { title: string; caption: string; dark?: boolean; width?: number; progress?: number; selection?: { start: number; end: number } }) {
  return <figure style={{ margin: 0, display: "grid", gap: 6, maxWidth: width }}>
    <figcaption style={{ display: "grid", gap: 2 }}><strong style={{ fontSize: 15 }}>{title}</strong><span style={note}>{caption}</span></figcaption>
    <Waveform2D peaks={PEAKS} width={width} height={80} ariaLabel={`Illustrative waveform: ${title.toLowerCase()}`} colors={dark ? DARK : LIGHT} {...props} />
  </figure>;
}

function PlainDemo({ dark = false }: { dark?: boolean }) {
  return <div style={page(dark)}>
    <Example dark={dark} title="Plain waveform" caption="Peaks only: no playhead and no selection." />
    <Example dark={dark} title="Played 40%" caption="The playhead is at 40 percent; bars before it use the played colour." progress={0.4} />
    <Example dark={dark} title="Selection 25% to 75%" caption="Bars outside the selection are dimmed." selection={{ start: 0.25, end: 0.75 }} progress={0.5} />
  </div>;
}

function NarrowDemo() {
  return <div style={page(false)}>
    <Example title="Narrow column" caption="Same peaks at 240 units wide." width={240} progress={0.3} selection={{ start: 0.1, end: 0.6 }} />
  </div>;
}

const meta = { title: "Video production/Waveform", id: "visual-waveform", component: Waveform2D, parameters: { layout: "padded" }, tags: ["autodocs"],
  args: { peaks: PEAKS, width: 640, height: 80, ariaLabel: "Illustrative waveform" } } satisfies Meta<typeof Waveform2D>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = { render: () => <PlainDemo /> };
export const DarkTheme: Story = { name: "Dark theme", render: () => <PlainDemo dark /> };
export const NarrowColumn: Story = { name: "Narrow column", render: () => <NarrowDemo /> };
