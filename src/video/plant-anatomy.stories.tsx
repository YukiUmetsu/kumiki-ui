import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PLANT_SPECIES, findPlant, inSeason } from "../../registry/anatomy/plant-species";
import type { Month } from "../../registry/anatomy/plant-species";
import { GROWTH_FORMS } from "../../registry/anatomy/plant-forms";
import type { GrowthFormId } from "../../registry/anatomy/plant-forms";
import { growPlant, plantConstruction, plantShapes } from "../../registry/anatomy/plant-construct";
import { PlantFigure, PlantSheet } from "../../registry/anatomy/plant-react";
import { CROWN_DRAWING } from "../../registry/anatomy/plant-crown";
import type { PlantFigureMode } from "../../registry/anatomy/plant-react";

const page = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "var(--km-surface-canvas, #f6f3f1)", color: "var(--km-text-primary, #242424)",
  font: "15px/1.5 var(--km-font-sans, system-ui, sans-serif)" } as const;
const label = { display: "grid", gap: 4, font: "600 13px var(--km-font-sans, system-ui, sans-serif)" } as const;
const field = { minHeight: 36, padding: "6px 8px", borderRadius: 7, border: "1px solid var(--km-border-strong, #797776)", background: "var(--km-surface-field, #fff)",
  color: "inherit", font: "14px var(--km-font-sans, system-ui, sans-serif)" } as const;
const row = { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" } as const;
const muted = { margin: 0, color: "var(--km-text-muted, #4e4d4d)", font: "13px/1.45 var(--km-font-sans, system-ui, sans-serif)" } as const;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function SpeciesSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <label style={label}>Plant
      <select style={field} value={value} onChange={e => onChange(e.target.value)}>
        {Object.values(GROWTH_FORMS).map(f => {
          const list = PLANT_SPECIES.filter(s => s.form === f.id);
          return list.length ? <optgroup key={f.id} label={f.label}>{list.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup> : null;
        })}
      </select>
    </label>
  );
}

function SheetStory() {
  const [id, setId] = useState("mountain-cherry");
  return <div style={page}><div style={row}><SpeciesSelect value={id} onChange={setId} /></div><PlantSheet species={id} /></div>;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!m) return;
    setReduced(m.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

function SeasonsLab() {
  const [id, setId] = useState("japanese-maple");
  const [month, setMonth] = useState<Month>(11);
  const [wind, setWind] = useState(0);
  const [seed, setSeed] = useState(11);
  const [mode, setMode] = useState<PlantFigureMode>("colour");
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(0);
  useEffect(() => {
    if (reduced || wind === 0) return;
    let raf = 0; const start = performance.now();
    const tick = (now: number) => { setT((now - start) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, wind]);
  const sp = findPlant(id)!, c = useMemo(() => plantConstruction(sp), [sp]);
  const still = useMemo(() => growPlant(c, { month, seed }), [c, month, seed]);
  const moving = !!wind && !reduced;
  const bounds = useMemo(() => { const b = plantShapes(still).bounds; return [b[0] - .1, b[1], b[2] + .1, b[3] + .05] as const; }, [still]);
  return (
    <div style={page}>
      <div style={row}>
        <SpeciesSelect value={id} onChange={setId} />
        <label style={{ ...label, minWidth: 200 }}>Month: {MONTHS[month - 1]}
          <input type="range" min={1} max={12} step={1} value={month} onChange={e => setMonth(Number(e.target.value) as Month)} />
        </label>
        <label style={{ ...label, minWidth: 160 }}>Wind: {wind.toFixed(1)}{reduced ? " (motion reduced)" : ""}
          <input type="range" min={0} max={2} step={.1} value={wind} onChange={e => setWind(Number(e.target.value))} />
        </label>
        <label style={label}>Drawing
          <select style={field} value={mode} onChange={e => setMode(e.target.value as PlantFigureMode)}>{(["colour", "construction", "silhouette"] as const).map(m => <option key={m} value={m}>{m}</option>)}</select>
        </label>
        <button type="button" style={field} onClick={() => setSeed(s => s + 1)}>Another one ({seed})</button>
      </div>
      {/* The crown is grown once on the still plant and moved by the sway (its physical rate); medium detail while it moves. */}
      <div style={{ maxWidth: 760, width: "100%" }}><PlantFigure skeleton={still} wind={moving ? wind : 0} t={t} swayHz="species" detail={moving ? "medium" : "full"} mode={mode} bounds={bounds} label={`${sp.name} in ${MONTHS[month - 1]}`} /></div>
      <p style={muted}>{sp.name} · {GROWTH_FORMS[sp.form].wind.moves}</p>
    </div>
  );
}

function GrowthForms() {
  return (
    <div style={page}>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))" }}>
        {(Object.keys(GROWTH_FORMS) as GrowthFormId[]).map(id => {
          const f = GROWTH_FORMS[id], sk = growPlant(plantConstruction(id), { month: 7, seed: 5 });
          return (
            <section key={id} style={{ display: "grid", gap: 8, alignContent: "start", padding: 16, borderRadius: 10, background: "var(--km-surface-default, #fff)", border: "1px solid var(--km-border-subtle, #cecac8)" }}>
              <h3 style={{ margin: 0, font: "600 15px var(--km-font-sans, system-ui, sans-serif)" }}>{f.label}</h3>
              <PlantFigure skeleton={sk} mode="construction" label={`${f.label}: construction`} />
              <p style={muted}>{f.architecture.leader} leader · {f.architecture.buds} buds · {f.architecture.crown.shape} crown</p>
              <p style={{ margin: 0, font: "13px/1.45 var(--km-font-sans, system-ui, sans-serif)" }}>{f.drawing[0]}</p>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Calendar() {
  const [month, setMonth] = useState<Month>(4);
  const s = inSeason(month);
  const list = (title: string, items: typeof PLANT_SPECIES[number][]) => (
    <section style={{ display: "grid", gap: 8, alignContent: "start" }}>
      <h3 style={{ margin: 0, font: "600 15px var(--km-font-sans, system-ui, sans-serif)" }}>{title}</h3>
      {items.length ? <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>{items.map(sp => (
        <figure key={sp.id} style={{ margin: 0, display: "grid", gap: 4 }}>
          <PlantFigure skeleton={growPlant(plantConstruction(sp), { month, seed: 3 })} mode="colour" label={`${sp.name} in ${MONTHS[month - 1]}`} />
          <figcaption style={{ ...muted, textAlign: "center" }}>{sp.name}</figcaption>
        </figure>))}</div> : <p style={muted}>Nothing in the library.</p>}
    </section>
  );
  return (
    <div style={page}>
      <label style={{ ...label, maxWidth: 260 }}>Month: {MONTHS[month - 1]}
        <input type="range" min={1} max={12} step={1} value={month} onChange={e => setMonth(Number(e.target.value) as Month)} />
      </label>
      {list("In flower", s.blooming)}
      {list("Autumn colour", s.autumn)}
      {list("Fruiting", s.fruiting)}
    </div>
  );
}

const meta = { title: "Video production/Art Foundations/Plant Anatomy", id: "video-plant-anatomy", component: SheetStory, parameters: { layout: "fullscreen" } } satisfies Meta<typeof SheetStory>;
export default meta;
type Story = StoryObj<typeof meta>;
/** The crown and trunk in detail (plant-crown.ts): the same trees flat and detailed, and trunks up close. */
function CrownDetail() {
  const trees: [string, Month][] = [["zelkova", 7], ["camphor", 7], ["mountain-cherry", 4], ["japanese-black-pine", 7], ["japanese-cedar", 7], ["ginkgo", 11], ["weeping-willow", 6], ["japanese-maple", 11]];
  const card = { display: "grid", gap: 4, alignContent: "start", alignSelf: "start", margin: 0, padding: 8, borderRadius: 8, background: "var(--km-surface-default, #fff)", border: "1px solid var(--km-border-subtle, #cecac8)" } as const;
  const grid = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))" } as const;
  return (
    <div style={page}>
      <p style={muted}>Foliage tufts lit by light filtered through the crown, sky holes at the measured gap, edge leaves, and shaded trunks with bark. Painter's rules (Needham): {CROWN_DRAWING.slice(0, 3).join(" ")}</p>
      <div style={grid}>{trees.map(([id, m]) => { const sk = growPlant(plantConstruction(id), { month: m, seed: 11 }); return (
        <figure key={id} style={card}><PlantFigure skeleton={sk} label={`${findPlant(id)!.name}, ${MONTHS[m - 1]}`} /><figcaption style={muted}>{findPlant(id)!.name} · {MONTHS[m - 1]}</figcaption></figure>); })}</div>
      <h3 style={{ margin: 0, font: "600 15px var(--km-font-sans, system-ui, sans-serif)" }}>Flat masses (detail="flat") against the detailed crown</h3>
      <div style={grid}>{(["flat", "full"] as const).map(d => <figure key={d} style={card}><PlantFigure skeleton={growPlant(plantConstruction("zelkova"), { month: 7, seed: 11 })} detail={d} label={`Zelkova, ${d}`} /><figcaption style={muted}>detail = {d}</figcaption></figure>)}</div>
      <h3 style={{ margin: 0, font: "600 15px var(--km-font-sans, system-ui, sans-serif)" }}>Trunks: cylinder shading, bark, root flare, limbs growing out of the trunk</h3>
      <div style={grid}>{(["zelkova", "japanese-black-pine", "mountain-cherry", "camphor"] as const).map(id => { const sk = growPlant(plantConstruction(id), { month: id === "mountain-cherry" ? 1 : 7, seed: 11 }), x = sk.branches.find(b => b.order === 0)!.points[0][0]; return (
        <figure key={id} style={card}><PlantFigure skeleton={sk} bounds={[x - .18, -.01, x + .18, .45]} label={`${findPlant(id)!.name} trunk`} /><figcaption style={muted}>{findPlant(id)!.name}: {findPlant(id)!.bark.kind} bark</figcaption></figure>); })}</div>
    </div>
  );
}

export const Sheet: Story = { render: () => <SheetStory /> };
export const Seasons: Story = { render: () => <SeasonsLab /> };
export const Forms: Story = { name: "Growth forms", render: () => <GrowthForms /> };
export const InSeason: Story = { name: "In season", render: () => <Calendar /> };
export const Crowns: Story = { name: "Crown and bark detail", render: () => <CrownDetail /> };
