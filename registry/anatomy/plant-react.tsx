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
import { crownEnvelope, growPlant, plantConstruction, plantShapes, swayField, swayPlant } from "./plant-construct";
import type { PlantShapes, PlantSkeleton, SwayHz } from "./plant-construct";
import { crownDetail, flareTrunk, foliageLadder, ladderAt, mixLinear, woodDetail } from "./plant-crown";
import type { CrownDetail, CrownDetailLevel, Tuft } from "./plant-crown";
import { barkMarks, flowerShape, fruitShape, leafShape } from "./plant-organs";
import type { OrganShape } from "./plant-organs";
import { linePath, polyPath, smoothClosedPath, smoothTube } from "./foundation-shapes";
import type { FPoint, Range } from "./foundation-shapes";
import { ACCENT, INK, MUTED, PAPER, ScaleChart, SheetCard, SwatchList, sheetGrid, sheetList, sheetSmall } from "./foundation-react";

export type PlantFigureMode = "silhouette" | "construction" | "colour";
export interface PlantFigureProps extends Omit<SVGAttributes<SVGSVGElement>, "mode"> {
  skeleton: PlantSkeleton;
  mode?: PlantFigureMode;
  bounds?: readonly [number, number, number, number];
  ground?: boolean;
  label: string;
  /** Colour mode: the crown in tufts with sky holes, shaded trunks and bark ("full", "medium", "low"), or flat masses ("flat"). */
  detail?: CrownDetailLevel | "flat";
  /** Sun azimuth from behind the viewer (0 front-lit, 90 from the right) and elevation, in degrees. */
  sunAzimuth?: number; sunElevation?: number;
  /** Wind (0–2) and time (s): the still skeleton is swayed here, its detail grown once and moved with it. */
  wind?: number; t?: number; swayHz?: SwayHz;
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
export const PlantFigure = forwardRef<SVGSVGElement, PlantFigureProps>(function PlantFigure({ skeleton: still, mode = "colour", bounds, ground = true, label, detail = "full", sunAzimuth, sunElevation, wind = 0, t = 0, swayHz, style, ...rest }, ref) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const sk = useMemo(() => (wind ? swayPlant(still, wind, t, swayHz) : still), [still, wind, t, swayHz]);
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
        {mode === "colour" && detail !== "flat" && <TreePaint skeleton={still} detail={detail} sunAzimuth={sunAzimuth} sunElevation={sunElevation} lineWidth={lw} wind={wind} t={t} swayHz={swayHz} />}
        {mode === "colour" && detail === "flat" && <>
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

export interface TreePaintProps {
  skeleton: PlantSkeleton;
  /** Shapes already computed for this skeleton (else computed here). */
  shapes?: PlantShapes;
  detail?: CrownDetailLevel;
  sunAzimuth?: number; sunElevation?: number;
  /** Mix every colour toward a haze colour (distance), 0 none – 1 all haze. */
  haze?: { colour: string; amount: number };
  /** Less light on the tree (overcast, dusk): 0 full daylight – 1 black, applied before the haze (airlight adds on top). */
  dim?: number;
  /** Rain-wet: bark darkens (light trapped in the water film is absorbed, Lekner & Dorf 1988; the amount is estimated). */
  wet?: boolean;
  /** A hairline width in plant units (default: a 300th of the plant's width). */
  lineWidth?: number;
  seed?: number;
  /** Wind (0–2) and time (s): `skeleton` is the still plant; the crown is grown on it once and moved by the same sway. */
  wind?: number; t?: number; swayHz?: SwayHz;
}

/** A crown's detail moved point by point by a sway field. */
function moveCrown(cd: CrownDetail, f: (p: readonly [number, number]) => readonly [number, number]): CrownDetail {
  const mv = (pts: readonly (readonly [number, number])[]) => pts.map(f);
  return {
    ...cd,
    tufts: cd.tufts.map(t => ({ ...t, c: f(t.c), outline: mv(t.outline), cap: mv(t.cap), leaves: t.leaves.map(l => ({ ...l, pts: mv(l.pts) })) })),
    holes: cd.holes.map(mv), body: cd.body.map(mv), flicks: cd.flicks.map(l => ({ ...l, pts: mv(l.pts) })), strandLeaves: cd.strandLeaves.map(l => ({ ...l, pts: mv(l.pts) })),
  } as CrownDetail;
}

/**
 * One grown plant painted in detail, as an SVG group in plant units (y up; put it inside a `scale(1 -1)` group).
 * Back to front:
 * - the wood behind;
 * - the crown's dark body, then the back tufts;
 * - the front wood, shaded as cylinders, with bark;
 * - the front tufts and the leaves breaking the outline.
 * The sky holes are cut out of every foliage layer, so the wood behind shows through them (Needham: bold dark touches
 * of trunk, with bits of clear light between).
 */
export function TreePaint({ skeleton: still, shapes, detail = "full", sunAzimuth = 35, sunElevation = 45, haze, dim = 0, wet = false, lineWidth, seed = 1, wind = 0, t = 0, swayHz }: TreePaintProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const sk = useMemo(() => (wind ? swayPlant(still, wind, t, swayHz) : still), [still, wind, t, swayHz]);
  const sh = useMemo(() => (shapes && !wind ? shapes : plantShapes(sk)), [shapes, sk, wind]);
  const grown = useMemo(() => crownDetail(still, { seed, sunAzimuth, sunElevation, detail }), [still, seed, sunAzimuth, sunElevation, detail]);
  const cd = useMemo(() => (wind ? moveCrown(grown, swayField(still, wind, t, swayHz)) : grown), [grown, still, wind, t, swayHz]);
  const wood = useMemo(() => flareTrunk(sk), [sk]);
  const wd = useMemo(() => woodDetail(wood, { sunAzimuth, seed, minRadius: (sh.bounds[2] - sh.bounds[0]) * (detail === "low" ? .012 : .005) }), [sk, sunAzimuth, seed, sh, detail]);
  const [x0, y0, x1, y1] = sh.bounds, lw = lineWidth ?? (x1 - x0) / 300;
  const hz = (c0: string) => { const c = dim > 0 ? mixLinear(c0, "#000000", dim) : c0; return haze && haze.amount > 0 ? mixLinear(c, haze.colour, haze.amount) : c; };
  const sp = sk.c.species, bark = wet ? mixLinear(sp?.bark.colour ?? "#5a4a3e", "#000000", .45) : sp?.bark.colour ?? "#5a4a3e";
  const barkShade = hz(mixLinear(bark, "#0a0806", .5)), barkLit = hz(mixLinear(bark, "#fff1d6", .22)), barkMark = hz(mixLinear(bark, "#000", .55));
  const strandFill = hz(sp?.flower?.inflorescence === "raceme" && sp.flower.months.includes(sk.month) ? sp.flower.colours[0] : leafColour(sp, sk.month, sk.autumn));
  // Tufts in z bands; inside a band, bodies then caps, grouped by colour so the SVG stays small.
  const layers = useMemo(() => {
    const ladders = new Map<string, string[]>();
    const ladderFor = (t: Tuft) => {
      if (!t.colour) return cd.ladder;
      let l = ladders.get(t.colour);
      if (!l) { l = foliageLadder(t.colour, t.kind === "blossom" ? "blossom" : "leaf"); ladders.set(t.colour, l); }
      return l;
    };
    const q = (v: number) => Math.round(v * 12) / 12;
    const band = (list: Tuft[]) => {
      const out: { fill: string; d: string; leaves?: boolean }[] = [], n = Math.max(1, Math.ceil(list.length / 90));
      for (let b = 0; b < n; b++) {
        const part = list.slice(Math.floor(b * list.length / n), Math.floor((b + 1) * list.length / n)), bodies = new Map<string, string[]>(), caps = new Map<string, string[]>();
        for (const t of part) {
          const L = ladderFor(t), body = hz(ladderAt(L, q(t.kind === "blossom" ? .35 + t.light * .45 : t.light * .62))), core = t.leaves.length ? t.outline.map(p => [t.c[0] + (p[0] - t.c[0]) * .78, t.c[1] + (p[1] - t.c[1]) * .78] as const) : t.outline;
          const d = t.kind === "blossom" ? smoothClosedPath(core) : polyPath(core);
          (bodies.get(body) ?? bodies.set(body, []).get(body)!).push(d);
          if (t.leaves.length) {
            // The lit side as single leaves; the deep-shade tufts keep only a few darker leaves.
            for (const lf of t.leaves) { const fill = hz(ladderAt(L, q(Math.min(1, t.light * lf.light)))); (caps.get(fill) ?? caps.set(fill, []).get(fill)!).push(polyPath(lf.pts)); }
          } else if (t.light > .28) { const cap = hz(ladderAt(L, q(t.light))); (caps.get(cap) ?? caps.set(cap, []).get(cap)!).push(smoothClosedPath(t.cap)); }
        }
        for (const [fill, ds] of bodies) out.push({ fill, d: ds.join("") });
        for (const [fill, ds] of caps) out.push({ fill, d: ds.join(""), leaves: true });
      }
      return out;
    };
    const flicks = new Map<string, string[]>();
    for (const f of cd.flicks) { const L = f.colour ? ladderFor({ colour: f.colour, kind: f.kind } as Tuft) : cd.ladder, fill = hz(ladderAt(L, q(f.light * .85))); (flicks.get(fill) ?? flicks.set(fill, []).get(fill)!).push(polyPath(f.pts)); }
    const hanging = new Map<string, string[]>();
    for (const lf of cd.strandLeaves) { const fill = hz(ladderAt(cd.ladder, q(lf.light))); (hanging.get(fill) ?? hanging.set(fill, []).get(fill)!).push(polyPath(lf.pts)); }
    const merge = (m: Map<string, string[]>) => [...m].map(([fill, ds]) => ({ fill, d: ds.join("") }));
    return { back: band(cd.tufts.filter(t => t.back)), front: band(cd.tufts.filter(t => !t.back)), flicks: merge(flicks), hanging: merge(hanging) };
  }, [cd, haze?.colour, haze?.amount, dim]); // eslint-disable-line react-hooks/exhaustive-deps
  const body = cd.body.map(polyPath).join(""), bodyFill = hz(ladderAt(cd.ladder, .02));
  // Inside the crown the twigs are in shade: dark, between bark and the deepest foliage.
  const woodFront = useMemo(() => {
    const tube = (b: PlantSkeleton["branches"][number]) => (b.points.length > 1 ? smoothTube(b.points, b.radii.map(r => r * 2)) : "");
    const fr = wood.branches.filter(b => b.depth >= 0), major = Math.max(1, sk.c.a.branch.orders - 1);
    return { limbs: fr.filter(b => b.order < major).map(tube).join(""), twigs: fr.filter(b => b.order >= major).map(tube).join(""), back: wood.branches.filter(b => b.depth < 0).map(tube).join("") };
  }, [wood, sk]);
  const inLeaf = sk.leafCover > .3 && cd.tufts.length > 0;
  const twigFill = hz(mixLinear(bark, cd.ladder[0] ?? "#1c2418", inLeaf ? .6 : .15));
  const mask = cd.holes.length ? `url(#holes-${id})` : undefined, fringe = cd.holes.length ? `url(#fringe-${id})` : undefined;
  return (
    <g>
      {cd.holes.length > 0 && <defs><mask id={`holes-${id}`} maskUnits="userSpaceOnUse" x={x0 - 1} y={y0 - 1} width={x1 - x0 + 2} height={y1 - y0 + 2}>
        <rect x={x0 - 1} y={y0 - 1} width={x1 - x0 + 2} height={y1 - y0 + 2} fill="#fff" />
        <path d={cd.holes.map(smoothClosedPath).join("")} fill="#000" />
      </mask>
      {/* The leaves round an opening overhang its edge: they are cut only by the hole's middle. */}
      <mask id={`fringe-${id}`} maskUnits="userSpaceOnUse" x={x0 - 1} y={y0 - 1} width={x1 - x0 + 2} height={y1 - y0 + 2}>
        <rect x={x0 - 1} y={y0 - 1} width={x1 - x0 + 2} height={y1 - y0 + 2} fill="#fff" />
        <path d={cd.holes.map(h => { const c = h.reduce((a, p) => [a[0] + p[0] / h.length, a[1] + p[1] / h.length], [0, 0]); return smoothClosedPath(h.map(p => [c[0] + (p[0] - c[0]) * .6, c[1] + (p[1] - c[1]) * .6] as const)); }).join("")} fill="#000" />
      </mask></defs>}
      <path d={woodFront.back} fill={inLeaf ? twigFill : hz(mixLinear(bark, "#000", .3))} />
      <path d={wd.backShade.map(polyPath).join("")} fill={barkShade} opacity=".7" />
      <g mask={mask}>
        {cd.tufts.length > 0 && <path d={body} fill={bodyFill} />}
        {layers.back.map((l, i) => <path key={i} d={l.d} fill={l.fill} />)}
      </g>
      <path d={woodFront.limbs} fill={hz(bark)} />
      <path d={woodFront.twigs} fill={twigFill} />
      {/* Inside the crown the limbs are in the crown's shade: Needham's "bold black touches" where the trunk peers out. */}
      {inLeaf && <>
        <defs><clipPath id={`crown-${id}`}><path d={body} /></clipPath></defs>
        <path d={woodFront.limbs} fill={twigFill} opacity=".85" clipPath={`url(#crown-${id})`} />
      </>}
      <path d={wd.shade.map(polyPath).join("")} fill={barkShade} opacity=".85" />
      <path d={wd.lit.map(polyPath).join("")} fill={barkLit} opacity=".6" />
      {/* Bark, each branch's marks inside its own outline. Plates are lit faces between dark fissures. */}
      {wd.bark.map((b, i) => <g key={i} clipPath={`url(#bark-${id}-${i})`}>
        <defs><clipPath id={`bark-${id}-${i}`}><path d={polyPath(b.outline)} /></clipPath></defs>
        {b.plates.length > 0 && <path d={b.plates.map(polyPath).join("")} fill={barkLit} fillOpacity=".22" stroke={barkMark} strokeWidth={lw * 1.1} strokeOpacity=".8" strokeLinejoin="round" />}
        {b.marks.length > 0 && <path d={b.marks.map(linePath).join("")} fill="none" stroke={barkMark} strokeWidth={lw * 1.1} opacity=".7" strokeLinecap="round" />}
      </g>)}
      <path d={sh.strands} fill={cd.strandLeaves.length ? twigFill : strandFill} />
      {layers.hanging.map((l, i) => <path key={i} d={l.d} fill={l.fill} />)}
      {/* Front tufts: bodies cut by the holes, their lit leaves left whole so they fringe the openings. */}
      {layers.front.map((l, i) => <path key={i} d={l.d} fill={l.fill} mask={l.leaves ? fringe : mask} />)}
      {layers.flicks.map((l, i) => <path key={i} d={l.d} fill={l.fill} />)}
      {/* Placed leaves, nodes, single flowers and fruit, as in the flat painting. */}
      <path d={sh.leaves} fill={hz(leafColour(sp, sk.month, sk.autumn))} stroke="#0002" strokeWidth={lw * .5} />
      <path d={sh.nodes} fill={INK} opacity=".55" />
      <path d={sh.flowers} fill={hz(sp?.flower?.colours[0] ?? "#f4eef0")} stroke="#0002" strokeWidth={lw * .3} />
      <path d={sh.fruits} fill={hz(sp?.fruit?.colour ?? "#c0502a")} />
    </g>
  );
}

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
            <PlantFigure skeleton={s} mode="colour" detail="medium" bounds={b} label={`${sp.name}, ${picks[i].name}`} />
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
