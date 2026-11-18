/**
 * FLORA2 `SpeciesMorphologyProfile`: pure data that describes how any plant is built, measured from references.
 *
 * A profile names its axes (trunk, limbs, strands, stems, petioles, roots), how each axis bends and branches, the organs
 * (blades, compound leaves, flower heads, ears, buds) and where they sit, the surfaces (colour stops sampled from the
 * reference photos, roughness, gloss, texture) and layout defaults. The same schema holds a moss cushion, a row crop, a
 * canopy tree, a climber, a succulent rosette and a flower. Nothing in a profile is code, so a profile can come from
 * JSON at run time (`ReferenceGuidedFloraEngine.register`).
 */
import type { Range } from "./foundation-shapes";
import type { ProfileStops } from "./flora-math";

export type FloraHabit = "tree" | "shrub" | "climber" | "herb" | "rosette" | "graminoid" | "cushion";

/** A reference studied for a profile. Photos are linked, never copied: `rights` records the licence of what was studied. */
export interface FloraSource {
  id: string;
  title: string;
  url: string;
  kind: "photo" | "paper" | "flora" | "database";
  /** The licence of a studied photo, or "cited" for a text that only gave facts. */
  rights: "public-domain" | "CC0" | "CC BY" | "CC BY-SA" | "GFDL" | "cited";
  creator?: string;
  /** What was read or measured from it. */
  observed: readonly string[];
}

/** A colour at a place along an axis or organ: 0 at its foot or base, 1 at its tip (sRGB hex). */
export interface ColourStop { at: number; hex: string }

export type SurfaceTexture = "bark-folds" | "bark-fissured" | "bark-ringed" | "stem" | "root" | "coir" | "cactus" | "leaf-veins" | "parallel-veins" | "banded" | "spotted" | "petal" | "farina" | "none";

/** How a surface looks: colour stops, PBR response and a procedural texture. */
export interface SurfaceSpec {
  colour: readonly ColourStop[];
  /** Colour of the underside of a blade (abaxial side), sRGB hex. */
  back?: string;
  /** A coloured margin (variegated rim) over the outer `width` (fraction) of a blade's half-width, sRGB hex. */
  rim?: { hex: string; width: number };
  roughness: number;
  /** Waxy cuticle: a clear, glossy coat (0–1). */
  clearcoat?: number;
  /** Velvet or bloom: a soft sheen at grazing angles (0–1). */
  sheen?: number;
  sheenColour?: string;
  texture: SurfaceTexture;
  /** Metres covered by one texture tile on axes (bark, stems, roots). Blades map one tile to the whole blade. */
  tile?: number;
  /**
   * A photo-scanned bark (axes only): its id, the physical size of one tile (m) and its source page. The scan's own
   * maps come from the caller (`createFloraAsset` option `scans`); without them the procedural `texture` is drawn.
   */
  scan?: { id: string; width: number; height: number; source: string };
  /** Geometric relief on thick axes, in foot radii (bark folds and fissures). */
  relief?: number;
}

export type AxisKind = "trunk" | "limb" | "branch" | "twig" | "strand" | "stem" | "culm" | "petiole" | "peduncle" | "aerial-root" | "prop-root" | "tassel";

/** One kind of axis and how it grows. */
export interface AxisRule {
  id: string;
  kind: AxisKind;
  surface: string;
  /**
   * Length as a ratio of the plant height, of the parent axis, or of the height of the attach point above the ground
   * (`drop`: a strand that hangs toward the ground). `spread` is the ± fraction drawn per axis.
   */
  length: { of: "height" | "parent" | "drop"; ratio: number; spread?: number };
  /** Foot radius as a ratio of the plant height (level 0) or of the parent radius where it attaches. `tip` is tip ÷ foot. */
  radius: { of: "height" | "parent"; ratio: number; tip?: number };
  /** Radius factor along the axis (0 foot → 1 tip). */
  profile?: ProfileStops;
  /** Alternative radius profiles drawn per plant by weight (for example the trunk forms of a baobab population). */
  profileVariants?: readonly { label: string; weight: number; stops: ProfileStops }[];
  /** Root flare at the foot: height in foot radii, extra radius at the ground (× foot radius), buttress lobes. */
  flare?: { height: number; amount: number; lobes: number };
  /** Extra radius where a branch joins its parent (× its foot radius), so limbs grow out of the trunk. */
  swell?: number;
  /** Nodes along the axis at high definition. */
  nodes: number;
  /** Heavy-elastica G (0 straight, ~3 arching, 100+ hanging) and a tip load in rod weights. */
  gravity?: number;
  tipLoad?: number;
  /** Extra bend toward the sky over the length (deg), the phototropic upturn. */
  upturn?: number;
  /** Random wander of the direction (deg, smooth along the axis). */
  wander?: number;
  /** Root axes: tilt from vertical at the foot (deg, in a random direction); upturn can bend it back up (a leaning palm). */
  lean?: number;
  /** Start angle from the parent axis (deg) at the lower and the upper end of the child range. */
  angle?: readonly [number, number];
  /** Rotation round the parent between successive children (deg): 137.5 spiral, 180 two-ranked, 90 decussate. */
  divergence?: number;
  children?: readonly ChildRule[];
  /** Dichotomous forking from the tip of this axis. */
  fork?: ForkRule;
  /** Wind up the support pole (`profile.support`) this many turns over the length. */
  climb?: { turns: number };
  /** Many stems side by side (a moss cushion): disc radius (m), stem spacing (m), rim stem height ÷ centre stem height. */
  colony?: { radius: number; spacing: number; dome: number };
  /** Longitudinal ribs (columnar cacti): rib count and groove depth as a fraction of the radius. */
  ribs?: { count: number; depth: number };
  /** Node rings (culms, aroid stems): spacing in metres and radius swelling. */
  nodeRings?: { spacing: number; swell: number };
  /** Growth stage at which this axis appears. */
  onset?: number;
}

/** Lateral children of an axis. */
export interface ChildRule {
  rule: string;
  /** Fraction of the parent where children start and stop. */
  from: number;
  to: number;
  count?: readonly [number, number];
  perMetre?: number;
  /** Children per node in a whorl. */
  whorl?: number;
  chance?: number;
  /** Child length along the parent (the crown shape), after Weber and Penn (1995). */
  envelope?: "conical" | "spherical" | "hemispherical" | "cylindrical" | "flame" | "inverse" | "tapered";
}

/** Dichotomous forking: each tip forks into 2, 3 or 4 until the branch tips fill a dome-shaped crown. */
export interface ForkRule {
  rule: string;
  /** Fork orders on a mature plant. */
  orders: number;
  /** Weights for forking into 2, 3, 4… */
  ways: readonly number[];
  /** The dome the tips fill, in plant heights: centre height, horizontal radius, vertical radius; lowest tip elevation (deg). */
  crown: { centre: number; radius: number; depth: number; rim: number };
  /** Leonardo exponent Δ: r_parent^Δ = Σ r_child^Δ (2 keeps the cross-section area). */
  leonardo: number;
  /** Upward bow of each segment, in segment lengths. */
  bow?: number;
}

/** A simple or compound leaf blade, a sword leaf, a grass blade, a petal or a bract. */
export interface BladeSpec {
  kind: "blade";
  surface: string;
  /** Lamina length (m). */
  length: Range;
  /** Width ÷ length. */
  width: number;
  /** Place of the widest point along the lamina (0 base, 1 apex). */
  widestAt: number;
  /** Outline exponents: base 0.3 (rounded) … 1 (wedge) … 2 (drawn out); apex 0.5 (blunt) … 1 (acute) … 1.6 (acuminate). */
  baseShape: number;
  apexShape: number;
  /** A short sharp point on a rounded apex (mucronate tip): its length as a fraction of the lamina. */
  mucro?: number;
  /** A narrowing of the blade (a fiddle or violin shape): where along the lamina (0–1) and how deep (fraction of the width). */
  waist?: { at: number; depth: number };
  /** A notch cut into the apex (a cherry petal, a two-lobed ginkgo leaf): its depth (fraction of the length) and its width at the tip (fraction of the width). */
  notch?: { depth: number; width: number };
  /** Cordate basal lobes: fraction of the lamina length behind the petiole, and the half-width of the sinus at the base (× width). */
  lobe?: number;
  sinus?: number;
  /** Margin: teeth (serrate), waves (undulate) or rounded lobes with sinuses (lobed, as on an oak), count per side. */
  margin?: { kind: "serrate" | "undulate" | "lobed"; count: number; depth: number };
  /** Veins: laterals per side, their angle from the midrib (deg) near the apex and at the base, end curvature, midrib width (× width). */
  veins: { style: "pinnate" | "parallel"; laterals: number; angle: number; baseAngle?: number; curve?: number; midrib: number };
  /**
   * Fenestration: pinnatifid splits from the margin toward the midrib and holes in rows between the laterals.
   * `reach` is how far a split runs in from the margin (fraction of the half-width), `gap` its opening at the margin
   * (fraction of the space between laterals). Hole rows sit at a fraction of the half-width from the midrib; `length`
   * and `width` are fractions of the space between laterals. `areaFraction` is the measured hole area ÷ leaf area.
   */
  fenestration?: {
    onset: number;
    splits?: { perSide: Range; reach: readonly [number, number]; gap: number };
    holes?: { rows: readonly { at: number; length: number; width: number; chance: number }[]; areaFraction?: Range };
  };
  /** Fleshy leaves: thickness (m) and underside keel (× thickness). Over 1 mm builds a closed leaf. */
  thickness?: number;
  keel?: number;
  /** Cross-section fold (deg, + margins up), cup, pleats between laterals and margin ruffle (× width), twist (deg).
   * `ruffleWave` is the ruffle's wavelength as a fraction of the length (default 0.06). */
  fold?: number;
  cup?: number;
  corrugation?: number;
  ruffle?: number;
  ruffleWave?: number;
  twist?: number;
  /** Heavy-elastica G along the midrib, and the base pitch it was measured at (deg above horizontal). A negative G
   * curls the blade toward its upper face (incurved petals and tepals). */
  droop?: number;
  droopPitch?: number;
  /** A stalk built into the organ (petiolule, short petiole): length (m), radius (m), surface. */
  stalk?: { length: number; radius: number; surface: string };
  /** Palmately compound leaf: the blade is one leaflet; leaflets fan over `spread` degrees. */
  leaflets?: { count: Range; spread: number };
}

/** A composite flower head (Asteraceae): disc florets in Vogel's spiral, ray florets, bracts, receptacle. */
export interface CapitulumSpec {
  kind: "capitulum";
  diameter: Range;
  /** Disc florets: divergence (deg), count on a head of typical diameter, surface (colour stops by radius 0 centre → 1 rim). */
  disc: { divergence: number; count: number; surface: string };
  rays: { count: Range; length: number; width: number; surface: string };
  bracts: { count: number; length: number; surface: string };
  receptacle: string;
}

/** A grass ear: a cob wrapped in husk leaves with silk at the tip. */
export interface EarSpec { kind: "ear"; length: Range; width: number; husk: string; silk: string; silkLength: number }

/** A small spindle-shaped organ: a spikelet, a bud, a capsule, a hanging fruit (with a stalk). */
export interface BudSpec { kind: "bud"; surface: string; length: Range; width: number; stalk?: { length: number; radius: number; surface: string } }

/**
 * A flower of separate petals or tepals round its axis (tulip, lily, rose): `count` petals in whorls of `perWhorl`, or
 * in a golden-angle spiral. `angle` is each petal's angle from the flower axis and `scale` its size, from the innermost
 * to the outermost petal. The petal is a blade (its `length` is the petal length). Stamens stand in the centre.
 */
export interface CorollaSpec {
  kind: "corolla";
  petal: BladeSpec;
  count: number;
  arrangement: "whorled" | "spiral";
  perWhorl?: number;
  angle: readonly [number, number];
  scale?: readonly [number, number];
  /** Stamens: count, length (m) and surface (its colour runs from filament to anther). `curve` bends long filaments
   * toward the flower axis (deg), as on a spider lily. */
  stamens?: { count: number; length: number; surface: string; curve?: number };
  /** A stalk (pedicel) below a single flower: length and radius (m), surface. */
  stalk?: { length: number; radius: number; surface: string };
}

/**
 * Florets gathered on one stalk: a dome of florets (a hydrangea mophead), an umbel of rays (a spider lily, a cherry
 * cluster) or a hanging raceme that opens from the base (wisteria). `floret` names a corolla organ. `size` is the dome
 * diameter, the ray length or the raceme length (m). `spread` is the cap angle of a dome or the cone half-angle of an
 * umbel (deg). Rays and the raceme axis are drawn with `stalk`.
 */
export interface ClusterSpec {
  kind: "cluster";
  floret: string;
  shape: "dome" | "umbel" | "raceme";
  count: Range;
  size: Range;
  spread?: number;
  stalk: { radius: number; surface: string };
}

export type OrganSpec = BladeSpec | CapitulumSpec | EarSpec | BudSpec | CorollaSpec | ClusterSpec;

/** Where organs sit on an axis. */
export interface OrganRule {
  organ: string;
  on: string;
  /** Along the axis at a spacing or count, at its tip, as a rosette round its tip, or as litter lying on the ground
   * under the crown (fallen petals and leaves; `count` organs, `on` names the root axis). */
  place: "along" | "tip" | "rosette" | "litter";
  from?: number;
  to?: number;
  /** Metres between nodes (along). */
  spacing?: number;
  count?: readonly [number, number];
  /** Organs per node (1 alternate, 2 opposite). */
  perNode?: number;
  divergence?: number;
  /** Angle from the axis (deg): along, at `from` → `to`; rosette, inner → outer; tip, the bend at the junction. */
  angle: readonly [number, number];
  /** Size along the range (from → to), or base → middle → tip. */
  scale?: readonly [number, number] | readonly [number, number, number];
  /** Along: put the organs on both sides of the axis in its horizontal plane (pinnae on a palm or fern rachis), raised
   * `lift` degrees above that plane (a V-shaped frond). */
  sides?: boolean;
  lift?: number;
  /** Along: a fixed azimuth for the first organ (deg) instead of a random one, to line organs up with ribs. */
  phase?: number;
  /** Along: where the organ's base sits, as a fraction of the axis radius (default 0.85; 1 puts spines on rib crests). */
  offset?: number;
  /** Along: hang straight down under gravity whatever the axis direction (racemes, hanging fruit). */
  hang?: boolean;
  /** Rosette: radius of the ring of leaf bases (m) and the height they climb (m). */
  core?: number;
  rise?: number;
  /** Blade face: toward the sky (default) or away from the axis. */
  face?: "sky" | "out";
  onset?: number;
  chance?: number;
}

/** Profile of a species, measured from references. */
export interface SpeciesMorphologyProfile {
  id: string;
  name: string;
  scientificName: string;
  family?: string;
  habit: FloraHabit;
  summary: string;
  sources: readonly FloraSource[];
  /** Height and spread of a mature plant (m). */
  size: { height: Range; spread?: Range };
  /** Ratios measured on the references, for documentation and checks (crown width ÷ height, fork height ÷ height…). */
  measured?: Readonly<Record<string, Range>>;
  /** The level-0 axis rule. */
  root: string;
  axes: readonly AxisRule[];
  organs: Readonly<Record<string, OrganSpec>>;
  placements: readonly OrganRule[];
  surfaces: Readonly<Record<string, SurfaceSpec>>;
  /** A support the plant climbs: height ÷ plant height, radius (m), surface. */
  support?: { height: number; radius: number; surface: string };
  /** Layout defaults: spacing between plants (m), row pitch (m), clump radius (m), ground-cover density (plants per m²). */
  layout: { spacing: number; rowPitch?: number; clumpRadius?: number; density?: number };
  /** Height at growth stage 0 (fraction of mature height). */
  seedling?: number;
  /** The parameter blueprint in words: phyllotaxy, skeleton, surface and layout rules (Phase 2 of the study). */
  blueprint: { phyllotaxy: string; skeleton: string; surface: string; layout: string };
}

/** A CC0 Poly Haven bark scan of `width` × `height` metres (see `SurfaceSpec.scan`). */
export const polyHavenScan = (id: string, width: number, height = width): NonNullable<SurfaceSpec["scan"]> => ({ id, width, height, source: `https://polyhaven.com/a/${id}` });

export interface FloraProfileIssue { level: "error" | "warning"; path: string; message: string }

const HEX = /^#[0-9a-f]{6}$/i;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Checks a profile for broken references, impossible numbers and missing evidence. Errors block registration. */
export function checkFloraProfile(p: SpeciesMorphologyProfile): FloraProfileIssue[] {
  const out: FloraProfileIssue[] = [];
  const err = (path: string, message: string) => out.push({ level: "error", path, message });
  const warn = (path: string, message: string) => out.push({ level: "warning", path, message });
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id ?? "")) err("id", "use a kebab-case id");
  if (!p.name || !p.scientificName) err("name", "give a common and a scientific name");
  const range = (path: string, r: Range | undefined, positive = true) => {
    if (!r) return err(path, "missing range");
    if (![r.min, r.typical, r.max].every(finite)) return err(path, "range values must be numbers");
    if (!(r.min <= r.typical && r.typical <= r.max)) err(path, "min ≤ typical ≤ max");
    if (positive && r.min <= 0) err(path, "must be above zero");
    if (r.grade === "reported" && !r.source) warn(path, "a reported value needs its source");
  };
  range("size.height", p.size?.height);
  if (!p.sources?.length) err("sources", "a profile needs at least one studied reference");
  const sourceIds = new Set((p.sources ?? []).map(s => s.id));
  (p.sources ?? []).forEach((s, i) => { if (!/^https:\/\//.test(s.url)) err(`sources[${i}].url`, "use an https URL"); if (!s.observed?.length) warn(`sources[${i}]`, "say what was observed"); });
  const checkSource = (path: string, r: Range | undefined) => { if (r?.source && !sourceIds.has(r.source) && !/^https:/.test(r.source)) warn(path, `unknown source "${r.source}"`); };
  checkSource("size.height", p.size?.height);
  for (const [k, r] of Object.entries(p.measured ?? {})) { range(`measured.${k}`, r, false); checkSource(`measured.${k}`, r); }
  const surfaces = p.surfaces ?? {};
  for (const [k, s] of Object.entries(surfaces)) {
    if (!s.colour?.length) err(`surfaces.${k}.colour`, "give at least one colour stop");
    s.colour?.forEach((c, i) => { if (!HEX.test(c.hex)) err(`surfaces.${k}.colour[${i}]`, `"${c.hex}" is not #rrggbb`); if (!(c.at >= 0 && c.at <= 1)) err(`surfaces.${k}.colour[${i}].at`, "use 0…1"); });
    if (s.back && !HEX.test(s.back)) err(`surfaces.${k}.back`, "use #rrggbb");
    if (s.rim && (!HEX.test(s.rim.hex) || !(s.rim.width > 0 && s.rim.width < 1))) err(`surfaces.${k}.rim`, "use #rrggbb and a width in 0…1");
    if (!(s.roughness >= 0 && s.roughness <= 1)) err(`surfaces.${k}.roughness`, "use 0…1");
    if (s.scan && (!(s.scan.width > 0 && s.scan.height > 0) || !/^https:\/\//.test(s.scan.source))) err(`surfaces.${k}.scan`, "give the tile size in metres and an https source");
  }
  const needSurface = (path: string, id: string | undefined) => { if (!id || !surfaces[id]) err(path, `unknown surface "${id}"`); };
  const rules = new Map((p.axes ?? []).map(a => [a.id, a]));
  if (!rules.has(p.root)) err("root", `unknown axis rule "${p.root}"`);
  for (const a of p.axes ?? []) {
    const at = `axes.${a.id}`;
    needSurface(`${at}.surface`, a.surface);
    if (!(finite(a.length?.ratio) && a.length.ratio > 0)) err(`${at}.length`, "length ratio must be above zero");
    if (!(finite(a.radius?.ratio) && a.radius.ratio > 0)) err(`${at}.radius`, "radius ratio must be above zero");
    if (!(Number.isInteger(a.nodes) && a.nodes >= 2 && a.nodes <= 400)) err(`${at}.nodes`, "use 2…400 nodes");
    if (a.angle && !a.angle.every(v => finite(v) && v >= -180 && v <= 180)) err(`${at}.angle`, "use −180…180 degrees");
    if (a.gravity !== undefined && !(a.gravity >= 0 && a.gravity <= 5000)) err(`${at}.gravity`, "use 0…5000");
    for (const c of a.children ?? []) {
      if (!rules.has(c.rule)) err(`${at}.children`, `unknown axis rule "${c.rule}"`);
      if (c.rule === a.id) err(`${at}.children`, "an axis cannot be its own lateral child (use fork)");
      if (!(c.from >= 0 && c.to <= 1 && c.from <= c.to)) err(`${at}.children`, "use 0 ≤ from ≤ to ≤ 1");
      if (!c.count && !c.perMetre) err(`${at}.children`, "give count or perMetre");
    }
    if (a.fork) {
      if (!rules.has(a.fork.rule)) err(`${at}.fork`, `unknown axis rule "${a.fork.rule}"`);
      if (!(a.fork.orders >= 1 && a.fork.orders <= 14)) err(`${at}.fork.orders`, "use 1…14 orders");
      if (!a.fork.ways?.length) err(`${at}.fork.ways`, "give fork weights");
    }
    if (a.climb && !p.support) err(`${at}.climb`, "a climbing axis needs profile.support");
  }
  // A lateral-children cycle would grow without end.
  const seen = new Set<string>(), stack = new Set<string>();
  const visit = (id: string): boolean => {
    if (stack.has(id)) return true;
    if (seen.has(id)) return false;
    seen.add(id); stack.add(id);
    const cyc = (rules.get(id)?.children ?? []).some(c => visit(c.rule));
    stack.delete(id);
    return cyc;
  };
  if (rules.has(p.root) && visit(p.root)) err("axes", "lateral children form a cycle");
  const organs = p.organs ?? {};
  for (const [k, o] of Object.entries(organs)) {
    const at = `organs.${k}`;
    if (o.kind === "blade") {
      needSurface(`${at}.surface`, o.surface);
      range(`${at}.length`, o.length); checkSource(`${at}.length`, o.length);
      if (!(o.width > 0 && o.width <= 3)) err(`${at}.width`, "width ÷ length must be 0…3");
      if (!(o.widestAt > 0 && o.widestAt < 1)) err(`${at}.widestAt`, "use 0…1");
      if (!(o.veins?.laterals >= 0)) err(`${at}.veins`, "give the lateral vein count");
      if (o.stalk) needSurface(`${at}.stalk.surface`, o.stalk.surface);
      if (o.fenestration?.splits) range(`${at}.fenestration.splits.perSide`, o.fenestration.splits.perSide, false);
    } else if (o.kind === "capitulum") {
      range(`${at}.diameter`, o.diameter);
      needSurface(`${at}.disc.surface`, o.disc.surface); needSurface(`${at}.rays.surface`, o.rays.surface);
      needSurface(`${at}.bracts.surface`, o.bracts.surface); needSurface(`${at}.receptacle`, o.receptacle);
    } else if (o.kind === "ear") {
      range(`${at}.length`, o.length); needSurface(`${at}.husk`, o.husk); needSurface(`${at}.silk`, o.silk);
    } else if (o.kind === "bud") {
      range(`${at}.length`, o.length); needSurface(`${at}.surface`, o.surface);
      if (o.stalk) needSurface(`${at}.stalk.surface`, o.stalk.surface);
    } else if (o.kind === "corolla") {
      needSurface(`${at}.petal.surface`, o.petal.surface); range(`${at}.petal.length`, o.petal.length);
      if (!(o.count >= 1 && o.count <= 200)) err(`${at}.count`, "use 1…200 petals");
      if (o.stamens) needSurface(`${at}.stamens.surface`, o.stamens.surface);
      if (o.stalk) needSurface(`${at}.stalk.surface`, o.stalk.surface);
    } else if (o.kind === "cluster") {
      if (organs[o.floret]?.kind !== "corolla") err(`${at}.floret`, `"${o.floret}" must name a corolla organ`);
      range(`${at}.count`, o.count); range(`${at}.size`, o.size); needSurface(`${at}.stalk.surface`, o.stalk.surface);
    } else err(at, "unknown organ kind");
  }
  (p.placements ?? []).forEach((r, i) => {
    const at = `placements[${i}]`;
    if (!organs[r.organ]) err(`${at}.organ`, `unknown organ "${r.organ}"`);
    if (!rules.has(r.on)) err(`${at}.on`, `unknown axis rule "${r.on}"`);
    if (r.place === "along" && !r.spacing && !r.count) err(at, "give spacing or count");
    if ((r.place === "rosette" || r.place === "litter") && !r.count) err(at, `a ${r.place} needs a count`);
  });
  if (p.support) needSurface("support.surface", p.support.surface);
  if (!(p.layout?.spacing > 0)) err("layout.spacing", "give the spacing between plants (m)");
  return out;
}

/** Thrown by `ReferenceGuidedFloraEngine.register` when a profile has errors. */
export class FloraProfileError extends Error {
  constructor(readonly issues: readonly FloraProfileIssue[]) {
    super(`Flora profile has errors: ${issues.filter(i => i.level === "error").map(i => `${i.path}: ${i.message}`).join("; ")}`);
    this.name = "FloraProfileError";
  }
}
