import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PLANT_SPECIES, findPlant, inSeason } from "../../registry/anatomy/plant-species";
import type { Month } from "../../registry/anatomy/plant-species";
import { GROWTH_FORMS } from "../../registry/anatomy/plant-forms";
import type { GrowthFormId } from "../../registry/anatomy/plant-forms";
import { growPlant, plantConstruction, plantShapes } from "../../registry/anatomy/plant-construct";
import { PlantFigure, PlantSheet } from "../../registry/anatomy/plant-react";
import { CROWN_DRAWING } from "../../registry/anatomy/plant-crown";
import type { PlantFigureMode } from "../../registry/anatomy/plant-react";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import { ReferenceGuidedFloraEngine } from "../../registry/anatomy/flora-engine";
import type { FloraEngineConfig, FloraScene } from "../../registry/anatomy/flora-engine";
import { createFloraAsset } from "../../registry/anatomy/flora-three";
import { FloraProfileError, checkFloraProfile } from "../../registry/anatomy/flora-profile";
import type { FloraProfileIssue, SpeciesMorphologyProfile } from "../../registry/anatomy/flora-profile";
import type { FloraFidelity } from "../../registry/anatomy/flora-mesh";
import type { FloraLayout } from "../../registry/anatomy/flora-layout";

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

// ---- FLORA2: the reference-guided 3D flora engine -------------------------------------------------------------------

/** One engine for every FLORA2 story; profiles registered in "Register a profile" join it. */
const flora = new ReferenceGuidedFloraEngine();
const FIDELITIES: readonly FloraFidelity[] = ["preview", "high_def", "macro_ultra"];
type LayoutMode = FloraLayout["mode"];
const card = { display: "grid", gap: 8, alignContent: "start", padding: 16, borderRadius: 10, background: "var(--km-surface-default, #fff)", border: "1px solid var(--km-border-subtle, #cecac8)" } as const;
const h3 = { margin: 0, font: "600 15px var(--km-font-sans, system-ui, sans-serif)" } as const;
const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} M` : n >= 1e4 ? `${Math.round(n / 1e3)} k` : String(Math.round(n)));

/** Default layouts for a habit: crops in rows, trees in groves, small plants as ground cover. */
function layoutFor(p: SpeciesMorphologyProfile, mode: LayoutMode): FloraLayout {
  const tree = p.habit === "tree", small = p.habit === "cushion" || p.habit === "rosette";
  if (mode === "rows") return { mode: "rows", rowCount: tree ? 2 : 5, plantsPerRow: tree ? 4 : 12, staggerOffset: 0.5, organicJitter: 0.3 };
  if (mode === "grove") return { mode: "grove", count: tree ? 6 : 14, organicJitter: 0.4 };
  if (mode === "ground-cover") { const side = p.layout.spacing * (small ? 4 : 6); return { mode: "ground-cover", width: side, depth: side, organicJitter: 0.4 }; }
  return { mode: "hero" };
}

function ProfileSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <label style={label}>Species profile
      <select style={field} value={value} onChange={e => onChange(e.target.value)}>
        {flora.profiles.map(p => <option key={p.id} value={p.id}>{p.name} ({p.scientificName})</option>)}
      </select>
    </label>
  );
}

function SceneStats({ scenes }: { scenes: readonly FloraScene[] }) {
  const t = scenes.reduce((a, s) => ({ plants: a.plants + s.stats.plants, specimens: a.specimens + s.stats.specimens, triangles: a.triangles + s.stats.triangles, instances: a.instances + s.stats.instances, drawCalls: a.drawCalls + s.stats.drawCalls, ms: a.ms + s.stats.ms }),
    { plants: 0, specimens: 0, triangles: 0, instances: 0, drawCalls: 0, ms: 0 });
  return <p style={muted}>{t.plants} plant{t.plants === 1 ? "" : "s"} from {t.specimens} built specimen{t.specimens === 1 ? "" : "s"} · {fmt(t.triangles)} triangles drawn · {fmt(t.instances)} instanced organs · {t.drawCalls} instanced draw groups · grown in {Math.round(t.ms)} ms</p>;
}

function FloraEngineLab() {
  const [id, setId] = useState("monstera-deliciosa");
  const [fidelity, setFidelity] = useState<FloraFidelity>("high_def");
  const [stage, setStage] = useState(1);
  const [seed, setSeed] = useState(7);
  const [mode, setMode] = useState<LayoutMode>("hero");
  const [azimuth, setAzimuth] = useState(28);
  const [elevation, setElevation] = useState(8);
  const profile = flora.profile(id)!;
  const scene = useMemo(() => flora.generate({ speciesProfile: id, seed, fidelityLevel: fidelity, layoutMode: layoutFor(profile, mode), growthStage: stage }), [id, seed, fidelity, mode, stage, profile]);
  const createAsset = useCallback(() => createFloraAsset(scene, { fidelity }), [scene, fidelity]);
  const sp = scene.specimens[0];
  return (
    <div style={page}>
      <div style={row}>
        <ProfileSelect value={id} onChange={setId} />
        <label style={label}>Fidelity
          <select style={field} value={fidelity} onChange={e => setFidelity(e.target.value as FloraFidelity)}>{FIDELITIES.map(f => <option key={f} value={f}>{f}</option>)}</select>
        </label>
        <label style={label}>Layout
          <select style={field} value={mode} onChange={e => setMode(e.target.value as LayoutMode)}>{(["hero", "rows", "grove", "ground-cover"] as const).map(m => <option key={m} value={m}>{m}</option>)}</select>
        </label>
        <label style={{ ...label, minWidth: 180 }}>Growth stage: {stage.toFixed(2)}
          <input type="range" min={0} max={1} step={0.05} value={stage} onChange={e => setStage(Number(e.target.value))} />
        </label>
        <button type="button" style={field} onClick={() => setSeed(s => s + 1)}>Another one (seed {seed})</button>
      </div>
      <div style={row}>
        <label style={{ ...label, minWidth: 180 }}>Turn: {azimuth}°<input type="range" min={-180} max={180} step={2} value={azimuth} onChange={e => setAzimuth(Number(e.target.value))} /></label>
        <label style={{ ...label, minWidth: 180 }}>Camera height: {elevation}°<input type="range" min={-5} max={80} step={1} value={elevation} onChange={e => setElevation(Number(e.target.value))} /></label>
      </div>
      <div style={{ maxWidth: 1080, width: "100%" }}>
        <HeroAssetViewer createAsset={createAsset} width={1080} height={720} azimuth={azimuth} elevation={elevation} fov={30} pixelRatio={1.5} ariaLabel={`${profile.name}, growth stage ${stage.toFixed(2)}, ${mode} layout`} />
      </div>
      <SceneStats scenes={[scene]} />
      <p style={muted}>{profile.summary} Height {sp.height.toFixed(2)} m{sp.forms.length ? ` · trunk form: ${sp.forms[0]}` : ""}{sp.leaf ? ` · leaf: ${sp.leaf.splits} splits, ${sp.leaf.holes} holes, holes ${(sp.leaf.holeArea / sp.leaf.area * 100).toFixed(1)}% of the blade` : ""}</p>
    </div>
  );
}

function FloraBlueprintStory() {
  const [id, setId] = useState("adansonia-digitata");
  const p = flora.profile(id)!;
  const scene = useMemo(() => flora.generate({ speciesProfile: id, seed: 11, fidelityLevel: "preview", layoutMode: { mode: "hero" }, growthStage: 1 }), [id]);
  const createAsset = useCallback(() => createFloraAsset(scene, { fidelity: "preview" }), [scene]);
  const range = (r: { min: number; typical: number; max: number; grade: string; source?: string }) => `${r.typical} (${r.min}–${r.max}), ${r.grade}${r.source ? `, ${r.source}` : ""}`;
  const organ = Object.entries(p.organs)[0];
  return (
    <div style={page}>
      <div style={row}><ProfileSelect value={id} onChange={setId} /></div>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", alignItems: "start" }}>
        <section style={card}>
          <h3 style={h3}>{p.name} · <i>{p.scientificName}</i></h3>
          <HeroAssetViewer createAsset={createAsset} width={640} height={480} azimuth={30} elevation={8} pixelRatio={1} ariaLabel={`${p.name} built from its profile`} />
          <p style={muted}>{p.summary}</p>
        </section>
        <section style={card}>
          <h3 style={h3}>Botanical parameter blueprint</h3>
          {(Object.entries(p.blueprint) as [string, string][]).map(([k, v]) => <p key={k} style={{ margin: 0, font: "13px/1.5 var(--km-font-sans, system-ui, sans-serif)" }}><b>{k[0].toUpperCase() + k.slice(1)}.</b> {v}</p>)}
          <h3 style={h3}>Measured and reported values</h3>
          <table style={{ borderCollapse: "collapse", font: "13px/1.4 var(--km-font-sans, system-ui, sans-serif)" }}><tbody>
            <tr><th style={{ textAlign: "left", paddingRight: 12 }}>height (m)</th><td>{range(p.size.height)}</td></tr>
            {Object.entries(p.measured ?? {}).map(([k, r]) => <tr key={k}><th style={{ textAlign: "left", paddingRight: 12 }}>{k}</th><td>{range(r)}</td></tr>)}
            {organ && organ[1].kind === "blade" ? <tr><th style={{ textAlign: "left", paddingRight: 12 }}>{organ[0]} length (m)</th><td>{range(organ[1].length)}</td></tr> : null}
          </tbody></table>
          <h3 style={h3}>Colour stops (sRGB, from the photo ladders)</h3>
          <div style={{ display: "grid", gap: 6 }}>{Object.entries(p.surfaces).map(([k, s]) => (
            <div key={k} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ ...muted, width: 90 }}>{k}</span>
              <span aria-hidden style={{ flex: 1, height: 18, borderRadius: 4, border: "1px solid var(--km-border-subtle, #cecac8)", background: `linear-gradient(90deg, ${s.colour.map(c => `${c.hex} ${c.at * 100}%`).join(", ")})` }} />
              <code style={{ font: "12px ui-monospace, monospace" }}>{s.colour.map(c => c.hex).join(" → ")}</code>
            </div>))}</div>
        </section>
      </div>
      <section style={card}>
        <h3 style={h3}>References studied</h3>
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>{p.sources.map(s => (
          <li key={s.id} style={{ font: "13px/1.45 var(--km-font-sans, system-ui, sans-serif)" }}>
            <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> <span style={muted}>({s.kind}, {s.rights}{s.creator ? `, ${s.creator}` : ""}; id {s.id})</span>
            <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>{s.observed.map((o, i) => <li key={i} style={muted}>{o}</li>)}</ul>
          </li>))}</ul>
      </section>
    </div>
  );
}

/** A close-up: an organ alone, or a whole plant framed on one of its parts. */
function CloseUp({ title, note, make, view }: { title: string; note: string; make: () => FloraScene; view?: { target?: (s: FloraScene) => [number, number, number]; zoom?: number; elevation?: number; azimuth?: number } }) {
  const scene = useMemo(make, [make]);
  const createAsset = useCallback(() => createFloraAsset(scene, { fidelity: "macro_ultra" }), [scene]);
  return (
    <figure style={{ ...card, margin: 0 }}>
      <HeroAssetViewer createAsset={createAsset} width={560} height={420} pixelRatio={1.5} azimuth={view?.azimuth ?? 18} elevation={view?.elevation ?? 6} zoom={view?.zoom} target={view?.target?.(scene)} fov={26} ariaLabel={title} />
      <figcaption style={{ display: "grid", gap: 4 }}><b style={{ font: "600 14px var(--km-font-sans, system-ui, sans-serif)" }}>{title}</b><span style={muted}>{note}</span></figcaption>
    </figure>
  );
}
const CLOSE_UPS: { title: string; note: string; make: () => FloraScene; view?: Parameters<typeof CloseUp>[0]["view"] }[] = [
  { title: "Monstera deliciosa, adult leaf", note: "Splits between the laterals and hole rows sized to the measured 1.6–4.6% hole area; veins from the same layout in the normal map.", make: () => flora.organ("monstera-deliciosa", "leaf", "macro_ultra", 1), view: { azimuth: 6, elevation: 10, zoom: 1.7 } },
  { title: "Monstera deliciosa, adolescent leaf", note: "Heteroblasty: fenestration starts at growth stage 0.32; fewer, shorter splits first.", make: () => flora.organ("monstera-deliciosa", "leaf", "macro_ultra", 0.42), view: { azimuth: 6, elevation: 10, zoom: 1.7 } },
  { title: "Helianthus annuus, flower head", note: "Disc florets at n × 137.5°, r = c√n (Vogel): the 34 and 55 spirals appear by themselves.", make: () => flora.organ("helianthus-annuus", "head", "macro_ultra", 1), view: { azimuth: 0, elevation: 0 } },
  { title: "Tulipa gesneriana, flower", note: "Six tepals in two whorls of three, cupped and a little incurved (a negative droop), with six dark stamens.", make: () => flora.organ("tulipa-gesneriana", "flower", "macro_ultra", 1), view: { azimuth: 20, elevation: 12, zoom: 1.15 } },
  { title: "Quercus robur, leaf", note: "Four to five rounded lobes a side cut 50% in (the lobed margin), small auricles at the base.", make: () => flora.organ("quercus-robur", "leaf", "macro_ultra", 1), view: { azimuth: 0, elevation: 12, zoom: 1.6 } },
  { title: "Acer palmatum, leaf", note: "Five to nine finely serrate, acuminate lobes fanned over 230° from one petiole, joined at their broad bases.", make: () => flora.organ("acer-palmatum", "leaf", "macro_ultra", 1), view: { azimuth: 0, elevation: 20, zoom: 1.6 } },
  { title: "Ficus lyrata, leaf", note: "The fiddle: widest near the tip, a 14% waist, wavy edge, pale curved laterals.", make: () => flora.organ("ficus-lyrata", "leaf", "macro_ultra", 1), view: { azimuth: 0, elevation: 10, zoom: 1.6 } },
  { title: "Adansonia digitata, palmate leaf", note: "Five to seven obovate leaflets fanned on one petiole.", make: () => flora.organ("adansonia-digitata", "leaf", "macro_ultra", 1), view: { azimuth: 0, elevation: 20, zoom: 1.7 } },
  { title: "Echeveria rosette", note: "Fleshy keeled leaves at the golden angle; offsets from stage 0.55.", make: () => flora.generate({ speciesProfile: "echeveria", seed: 4, fidelityLevel: "macro_ultra", layoutMode: { mode: "hero" }, growthStage: 1 }), view: { elevation: 40, zoom: 1.2 } },
  { title: "Adansonia digitata, trunk and limb collars", note: "Folded bark from solid noise, root flare and limbs swelling into the trunk.", make: () => flora.generate({ speciesProfile: "adansonia-digitata", seed: 11, fidelityLevel: "high_def", layoutMode: { mode: "hero" }, growthStage: 1 }),
    view: { target: s => [0, s.specimens[0].height * 0.3, 0], zoom: 2.6, elevation: 6 } },
];
function FloraCloseUpStory() {
  return (
    <div style={page}>
      <p style={muted}>Organs at macro_ultra fidelity, lit in the studio. Each one is the template the plants instance.</p>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 480px), 1fr))" }}>
        {CLOSE_UPS.map(c => <CloseUp key={c.title} {...c} />)}
      </div>
    </div>
  );
}

const SCENES: Record<string, { label: string; configs: FloraEngineConfig[] }> = {
  crops: { label: "Maize and sunflower rows", configs: [
    { speciesProfile: "zea-mays", seed: 3, fidelityLevel: "preview", layoutMode: { mode: "rows", rowCount: 6, plantsPerRow: 18, staggerOffset: 0.5, organicJitter: 0.35 }, growthStage: 1, origin: [0, -1.4] },
    { speciesProfile: "helianthus-annuus", seed: 5, fidelityLevel: "preview", layoutMode: { mode: "rows", rowCount: 3, plantsPerRow: 7, organicJitter: 0.3 }, growthStage: 0.95, origin: [0, 2.6] },
  ] },
  savanna: { label: "Baobabs and dragon trees", configs: [
    { speciesProfile: "adansonia-digitata", seed: 2, fidelityLevel: "preview", layoutMode: { mode: "grove", count: 3, clumpRadius: 9 }, growthStage: 1, origin: [-10, 0] },
    { speciesProfile: "dracaena-cinnabari", seed: 4, fidelityLevel: "preview", layoutMode: { mode: "grove", count: 6, clumpRadius: 7 }, growthStage: 0.85, stageSpread: 0.2, origin: [12, 4] },
  ] },
  willows: { label: "Weeping willow grove", configs: [
    { speciesProfile: "salix-babylonica", seed: 8, fidelityLevel: "preview", layoutMode: { mode: "grove", count: 4, clumpRadius: 8 }, growthStage: 1, variants: 3 },
  ] },
  bulbs: { label: "Tulip and lavender fields", configs: [
    { speciesProfile: "tulipa-gesneriana", seed: 2, fidelityLevel: "preview", layoutMode: { mode: "rows", rowCount: 8, plantsPerRow: 30, organicJitter: 0.4 }, growthStage: 0.95, stageSpread: 0.1, origin: [0, -1.2] },
    { speciesProfile: "lavandula-angustifolia", seed: 4, fidelityLevel: "preview", layoutMode: { mode: "rows", rowCount: 3, plantsPerRow: 5, organicJitter: 0.25 }, growthStage: 1, origin: [0, 2.2] },
  ] },
  palms: { label: "Coconut palms on a beach", configs: [
    { speciesProfile: "cocos-nucifera", seed: 6, fidelityLevel: "preview", layoutMode: { mode: "grove", count: 5, clumpRadius: 6 }, growthStage: 1, stageSpread: 0.2, variants: 4 },
  ] },
  desert: { label: "Saguaro desert", configs: [
    { speciesProfile: "carnegiea-gigantea", seed: 3, fidelityLevel: "preview", layoutMode: { mode: "grove", count: 6, clumpRadius: 10 }, growthStage: 0.85, stageSpread: 0.3, variants: 4 },
    { speciesProfile: "aloe-vera", seed: 5, fidelityLevel: "preview", layoutMode: { mode: "grove", count: 8, clumpRadius: 4 }, growthStage: 1, origin: [3, 3] },
  ] },
  park: { label: "Oak and maple parkland", configs: [
    { speciesProfile: "quercus-robur", seed: 5, fidelityLevel: "preview", layoutMode: { mode: "grove", count: 3, clumpRadius: 12 }, growthStage: 1, variants: 3 },
    { speciesProfile: "acer-palmatum", seed: 7, fidelityLevel: "preview", layoutMode: { mode: "grove", count: 4, clumpRadius: 4 }, growthStage: 1, variants: 2, origin: [12, 6] },
  ] },
  floor: { label: "Succulent bed and moss cushions", configs: [
    { speciesProfile: "echeveria", seed: 9, fidelityLevel: "preview", layoutMode: { mode: "ground-cover", width: 0.8, depth: 0.8, density: 45 }, growthStage: 1, variants: 4, stageSpread: 0.25 },
    { speciesProfile: "polytrichum-commune", seed: 6, fidelityLevel: "preview", layoutMode: { mode: "grove", count: 3, clumpRadius: 0.35 }, growthStage: 1, variants: 3, origin: [0.95, -0.15] },
  ] },
};
function FloraSceneStory() {
  const [key, setKey] = useState("crops");
  const [orbit, setOrbit] = useState(false);
  const [azimuth, setAzimuth] = useState(30);
  const [fps, setFps] = useState<number | null>(null);
  const reduced = usePrefersReducedMotion();
  const scenes = useMemo(() => SCENES[key].configs.map(c => flora.generate(c)), [key]);
  const createAsset = useCallback(() => createFloraAsset(scenes, { fidelity: "preview", textureSize: 256 }), [scenes]);
  const frames = useRef<number[]>([]);
  useEffect(() => {
    if (!orbit || reduced) { setFps(null); return; }
    let raf = 0;
    const start = performance.now(), from = azimuth;
    const tick = (now: number) => {
      const f = frames.current; f.push(now);
      while (f.length && now - f[0] > 1000) f.shift();
      if (f.length > 1 && now - start > 1000) setFps(Math.round((f.length - 1) * 1000 / (now - f[0]) * 10) / 10);
      setAzimuth(from + (now - start) / 1000 * 12);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the orbit starts from the azimuth at the time of the click.
  }, [orbit, reduced]);
  return (
    <div style={page}>
      <div style={row}>
        <label style={label}>Scene
          <select style={field} value={key} onChange={e => setKey(e.target.value)}>{Object.entries(SCENES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        </label>
        <button type="button" style={field} aria-pressed={orbit} onClick={() => setOrbit(o => !o)} disabled={reduced}>{orbit ? "Stop orbit" : "Orbit and measure frame rate"}{reduced ? " (motion reduced)" : ""}</button>
        <p style={muted} aria-live="polite">{fps === null ? "Frame rate is measured in this browser while the camera orbits." : `${fps} frames per second, measured in this browser`}</p>
      </div>
      <div style={{ maxWidth: 1080, width: "100%" }}>
        <HeroAssetViewer createAsset={createAsset} width={1080} height={640} azimuth={azimuth} elevation={14} fov={34} pixelRatio={1} ariaLabel={SCENES[key].label} />
      </div>
      <SceneStats scenes={scenes} />
    </div>
  );
}

const EXAMPLE_PROFILE = `{
  "id": "custom-fan-palm",
  "name": "Custom fan palm (example)",
  "scientificName": "Example only: replace with your species",
  "habit": "tree",
  "summary": "Registered at run time: a ringed trunk and a crown of fan leaves, with no code change.",
  "sources": [{ "id": "you", "title": "Your reference photos", "url": "https://commons.wikimedia.org/wiki/Category:Arecaceae", "kind": "photo", "rights": "cited",
    "observed": ["Example numbers: replace them with what you measured."] }],
  "size": { "height": { "min": 6, "typical": 9, "max": 14, "grade": "estimated" } },
  "root": "trunk",
  "axes": [
    { "id": "trunk", "kind": "trunk", "surface": "bark", "length": { "of": "height", "ratio": 0.86 }, "radius": { "of": "height", "ratio": 0.028, "tip": 0.8 },
      "profile": [[0, 1.25], [0.08, 1], [1, 0.9]], "flare": { "height": 1.5, "amount": 0.2, "lobes": 9 }, "nodes": 16, "wander": 6,
      "children": [{ "rule": "frond", "from": 0.97, "to": 1, "count": [18, 26] }] },
    { "id": "frond", "kind": "petiole", "surface": "petiole", "length": { "of": "height", "ratio": 0.16, "spread": 0.2 }, "radius": { "of": "parent", "ratio": 0.12, "tip": 0.5 },
      "nodes": 8, "angle": [95, 20], "divergence": 137.5, "gravity": 2, "tipLoad": 1.5 }
  ],
  "organs": {
    "fan": { "kind": "blade", "surface": "leaf", "length": { "min": 0.6, "typical": 0.9, "max": 1.1, "grade": "estimated" }, "width": 0.09, "widestAt": 0.4, "baseShape": 0.8, "apexShape": 1.2,
      "veins": { "style": "parallel", "laterals": 4, "angle": 3, "midrib": 0.1 }, "fold": 35, "droop": 3, "droopPitch": 10,
      "leaflets": { "count": { "min": 30, "typical": 40, "max": 50, "grade": "estimated" }, "spread": 200 } }
  },
  "placements": [{ "organ": "fan", "on": "frond", "place": "tip", "angle": [25, 25] }],
  "surfaces": {
    "bark": { "colour": [{ "at": 0, "hex": "#6b5d4e" }, { "at": 1, "hex": "#8a7a62" }], "roughness": 0.85, "texture": "bark-ringed", "tile": 0.5, "relief": 0.04 },
    "petiole": { "colour": [{ "at": 0, "hex": "#7a6e48" }, { "at": 1, "hex": "#5f7a3a" }], "roughness": 0.6, "texture": "stem" },
    "leaf": { "colour": [{ "at": 0, "hex": "#4f6e36" }, { "at": 1, "hex": "#5f7f40" }], "back": "#7d936a", "roughness": 0.45, "clearcoat": 0.3, "texture": "parallel-veins" }
  },
  "layout": { "spacing": 6, "clumpRadius": 5, "rowPitch": 8 },
  "blueprint": { "phyllotaxy": "Fronds at the golden angle in a crown at the top 3% of the trunk.", "skeleton": "Single ringed trunk; fronds arch under their blades.",
    "surface": "Ringed grey-brown trunk, glossy fan segments.", "layout": "Avenue rows 8 m apart." }
}`;
function FloraRegisterStory() {
  const [text, setText] = useState(EXAMPLE_PROFILE);
  const [registered, setRegistered] = useState<SpeciesMorphologyProfile | null>(null);
  const [issues, setIssues] = useState<FloraProfileIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(1);
  const register = () => {
    try {
      const profile = JSON.parse(text) as SpeciesMorphologyProfile;
      setIssues(flora.register(profile));
      setRegistered(profile); setError(null);
    } catch (e) {
      if (e instanceof FloraProfileError) { setIssues([...e.issues]); setError("The profile has errors. Fix them and register again."); }
      else setError(`The text is not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const scene = useMemo(() => (registered ? flora.generate({ speciesProfile: registered.id, seed: 3, fidelityLevel: "high_def", layoutMode: { mode: "hero" }, growthStage: stage }) : null), [registered, stage]);
  const createAsset = useCallback(() => createFloraAsset(scene!, { fidelity: "high_def" }), [scene]);
  const draft = useMemo(() => { try { return checkFloraProfile(JSON.parse(text)); } catch { return null; } }, [text]);
  return (
    <div style={page}>
      <p style={muted}>Edit the JSON profile, then register it with the running engine. The engine checks it (<code>checkFloraProfile</code>), stores it, and grows it at once. In code: <code>engine.register(profile)</code>, then <code>createFloraAsset(engine.generate(&#123; speciesProfile: profile.id, seed, fidelityLevel, layoutMode, growthStage &#125;))</code>.</p>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))", alignItems: "start" }}>
        <section style={card}>
          <label style={label} htmlFor="flora-profile-json">Profile (JSON)</label>
          <textarea id="flora-profile-json" spellCheck={false} value={text} onChange={e => setText(e.target.value)} style={{ ...field, minHeight: 420, font: "12px/1.45 ui-monospace, monospace", whiteSpace: "pre" }} />
          <div style={row}>
            <button type="button" style={field} onClick={register}>Register and grow</button>
            <span style={muted}>{draft === null ? "Not valid JSON yet." : `${draft.filter(i => i.level === "error").length} errors, ${draft.filter(i => i.level === "warning").length} warnings`}</span>
          </div>
          {error ? <p role="alert" style={{ margin: 0, color: "var(--km-text-danger, #a4282a)", font: "13px var(--km-font-sans, system-ui, sans-serif)" }}>{error}</p> : null}
          {issues.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{issues.map((i, k) => <li key={k} style={muted}><b>{i.level}</b> {i.path}: {i.message}</li>)}</ul> : null}
        </section>
        <section style={card}>
          {scene ? <>
            <label style={{ ...label, maxWidth: 260 }}>Growth stage: {stage.toFixed(2)}<input type="range" min={0} max={1} step={0.05} value={stage} onChange={e => setStage(Number(e.target.value))} /></label>
            <HeroAssetViewer createAsset={createAsset} width={640} height={560} azimuth={24} elevation={8} pixelRatio={1.25} ariaLabel={`${scene.profile.name}, registered at run time`} />
            <SceneStats scenes={[scene]} />
          </> : <p style={muted}>Nothing registered yet. Press “Register and grow”.</p>}
        </section>
      </div>
    </div>
  );
}

export const Sheet: Story = { render: () => <SheetStory /> };
export const Seasons: Story = { render: () => <SeasonsLab /> };
export const Forms: Story = { name: "Growth forms", render: () => <GrowthForms /> };
export const InSeason: Story = { name: "In season", render: () => <Calendar /> };
export const Crowns: Story = { name: "Crown and bark detail", render: () => <CrownDetail /> };
export const FloraEngine: Story = { name: "3D flora engine", render: () => <FloraEngineLab /> };
export const FloraBlueprints: Story = { name: "Reference blueprints", render: () => <FloraBlueprintStory /> };
export const FloraCloseUps: Story = { name: "Organ close-ups", render: () => <FloraCloseUpStory /> };
export const FloraScenes: Story = { name: "Rows and groves", render: () => <FloraSceneStory /> };
export const FloraRegister: Story = { name: "Register a profile", render: () => <FloraRegisterStory /> };
