import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import latticeUrl from "../../assets/models/anatomy/human-body-lattice.bin?url";
import { loadHumanBodyModel } from "../../registry/anatomy/anatomy-body";
import type { HumanBodyModel } from "../../registry/anatomy/anatomy-body";
import { MOODS } from "../../registry/anatomy/motion-gait";
import type { MoodId } from "../../registry/anatomy/motion-gait";
import { GaitPlayer, GaitStrip, MotionSheet } from "../../registry/anatomy/motion-react";

const page: CSSProperties = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "#f3efe8", color: "#26211d", font: "15px/1.45 system-ui, sans-serif" };
const muted: CSSProperties = { margin: 0, color: "#5b524b", font: "13px/1.5 system-ui" };
const h2: CSSProperties = { margin: 0, font: "700 20px system-ui" };
const button: CSSProperties = { minHeight: 34, padding: "4px 10px", borderRadius: 6, border: "1px solid #a99c8c", background: "#fff", font: "600 13px system-ui", cursor: "pointer" };
const active: CSSProperties = { ...button, background: "#26211d", color: "#fff", border: "1px solid #26211d" };

function useModel() {
  const [m, setM] = useState<HumanBodyModel | null>(null), [err, setErr] = useState("");
  useEffect(() => { let live = true; loadHumanBodyModel(latticeUrl).then(x => live && setM(x), e => live && setErr(String(e))); return () => { live = false; }; }, []);
  return { model: m, error: err };
}
const Loading = ({ error }: { error: string }) => <div style={page} role="status" aria-live="polite">{error ? `Could not load the body model: ${error}` : "Loading the body model…"}</div>;

function Gaits() {
  const { model, error } = useModel();
  if (!model) return <Loading error={error} />;
  return (
    <div style={page}>
      <h2 style={h2}>Walking and running — one cycle, feet planted</h2>
      <p style={{ ...muted, maxWidth: 900 }}>Joint angles through the cycle follow the normative gait curves (Winter 1991; Perry & Burnfield; Novacheck 1998 for running). Each frame stands on the floor, and while a foot is down the point it rolls on (heel, then ball, then toe) stays put: the body moves over it. The strip sets each frame at the distance the body really travelled, as Muybridge's plates did.</p>
      <GaitStrip model={model} gait="walk" frames={12} />
      <GaitStrip model={model} gait="run" frames={12} />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}><GaitPlayer model={model} gait="walk" /><GaitPlayer model={model} gait="run" /></div>
    </div>
  );
}

function Moods() {
  const { model, error } = useModel();
  const [mood, setMood] = useState<MoodId>("sad");
  if (!model) return <Loading error={error} />;
  const m = MOODS.find(x => x.id === mood)!;
  return (
    <div style={page}>
      <h2 style={h2}>A walk with a mood</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} role="group" aria-label="Mood">{MOODS.map(x => <button key={x.id} type="button" style={mood === x.id ? active : button} aria-pressed={mood === x.id} onClick={() => setMood(x.id)}>{x.label}</button>)}</div>
      <p style={{ ...muted, maxWidth: 900 }}>{m.note} (Roether et al. 2009; sizes estimated.)</p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "start" }}><GaitPlayer model={model} gait="walk" mood={mood} /><div style={{ flex: "1 1 400px", minWidth: 0 }}><GaitStrip model={model} gait="walk" mood={mood} frames={10} /></div></div>
    </div>
  );
}

const meta = { title: "Video production/Art Foundations/Human Motion", id: "video-motion", component: MotionSheet, parameters: { layout: "fullscreen" } } satisfies Meta<typeof MotionSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Sheet: Story = { render: () => <div style={page}><h2 style={h2}>Human motion (MOTION1)</h2><MotionSheet /></div> };
export const GaitsStory: Story = { name: "Walking and running", render: () => <Gaits /> };
export const MoodsStory: Story = { name: "Walk with a mood", render: () => <Moods /> };
