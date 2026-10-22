import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ZoneBoundary } from "../../registry/visual/zone-boundary";
import type { ZoneBoundaryColors, ZoneBoundaryZone } from "../../registry/visual/zone-boundary";

// Plain rectangles stand in for nodes; the story only demonstrates the boundary overlay.
const W = 640, H = 200;
const NODES = [
  { id: "a", x: 70, y: 100, w: 120, h: 60 },
  { id: "b", x: 300, y: 100, w: 120, h: 60 },
  { id: "c", x: 470, y: 100, w: 120, h: 60 },
];
const ZONES: ZoneBoundaryZone[] = [
  { id: "device", label: "Your device", rect: { x: 40, y: 30, width: 200, height: 150 } },
  { id: "server", label: "Converter", rect: { x: 430, y: 30, width: 180, height: 150 }, tone: "outside" },
];
const LIGHT: Partial<ZoneBoundaryColors> = {};
const DARK: Partial<ZoneBoundaryColors> = { inside: "#6cc598", outside: "#efb389", labelFill: "#253448", labelInk: "#edf3fc" };

const page = (dark: boolean): CSSProperties => ({ padding: 20, borderRadius: 16, background: dark ? "#182332" : "#f4f6f9", color: dark ? "#edf3fc" : "#243347", font: "15px/1.5 Geist, Inter, system-ui, sans-serif", display: "grid", gap: 20 });
const note: CSSProperties = { margin: 0, fontSize: 13, opacity: 0.75 };

function Host({ zones, dark = false, label }: { zones: ZoneBoundaryZone[]; dark?: boolean; label: string }) {
  const nodeFill = dark ? "#253448" : "#ffffff", nodeStroke = dark ? "#7389a7" : "#8a9caf", ink = dark ? "#edf3fc" : "#243347";
  return <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ display: "block", width: "100%", height: "auto", background: dark ? "#131c2a" : "#ffffff", borderRadius: 12 }}>
    {NODES.map(n => <g key={n.id}>
      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={10} fill={nodeFill} stroke={nodeStroke} strokeWidth={1.5} />
      <text x={n.x + n.w / 2} y={n.y + n.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={14} fill={ink}>Node {n.id.toUpperCase()}</text>
    </g>)}
    <ZoneBoundary zones={zones} fontSize={20} fontFamily="Geist, Inter, system-ui, sans-serif" colors={dark ? DARK : LIGHT} />
  </svg>;
}

function ZonesDemo({ dark = false }: { dark?: boolean }) {
  return <div style={page(dark)}>
    <figure style={{ margin: 0, display: "grid", gap: 6 }}>
      <Host zones={ZONES} dark={dark} label="Two zones: your device, and a converter's server outside it." />
      <figcaption style={note}>Green marks a zone the data stays in; orange marks a third party's zone.</figcaption>
    </figure>
  </div>;
}

function OverflowDemo() {
  const narrow: ZoneBoundaryZone[] = [{ id: "long", label: "A label much wider than the zone it sits in", rect: { x: 40, y: 30, width: 140, height: 150 } }];
  return <div style={page(false)}>
    <figure style={{ margin: 0, display: "grid", gap: 6 }}>
      <Host zones={narrow} label="A zone whose label is wider than the zone; the label is drawn in full and flagged." />
      <figcaption style={note}>A label wider than its zone is drawn in full and flagged with data-km-zone-overflow. Widen the zone or shorten the label.</figcaption>
    </figure>
  </div>;
}

const meta = { title: "Visual/Zone Boundary", component: ZoneBoundary, parameters: { layout: "padded" }, tags: ["autodocs"],
  args: { zones: ZONES, fontSize: 20 } } satisfies Meta<typeof ZoneBoundary>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Zones: Story = { render: () => <ZonesDemo /> };
export const DarkTheme: Story = { name: "Dark theme", render: () => <ZonesDemo dark /> };
export const LabelOverflow: Story = { name: "Label wider than zone", render: () => <OverflowDemo /> };
