import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileObjectStory } from "../../registry/video/object-story";
import type { ObjectStorySpec } from "../../registry/video/object-story";
import { ObjectStory, createStoryTextMeasure } from "../../registry/video/object-story-react";
import { FinanceObject2D } from "../../registry/domains/finance-object-2d";
import { TechnologyObject2D } from "../../registry/domains/technology-object-2d";
import { BusinessObject2D } from "../../registry/domains/business-object-2d";
import type { FinanceObjectKind } from "../../registry/domains/finance-object-model";
import type { TechnologyObjectKind } from "../../registry/domains/technology-object-model";
import type { BusinessObjectKind } from "../../registry/domains/business-object-model";

const usd = { format: { kind: "currency", currency: "USD", precision: 0 } } as const;
const base = { schemaVersion: 1, fps: { num: 30, den: 1 }, width: 1920, height: 1080 } as const;
const billing: ObjectStorySpec = { ...base, id: "billing", durationFrames: 300,
  objects: [{ id: "bill", label: "Bill", art: "finance:invoice", value: usd }, { id: "slip", label: "Slip", art: "finance:receipt", value: usd }, { id: "wallet", label: "Paid", art: "finance:wallet" }],
  beats: [
    { id: "bill", startFrame: 0, endFrame: 80, arrangement: { kind: "solo", objects: ["bill"] }, caption: { text: "The bill says $120", emphasis: ["$120"] }, ops: [{ kind: "set-value", object: "bill", value: 120, durationFrames: 50 }] },
    { id: "slip", startFrame: 80, endFrame: 160, arrangement: { kind: "pair", objects: ["bill", "slip"] }, caption: { text: "The slip says $100", emphasis: ["$100"] }, ops: [{ kind: "set-value", object: "slip", value: 100, atFrame: 90, durationFrames: 50 }] },
    { id: "gap", startFrame: 160, endFrame: 230, arrangement: { kind: "pair", objects: ["bill", "slip"] }, caption: { text: "So where is the rest?" }, ops: [{ kind: "measure-gap", a: "bill", b: "slip", label: "$20", durationFrames: 40 }, { kind: "mark", object: "slip", mark: "question", atFrame: 200 }] },
    { id: "paid", startFrame: 230, endFrame: 300, arrangement: { kind: "row", objects: ["bill", "wallet", "slip"] }, caption: { text: "Payment closes the gap" }, ops: [{ kind: "transfer", from: "wallet", to: "slip", label: "$20", atFrame: 245, durationFrames: 30 }, { kind: "mark", object: "bill", mark: "check", atFrame: 275, durationFrames: 15 }] },
  ] };
const network: ObjectStorySpec = { ...base, id: "network", durationFrames: 240,
  objects: [{ id: "laptop", label: "Your laptop", art: "technology:laptop" }, { id: "router", label: "Router", art: "technology:router" }, { id: "server", label: "Server", art: "technology:server-rack" }],
  beats: [
    { id: "ask", startFrame: 0, endFrame: 70, arrangement: { kind: "pair", objects: ["laptop", "router"] }, caption: { text: "Your request leaves home" }, ops: [{ kind: "transfer", from: "laptop", to: "router", label: "GET", atFrame: 20 }] },
    { id: "hop", startFrame: 70, endFrame: 150, arrangement: { kind: "row", objects: ["laptop", "router", "server"] }, caption: { text: "The router picks only the next hop", emphasis: ["next", "hop"] }, ops: [{ kind: "connect", from: "router", to: "server", atFrame: 85 }, { kind: "transfer", from: "router", to: "server", label: "GET", atFrame: 110 }] },
    { id: "answer", startFrame: 150, endFrame: 240, arrangement: { kind: "row", objects: ["laptop", "router", "server"] }, focus: "server", caption: { text: "The server answers" }, ops: [{ kind: "highlight", object: "server" }, { kind: "transfer", from: "server", to: "router", label: "200", atFrame: 180 }] },
  ] };
const planning: ObjectStorySpec = { ...base, id: "planning", durationFrames: 210, width: 1080, height: 1920,
  objects: [{ id: "idea", label: "Idea", art: "business:idea" }, { id: "list", label: "Checklist", art: "business:checklist" }, { id: "goal", label: "Goal", art: "business:target" }],
  beats: [
    { id: "idea", startFrame: 0, endFrame: 70, arrangement: { kind: "solo", objects: ["idea"] }, caption: { text: "Start with one idea" }, ops: [{ kind: "highlight", object: "idea", atFrame: 20 }] },
    { id: "plan", startFrame: 70, endFrame: 140, arrangement: { kind: "stack", objects: ["idea", "list"] }, caption: { text: "Turn it into steps" }, ops: [{ kind: "connect", from: "idea", to: "list", atFrame: 85 }] },
    { id: "goal", startFrame: 140, endFrame: 210, arrangement: { kind: "stack", objects: ["list", "goal"] }, caption: { text: "Each step points at the goal" }, ops: [{ kind: "mark", object: "goal", mark: "check", atFrame: 170 }] },
  ] };

function Art({ name, width, height }: { name?: string; width: number; height: number }) {
  const [family, kind] = (name ?? "").split(":");
  const size = { width, height, showTitle: false } as const;
  if (family === "finance") return <FinanceObject2D spec={{ id: kind, kind: kind as FinanceObjectKind }} {...size} />;
  if (family === "technology") return <TechnologyObject2D spec={{ id: kind, kind: kind as TechnologyObjectKind }} {...size} />;
  return <BusinessObject2D spec={{ id: kind, kind: kind as BusinessObjectKind }} {...size} />;
}

function Player({ spec }: { spec: ObjectStorySpec }) {
  const [frame, setFrame] = useState(0);
  const compiled = useMemo(() => compileObjectStory(spec, { measure: createStoryTextMeasure() }), [spec]);
  if (!compiled.ok) return <pre>{compiled.diagnostics.map(item => `${item.code}: ${item.message}`).join("\n")}</pre>;
  const scale = spec.width > spec.height ? .5 : .36;
  return <div style={{ padding: 16 }}>
    <label style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>Frame {frame}
      <input type="range" min={0} max={spec.durationFrames - 1} value={frame} onChange={event => setFrame(Number(event.target.value))} style={{ flex: 1 }} /></label>
    <div style={{ width: spec.width * scale, height: spec.height * scale, overflow: "hidden" }}><div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
      <ObjectStory plan={compiled.plan} frame={frame} renderObject={(object, size) => <Art name={object.art} {...size} />} />
    </div></div>
    <p>Longest still stretch {compiled.plan.pacing.longestStillSeconds.toFixed(1)} s, {Math.round(compiled.plan.pacing.changesPerMinute)} changes a minute.</p>
  </div>;
}

const meta = { title: "Video production/Object Story", id: "video-object-story", component: Player } satisfies Meta<typeof Player>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Finance: Story = { args: { spec: billing } };
export const Technology: Story = { args: { spec: network } };
export const BusinessPortrait: Story = { args: { spec: planning } };
