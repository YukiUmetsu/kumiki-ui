import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ACTION_UNITS, EMOTIONS } from "../../registry/anatomy/expression-facs";
import { expressFace, expressionFeatures, findEmotion, nearestEmotion } from "../../registry/anatomy/expression-face";
import { ExpressionAtlas, ExpressionFace, ExpressionSheet } from "../../registry/anatomy/expression-react";
import { renderMeshFrame } from "../../registry/anatomy/anatomy-view";
import { HumanFigure } from "../../registry/anatomy/anatomy-react";

const page = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "var(--km-surface-canvas, #f6f3f1)", color: "var(--km-text-primary, #242424)",
  font: "15px/1.5 var(--km-font-sans, system-ui, sans-serif)" } as const;
const label = { display: "grid", gap: 4, font: "600 13px var(--km-font-sans, system-ui, sans-serif)" } as const;
const field = { minHeight: 36, padding: "6px 8px", borderRadius: 7, border: "1px solid var(--km-border-strong, #797776)", background: "var(--km-surface-field, #fff)",
  color: "inherit", font: "14px var(--km-font-sans, system-ui, sans-serif)" } as const;
const muted = { margin: 0, color: "var(--km-text-muted, #4e4d4d)", font: "13px/1.45 var(--km-font-sans, system-ui, sans-serif)" } as const;

function EmotionSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return <label style={{ ...label, maxWidth: 320 }}>Expression
    <select style={field} value={value} onChange={e => onChange(e.target.value)}>{EMOTIONS.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
  </label>;
}

function AtlasStory() {
  return <div style={page}>
    <p style={muted}>EMFACS prototypes (reported) and drawing extras (estimated), as action units applied to ANAT1's measured face. Red lines are the creases each unit makes.</p>
    <ExpressionAtlas />
  </div>;
}

function SheetStory() {
  const [id, setId] = useState("smile");
  return <div style={page}><EmotionSelect value={id} onChange={setId} /><ExpressionSheet emotion={id} /></div>;
}

const LAB_UNITS = [1, 2, 4, 5, 6, 7, 9, 10, 12, 14, 15, 17, 20, 23, 24, 25, 26, 27, 41, 43, 61, 62, 63, 64, 66];
function Lab() {
  const [w, setW] = useState<Record<number, number>>({ ...findEmotion("smile")!.aus });
  const [yaw, setYaw] = useState(-25);
  const face = useMemo(() => expressFace(w), [w]);
  const frame = useMemo(() => renderMeshFrame(face.mesh, { yaw, pitch: 0, target: [0, 0, .03] }, { width: 360, height: 420, pixelsPerMetre: 360 * 4.6, centerOnTarget: true }), [face, yaw]);
  const nearest = useMemo(() => nearestEmotion(expressionFeatures(face)).slice(0, 3), [face]);
  return (
    <div style={{ ...page, gridTemplateColumns: "minmax(260px, 340px) 1fr" }}>
      <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
        <EmotionSelect value="" onChange={id => setW({ ...findEmotion(id)!.aus })} />
        <button type="button" style={field} onClick={() => setW({})}>Neutral</button>
        {LAB_UNITS.map(id => <label key={id} style={label}>AU {id} {ACTION_UNITS[id].name}: {(w[id] ?? 0).toFixed(2)}
          <input type="range" min={0} max={1} step={.05} value={w[id] ?? 0} onChange={e => setW(prev => ({ ...prev, [id]: Number(e.target.value) }))} />
        </label>)}
      </div>
      <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}>
          <figure style={{ margin: 0 }}><HumanFigure frame={frame} surface="clay" contour label="Expressed face, clay" />
            <figcaption style={muted}>ANAT1's measured face, clay. <label>Turn <input type="range" min={-60} max={60} value={yaw} onChange={e => setYaw(Number(e.target.value))} /></label></figcaption></figure>
          <figure style={{ margin: 0 }}><ExpressionFace face={face} label="Expressed face, line study" /><figcaption style={muted}>Line study with creases.</figcaption></figure>
        </div>
        <p style={{ margin: 0 }}>Reads as: {nearest.map(n => `${findEmotion(n.id)?.name} (${n.distance.toFixed(2)})`).join(", ")}</p>
      </div>
    </div>
  );
}

const meta = { title: "Video production/Art Foundations/Facial Expressions", id: "video-facial-expressions", component: AtlasStory, parameters: { layout: "fullscreen" } } satisfies Meta<typeof AtlasStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Atlas: Story = { render: () => <AtlasStory /> };
export const Sheet: Story = { render: () => <SheetStory /> };
export const ActionUnitLab: Story = { name: "Action unit lab", render: () => <Lab /> };
