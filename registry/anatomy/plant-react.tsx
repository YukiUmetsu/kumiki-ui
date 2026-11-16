/**
 * FLORA1 painters. `PlantFigure` draws one grown plant as:
 * - a silhouette;
 * - a construction (branch lines by order, foliage masses dashed, the crown envelope);
 * - a colour study for its month (bark, seasonal leaves, blossom, fruit, water).
 *
 * `PlantSheet` is the character sheet any style starts from:
 * - construction, the four seasons, leaf, flower, fruit and bark;
 * - size against a person, the calendar;
 * - architecture after Vicat Cole, wind, sounds, culture, references, and where it is already drawn.
 *
 * Text is HTML; colours come from the tokens and the shared foundation variables.
 */
import { forwardRef, useId, useMemo } from "react";
import type { HTMLAttributes, SVGAttributes } from "react";
import { GROWTH_FORMS } from "./plant-forms";
import { findPlant } from "./plant-species";
import type { Month, PlantSpecies } from "./plant-species";
import { crownEnvelope, growPlant, plantConstruction, plantShapes } from "./plant-construct";
import type { PlantSkeleton } from "./plant-construct";
import { barkMarks, flowerShape, fruitShape, leafShape } from "./plant-organs";
import type { OrganShape } from "./plant-organs";
import { linePath, polyPath } from "./foundation-shapes";
import type { FPoint, Range } from "./foundation-shapes";
import { ACCENT, INK, MUTED, PAPER, ScaleChart, SheetCard, SwatchList, sheetGrid, sheetList, sheetSmall } from "./foundation-react";

export type PlantFigureMode = "silhouette" | "construction" | "colour";
export interface PlantFigureProps extends Omit<SVGAttributes<SVGSVGElement>, "mode"> {
  skeleton: PlantSkeleton;
  mode?: PlantFigureMode;
  bounds?: readonly [number, number, number, number];
  ground?: boolean;
  label: string;
}

/** The leaf colour a species shows in a month. */
export function leafColour(sp: PlantSpecies | undefined, month: Month, autumn: boolean): string {
  if (!sp) return "#4a6e3a";
  const c = sp.leaf.colours;
  // Out of leaf, grasses stand as dry straw.
  if (!sp.leaf.evergreen && sp.seasons.leaf && !sp.seasons.leaf.includes(month)) return c.autumn ?? "#b09a6a";
  if (autumn && c.autumn) return c.autumn;
  if (month >= 3 && month <= 5 && c.spring && !sp.leaf.evergreen) return c.spring;
  return c.summer;
}

/** One grown plant as SVG (y up inside, flipped for the screen). */
export const PlantFigure = forwardRef<SVGSVGElement, PlantFigureProps>(function PlantFigure({ skeleton: sk, mode = "colour", bounds, ground = true, label, style, ...rest }, ref) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const sh = useMemo(() => plantShapes(sk), [sk]);
  const [x0, y0, x1, y1] = bounds ?? sh.bounds, w = x1 - x0, h = y1 - y0, lw = w / 300;
  const sp = sk.c.species, leaf = leafColour(sp, sk.month, sk.autumn), bark = sp?.bark.colour ?? "#5a4a3e", bloom = sp?.flower?.colours[0] ?? "#f4eef0";
  const strandFill = sp?.flower?.inflorescence === "raceme" && sp.flower.months.includes(sk.month) ? sp.flower.colours[0] : leaf;
  const all = sh.woodBack + sh.woodFront + sh.foliageBack + sh.foliageFront + sh.blossom + sh.strands + sh.leaves + sh.flowers + sh.fruits;
  return (
    <svg ref={ref} role="img" aria-label={label} viewBox={`${x0} ${-y1} ${w} ${h}`} preserveAspectRatio="xMidYMax meet" style={{ display: "block", width: "100%", height: "auto", ...style }} {...rest}>
      <g transform="scale(1 -1)">
        {sk.waterline !== undefined && <rect x={x0} y={0} width={w} height={sk.waterline} fill="var(--kumiki-plant-water, #bcd2da)" opacity={mode === "colour" ? .9 : .4} />}
        {ground && <line x1={x0} x2={x1} y1={0} y2={0} stroke={MUTED} strokeWidth={lw} />}
        {mode === "silhouette" && <path d={all} fill={INK} />}
        {mode === "colour" && <>
          <path d={sh.woodBack} fill={bark} /><path d={sh.woodBack} fill="#000" opacity=".25" />
          <path d={sh.foliageBack} fill={leaf} /><path d={sh.foliageBack} fill="#000" opacity=".18" />
          <path d={sh.woodFront} fill={bark} />
          <path d={sh.strands} fill={strandFill} />
          <path d={sh.foliageFront} fill={leaf} />
          <path d={sh.blossom} fill={bloom} /><path d={sh.blossom} fill="none" stroke={sp?.flower?.colours[1] ?? "#0002"} strokeWidth={lw * .6} opacity=".7" />
          <path d={sh.leaves} fill={leaf} stroke="#0002" strokeWidth={lw * .5} />
          <path d={sh.nodes} fill={INK} opacity=".55" />
          <path d={sh.flowers} fill={bloom} stroke="#0002" strokeWidth={lw * .3} />
          <path d={sh.fruits} fill={sp?.fruit?.colour ?? "#c0502a"} />
        </>}
        {mode === "construction" && <>
          <path d={sh.foliageBack + sh.foliageFront + sh.blossom} fill={PAPER} stroke={ACCENT} strokeWidth={lw} strokeDasharray={`${lw * 5} ${lw * 3}`} />
          {sk.branches.map((b, i) => <path key={i} d={linePath(b.points)} fill="none" stroke={INK} strokeWidth={Math.max(lw * .6, b.radii[0] * 2)} opacity={b.order === 0 ? 1 : b.order === 1 ? .85 : .55} strokeLinecap="round" />)}
          <path d={sh.strands} fill={INK} opacity=".5" />
          <path d={sh.leaves + sh.flowers} fill="none" stroke={INK} strokeWidth={lw * .5} />
          <Envelope sk={sk} lw={lw} id={id} />
        </>}
      </g>
    </svg>
  );
});

function Envelope({ sk, lw }: { sk: PlantSkeleton; lw: number; id: string }) {
  const a = sk.c.a;
  if (a.leader === "culm" || a.leader === "clump" || a.leader === "stems" || a.leader === "twining") return null;
  // Centred on the stem where the crown begins (a leaning trunk carries its crown over to one side).
  const W2 = a.crown.width / 2, cb = a.crown.base, pts: FPoint[] = [], stem = sk.branches.find(b => b.order === 0);
  const cx = stem ? (stem.points.find(p => p[1] >= cb) ?? stem.points[stem.points.length - 1])[0] : 0;
  for (let i = 0; i <= 20; i++) { const u = i / 20, y = cb + (1 - cb) * u; pts.push([W2 * crownEnvelope(a.crown.shape, u), y]); }
  const outline = [...pts.map(([x, y]) => [cx + x, y] as FPoint), ...pts.slice().reverse().map(([x, y]) => [cx - x, y] as FPoint)];
  return <path d={polyPath(outline)} fill="none" stroke={ACCENT} strokeWidth={lw * .8} opacity=".6" />;
}

/** A leaf, flower, fruit or piece of bark drawn alone, in the species' colours. */
export function OrganFigure({ shape, fill, label, view, stroke = INK }: { shape: OrganShape; fill: string; label: string; view: readonly [number, number, number, number]; stroke?: string }) {
  const [x0, y0, x1, y1] = view, lw = (x1 - x0) / 120;
  return (
    <svg role="img" aria-label={label} viewBox={`${x0} ${-y1} ${x1 - x0} ${y1 - y0}`} style={{ display: "block", width: "100%", height: "auto", maxHeight: 160 }}>
      <g transform="scale(1 -1)">
        {shape.outlines.map((o, i) => <path key={i} d={polyPath(o)} fill={fill} stroke={stroke} strokeWidth={lw} strokeLinejoin="round" />)}
        {shape.marks.map((m, i) => <path key={i} d={linePath(m)} fill="none" stroke={stroke} strokeWidth={lw * .7} opacity=".7" strokeLinecap="round" />)}
      </g>
    </svg>
  );
}

const fmt = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toPrecision(2));
const rangeText = (r: Range, unit: string) => `${fmt(r.min)}–${fmt(r.max)} ${unit} (typ. ${fmt(r.typical)}; ${r.grade})`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** The four months a sheet shows: winter, the species' spring bloom (else April), high summer, its autumn colour (else November). */
export function seasonMonths(sp: PlantSpecies): { month: Month; name: string }[] {
  const bloom = sp.flower?.months.find(m => m >= 2 && m <= 6), fall = sp.seasons.autumn?.[sp.seasons.autumn.length - 1] ?? sp.flower?.months.find(m => m >= 9);
  const pick = (m: Month, season: string) => ({ month: m, name: `${season} (${MONTH_NAMES[m - 1]})` });
  return [pick(1, "Winter"), pick((bloom ?? 4) as Month, "Spring"), pick(7, "Summer"), pick((fall ?? 11) as Month, "Autumn")];
}

export interface PlantSheetProps extends HTMLAttributes<HTMLDivElement> {
  /** A species record, or an id (species id, the id it is drawn by in a style, or romaji). */
  species: PlantSpecies | string;
  seed?: number;
}

/** The character sheet for one plant. */
export const PlantSheet = forwardRef<HTMLDivElement, PlantSheetProps>(function PlantSheet({ species, seed = 11, style, ...rest }, ref) {
  const sp = typeof species === "string" ? findPlant(species) : species;
  const c = useMemo(() => (sp ? plantConstruction(sp) : undefined), [sp]);
  const picks = useMemo(() => (sp ? seasonMonths(sp) : []), [sp]);
  const seasons = useMemo(() => (c ? picks.map(s => growPlant(c, { month: s.month, seed })) : []), [c, picks, seed]);
  if (!sp || !c) return <div ref={ref} role="alert" {...rest}>Unknown plant: {String(species)}</div>;
  const form = GROWTH_FORMS[sp.form], a = c.a, summer = seasons[2];
  const shared = seasons.map(s => plantShapes(s).bounds), b: [number, number, number, number] = [Math.min(...shared.map(x => x[0])), Math.min(...shared.map(x => x[1])), Math.max(...shared.map(x => x[2])), Math.max(...shared.map(x => x[3]))];
  const leaf = leafShape(sp.leaf, 3), flower = sp.flower ? flowerShape(sp.flower, 5) : undefined, fruit = sp.fruit ? fruitShape(sp.fruit.shape, 2) : undefined, bark = barkMarks(sp.bark.kind, 1, 1.6, 4);
  const leafBox: [number, number, number, number] = sp.leaf.shape === "peltate" ? [-.6, -.1, .6, 1.1] : sp.leaf.shape === "palmate" ? [-1, -.65, 1, 1.1] : [-.7, -.2, .7, 1.25];
  const flowerBox: [number, number, number, number] = flower && (sp.flower!.shape === "raceme") ? [-.4, -1.1, .4, .1] : flower && (sp.flower!.shape === "plume" || sp.flower!.shape === "panicle") ? [-.5, -.05, .5, 1.1] : [-1.15, -1.15, 1.15, 1.15];
  const H = sp.size.height.typical, months = Array.from({ length: 12 }, (_, i) => (i + 1) as Month);
  const row = (label: string, on: (m: Month) => boolean, colour: string) => (
    <>
      <span style={sheetSmall}>{label}</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 2 }} aria-label={`${label}: ${months.filter(on).map(m => MONTHS[m - 1]).join(", ") || "none"}`} role="img">
        {months.map(m => <span key={m} style={{ height: 12, borderRadius: 2, background: on(m) ? colour : "var(--km-surface-subtle, #f6f3f1)" }} />)}
      </div>
    </>
  );
  return (
    <div ref={ref} style={{ ...sheetGrid, ...style }} {...rest}>
      <header style={{ gridColumn: "1 / -1", display: "grid", gap: 4 }}>
        <h2 style={{ margin: 0, font: "700 22px/1.25 var(--km-font-sans, system-ui, sans-serif)" }}>{sp.name}</h2>
        <div style={sheetSmall}><span lang="ja">{sp.ja.kanji ? `${sp.ja.kanji} ` : ""}{sp.ja.kana}</span> · {sp.ja.romaji} · <i>{sp.scientific}</i> · {form.label}</div>
      </header>
      <SheetCard title="Construction">
        <PlantFigure skeleton={summer} mode="construction" label={`${sp.name}: construction`} />
        <p style={{ ...sheetSmall, margin: 0 }}>Branches by order (thickest the trunk), foliage masses dashed, the crown envelope ({a.crown.shape}). Leader: {a.leader}; buds: {a.buds}{a.buds === "spiral" ? `, ${fmt(a.phyllotaxis)} of a turn apart` : ""}.</p>
      </SheetCard>
      <SheetCard title="Silhouette">
        <PlantFigure skeleton={summer} mode="silhouette" label={`${sp.name}: silhouette`} />
        <p style={{ ...sheetSmall, margin: 0 }}>{form.drawing[0]}</p>
      </SheetCard>
      <SheetCard title="Size against a person">
        <ScaleChart subject={(() => { const s = plantShapes(summer); return s.woodBack + s.woodFront + s.foliageBack + s.foliageFront + s.strands + s.leaves; })()} bounds={plantShapes(summer).bounds} metresPerUnit={H}
          label={`${sp.name} beside a person, to scale`} caption={<>{sp.name}: {fmt(H)} m typical height.</>} />
      </SheetCard>
      <SheetCard title="Four seasons" wide>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 12 }}>
          {seasons.map((s, i) => <figure key={i} style={{ margin: 0, display: "grid", gap: 4 }}>
            <PlantFigure skeleton={s} mode="colour" bounds={b} label={`${sp.name}, ${picks[i].name}`} />
            <figcaption style={{ ...sheetSmall, textAlign: "center" }}>{picks[i].name}</figcaption>
          </figure>)}
        </div>
      </SheetCard>
      <SheetCard title="Leaf">
        <OrganFigure shape={leaf} fill={sp.leaf.colours.summer} label={`${sp.name} leaf`} view={leafBox} />
        <p style={{ ...sheetSmall, margin: 0 }}>{sp.leaf.shape}{sp.leaf.margin ? `, ${sp.leaf.margin}` : ""}; {rangeText(sp.leaf.length, "cm")}; {sp.leaf.arrangement}; {sp.leaf.evergreen ? "evergreen" : "deciduous"}.</p>
        <SwatchList items={[["new", sp.leaf.colours.spring], ["summer", sp.leaf.colours.summer], ["autumn", sp.leaf.colours.autumn]].filter(([, hex]) => hex).map(([n, hex]) => ({ name: n as string, hex: hex as string }))} />
      </SheetCard>
      {flower && sp.flower && <SheetCard title="Flower">
        <OrganFigure shape={flower} fill={sp.flower.colours[0]} label={`${sp.name} flower`} view={flowerBox} />
        <p style={{ ...sheetSmall, margin: 0 }}>{sp.flower.shape}{sp.flower.petals ? `, ${sp.flower.petals} petals` : ""}; {rangeText(sp.flower.diameter, sp.flower.inflorescence === "raceme" ? "cm long" : "cm")}; {sp.flower.inflorescence}; {sp.flower.timing.replace("-", " ")}{sp.flower.fragrant ? "; fragrant" : ""}.</p>
        <SwatchList items={sp.flower.colours.map((hex, i) => ({ name: i === 0 ? "main" : `variant ${i}`, hex }))} />
      </SheetCard>}
      <SheetCard title={fruit ? "Fruit and bark" : "Bark"}>
        <div style={{ display: "grid", gridTemplateColumns: fruit ? "1fr 1fr" : "1fr", gap: 12, alignItems: "end" }}>
          {fruit && sp.fruit && <OrganFigure shape={fruit} fill={sp.fruit.colour} label={`${sp.name} fruit`} view={[-1.3, -1.6, 1.3, 1.6]} />}
          <svg role="img" aria-label={`${sp.name} bark`} viewBox="0 -1.6 1 1.6" style={{ display: "block", width: "100%", height: "auto", maxHeight: 160 }}>
            <defs><clipPath id={`bark-${sp.id}`}><rect x={0} y={0} width={1} height={1.6} /></clipPath></defs>
            <g transform="scale(1 -1)" clipPath={`url(#bark-${sp.id})`}>
              <rect x={0} y={0} width={1} height={1.6} fill={sp.bark.colour} />
              {bark.outlines.map((o, i) => <path key={i} d={polyPath(o)} fill="#fff" opacity=".12" stroke="#000" strokeOpacity=".35" strokeWidth={.012} />)}
              {bark.marks.map((m, i) => <path key={i} d={linePath(m)} fill="none" stroke="#000" strokeOpacity=".45" strokeWidth={.02} strokeLinecap="round" />)}
            </g>
          </svg>
        </div>
        <p style={{ ...sheetSmall, margin: 0 }}>{fruit && sp.fruit ? `Fruit: ${sp.fruit.shape}, ${rangeText(sp.fruit.size, "cm")}. ` : ""}Bark ({sp.bark.kind}): {sp.bark.note}</p>
      </SheetCard>
      <SheetCard title="Calendar">
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px", alignItems: "center" }}>
          <span />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 2, ...sheetSmall, textAlign: "center" }}>{MONTHS.map(m => <span key={m}>{m[0]}</span>)}</div>
          {row("in leaf", m => sp.leaf.evergreen || (sp.seasons.leaf ?? []).includes(m), sp.leaf.colours.summer)}
          {sp.seasons.autumn && row("autumn colour", m => sp.seasons.autumn!.includes(m), sp.leaf.colours.autumn ?? "#c8702e")}
          {sp.flower && row("flowers", m => sp.flower!.months.includes(m), sp.flower.colours[0])}
          {sp.fruit && row("fruit", m => sp.fruit!.months.includes(m), sp.fruit.colour)}
        </div>
      </SheetCard>
      <SheetCard title="Size">
        <ul style={sheetList}>
          <li>Height: {rangeText(sp.size.height, "m")}</li>
          {sp.size.trunk && <li>Trunk: {rangeText(sp.size.trunk, "cm across")}</li>}
          {sp.size.crown && <li>Crown: {rangeText(sp.size.crown, "m across")}</li>}
          <li>Construction: crown {fmt(a.crown.width)} of the height across from {fmt(a.crown.base)} up; trunk {fmt(a.trunk.baseWidth)} across.</li>
        </ul>
      </SheetCard>
      <SheetCard title="How it is built">
        <ul style={sheetList}>{form.drawing.map(t => <li key={t}>{t}</li>)}</ul>
        <p style={{ ...sheetSmall, margin: 0 }}>After Rex Vicat Cole, The Artistic Anatomy of Trees (1915). Wind: {form.wind.moves}</p>
      </SheetCard>
      <SheetCard title="Sound and culture">
        <ul style={sheetList}>
          {sp.sounds.map(s => <li key={s.label}>{s.label} — {s.catalog ? <code>{s.catalog}</code> : <>no recording yet; search <q>{s.query}</q></>}</li>)}
          {sp.culture.map(t => <li key={t}>{t}</li>)}
        </ul>
      </SheetCard>
      <SheetCard title="Already drawn in">
        {sp.styles.length ? <ul style={sheetList}>{sp.styles.map(s => <li key={s.style + s.id}><b>{s.style}</b> · <code>{s.id}</code> ({s.pack}){s.note ? ` — ${s.note}` : ""}</li>)}</ul>
          : <p style={{ ...sheetSmall, margin: 0 }}>Not yet drawn in any style.</p>}
      </SheetCard>
      <SheetCard title="References and sources">
        <ul style={{ ...sheetList, overflowWrap: "anywhere" }}>
          {sp.references.map(r => <li key={r.url}><a href={r.url}>{r.title}</a> <span style={sheetSmall}>({r.kind}, {r.rights})</span></li>)}
          {sp.sources.map(r => <li key={r.url}><a href={r.url}>{r.title}</a></li>)}
        </ul>
      </SheetCard>
    </div>
  );
});
