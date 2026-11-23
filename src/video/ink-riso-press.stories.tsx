import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InkRisoCanvas } from "../../registry/video/ink-riso-press-react";
import type { InkRisoSheet } from "../../registry/video/ink-riso-press";
import { drawInkWashPortrait, inkWashPortraitSheet } from "./ink-wash-portrait-art";
import type { InkWashPortraitCrop } from "./ink-wash-portrait-art";

const LABEL = "Half figure of a calm woman turned away, looking back over her shoulder: the hair parted over the forehead and gathered into a bun tied with a red ribbon, the rest falling down her back, before a full moon left as bare paper";
const FACE: InkWashPortraitCrop = { x: 290, y: 350, width: 470, height: 480 };
const DRUMS = [{ id: "teal", name: "Teal" }, { id: "red", name: "Vermilion" }, { id: "black", name: "Sumi black" }] as const;

const page = { minHeight: "100vh", boxSizing: "border-box", padding: "32px 20px", background: "#E4E0D6", color: "#1F2324", font: "16px/1.5 system-ui, sans-serif" } as const;

function Portrait({ scale = 1, crop, finish, drums, maxWidth }: { scale?: number; crop?: InkWashPortraitCrop; finish?: "riso" | "ink"; drums?: readonly string[]; maxWidth: number }) {
  const spec = useMemo(() => inkWashPortraitSheet(scale, crop), [scale, crop]);
  const draw = useMemo(() => (sheet: InkRisoSheet) => drawInkWashPortrait(sheet, crop), [crop]);
  return <InkRisoCanvas spec={spec} draw={draw} finish={finish} drums={drums} label={LABEL} style={{ maxWidth, margin: "0 auto", boxShadow: "0 2px 18px rgb(40 34 20 / .22)" }} />;
}

function Proofs() {
  const [on, setOn] = useState<readonly string[]>(DRUMS.map(d => d.id));
  return <main style={page}>
    <fieldset style={{ border: 0, padding: 0, margin: "0 auto 20px", maxWidth: 840, display: "flex", flexWrap: "wrap", gap: "8px 24px" }}>
      <legend style={{ fontWeight: 600, marginBottom: 6 }}>Drums to print</legend>
      {DRUMS.map(d => <label key={d.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 32 }}>
        <input type="checkbox" checked={on.includes(d.id)} onChange={e => setOn(DRUMS.map(x => x.id).filter(id => (id === d.id ? e.target.checked : on.includes(id))))} style={{ width: 18, height: 18 }} />{d.name}
      </label>)}
    </fieldset>
    <Portrait scale={2} crop={FACE} drums={on} maxWidth={840} />
  </main>;
}

const meta: Meta = { title: "Video production/Film Looks/Risograph", id: "video-riso-ink-press", parameters: { layout: "fullscreen" } };
export default meta;

/** The whole page: brush ink printed in three spot colours. */
export const InkPortrait: StoryObj = { render: () => <main style={page}><Portrait scale={1.5} maxWidth={900} /></main> };
/** The same sheet before the press: ink on xuan paper. */
export const InkPortraitPainting: StoryObj = { render: () => <main style={page}><Portrait scale={1.5} finish="ink" maxWidth={900} /></main> };
/** The face at print size, with a switch per drum. */
export const InkPortraitProofs: StoryObj = { render: () => <Proofs /> };
