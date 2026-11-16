/**
 * ANIM1 painters. `AnimalFigure` draws one posed skeleton in one of four modes:
 * - silhouette;
 * - construction (masses, leg chains, measures);
 * - colour map (the species' palette painted on its coat regions);
 * - fur map (where the coat is long, and which way it lies).
 *
 * `AnimalSheet` is the character sheet any art style starts from. It holds:
 * - construction, colour and fur maps;
 * - gait strips and footfall diagrams;
 * - size against a person;
 * - proportions with their evidence grades;
 * - palette, markings and variants;
 * - parts, sounds, culture, references, and where the animal is already drawn.
 *
 * All text is HTML, so drawings carry no text. Colours come from the library tokens (`--km-*`) and from
 * `--kumiki-animal-ink`, `--kumiki-animal-accent` and `--kumiki-animal-paper`, so themes and dark mode restyle it.
 */
import { forwardRef, useId, useMemo } from "react";
import type { HTMLAttributes, SVGAttributes } from "react";
import { BODY_PLANS } from "./animal-plans";
import type { AnimalRegion } from "./animal-plans";
import { ANIMAL_GAITS, footfallBars } from "./animal-gaits";
import type { GaitId } from "./animal-gaits";
import { findAnimal } from "./animal-species";
import type { AnimalSpecies, Range, Swatch } from "./animal-species";
import { CONSTRUCTION_KEYS, animalConstruction, headBodyLength, poseAnimal, skeletonShapes } from "./animal-construct";
import type { AnimalPoint, AnimalSkeleton } from "./animal-construct";
import { proportionRange } from "./animal-check";
import { ACCENT, INK, MUTED, PAPER, ScaleChart, SheetCard, SwatchList, sheetGrid, sheetSmall } from "./foundation-react";

export type AnimalFigureMode = "silhouette" | "construction" | "colour" | "fur";

export interface AnimalFigureProps extends Omit<SVGAttributes<SVGSVGElement>, "mode"> {
  skeleton: AnimalSkeleton;
  mode?: AnimalFigureMode;
  /** Colours for the colour map (default: the species' palette). */
  palette?: readonly Swatch[];
  /** Regions with long coat for the fur map (default: the species'). */
  longCoat?: readonly AnimalRegion[];
  /** Model-unit bounds [x0, y0, x1, y1] to share one scale across several figures (a gait strip). */
  bounds?: readonly [number, number, number, number];
  /** Draw the ground line. */
  ground?: boolean;
  /** Accessible description. */
  label: string;
}

const pts = (p: readonly AnimalPoint[]) => p.map(q => `${q[0].toFixed(3)},${q[1].toFixed(3)}`).join(" ");

/** One posed animal as SVG (y up inside, flipped for the screen). */
export const AnimalFigure = forwardRef<SVGSVGElement, AnimalFigureProps>(function AnimalFigure(
  { skeleton: s, mode = "silhouette", palette, longCoat, bounds, ground = true, label, style, ...rest }, ref) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const sh = useMemo(() => skeletonShapes(s), [s]);
  const [x0, y0, x1, y1] = bounds ?? sh.bounds, w = x1 - x0, h = y1 - y0, lw = w / 260;
  const sil = sh.far + sh.body + sh.near;
  const pal = palette ?? s.c.species?.coat.palette ?? [];
  const base = pal.find(p => p.region === "back" && p.fill !== "accent")?.hex ?? "#8a7a68";
  const paints: { d: string; fill: string }[] = [];
  if (mode === "colour") {
    const seen = new Set<string>();
    for (const p of pal) {
      const fill = p.fill ?? "area";
      if (fill === "accent" || p.hex === base && p.region === "back" && fill === "area") continue;
      const key = `${p.region}:${fill}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const d = fill === "tip" ? sh.tips[p.region] : fill === "band" ? sh.bands[p.region] : fill === "eye-patch" ? sh.eyePatch : sh.regions[p.region];
      if (d && p.region !== "eyes") paints.push({ d, fill: p.hex });
    }
  }
  const eyeColour = pal.find(p => p.region === "eyes")?.hex ?? s.c.species?.eyes.iris ?? "#1c1a18";
  const long = mode === "fur" ? (longCoat ?? s.c.species?.coat.long ?? []) : [];
  const flow = mode === "fur" ? furFlow(s) : [];
  return (
    <svg ref={ref} role="img" aria-label={label} viewBox={`${x0} ${-y1} ${w} ${h}`} preserveAspectRatio="xMidYMax meet" style={{ display: "block", width: "100%", height: "auto", ...style }} {...rest}>
      <defs>
        <clipPath id={`${id}-sil`}><path d={sil} /></clipPath>
        <pattern id={`${id}-hair`} width={w / 70} height={w / 70} patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2={w / 70} stroke={INK} strokeWidth={lw * 1.1} opacity=".55" />
        </pattern>
        <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10Z" fill={ACCENT} />
        </marker>
      </defs>
      <g transform="scale(1 -1)">
        {ground && s.kind !== "fish" && <line x1={x0} x2={x1} y1={0} y2={0} stroke={MUTED} strokeWidth={lw} />}
        {mode === "silhouette" && <path d={sil} fill={INK} />}
        {mode === "colour" && <>
          {/* Outlines are strokes laid under the fills: only the outer edge shows, not the overlaps of the parts. */}
          <path d={sh.far} fill="none" stroke={INK} strokeWidth={lw * 2} /><path d={sh.far} fill={base} /><path d={sh.far} fill="#000" opacity=".28" />
          <path d={sh.body + sh.near} fill="none" stroke={INK} strokeWidth={lw * 2} /><path d={sh.body + sh.near} fill={base} />
          <g clipPath={`url(#${id}-sil)`}>{paints.map((p, i) => <path key={i} d={p.d} fill={p.fill} />)}</g>
        </>}
        {(mode === "construction" || mode === "fur") && <>
          <path d={sh.far} fill="none" stroke={MUTED} strokeWidth={lw * 1.6} /><path d={sh.far} fill={PAPER} />
          <path d={sh.body + sh.near} fill="none" stroke={MUTED} strokeWidth={lw * 1.6} /><path d={sh.body + sh.near} fill={PAPER} />
        </>}
        {mode === "fur" && <>
          <g clipPath={`url(#${id}-sil)`}>{long.map(r => sh.regions[r] && <path key={r} d={sh.regions[r]} fill={`url(#${id}-hair)`} />)}</g>
          {flow.map((line, i) => <polyline key={i} points={pts(line)} fill="none" stroke={ACCENT} strokeWidth={lw * 1.4} markerEnd={`url(#${id}-arrow)`} opacity=".9" />)}
        </>}
        {mode === "construction" && <Construction s={s} lw={lw} />}
        {(mode === "colour" || mode === "construction" || mode === "fur") && <circle cx={s.head.eye[0]} cy={s.head.eye[1]} r={s.head.eyeR} fill={mode === "colour" ? eyeColour : INK} />}
      </g>
    </svg>
  );
});

function Construction({ s, lw }: { s: AnimalSkeleton; lw: number }) {
  const j = s.joints;
  return (
    <g fill="none" stroke={ACCENT} strokeWidth={lw * 1.2}>
      {Object.values(s.masses).map((e, i) => <ellipse key={i} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} transform={`rotate(${e.angle} ${e.cx} ${e.cy})`} strokeDasharray={`${lw * 6} ${lw * 3}`} />)}
      <ellipse cx={s.head.cranium.cx} cy={s.head.cranium.cy} rx={s.head.cranium.rx} ry={s.head.cranium.ry} transform={`rotate(${s.head.cranium.angle} ${s.head.cranium.cx} ${s.head.cranium.cy})`} strokeDasharray={`${lw * 6} ${lw * 3}`} />
      {s.neck.points.length > 0 && <polyline points={pts(s.neck.points)} />}
      {j.occiput && <line x1={j.occiput[0]} y1={j.occiput[1]} x2={s.head.nose[0]} y2={s.head.nose[1]} />}
      <polyline points={pts(s.topLine)} stroke={INK} strokeWidth={lw * .9} />
      {s.wings && [s.wings.far, s.wings.near].map((w, i) => <g key={`w${i}`} opacity={i ? 1 : .5}><polyline points={pts(w.bones)} stroke={INK} strokeWidth={lw * 1.6} />
        {w.bones.slice(0, 3).map((p, k) => <circle key={k} cx={p[0]} cy={p[1]} r={lw * 2.4} fill={PAPER} stroke={INK} strokeWidth={lw} />)}</g>)}
      {s.limbs.map((l, i) => <g key={i} opacity={l.far ? .5 : 1}><polyline points={pts(l.points)} stroke={INK} strokeWidth={lw * 1.6} />
        {l.points.slice(0, 4).map((p, k) => <circle key={k} cx={p[0]} cy={p[1]} r={lw * 2.4} fill={PAPER} stroke={INK} strokeWidth={lw} />)}</g>)}
      {s.kind === "quadruped" && j.withers && j.brisket && <g stroke={MUTED} strokeWidth={lw}>
        <line x1={j.withers[0] - .05} x2={j.withers[0] - .05} y1={0} y2={j.withers[1]} strokeDasharray={`${lw * 2} ${lw * 2}`} />
        <line x1={j.brisket[0]} x2={j.brisket[0]} y1={0} y2={j.brisket[1]} />
      </g>}
    </g>
  );
}

/** Lines showing how the coat lies: from the nape back along the body, and down each near leg and the tail. */
function furFlow(s: AnimalSkeleton): AnimalPoint[][] {
  if (s.kind !== "quadruped") return s.topLine.length ? [s.topLine.slice().reverse().slice(0, -1)] : [];
  // The top line runs tail → nape: reversed and dropped below the back, it runs nape → croup, the way the hair lies.
  const fromNape = s.topLine.slice().reverse().slice(0, -1), D = s.c.chestDepth;
  const lines = [.3, .62].map(k => fromNape.map(p => [p[0], p[1] - D * k] as AnimalPoint));
  for (const l of s.limbs.filter(x => !x.far)) lines.push([l.points[0], l.points[1], l.points[2]].map(p => [p[0] + .015, p[1]] as AnimalPoint));
  if (s.tail.points.length > 2) lines.push(s.tail.points.slice(1, -1));
  return lines;
}

// ---- The character sheet -------------------------------------------------------------------------------------------------------

const small = sheetSmall;
const Card = SheetCard;
const fmt = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toPrecision(2));
const rangeText = (r: Range, unit: string) => `${fmt(r.min)}–${fmt(r.max)} ${unit} (typ. ${fmt(r.typical)}; ${r.grade})`;
const GRADE_NOTE = "Grades: reported (from a cited source), measured (off a reference plate), estimated (no direct source), plan (the body plan's typical value).";

export interface AnimalSheetProps extends HTMLAttributes<HTMLDivElement> {
  /** A species record, or an id (species id, the id it is drawn by in a style, or romaji). */
  species: AnimalSpecies | string;
  /** Gaits shown as strips (default: the species' walk and its fastest gait). */
  gaits?: readonly GaitId[];
}

/** The character sheet for one animal. */
export const AnimalSheet = forwardRef<HTMLDivElement, AnimalSheetProps>(function AnimalSheet({ species, gaits, style, ...rest }, ref) {
  const sp = typeof species === "string" ? findAnimal(species) : species;
  const c = useMemo(() => (sp ? animalConstruction(sp) : undefined), [sp]);
  const stand = useMemo(() => (c ? poseAnimal(c) : undefined), [c]);
  if (!sp || !c || !stand) return <div ref={ref} role="alert" {...rest}>Unknown animal: {String(species)}</div>;
  const plan = BODY_PLANS[sp.plan];
  const moving = sp.behaviour.gaits.filter(g => g in ANIMAL_GAITS);
  const fast = plan.gallop && moving.includes(plan.gallop) ? plan.gallop : moving[moving.length - 1];
  const strips = (gaits ?? [...new Set([moving[0], fast].filter(Boolean))]) as GaitId[];
  const quad = plan.group === "mammal";
  return (
    <div ref={ref} style={{ ...sheetGrid, ...style }} {...rest}>
      <header style={{ gridColumn: "1 / -1", display: "grid", gap: 4 }}>
        <h2 style={{ margin: 0, font: "700 22px/1.25 var(--km-font-sans, system-ui, sans-serif)" }}>{sp.name}</h2>
        <div style={small}><span lang="ja">{sp.ja.kanji ? `${sp.ja.kanji} ` : ""}{sp.ja.kana}</span> · {sp.ja.romaji} · <i>{sp.scientific}</i> · {plan.label} ({plan.posture})</div>
      </header>
      <Card title="Construction">
        <AnimalFigure skeleton={stand} mode="construction" label={`${sp.name}: construction, side view`} />
        <p style={{ ...small, margin: 0 }}>{plan.group === "mammal" ? `Masses (dashed), leg chains on ${plan.posture} feet, top line, head axis; the two verticals are the shoulder height and the clearance under the chest.`
          : plan.group === "bird" ? "Body egg and folded wing (dashed), head and bill axis, the leg chain: the visible 'backward knee' is the ankle." : "Body spindle and head (dashed), the top line, the fins."} {plan.feet}</p>
      </Card>
      <Card title="Colour map">
        <AnimalFigure skeleton={stand} mode="colour" label={`${sp.name}: colour zones`} />
        <Swatches list={sp.coat.palette} />
      </Card>
      <Card title="Fur map">
        <AnimalFigure skeleton={stand} mode="fur" label={`${sp.name}: long coat and direction of lay`} />
        <p style={{ ...small, margin: 0 }}>Coat: {sp.coat.type}. {sp.coat.long.length ? `Longest on the ${sp.coat.long.join(", ")} (hatched). ` : ""}{sp.coat.lay}</p>
      </Card>
      <Card title="Size against a person">
        <SizeChart species={sp} skeleton={stand} />
      </Card>
      {strips.map(g => <Card key={g} title={`${ANIMAL_GAITS[g].label}`} wide><GaitStrip species={sp} gait={g} />{quad && <FootfallDiagram gait={g} />}
        <p style={{ ...small, margin: 0 }}>{ANIMAL_GAITS[g].notes}</p></Card>)}
      <Card title="Proportions">
        <table style={{ borderCollapse: "collapse", font: "13px/1.4 var(--km-font-sans, system-ui, sans-serif)" }}>
          <tbody>
            {CONSTRUCTION_KEYS.map(k => {
              const r = proportionRange(sp, k), deg = k.endsWith("Angle") ? "°" : "";
              return r && r.typical !== 0 && <tr key={k}><td style={{ padding: "2px 8px 2px 0" }}>{k}</td><td style={{ padding: "2px 8px" }}>{fmt(r.typical)}{deg}</td><td style={{ ...small, padding: "2px 0" }}>{fmt(r.min)}–{fmt(r.max)}{deg} · {r.grade}</td></tr>;
            })}
          </tbody>
        </table>
        <p style={{ ...small, margin: 0 }}>Shoulder-height units (body length for birds and fish). Head-and-body ≈ trunk + neck + head = {fmt(headBodyLength(c))}. {GRADE_NOTE}</p>
      </Card>
      <Card title="Size and weight">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {sp.size.shoulder && <li>Shoulder: {rangeText(sp.size.shoulder, "cm")}</li>}
          <li>{quad ? "Head and body" : "Length"}: {rangeText(sp.size.length, "cm")}</li>
          {sp.size.tail && <li>Tail: {rangeText(sp.size.tail, "cm")}</li>}
          {sp.size.wingspan && <li>Wingspan: {rangeText(sp.size.wingspan, "cm")}</li>}
          <li>Mass: {rangeText(sp.size.mass, "kg")}</li>
        </ul>
      </Card>
      <Card title="Markings and variants">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {sp.coat.markings.map(m => <li key={m.name}><b>{m.name}</b>: {m.shape}</li>)}
          <li>Eye: {sp.eyes.pupil.replace("-", " ")} pupil.{sp.eyes.note ? ` ${sp.eyes.note}` : ""}</li>
        </ul>
        {sp.coat.variants.map(v => <div key={v.name}><div style={small}>{v.name} ({v.when})</div><Swatches list={v.palette} /></div>)}
      </Card>
      {sp.face && <Card title="Face">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Profile, in head lengths: eye {fmt(sp.face.eyeFromNose)} back from the {sp.face.ear === undefined ? "tip" : "nose"}, eye {fmt(sp.face.eye)} long, {sp.face.ear !== undefined && <>ear {fmt(sp.face.ear)} high, </>}head {fmt(sp.face.depth)} deep.</li>
          <li>Square on: eye centres {fmt(sp.face.eyeSpacing)} of the head's width apart; eyes read as {sp.face.eyeLook === "bead" ? "glossy black beads" : sp.face.eyeLook === "slit" ? "an iris with a slit pupil" : "an iris with a round pupil"}.</li>
          <li>Ears: {sp.face.ears}</li>
          {sp.face.features.map(f => <li key={f}>{f}</li>)}
        </ul>
        <p style={{ ...small, margin: 0 }}>{sp.face.grade}: {sp.face.source}.</p>
      </Card>}
      <Card title="Parts">
        <ul style={{ margin: 0, paddingLeft: 18, columns: "2 160px" }}>
          {[...plan.parts, ...sp.parts].map(p => <li key={p.id} title={p.note}>{p.name}</li>)}
        </ul>
      </Card>
      <Card title="Behaviour and sound">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Gaits: {sp.behaviour.gaits.map(g => ANIMAL_GAITS[g].label.toLowerCase()).join(", ") || "none on land"}{sp.behaviour.canRear ? "; rears up" : ""}{sp.behaviour.climbs ? "; climbs" : ""}{sp.behaviour.swims ? "; swims" : ""}{sp.behaviour.flies ? "; flies" : ""}</li>
          {sp.behaviour.notes.map(n => <li key={n}>{n}</li>)}
          {sp.sounds.map(s2 => <li key={s2.label}>{s2.kind === "vocal" ? "Voice" : "Foley"}: {s2.label} — {s2.catalog ? <code>{s2.catalog}</code> : <>no recording yet; search <q>{s2.query}</q></>}</li>)}
          <li>Footfall: {plan.footfall}</li>
        </ul>
      </Card>
      <Card title="Culture">
        <ul style={{ margin: 0, paddingLeft: 18 }}>{sp.culture.map(t => <li key={t}>{t}</li>)}</ul>
      </Card>
      <Card title="Drawing notes">
        <ul style={{ margin: 0, paddingLeft: 18 }}>{plan.drawing.map(t => <li key={t}>{t}</li>)}</ul>
      </Card>
      <Card title="Already drawn in">
        <ul style={{ margin: 0, paddingLeft: 18 }}>{sp.styles.map(s2 => <li key={s2.style + s2.id}><b>{s2.style}</b> · <code>{s2.id}</code> ({s2.pack}){s2.note ? ` — ${s2.note}` : ""}</li>)}</ul>
      </Card>
      <Card title="References and sources">
        <ul style={{ margin: 0, paddingLeft: 18, overflowWrap: "anywhere" }}>
          {sp.references.map(r => <li key={r.url}><a href={r.url}>{r.title}</a> <span style={small}>({r.kind}, {r.rights})</span></li>)}
          {sp.sources.map(r => <li key={r.url}><a href={r.url}>{r.title}</a></li>)}
        </ul>
      </Card>
    </div>
  );
});

const Swatches = ({ list }: { list: readonly Swatch[] }) => <SwatchList items={list.map(p => ({ name: p.name, hex: p.hex, note: `${p.region}${p.fill && p.fill !== "area" ? ` ${p.fill}` : ""}` }))} />;

/** Shoulder height (or length) in metres for the scale chart. */
function unitMetres(sp: AnimalSpecies, c: { trunk: number; neck: number; head: number }): number {
  if (BODY_PLANS[sp.plan].group !== "mammal") return sp.size.length.typical / 100;
  return (sp.size.shoulder?.typical ?? sp.size.length.typical / headBodyLength(c)) / 100;
}

function SizeChart({ species: sp, skeleton: s }: { species: AnimalSpecies; skeleton: AnimalSkeleton }) {
  const sh = skeletonShapes(s);
  return <ScaleChart subject={sh.far + sh.body + sh.near} bounds={sh.bounds} metresPerUnit={unitMetres(sp, s.c)} label={`${sp.name} beside a person, to scale`}
    caption={<>{sp.name}: {sp.size.shoulder ? `${fmt(sp.size.shoulder.typical)} cm at the shoulder` : `${fmt(sp.size.length.typical)} cm long`}.</>} />;
}

function GaitStrip({ species: sp, gait, frames = 6 }: { species: AnimalSpecies; gait: GaitId; frames?: number }) {
  const c = useMemo(() => animalConstruction(sp), [sp]);
  const poses = useMemo(() => Array.from({ length: frames }, (_, i) => poseAnimal(c, { gait, t: i / frames })), [c, gait, frames]);
  const all = poses.map(p => skeletonShapes(p).bounds);
  const b: [number, number, number, number] = [Math.min(...all.map(x => x[0])), Math.min(...all.map(x => x[1])), Math.max(...all.map(x => x[2])), Math.max(...all.map(x => x[3]))];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${frames}, minmax(0, 1fr))`, gap: 8 }}>
      {poses.map((p, i) => <figure key={i} style={{ margin: 0, display: "grid", gap: 2 }}>
        <AnimalFigure skeleton={p} mode="silhouette" bounds={b} label={`${sp.name}, ${ANIMAL_GAITS[gait].label.toLowerCase()}, ${Math.round(i / frames * 100)} % of the stride`} />
        <figcaption style={{ ...small, textAlign: "center" }}>{(i / frames).toFixed(2)}</figcaption>
      </figure>)}
    </div>
  );
}

const LEG_LABEL = { "hind-far": "hind far", "fore-far": "fore far", "hind-near": "hind near", "fore-near": "fore near" } as const;
/** Hildebrand's footfall diagram: one bar per leg, filled while the foot is on the ground. */
export function FootfallDiagram({ gait }: { gait: GaitId }) {
  const bars = footfallBars(gait);
  return (
    <div role="img" aria-label={`Footfall diagram, ${ANIMAL_GAITS[gait].label}`} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px", alignItems: "center" }}>
      {bars.map(bar => [
        <span key={bar.leg + "l"} style={small}>{LEG_LABEL[bar.leg]}</span>,
        <svg key={bar.leg} viewBox="0 0 100 6" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 12 }} aria-hidden>
          <rect x={0} y={0} width={100} height={6} fill="var(--km-surface-subtle, #f6f3f1)" />
          {bar.spans.map(([a, z], i) => <rect key={i} x={a * 100} y={0} width={(z - a) * 100} height={6} fill={bar.leg.startsWith("fore") ? ACCENT : INK} />)}
        </svg>,
      ])}
    </div>
  );
}
