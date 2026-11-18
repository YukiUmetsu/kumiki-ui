import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ANIMAL_SPECIES } from "../../registry/anatomy/animal-species";
import { BODY_PLANS } from "../../registry/anatomy/animal-plans";
import type { BodyPlanId } from "../../registry/anatomy/animal-plans";
import { ANIMAL_GAITS, gaitSpeed, strideFrames } from "../../registry/anatomy/animal-gaits";
import type { GaitId } from "../../registry/anatomy/animal-gaits";
import { animalConstruction, poseAnimal, skeletonShapes } from "../../registry/anatomy/animal-construct";
import type { AnimalSkeleton } from "../../registry/anatomy/animal-construct";
import { AnimalFigure, AnimalSheet, FootfallDiagram } from "../../registry/anatomy/animal-react";
import type { AnimalFigureMode } from "../../registry/anatomy/animal-react";
import { checkAnimalProportions, measureAnimal } from "../../registry/anatomy/animal-check";
import { findAnimal } from "../../registry/anatomy/animal-species";
import { ukiyoeBeastLandmarks } from "../../registry/video/ukiyoe/ukiyoe-creatures";
import { ANIMAL_POSTURES, BIRD_POSTURE_IDS, BIRD_POSTURES, birdPostureFits, POSTURE_IDS, postureFit } from "../../registry/anatomy/animal-postures";
import type { BirdPostureId, PostureId } from "../../registry/anatomy/animal-postures";
import { BIRD_FLIGHT, flightAt, speciesWingbeat } from "../../registry/anatomy/animal-flight";
import { coatAt, growthRule, heightAt, juvenileConstruction } from "../../registry/anatomy/animal-growth";
import type { UkiyoeSpecies } from "../../registry/video/ukiyoe/ukiyoe-creatures";
import { GallopScene3D } from "../../registry/video/gallop-scene-3d-react";

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
/** A posture the chosen animal takes: four-legged (`ANIMAL_POSTURES`) or a bird's (`BIRD_POSTURES`). */
type PostureChoice = { kind: "quad"; id: PostureId } | { kind: "bird"; id: BirdPostureId };

function PostureLab() {
  const [id, setId] = useState("shiba-inu");
  const sp = findAnimal(id)!;
  const c = useMemo(() => animalConstruction(sp), [sp]);
  const usable: PostureChoice[] = c.plan.group === "bird"
    ? BIRD_POSTURE_IDS.filter(p => birdPostureFits(c.plan.id, p)).map(p => ({ kind: "bird", id: p }))
    : POSTURE_IDS.filter(p => postureFit(c.plan.id, p, sp.behaviour.canRear)).map(p => ({ kind: "quad", id: p }));
  const [want, setWant] = useState<string>("sit");
  const choice = usable.find(u => u.id === want) ?? usable[0];
  const info = choice ? (choice.kind === "bird" ? BIRD_POSTURES[choice.id] : ANIMAL_POSTURES[choice.id]) : undefined;
  const [mode, setMode] = useState<AnimalFigureMode>("construction");
  const reduced = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [amount, setAmount] = useState(1);
  const frames = info?.frames ?? 1;
  useEffect(() => {
    if (!playing || reduced || !choice) return;
    // Down over the posture's frames, hold, back up, hold.
    let raf = 0; const t0 = performance.now(), cycle = (frames * 2 + 60) / 30;
    const tick = (now: number) => {
      const u = ((now - t0) / 1000 % cycle) * 30, f = frames;
      setAmount(u < f ? u / f : u < f + 30 ? 1 : u < 2 * f + 30 ? 1 - (u - f - 30) / f : 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced, choice?.id, frames]); // eslint-disable-line react-hooks/exhaustive-deps -- restart per posture
  const pose = useMemo(() => poseAnimal(c, choice?.kind === "bird" ? { birdPosture: choice.id, amount } : { posture: choice?.id, amount }), [c, choice?.kind, choice?.id, amount]);
  const fit = choice?.kind === "quad" ? postureFit(c.plan.id, choice.id, sp.behaviour.canRear) : undefined;
  // Birds are framed on their own standing size; four-legged animals share one frame.
  const bounds = useMemo(() => {
    if (c.plan.group !== "bird") return [-2.6, -.06, 1.2, 2] as const;
    const b = skeletonShapes(poseAnimal(c)).bounds, w = Math.max(b[2] - b[0], b[3] - b[1]) * 1.2, cx = (b[0] + b[2]) / 2;
    return [cx - w / 2, -w * .08, cx + w / 2, w * .92] as const;
  }, [c]);
  const bp = choice?.kind === "bird" ? BIRD_POSTURES[choice.id] : undefined;
  return (
    <div style={page}>
      <div style={row}>
        <SpeciesSelect value={id} onChange={setId} />
        <label style={label}>Posture
          <select style={field} value={choice?.id ?? ""} onChange={e => setWant(e.target.value)} disabled={!usable.length}>
            {usable.map(u => <option key={u.id} value={u.id}>{(u.kind === "bird" ? BIRD_POSTURES[u.id] : ANIMAL_POSTURES[u.id]).label}</option>)}
          </select>
        </label>
        <label style={label}>Drawing
          <select style={field} value={mode} onChange={e => setMode(e.target.value as AnimalFigureMode)}>
            {(["construction", "silhouette", "colour", "fur"] as const).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <button type="button" style={field} onClick={() => setPlaying(p => !p)} aria-pressed={playing && !reduced} disabled={reduced || !choice}>{reduced ? "Motion reduced" : playing ? "Pause" : "Play"}</button>
        <label style={{ ...label, minWidth: 220 }}>Amount: {amount.toFixed(2)}
          <input type="range" min={0} max={1} step={.01} value={amount} onChange={e => { setPlaying(false); setAmount(Number(e.target.value)); }} disabled={!choice} />
        </label>
      </div>
      {choice && info ? (
        <>
          <AnimalFigure skeleton={pose} mode={mode} bounds={bounds} label={`${sp.name}, ${info.label.toLowerCase()}`} style={{ width: "100%", maxWidth: 900, height: "auto" }} />
          <div style={{ maxWidth: "70ch" }}>
            <p style={{ margin: "0 0 8px" }}><strong>{info.label}</strong> ({info.ja})
              {fit && <> · body {fit.pitch.typical}° ({fit.pitch.min}–{fit.pitch.max}°, {fit.pitch.grade}{fit.pitch.source ? `: ${fit.pitch.source}` : ""}) · forelegs {fit.fore}, hind legs {fit.hind}</>}
              {bp?.waterline && <> · waterline {Math.round(bp.waterline.typical * 100)}% up the body ({bp.waterline.grade}{bp.waterline.source ? `: ${bp.waterline.source}` : ""})</>}
              {" "}· {frames} frames at 30 fps</p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>{info.drawing.map(d => <li key={d}>{d}</li>)}</ul>
          </div>
        </>
      ) : <p>{sp.name} has no posture beyond standing in ANIM1 yet (fish), or its plan does not take one naturally.</p>}
    </div>
  );
}

/** Birds in the air: open wings through the beat, glides and bounding, at the species' predicted wingbeat. */
function FlightLab() {
  const birds = Object.keys(BIRD_FLIGHT);
  const [id, setId] = useState("red-crowned-crane");
  const sp = findAnimal(id)!, f = BIRD_FLIGHT[id];
  const c = useMemo(() => animalConstruction(sp), [sp]);
  const [mode, setMode] = useState<AnimalFigureMode>("colour");
  const [capped, setCapped] = useState(true);
  const reduced = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!playing || reduced) return;
    let raf = 0; const t0 = performance.now() - seconds * 1000;
    const tick = (now: number) => { setSeconds(((now - t0) / 1000) % 12); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart from the paused time only when play toggles
  }, [playing, reduced]);
  // Frames are drawn on the 30 fps grid, as a film would.
  const frame = Math.floor(seconds * 30) / 30, at = flightAt(id, frame, 1, capped ? 7.5 : Infinity);
  const pose = useMemo(() => poseAnimal(c, { flight: at.flight, t: at.t, amount: at.amount }), [c, at.flight, at.t, at.amount]);
  // One frame for every bird: the bounds of a whole beat and the glide.
  const bounds = useMemo(() => {
    const all = [0, .25, .5, .75].map(t => skeletonShapes(poseAnimal(c, { flight: "flap", t })).bounds).concat([skeletonShapes(poseAnimal(c, { flight: "glide" })).bounds]);
    return [Math.min(...all.map(b => b[0])), Math.min(...all.map(b => b[1])), Math.max(...all.map(b => b[2])), Math.max(...all.map(b => b[3]))] as const;
  }, [c]);
  const hz = speciesWingbeat(id) ?? 0;
  return (
    <div style={page}>
      <div style={row}>
        <label style={label}>Bird
          <select style={field} value={id} onChange={e => setId(e.target.value)}>{birds.map(b => <option key={b} value={b}>{findAnimal(b)?.name ?? b}</option>)}</select>
        </label>
        <label style={label}>Drawing
          <select style={field} value={mode} onChange={e => setMode(e.target.value as AnimalFigureMode)}>
            {(["construction", "silhouette", "colour"] as const).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label style={{ ...label, display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={capped} onChange={e => setCapped(e.target.checked)} /> At most 7.5 beats a second (4 frames per beat)</label>
        <button type="button" style={field} onClick={() => setPlaying(p => !p)} aria-pressed={playing && !reduced} disabled={reduced}>{reduced ? "Motion reduced" : playing ? "Pause" : "Play"}</button>
        <label style={{ ...label, minWidth: 220 }}>Time: {frame.toFixed(2)} s
          <input type="range" min={0} max={12} step={1 / 30} value={seconds} onChange={e => { setPlaying(false); setSeconds(Number(e.target.value)); }} />
        </label>
      </div>
      <div style={{ maxWidth: 900, width: "100%" }}><AnimalFigure skeleton={pose} mode={mode} bounds={bounds} ground={false} label={`${sp.name} flying: ${at.flight === "flap" ? "wingbeat" : at.flight === "glide" ? "gliding" : "wings closed"}`} /></div>
      <div style={{ maxWidth: "70ch", display: "grid", gap: 8 }}>
        <p style={{ margin: 0 }}><strong>{sp.name}</strong>: {f.wing} wing (aspect ratio {f.aspect.typical}, {f.aspect.grade}), {f.style} flight; neck {f.neck}, legs {f.legs}.
          Predicted wingbeat {hz.toFixed(1)} Hz in steady cruising flight (Pennycuick 1990, from {sp.size.mass.typical} kg and a {sp.size.wingspan?.typical} cm span){capped && hz > 7.5 ? "; drawn at 7.5 Hz" : ""}.</p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>{f.notes.map(n => <li key={n}>{n}</li>)}</ul>
      </div>
    </div>
  );
}

/** The young beside the parent, to scale: proportions and coat from `animal-growth.ts`. */
function GrowthLab() {
  const [id, setId] = useState("kiso-horse");
  const sp = findAnimal(id)!;
  const c = useMemo(() => animalConstruction(sp), [sp]);
  const rule = growthRule(c.plan.id, c.plan.group);
  const [age, setAge] = useState(0);
  const [mode, setMode] = useState<AnimalFigureMode>("colour");
  const young = useMemo(() => poseAnimal(juvenileConstruction(c, age)), [c, age]), adult = useMemo(() => poseAnimal(c), [c]);
  // One frame for both: the adult's bounds in its own units; the young is drawn in its units scaled by its height.
  const b = useMemo(() => skeletonShapes(adult).bounds, [adult]), w = b[2] - b[0], hgt = b[3] - b[1], h = rule ? heightAt(rule, age) : 1;
  const yb = [b[0] / h, b[1] / h, b[2] / h, b[3] / h] as const;
  const figure = { width: "100%", height: "auto", maxWidth: 420 } as const;
  return (
    <div style={page}>
      <div style={row}>
        <SpeciesSelect value={id} onChange={setId} />
        <label style={{ ...label, minWidth: 240 }}>Age: {age === 0 ? (rule?.youngest ?? "youngest") : age >= 1 ? "adult" : age.toFixed(2)}
          <input type="range" min={0} max={1} step={.01} value={age} onChange={e => setAge(Number(e.target.value))} disabled={!rule} />
        </label>
        <label style={label}>Drawing
          <select style={field} value={mode} onChange={e => setMode(e.target.value as AnimalFigureMode)}>
            {(["construction", "silhouette", "colour", "fur"] as const).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>
      {rule ? (
        <>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", alignItems: "end", maxWidth: 900 }}>
            <figure style={{ margin: 0 }}><AnimalFigure skeleton={young} mode={mode} palette={coatAt(sp, age)} bounds={yb} label={`${sp.name}, young, at ${Math.round(h * 100)}% of adult height`} style={figure} />
              <figcaption style={{ ...label, fontWeight: 400 }}>Young: {Math.round(h * 100)}% of adult height</figcaption></figure>
            <figure style={{ margin: 0 }}><AnimalFigure skeleton={adult} mode={mode} bounds={b} label={`${sp.name}, adult`} style={figure} />
              <figcaption style={{ ...label, fontWeight: 400 }}>Adult</figcaption></figure>
          </div>
          <div style={{ maxWidth: "70ch" }}>
            <p style={{ margin: "0 0 8px" }}>Youngest drawn: {rule.youngest}. Height then {Math.round(rule.height.typical * 100)}% of adult ({rule.height.grade}{rule.height.source ? `: ${rule.height.source}` : ""}). Frame {w.toFixed(2)} × {hgt.toFixed(2)} {c.plan.group === "mammal" ? "adult shoulder heights" : "adult lengths"}.</p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>{rule.notes.map(n => <li key={n}>{n}</li>)}
              {sp.coat.variants.filter(v => v.age).map(v => <li key={v.name}>Young coat, {v.name}: {v.when}</li>)}</ul>
          </div>
        </>
      ) : <p>{sp.name}: no growth rule (fish).</p>}
    </div>
  );
}

export const Sheet: Story = { render: () => <SheetStory /> };
export const Gaits: Story = { render: () => <GaitLab /> };
export const Postures: Story = { render: () => <PostureLab /> };
export const Flight: Story = { render: () => <FlightLab /> };
export const Growth: Story = { render: () => <GrowthLab /> };
export const BodyPlans: Story = { name: "Body plans", render: () => <BodyPlansStory /> };
export const UkiyoeCheck: Story = { name: "UKIYO1 proportion check", render: () => <ProportionCheck /> };

/* Horse and rider at a gallop in 3D: the gait table above, Muybridge-timed, on an original sculpted stock horse (GLB),
 * western tack, a Rocketbox rider (MIT) locked in the stirrups, recorded CC0 hoofbeats on the contacts, dust and a chase camera.
 * Provenance: assets/THIRD_PARTY_ASSETS.json and assets/sound/catalog.json. */
const GALLOP_ASSETS = {
  horseUrl: new URL("../../assets/models/animals/stock-horse-bay.glb", import.meta.url).href,
  gearUrl: new URL("../../assets/models/animals/western-gear.glb", import.meta.url).href,
  riderUrl: new URL("../../assets/models/people/rocketbox-male-adult-08.glb", import.meta.url).href,
  sounds: {
    hoof: [1, 2, 3, 4, 5, 6, 7, 8].map(i => new URL(`../../assets/sound/recorded/hoof-dirt-${i}.wav`, import.meta.url).href),
    scuff: [new URL("../../assets/sound/recorded/hoof-dirt-scuff-1.wav", import.meta.url).href],
    breath: [1, 2].map(i => new URL(`../../assets/sound/recorded/horse-breath-${i}.wav`, import.meta.url).href),
  },
};
export const Gallop3D: Story = {
  name: "Horse and rider gallop (3D)",
  parameters: { layout: "fullscreen" },
  // The built scene is exposed as window.__kmGallop for capture scripts (stats, framing, stepping).
  render: () => <div style={{ height: "100vh" }}><GallopScene3D {...GALLOP_ASSETS} onReady={scene => { (window as unknown as { __kmGallop: unknown }).__kmGallop = scene; }} /></div>,
};
