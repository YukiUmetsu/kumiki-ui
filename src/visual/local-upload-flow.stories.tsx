import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { DiagramSpec } from "../../registry/infographic/types";
import { createDiagramTimeline } from "../../registry/motion/diagram-stage";
import type { DiagramPacket, DiagramNodeSample } from "../../registry/motion/diagram-stage";
import { DiagramStage } from "../../registry/motion/diagram-stage-react";
import type { DiagramStageTheme } from "../../registry/motion/diagram-stage-react";
import type { Rect } from "../../registry/motion/types";
import { TechnologyObject2D } from "../../registry/domains/technology-object-2d";
import type { TechnologyObjectKind } from "../../registry/domains/technology-object-model";
import { ZoneBoundary } from "../../registry/visual/zone-boundary";
import type { ZoneBoundaryColors, ZoneBoundaryZone } from "../../registry/visual/zone-boundary";

// Illustrative flows: packet motion shows where a file goes, not how fast or how much moves.
const W = 1200, H = 340, FRAMES = 240, FPS = { num: 30, den: 1 };
const box = (x: number, y: number): Rect => ({ x, y, width: 200, height: 180 });

const LOCAL_GRAPH: DiagramSpec = {
  direction: "horizontal",
  nodes: [
    { id: "tab", label: "Browser tab" },
    { id: "convert", label: "Converts in memory" },
    { id: "saved", label: "File saved here" },
  ],
  edges: [{ id: "tab-convert", from: "tab", to: "convert" }, { id: "convert-saved", from: "convert", to: "saved" }],
};
const LOCAL_KINDS: Record<string, TechnologyObjectKind> = { tab: "laptop", convert: "cpu", saved: "storage-disk" };
const LOCAL_BOUNDS: Record<string, Rect> = { tab: box(80, 110), convert: box(500, 110), saved: box(920, 110) };
const LOCAL_ZONES: ZoneBoundaryZone[] = [{ id: "device", label: "Stays on this device", rect: { x: 30, y: 40, width: 1140, height: 270 } }];
const LOCAL_PACKETS: DiagramPacket[] = [
  { id: "local-1", edgeId: "tab-convert", label: "your file", range: { startFrame: 20, endFrame: 80 } },
  { id: "local-2", edgeId: "convert-saved", label: "result", range: { startFrame: 100, endFrame: 160 } },
];

const UPLOAD_GRAPH: DiagramSpec = {
  direction: "horizontal",
  nodes: [
    { id: "laptop", label: "Browser tab" },
    { id: "router", label: "Internet" },
    { id: "server", label: "Converter's server" },
  ],
  edges: [{ id: "laptop-router", from: "laptop", to: "router", label: "upload" }, { id: "router-server", from: "router", to: "server" }],
};
const UPLOAD_KINDS: Record<string, TechnologyObjectKind> = { laptop: "laptop", router: "router", server: "server-rack" };
const UPLOAD_BOUNDS: Record<string, Rect> = { laptop: box(60, 110), router: box(490, 110), server: box(900, 110) };
const UPLOAD_ZONES: ZoneBoundaryZone[] = [
  { id: "device", label: "Your device", rect: { x: 30, y: 40, width: 270, height: 270 } },
  { id: "server", label: "Converter's server", rect: { x: 870, y: 40, width: 300, height: 270 }, tone: "outside" },
];
const UPLOAD_PACKETS: DiagramPacket[] = [
  { id: "up-1", edgeId: "laptop-router", label: "your file", range: { startFrame: 20, endFrame: 70 } },
  { id: "up-2", edgeId: "router-server", label: "your file", range: { startFrame: 80, endFrame: 130 } },
  { id: "up-3", edgeId: "router-server", direction: "reverse", label: "result", range: { startFrame: 150, endFrame: 195 } },
  { id: "up-4", edgeId: "laptop-router", direction: "reverse", label: "result", range: { startFrame: 195, endFrame: 215 } },
];

const THEMES: Record<"light" | "dark", { diagram: Partial<DiagramStageTheme>; zones: Partial<ZoneBoundaryColors>; tech: "paper" | "midnight"; page: CSSProperties }> = {
  light: {
    diagram: { surface: "#f4f6f9", node: "#ffffff", ink: "#243347", mutedInk: "#526174", edge: "#8a9caf", accent: "#345eb5", packet: "#345eb5", reversePacket: "#b45b27", fontFamily: "Geist, Inter, system-ui, sans-serif", fontSize: 20 },
    zones: { inside: "#2f8f5b", outside: "#b45b27", labelFill: "#ffffff", labelInk: "#243347" },
    tech: "paper", page: { background: "#ffffff", color: "#16191e" },
  },
  dark: {
    diagram: { surface: "#182332", node: "#253448", ink: "#edf3fc", mutedInk: "#b2c4dc", edge: "#7389a7", accent: "#8dc6f3", packet: "#a7d9ff", reversePacket: "#efb389", fontFamily: "Geist, Inter, system-ui, sans-serif", fontSize: 20 },
    zones: { inside: "#6cc598", outside: "#efb389", labelFill: "#253448", labelInk: "#edf3fc" },
    tech: "midnight", page: { background: "#182332", color: "#edf3fc" },
  },
};

function timelineFor(id: string, graph: DiagramSpec, bounds: Record<string, Rect>) {
  return createDiagramTimeline({ id, graph, fps: FPS, durationFrames: FRAMES, layouts: [{ frame: 0, bounds }] });
}

function Panel({ title, caption, graph, timeline, kinds, packets, zones, frame, theme, mode, ariaLabel }: {
  title: string; caption: string; graph: DiagramSpec; timeline: ReturnType<typeof timelineFor>; kinds: Record<string, TechnologyObjectKind>;
  packets: DiagramPacket[]; zones: ZoneBoundaryZone[]; frame: number; theme: (typeof THEMES)["light"]; mode: "light" | "dark"; ariaLabel: string;
}) {
  const renderNode = ({ node, bounds }: DiagramNodeSample) => <TechnologyObject2D x={0} y={0} width={bounds.width} height={bounds.height}
    theme={theme.tech} spec={{ id: node.id, kind: kinds[node.id], title: node.label }} />;
  return <figure style={{ margin: 0, display: "grid", gap: 10 }}>
    <figcaption style={{ display: "grid", gap: 4 }}>
      <strong style={{ fontSize: 18 }}>{title}</strong>
      <span style={{ fontSize: 14, opacity: 0.75 }}>{caption}</span>
    </figcaption>
    <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${mode === "dark" ? "#3a4758" : "#d5d9df"}` }}>
      <DiagramStage graph={graph} timeline={timeline} frame={frame} width={W} height={H} packets={packets}
        theme={theme.diagram} ariaLabel={ariaLabel} renderNode={renderNode}
        overlay={<ZoneBoundary zones={zones} fontSize={20} fontFamily={theme.diagram.fontFamily} colors={theme.zones} />} />
    </div>
  </figure>;
}

function FlowDemo({ mode = "light" }: { mode?: "light" | "dark" }) {
  const [frame, setFrame] = useState(0);
  const theme = THEMES[mode];
  const local = useMemo(() => timelineFor("local-flow", LOCAL_GRAPH, LOCAL_BOUNDS), []);
  const upload = useMemo(() => timelineFor("upload-flow", UPLOAD_GRAPH, UPLOAD_BOUNDS), []);
  return <div style={{ display: "grid", gap: 26, padding: 20, borderRadius: 16, font: "16px/1.5 Geist, Inter, system-ui, sans-serif", ...theme.page }}>
    <Panel mode={mode} theme={theme} frame={frame} title="Converted on this device"
      caption="The file is processed in your browser and saved back to your device. No packet crosses the boundary."
      graph={LOCAL_GRAPH} timeline={local} kinds={LOCAL_KINDS} packets={LOCAL_PACKETS} zones={LOCAL_ZONES}
      ariaLabel="Illustrative flow: a browser tab converts a file in memory and saves the result on the same device; all packets stay inside the device zone." />
    <Panel mode={mode} theme={theme} frame={frame} title="Uploaded to a converter"
      caption="The file leaves your device, is processed on a server you do not control, and comes back. Arrows show direction, not measured speed."
      graph={UPLOAD_GRAPH} timeline={upload} kinds={UPLOAD_KINDS} packets={UPLOAD_PACKETS} zones={UPLOAD_ZONES}
      ariaLabel="Illustrative flow: a file uploads from the device through the internet to a converter's server, and the result returns; packets cross from the device zone into the server zone." />
    <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
      Animation frame: {frame}
      <input type="range" min={0} max={FRAMES - 1} value={frame} onChange={(e) => setFrame(Number(e.target.value))} aria-label="Animation frame" />
    </label>
  </div>;
}

const meta = { title: "Visual/Local vs Upload Flow", component: FlowDemo, parameters: { layout: "padded" }, tags: ["autodocs"] } satisfies Meta<typeof FlowDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Compare: Story = { render: () => <FlowDemo /> };
export const DarkTheme: Story = { name: "Dark theme", render: () => <FlowDemo mode="dark" /> };
