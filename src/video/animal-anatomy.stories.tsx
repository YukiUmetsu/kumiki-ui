import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ANIMAL_SPECIES } from "../../registry/anatomy/animal-species";
import { BODY_PLANS } from "../../registry/anatomy/animal-plans";
import type { BodyPlanId } from "../../registry/anatomy/animal-plans";
import { ANIMAL_GAITS, gaitSpeed, strideFrames } from "../../registry/anatomy/animal-gaits";
import type { GaitId } from "../../registry/anatomy/animal-gaits";
import { animalConstruction, poseAnimal } from "../../registry/anatomy/animal-construct";
import type { AnimalSkeleton } from "../../registry/anatomy/animal-construct";
import { AnimalFigure, AnimalSheet, FootfallDiagram } from "../../registry/anatomy/animal-react";
import type { AnimalFigureMode } from "../../registry/anatomy/animal-react";
import { checkAnimalProportions, measureAnimal } from "../../registry/anatomy/animal-check";
import { findAnimal } from "../../registry/anatomy/animal-species";
import { ukiyoeBeastLandmarks } from "../../registry/video/ukiyoe/ukiyoe-creatures";
import { ANIMAL_POSTURES, POSTURE_IDS, postureFit } from "../../registry/anatomy/animal-postures";
import type { PostureId } from "../../registry/anatomy/animal-postures";
import type { UkiyoeSpecies } from "../../registry/video/ukiyoe/ukiyoe-creatures";

const page = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "var(--km-surface-canvas, #f6f3f1)", color: "var(--km-text-primary, #242424)",
  font: "15px/1.5 var(--km-font-sans, system-ui, sans-serif)" } as const;
const label = { display: "grid", gap: 4, font: "600 13px var(--km-font-sans, system-ui, sans-serif)" } as const;
const field = { minHeight: 36, padding: "6px 8px", borderRadius: 7, border: "1px solid var(--km-border-strong, #797776)", background: "var(--km-surface-field, #fff)",
  color: "inherit", font: "14px var(--km-font-sans, system-ui, sans-serif)" } as const;
const row = { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" } as const;

function SpeciesSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <label style={label}>Animal
      <select style={field} value={value} onChange={e => onChange(e.target.value)}>
        {Object.values(BODY_PLANS).map(p => {
          const list = ANIMAL_SPECIES.filter(s => s.plan === p.id);
          return list.length ? <optgroup key={p.id} label={p.label}>{list.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup> : null;
        })}
      </select>
    </label>
  );
}

function SheetStory() {
  const [id, setId] = useState("asian-black-bear");
  return (
    <div style={page}>
      <div style={row}><SpeciesSelect value={id} onChange={setId} /></div>
      <AnimalSheet species={id} />
    </div>
  );
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

function GaitLab() {
  const [id, setId] = useState("japanese-wild-boar");
  const sp = findAnimal(id)!;
  const gaits = sp.behaviour.gaits.length ? sp.behaviour.gaits : (["walk"] as GaitId[]);
  const [gait, setGait] = useState<GaitId>("walk");
  const g = gaits.includes(gait) ? gait : gaits[0];
  const [mode, setMode] = useState<AnimalFigureMode>("construction");
  const reduced = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0);
  const c = useMemo(() => animalConstruction(sp), [sp]);
  const frames = strideFrames(g, sp.size.mass.typical);
  useEffect(() => {
    if (!playing || reduced) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => { setT(v => (v + (now - last) / 1000 / (frames / 30)) % 1); last = now; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced, frames]);
  const pose: AnimalSkeleton = useMemo(() => poseAnimal(c, { gait: g, t }), [c, g, t]);
  const bounds = useMemo(() => {
    const b = [0, .25, .5, .75].map(u => poseAnimal(c, { gait: g, t: u })), all = b.flatMap(p => p.limbs.flatMap(l => l.points));
    const xs = all.map(p => p[0]).concat(b.flatMap(p => [p.head.nose[0], ...p.tail.points.map(q => q[0])])), ys = all.map(p => p[1]).concat(b.flatMap(p => [p.head.nose[1], ...p.tail.points.map(q => q[1])]));
    return [Math.min(...xs) - .15, -.06, Math.max(...xs) + .15, Math.max(...ys, 1.1) + .15] as const;
  }, [c, g]);
  const hip = (sp.size.shoulder?.typical ?? 30) / 100 * .9;
  return (
    <div style={page}>
      <div style={row}>
        <SpeciesSelect value={id} onChange={setId} />
        <label style={label}>Gait
          <select style={field} value={g} onChange={e => setGait(e.target.value as GaitId)}>{gaits.map(x => <option key={x} value={x}>{ANIMAL_GAITS[x].label}</option>)}</select>
        </label>
        <label style={label}>Drawing
          <select style={field} value={mode} onChange={e => setMode(e.target.value as AnimalFigureMode)}>
            {(["construction", "silhouette", "colour", "fur"] as const).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <button type="button" style={field} onClick={() => setPlaying(p => !p)} aria-pressed={playing && !reduced} disabled={reduced}>{reduced ? "Motion reduced" : playing ? "Pause" : "Play"}</button>
        <label style={{ ...label, minWidth: 220 }}>Stride position: {t.toFixed(2)}
          <input type="range" min={0} max={.99} step={.01} value={t} onChange={e => { setPlaying(false); setT(Number(e.target.value)); }} />
        </label>
      </div>
      <div style={{ maxWidth: 900, width: "100%" }}><AnimalFigure skeleton={pose} mode={mode} bounds={bounds} label={`${sp.name}, ${ANIMAL_GAITS[g].label.toLowerCase()}, stride position ${t.toFixed(2)}`} /></div>
      <div style={{ maxWidth: 520, display: "grid", gap: 8 }}>
        {pose.kind === "quadruped" && <FootfallDiagram gait={g} />}
        <p style={{ margin: 0 }}>{ANIMAL_GAITS[g].notes}</p>
        <p style={{ margin: 0, color: "var(--km-text-muted, #4e4d4d)" }}>
          At {sp.size.mass.typical} kg one stride takes about {frames} frames at 30 fps (Heglund &amp; Taylor 1988, scaled per gait); at a hip height near {hip.toFixed(2)} m
          the {ANIMAL_GAITS[g].label.toLowerCase()} runs at about {gaitSpeed(g, hip).toFixed(1)} m/s (Froude {ANIMAL_GAITS[g].froude}).
        </p>
      </div>
    </div>
  );
}

function BodyPlansStory() {
  return (
    <div style={page}>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }}>
        {(Object.keys(BODY_PLANS) as BodyPlanId[]).map(id => {
          const p = BODY_PLANS[id], s = poseAnimal(animalConstruction(id));
          return (
            <section key={id} style={{ display: "grid", gap: 8, alignContent: "start", padding: 16, borderRadius: 10, background: "var(--km-surface-default, #fff)", border: "1px solid var(--km-border-subtle, #cecac8)" }}>
              <h3 style={{ margin: 0, font: "600 15px var(--km-font-sans, system-ui, sans-serif)" }}>{p.label}</h3>
              <AnimalFigure skeleton={s} mode="construction" label={`${p.label}: construction`} />
              <p style={{ margin: 0, font: "13px/1.45 var(--km-font-sans, system-ui, sans-serif)", color: "var(--km-text-muted, #4e4d4d)" }}>{p.posture} · {p.feet}</p>
              <p style={{ margin: 0, font: "13px/1.45 var(--km-font-sans, system-ui, sans-serif)" }}>{p.drawing[0]}</p>
            </section>
          );
        })}
      </div>
    </div>
  );
}

const UKIYO: readonly UkiyoeSpecies[] = ["fox", "tanuki", "dog", "cat", "rabbit", "monkey", "horse", "bear", "boar", "deer", "ox", "wolf", "mouse", "weasel"];
function ProportionCheck() {
  const rows = UKIYO.map(id => {
    const lm = ukiyoeBeastLandmarks(id)!, m = measureAnimal(lm, false);
    return { id, species: findAnimal(id), findings: checkAnimalProportions(id, m) };
  });
  const cell = { padding: "6px 10px", borderBottom: "1px solid var(--km-border-subtle, #cecac8)", textAlign: "left", verticalAlign: "top" } as const;
  return (
    <div style={page}>
      <p style={{ margin: 0, maxWidth: 760 }}>Every UKIYO1 four-legged creature, measured off its own standing contour (<code>ukiyoeBeastLandmarks</code>) and checked against ANIM1 ranges with 10 % allowed for stylisation.</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", font: "14px/1.4 var(--km-font-sans, system-ui, sans-serif)", minWidth: 720 }}>
          <thead><tr><th style={cell}>UKIYO1</th><th style={cell}>Animal</th><th style={cell}>Leg clearance</th><th style={cell}>Chest depth</th><th style={cell}>Trunk</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.id}><td style={cell}><code>{r.id}</code></td><td style={cell}>{r.species?.name}</td>
            {(["legClearance", "chestDepth", "trunk"] as const).map(k => { const f = r.findings.find(x => x.key === k); return <td key={k} style={{ ...cell, color: f && f.status !== "ok" ? "var(--km-text-danger, #c0392b)" : undefined }}>
              {f ? <>{f.value.toFixed(2)} <span style={{ opacity: .75 }}>({f.min.toFixed(2)}–{f.max.toFixed(2)}, {f.grade}){f.status !== "ok" ? ` ${f.status}` : ""}</span></> : "—"}</td>; })}
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

const meta = { title: "Video production/Art Foundations/Animal Anatomy", id: "video-animal-anatomy", component: SheetStory, parameters: { layout: "fullscreen" } } satisfies Meta<typeof SheetStory>;
export default meta;
type Story = StoryObj<typeof meta>;
/** Sit, lie, rest and rear: a posture's pitch source, and the transition from standing played over its frames. */
function PostureLab() {
  const [id, setId] = useState("shiba-inu");
  const sp = findAnimal(id)!;
  const c = useMemo(() => animalConstruction(sp), [sp]);
  const usable = POSTURE_IDS.filter(p => postureFit(c.plan.id, p, sp.behaviour.canRear));
  const [want, setWant] = useState<PostureId>("sit");
  const posture = usable.includes(want) ? want : usable[0];
  const [mode, setMode] = useState<AnimalFigureMode>("construction");
  const reduced = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [amount, setAmount] = useState(1);
  const frames = posture ? ANIMAL_POSTURES[posture].frames : 1;
  useEffect(() => {
    if (!playing || reduced || !posture) return;
    // Down over the posture's frames, hold, back up, hold.
    let raf = 0; const t0 = performance.now(), cycle = (frames * 2 + 60) / 30;
    const tick = (now: number) => {
      const u = ((now - t0) / 1000 % cycle) * 30, f = frames;
      setAmount(u < f ? u / f : u < f + 30 ? 1 : u < 2 * f + 30 ? 1 - (u - f - 30) / f : 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced, posture, frames]);
  const pose = useMemo(() => poseAnimal(c, { posture, amount }), [c, posture, amount]);
  const fit = posture ? postureFit(c.plan.id, posture, sp.behaviour.canRear) : undefined;
  return (
    <div style={page}>
      <div style={row}>
        <SpeciesSelect value={id} onChange={setId} />
        <label style={label}>Posture
          <select style={field} value={posture ?? ""} onChange={e => setWant(e.target.value as PostureId)} disabled={!usable.length}>
            {usable.map(p => <option key={p} value={p}>{ANIMAL_POSTURES[p].label}</option>)}
          </select>
        </label>
        <label style={label}>Drawing
          <select style={field} value={mode} onChange={e => setMode(e.target.value as AnimalFigureMode)}>
            {(["construction", "silhouette", "colour", "fur"] as const).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <button type="button" style={field} onClick={() => setPlaying(p => !p)} aria-pressed={playing && !reduced} disabled={reduced || !posture}>{reduced ? "Motion reduced" : playing ? "Pause" : "Play"}</button>
        <label style={{ ...label, minWidth: 220 }}>Amount: {amount.toFixed(2)}
          <input type="range" min={0} max={1} step={.01} value={amount} onChange={e => { setPlaying(false); setAmount(Number(e.target.value)); }} disabled={!posture} />
        </label>
      </div>
      {posture && fit ? (
        <>
          <AnimalFigure skeleton={pose} mode={mode} bounds={[-2.6, -.06, 1.2, 2]} label={`${sp.name}, ${ANIMAL_POSTURES[posture].label.toLowerCase()}`} style={{ width: "100%", maxWidth: 900, height: "auto" }} />
          <div style={{ maxWidth: "70ch" }}>
            <p style={{ margin: "0 0 8px" }}><strong>{ANIMAL_POSTURES[posture].label}</strong> ({ANIMAL_POSTURES[posture].ja}) · body {fit.pitch.typical}° ({fit.pitch.min}–{fit.pitch.max}°, {fit.pitch.grade}{fit.pitch.source ? `: ${fit.pitch.source}` : ""}) · forelegs {fit.fore}, hind legs {fit.hind} · {frames} frames at 30 fps</p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>{ANIMAL_POSTURES[posture].drawing.map(d => <li key={d}>{d}</li>)}</ul>
          </div>
        </>
      ) : <p>{sp.name} has no posture beyond standing in ANIM1 yet (birds and fish), or its plan does not take one naturally.</p>}
    </div>
  );
}

export const Sheet: Story = { render: () => <SheetStory /> };
export const Gaits: Story = { render: () => <GaitLab /> };
export const Postures: Story = { render: () => <PostureLab /> };
export const BodyPlans: Story = { name: "Body plans", render: () => <BodyPlansStory /> };
export const UkiyoeCheck: Story = { name: "UKIYO1 proportion check", render: () => <ProportionCheck /> };
