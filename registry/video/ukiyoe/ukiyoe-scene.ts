/**
 * UKIYO1 — ukiyo-e woodblock / emaki handscroll scene contract.
 *
 * A scene is JSON-safe data: no clock, callbacks or remote code. `UkiyoeScene` draws one SVG from the spec and an
 * absolute frame. `inspectUkiyoeScene` returns every problem with a JSON path; the renderer refuses invalid scenes.
 */
import type { UkiyoeCamera, UkiyoeEase, UkiyoeKey, UkiyoeLoop, UkiyoeMove, UkiyoeWind } from "./ukiyoe-core";
import { isHex, UKIYOE_CHANNELS, UKIYOE_EASES, UKIYOE_LOOPS, UKIYOE_MOVES } from "./ukiyoe-core";
import type { UkiyoeAction, UkiyoeFigureLook } from "./ukiyoe-figure";
import { UKIYOE_ACTIONS, UKIYOE_BUILDS, UKIYOE_HAIRS, UKIYOE_HATS, UKIYOE_PROPS } from "./ukiyoe-figure";
import type { UkiyoeCreatureAction, UkiyoeCreatureLook, UkiyoeSpecies } from "./ukiyoe-creatures";
import { UKIYOE_CREATURE_ACTIONS, UKIYOE_SPECIES } from "./ukiyoe-creatures";
import type { UkiyoeMotifName } from "./ukiyoe-motifs";
import { UKIYOE_MOTIFS } from "./ukiyoe-motifs";
import type { UkiyoeParticleSpec } from "./ukiyoe-particles";
import { UKIYOE_PARTICLES } from "./ukiyoe-particles";
import type { UkiyoeFill, UkiyoePaint, UkiyoePresetName } from "./ukiyoe-pigments";
import { palette, UKIYOE_PRESETS } from "./ukiyoe-pigments";
import type { UkiyoePattern } from "./ukiyoe-prims";
import { UKIYOE_PATTERNS } from "./ukiyoe-prims";
import type { UkiyoeCrowdSpec } from "./ukiyoe-crowd";
import { UKIYOE_CROWD_MOODS } from "./ukiyoe-crowd";
import { UKIYOE_KAMAE } from "./ukiyoe-katana";

export interface UkiyoeBase {
  id: string;
  /** Parent group id. */
  parent?: string;
  x?: number;
  y?: number;
  rotate?: number;
  scale?: number;
  /** Mirror horizontally (motifs and blocks). */
  flip?: boolean;
  pivot?: readonly [number, number];
  /** Parallax depth for top-level nodes: 1 = scroll plane, .3 = far mountains, 1.4 = foreground. */
  depth?: number;
  from?: number;
  to?: number;
  enter?: UkiyoeMove;
  exit?: UkiyoeMove;
  keys?: readonly UkiyoeKey[];
  loops?: readonly UkiyoeLoop[];
  /** Held drawings: 2 = on twos. Defaults to the scene cadence for figures and 1 for everything else. */
  cadence?: 1 | 2 | 3 | 4;
  opacity?: number;
  /** How strongly the scene wind moves this node's motif or figure (default 1). */
  windScale?: number;
  /** Compositing: `multiply` for dusk and shadow washes, `screen` for light and mist. */
  blend?: "normal" | "multiply" | "screen";
  /**
   * Float on a `wave` motif: this top-level node (a boat group, a bird, driftwood) is lifted by the wave's surface
   * under it and pitched to its slope, so it climbs the face as the wave rises and drops when it breaks.
   * `amount` scales the lift, `tilt` the pitch, `span` is the waterline length sampled for the slope.
   */
  ride?: { on: string; amount?: number; tilt?: number; span?: number };
}

export interface UkiyoeBlockNode extends UkiyoeBase {
  kind: "block";
  /** SVG path in local coordinates, or a simple shape. */
  d?: string;
  shape?: { type: "rect"; width: number; height: number; radius?: number } | { type: "ellipse"; rx: number; ry: number } | { type: "polygon"; points: readonly (readonly [number, number])[] };
  fill: UkiyoeFill;
  /** Key-block outline width; 0 for none. */
  line?: number;
  lineColor?: UkiyoePaint;
  pattern?: UkiyoePattern;
  grain?: number;
  emboss?: boolean;
}

export interface UkiyoeLineNode extends UkiyoeBase {
  kind: "line";
  points: readonly (readonly [number, number])[];
  width: number;
  color?: UkiyoePaint;
  taper?: "both" | "start" | "end" | "none" | "swell";
  smooth?: boolean;
}

export interface UkiyoeGroupNode extends UkiyoeBase { kind: "group" }

export interface UkiyoeMotifNode extends UkiyoeBase {
  kind: "motif";
  motif: UkiyoeMotifName;
  params?: Readonly<Record<string, unknown>>;
}

export interface UkiyoeParticlesNode extends UkiyoeBase, UkiyoeParticleSpec { kind: "particles" }

export interface UkiyoeFigureNode extends UkiyoeBase {
  kind: "figure";
  look: UkiyoeFigureLook;
  actions?: readonly UkiyoeAction[];
  facing?: "left" | "right";
}

/** A folktale animal or spirit: fox, tanuki, dog, cat, rabbit, crane, heron, crow, pheasant, sparrow or dragon. */
export interface UkiyoeCreatureNode extends UkiyoeBase {
  kind: "creature";
  species: UkiyoeSpecies;
  look?: UkiyoeCreatureLook;
  actions?: readonly UkiyoeCreatureAction[];
  facing?: "left" | "right";
}

/**
 * Text on the print. `cartouche`: a framed title slip (vertical for CJK by default). `caption`: subtitle on a paper
 * slip, pinned to the frame unless given a depth. `seal`: a red artist's seal. `plain`: free text.
 */
export interface UkiyoeTextNode extends UkiyoeBase {
  kind: "text";
  style: "cartouche" | "caption" | "seal" | "plain";
  text: string;
  /** Second line (subtitle in a cartouche, small print under a caption). */
  sub?: string;
  vertical?: boolean;
  size?: number;
  color?: UkiyoePaint;
  fill?: UkiyoePaint;
  /** Max width (horizontal) or height (vertical) in px. */
  max?: number;
  align?: "start" | "middle" | "end";
}

/**
 * A crowd of townsfolk filling a strip of road: strollers, talkers, porters, children, dancers or a procession, in depth
 * rows, each a full figure with its own look and timing (seeded). It expands into figures before rendering.
 */
export interface UkiyoeCrowdNode extends UkiyoeBase, Omit<UkiyoeCrowdSpec, "id"> { kind: "crowd" }

export type UkiyoeNode = UkiyoeBlockNode | UkiyoeLineNode | UkiyoeGroupNode | UkiyoeMotifNode | UkiyoeParticlesNode | UkiyoeFigureNode | UkiyoeCreatureNode | UkiyoeTextNode | UkiyoeCrowdNode;

export interface UkiyoeSceneSpec {
  version: 1;
  id: string;
  width: number;
  height: number;
  durationFrames: number;
  seed: number;
  palette?: { preset?: UkiyoePresetName; roles?: Readonly<Record<string, string>> };
  /** Washi: base tone, fibre strength and age (warm toning toward the edges). */
  paper?: { tone?: UkiyoePaint; fibre?: number; age?: number };
  /** Woodblock behaviour: misregistration px, baren mottle, wood grain, key-line weight and line wear. */
  print?: { registration?: number; mottle?: number; grain?: number; line?: number; bleed?: number };
  /** The print-pass reveal: key block first, then colour blocks light → dark, each rubbed on with a baren sweep. */
  printIn?: { frame: number; duration: number };
  /** `print`: the sheet margin with a border line. `scroll`: brocade mounting bands of a handscroll. */
  mount?: { kind: "none" | "print" | "scroll"; margin?: number; color?: UkiyoePaint };
  /** Default held drawings for figures. */
  cadence?: 1 | 2 | 3 | 4;
  wind?: UkiyoeWind;
  camera?: UkiyoeCamera;
  nodes: readonly UkiyoeNode[];
}

// ---- Validation --------------------------------------------------------------------------------------------------------------------

export interface UkiyoeIssue { path: string; message: string }
const KINDS = ["block", "line", "group", "motif", "particles", "figure", "creature", "text", "crowd"] as const;
const SAFE_PATH = /^[MmLlHhVvCcSsQqTtAaZz0-9eE+\-.,\s]*$/;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isInt = (v: unknown): v is number => Number.isSafeInteger(v);

export function inspectUkiyoeScene(input: unknown): UkiyoeIssue[] {
  const issues: UkiyoeIssue[] = [];
  const bad = (path: string, message: string) => { issues.push({ path, message }); };
  if (!input || typeof input !== "object" || Array.isArray(input)) return [{ path: "$", message: "scene must be an object" }];
  const s = input as Partial<UkiyoeSceneSpec> & Record<string, unknown>;
  if (s.version !== 1) bad("$.version", "must be 1");
  if (typeof s.id !== "string" || !s.id) bad("$.id", "must be a non-empty string");
  for (const k of ["width", "height"] as const) if (!isInt(s[k]) || (s[k] as number) < 16 || (s[k] as number) > 8192) bad("$." + k, "must be an integer 16..8192");
  if (!isInt(s.durationFrames) || (s.durationFrames as number) < 1 || (s.durationFrames as number) > 108000) bad("$.durationFrames", "must be an integer 1..108000");
  if (!isInt(s.seed)) bad("$.seed", "must be an integer");
  let pal: Record<string, string> = palette();
  if (s.palette !== undefined) {
    if (s.palette.preset !== undefined && !UKIYOE_PRESETS.includes(s.palette.preset)) bad("$.palette.preset", "unknown preset; use " + UKIYOE_PRESETS.join(", "));
    for (const [k, v] of Object.entries(s.palette.roles ?? {})) if (!isHex(v)) bad("$.palette.roles." + k, "must be #rrggbb");
    try { pal = palette(UKIYOE_PRESETS.includes(s.palette.preset as UkiyoePresetName) ? s.palette.preset : "edo", Object.fromEntries(Object.entries(s.palette.roles ?? {}).filter(([, v]) => isHex(v)))); } catch { /* reported above */ }
  }
  const paint = (path: string, v: unknown) => { if (typeof v !== "string" || !(isHex(v) || isHex(pal[v]))) bad(path, "must be #rrggbb or a palette role"); };
  const fill = (path: string, v: unknown) => {
    if (typeof v === "string") return paint(path, v);
    if (!v || typeof v !== "object") return bad(path, "must be a paint or gradient");
    const g = v as { type?: unknown; stops?: unknown };
    if (g.type !== "linear" && g.type !== "radial") bad(path + ".type", "must be linear or radial");
    if (!Array.isArray(g.stops) || g.stops.length < 2) return bad(path + ".stops", "needs at least two stops");
    g.stops.forEach((st, i) => {
      if (!Array.isArray(st) || !isNum(st[0]) || st[0] < 0 || st[0] > 1) bad(`${path}.stops[${i}]`, "must be [offset 0..1, paint, opacity?]");
      else { paint(`${path}.stops[${i}][1]`, st[1]); if (st[2] !== undefined && (!isNum(st[2]) || st[2] < 0 || st[2] > 1)) bad(`${path}.stops[${i}][2]`, "opacity must be 0..1"); }
    });
  };
  const range = (path: string, v: unknown, lo: number, hi: number) => { if (v !== undefined && (!isNum(v) || v < lo || v > hi)) bad(path, `must be a number ${lo}..${hi}`); };
  if (s.paper) { if (s.paper.tone !== undefined) paint("$.paper.tone", s.paper.tone); range("$.paper.fibre", s.paper.fibre, 0, 1); range("$.paper.age", s.paper.age, 0, 1); }
  if (s.print) { range("$.print.registration", s.print.registration, 0, 12); range("$.print.mottle", s.print.mottle, 0, 1); range("$.print.grain", s.print.grain, 0, 1); range("$.print.line", s.print.line, .2, 3); range("$.print.bleed", s.print.bleed, 0, 1); }
  if (s.printIn && (!isInt(s.printIn.frame) || !isInt(s.printIn.duration) || s.printIn.duration < 2)) bad("$.printIn", "needs integer frame and duration ≥ 2");
  if (s.mount && !["none", "print", "scroll"].includes(s.mount.kind)) bad("$.mount.kind", "must be none, print or scroll");
  if (s.cadence !== undefined && ![1, 2, 3, 4].includes(s.cadence)) bad("$.cadence", "must be 1..4");
  if (s.wind) {
    range("$.wind.base", s.wind.base, -3, 3); range("$.wind.turbulence", s.wind.turbulence, 0, 2);
    (s.wind.gusts ?? []).forEach((g, i) => { if (!isInt(g.frame) || !isInt(g.duration) || g.duration < 1 || !isNum(g.strength)) bad(`$.wind.gusts[${i}]`, "needs integer frame, duration ≥ 1 and numeric strength"); });
  }
  (s.camera?.keys ?? []).forEach((k, i) => {
    if (!isInt(k.frame) || !isNum(k.x) || !isNum(k.y)) bad(`$.camera.keys[${i}]`, "needs integer frame and numeric x, y");
    if (k.zoom !== undefined && (!isNum(k.zoom) || k.zoom <= 0 || k.zoom > 20)) bad(`$.camera.keys[${i}].zoom`, "must be 0..20");
    if (k.ease !== undefined && !UKIYOE_EASES.includes(k.ease as UkiyoeEase)) bad(`$.camera.keys[${i}].ease`, "unknown ease");
  });
  if (!Array.isArray(s.nodes)) { bad("$.nodes", "must be an array"); return issues; }
  if (s.nodes.length > 1500) bad("$.nodes", "at most 1500 nodes");
  const ids = new Set<string>();
  s.nodes.forEach((n, i) => { if (n && typeof n === "object" && typeof n.id === "string") { if (ids.has(n.id)) bad(`$.nodes[${i}].id`, `duplicate id "${n.id}"`); ids.add(n.id); } });
  const groups = new Set(s.nodes.filter(n => n?.kind === "group").map(n => n.id));
  s.nodes.forEach((raw, i) => {
    const p = `$.nodes[${i}]`;
    if (!raw || typeof raw !== "object") return bad(p, "must be an object");
    const n = raw as UkiyoeNode;
    if (typeof n.id !== "string" || !/^[A-Za-z0-9_.:-]{1,80}$/.test(n.id)) bad(p + ".id", "must be 1-80 chars of letters, digits, _ . : -");
    if (!KINDS.includes(n.kind as typeof KINDS[number])) return bad(p + ".kind", "unknown kind; use " + KINDS.join(", "));
    if (n.parent !== undefined && !groups.has(n.parent)) bad(p + ".parent", `no group "${n.parent}"`);
    if (n.parent === n.id) bad(p + ".parent", "cannot parent itself");
    for (const k of ["x", "y", "rotate", "scale", "opacity", "depth", "windScale"] as const) if (n[k] !== undefined && !isNum(n[k])) bad(`${p}.${k}`, "must be a finite number");
    if (n.depth !== undefined && (n.depth < 0 || n.depth > 4)) bad(p + ".depth", "must be 0..4 (0 pins to the frame)");
    for (const k of ["from", "to"] as const) if (n[k] !== undefined && !isInt(n[k])) bad(`${p}.${k}`, "must be an integer frame");
    if (n.cadence !== undefined && ![1, 2, 3, 4].includes(n.cadence)) bad(p + ".cadence", "must be 1..4");
    if (n.blend !== undefined && !["normal", "multiply", "screen"].includes(n.blend)) bad(p + ".blend", "must be normal, multiply or screen");
    if (n.ride !== undefined) {
      const target = s.nodes!.find(m => m && m.id === n.ride!.on);
      if (!target || target.kind !== "motif" || target.motif !== "wave") bad(p + ".ride.on", "must be the id of a wave motif node");
      if (n.parent !== undefined) bad(p + ".ride", "only top-level nodes can ride a wave");
      range(p + ".ride.amount", n.ride.amount, 0, 3); range(p + ".ride.tilt", n.ride.tilt, 0, 3); range(p + ".ride.span", n.ride.span, 4, 4000);
    }
    for (const k of ["enter", "exit"] as const) {
      const m = n[k];
      if (m && (!UKIYOE_MOVES.includes(m.preset) || !isInt(m.frame) || !isInt(m.duration) || m.duration < 1)) bad(`${p}.${k}`, "needs a known preset, integer frame and duration ≥ 1");
    }
    (n.keys ?? []).forEach((key, j) => {
      if (!isInt(key.frame)) bad(`${p}.keys[${j}].frame`, "must be an integer");
      for (const c of Object.keys(key)) if (c !== "frame" && c !== "ease" && !UKIYOE_CHANNELS.includes(c as never)) bad(`${p}.keys[${j}].${c}`, "unknown channel");
      if (key.ease && !UKIYOE_EASES.includes(key.ease)) bad(`${p}.keys[${j}].ease`, "unknown ease");
      if (j && n.keys![j - 1].frame > key.frame) bad(`${p}.keys[${j}].frame`, "keys must be in frame order");
    });
    (n.loops ?? []).forEach((l, j) => { if (!UKIYOE_LOOPS.includes(l.kind)) bad(`${p}.loops[${j}].kind`, "unknown loop"); });
    switch (n.kind) {
      case "block":
        if (n.d === undefined && n.shape === undefined) bad(p, "block needs d or shape");
        if (n.d !== undefined && (typeof n.d !== "string" || !SAFE_PATH.test(n.d) || n.d.length > 40000)) bad(p + ".d", "must be SVG path data");
        fill(p + ".fill", n.fill);
        if (n.lineColor !== undefined) paint(p + ".lineColor", n.lineColor);
        if (n.pattern) { if (!UKIYOE_PATTERNS.includes(n.pattern.type)) bad(p + ".pattern.type", "unknown pattern"); paint(p + ".pattern.color", n.pattern.color); }
        break;
      case "line":
        if (!Array.isArray(n.points) || n.points.length < 2 || n.points.some(q => !Array.isArray(q) || !isNum(q[0]) || !isNum(q[1]))) bad(p + ".points", "needs at least two [x, y] points");
        if (!isNum(n.width) || n.width <= 0) bad(p + ".width", "must be > 0");
        if (n.color !== undefined) paint(p + ".color", n.color);
        break;
      case "motif":
        if (!UKIYOE_MOTIFS.includes(n.motif)) bad(p + ".motif", "unknown motif; use " + UKIYOE_MOTIFS.join(", "));
        if (n.params !== undefined && (typeof n.params !== "object" || Array.isArray(n.params))) bad(p + ".params", "must be an object");
        for (const [k, v] of Object.entries(n.params ?? {})) {
          if (typeof v === "number" && !Number.isFinite(v)) bad(`${p}.params.${k}`, "must be finite");
          if (typeof v === "string" && /color|top|mid|horizon|light|dark|trunk|needles|blossom|leaves|wall|wood|deck|rail|hull|noren|roofColor|foam|panel|floor|water|shade|snowColor|haloColor/i.test(k)) paint(`${p}.params.${k}`, v);
        }
        break;
      case "particles":
        if (!UKIYOE_PARTICLES.includes(n.type)) bad(p + ".type", "unknown particle type");
        if (n.area !== undefined && (!Array.isArray(n.area) || n.area.length !== 4 || n.area.some(v => !isNum(v)))) bad(p + ".area", "must be [x, y, width, height]");
        if (n.count !== undefined && (!isInt(n.count) || n.count < 0 || n.count > 2000)) bad(p + ".count", "must be 0..2000");
        if (n.color !== undefined) paint(p + ".color", n.color);
        (n.bursts ?? []).forEach((b, j) => { if (!isInt(b.frame) || !isNum(b.x) || !isNum(b.y)) bad(`${p}.bursts[${j}]`, "needs integer frame and numeric x, y"); });
        break;
      case "figure": {
        const l = n.look;
        if (!l || typeof l !== "object") { bad(p + ".look", "required"); break; }
        if (l.hair && !UKIYOE_HAIRS.includes(l.hair)) bad(p + ".look.hair", "unknown hair");
        if (l.hat && !UKIYOE_HATS.includes(l.hat)) bad(p + ".look.hat", "unknown hat");
        if (l.prop && !UKIYOE_PROPS.includes(l.prop)) bad(p + ".look.prop", "unknown prop");
        if (l.build && !UKIYOE_BUILDS.includes(l.build)) bad(p + ".look.build", "unknown build");
        for (const k of ["skin", "hairColor", "hatColor", "robe", "under", "obi", "coat", "hakama", "legs", "propColor", "accent", "lips", "uchikake", "lining", "obiPattern", "kataginu", "crest"] as const) if (l[k] !== undefined) paint(`${p}.look.${k}`, l[k]);
        if (l.motif !== undefined && l.motif !== "none") paint(`${p}.look.motif`, l.motif);
        (l.layers ?? []).forEach((c, j) => paint(`${p}.look.layers[${j}]`, c));
        if (l.swords !== undefined && l.swords !== "katana" && l.swords !== "daisho") bad(p + ".look.swords", "must be katana or daisho");
        if (l.obiTie !== undefined && !["front", "back", "darari"].includes(l.obiTie)) bad(p + ".look.obiTie", "must be front, back or darari");
        if (l.feet !== undefined && !["waraji", "geta", "tabi", "bare", "koma-geta", "okobo"].includes(l.feet)) bad(p + ".look.feet", "must be waraji, geta, tabi, bare, koma-geta or okobo");
        for (const k of ["robePattern", "coatPattern", "uchikakePattern"] as const) if (l[k]) { if (!UKIYOE_PATTERNS.includes(l[k]!.type)) bad(`${p}.look.${k}.type`, "unknown pattern"); paint(`${p}.look.${k}.color`, l[k]!.color); }
        range(p + ".look.height", l.height, 40, 2000);
        if (l.view !== undefined && !["profile", "three-quarter", "front", "back"].includes(l.view)) bad(p + ".look.view", "must be profile, three-quarter, front or back");
        (n.actions ?? []).forEach((a, j) => {
          if (!UKIYOE_ACTIONS.includes(a.type)) bad(`${p}.actions[${j}].type`, "unknown action; use " + UKIYOE_ACTIONS.join(", "));
          if (!isInt(a.start) || !isInt(a.end) || a.end < a.start) bad(`${p}.actions[${j}]`, "needs integer start ≤ end");
          if ((a.type === "walk" || a.type === "run") && !isNum(a.to)) bad(`${p}.actions[${j}].to`, "walk/run needs a numeric target x");
          if (a.form !== undefined && !UKIYOE_KAMAE.includes(a.form)) bad(`${p}.actions[${j}].form`, "must be " + UKIYOE_KAMAE.join(", "));
          if (a.via !== undefined && (!Array.isArray(a.via) || a.via.length > 64 || a.via.some(q => !Array.isArray(q) || !isNum(q[0]) || !isNum(q[1])))) bad(`${p}.actions[${j}].via`, "must be up to 64 [x, y] waypoints");
        });
        break;
      }
      case "creature": {
        if (!UKIYOE_SPECIES.includes(n.species)) bad(p + ".species", "unknown species; use " + UKIYOE_SPECIES.join(", "));
        const l = n.look ?? {};
        for (const k of ["color", "belly", "dark", "accent"] as const) if (l[k] !== undefined) paint(`${p}.look.${k}`, l[k]);
        range(p + ".look.size", l.size, 8, 6000);
        range(p + ".look.tails", l.tails, 1, 9);
        range(p + ".look.age", l.age, 0, 1);
        if (l.proportions !== undefined && l.proportions !== "print" && l.proportions !== "natural") bad(p + ".look.proportions", "must be print or natural");
        if (l.view !== undefined && !["profile", "three-quarter", "front", "back"].includes(l.view)) bad(p + ".look.view", "must be profile, three-quarter, front or back");
        (n.actions ?? []).forEach((a, j) => {
          if (!UKIYOE_CREATURE_ACTIONS.includes(a.type)) bad(`${p}.actions[${j}].type`, "unknown action; use " + UKIYOE_CREATURE_ACTIONS.join(", "));
          if (!isInt(a.start) || !isInt(a.end) || a.end < a.start) bad(`${p}.actions[${j}]`, "needs integer start ≤ end");
          if (["walk", "run", "fly", "hop", "float"].includes(a.type) && !isNum(a.to)) bad(`${p}.actions[${j}].to`, "travel needs a numeric target x");
          if (a.via !== undefined && (!Array.isArray(a.via) || a.via.length > 64 || a.via.some(q => !Array.isArray(q) || !isNum(q[0]) || !isNum(q[1])))) bad(`${p}.actions[${j}].via`, "must be up to 64 [x, y] waypoints");
        });
        break;
      }
      case "crowd":
        if (!isNum(n.width) || n.width <= 0 || n.width > 40000) bad(p + ".width", "must be a positive width in px");
        if (!isInt(n.count) || n.count < 1 || n.count > 80) bad(p + ".count", "must be an integer 1..80");
        if (n.rows !== undefined && (!isInt(n.rows) || n.rows < 1 || n.rows > 4)) bad(p + ".rows", "must be 1..4");
        range(p + ".rowGap", n.rowGap, 0, 400);
        range(p + ".scale", n.scale, .1, 10);
        if (n.frames !== undefined && (!isInt(n.frames) || n.frames < 30 || n.frames > 108000)) bad(p + ".frames", "must be an integer 30..108000");
        if (n.mood !== undefined && !UKIYOE_CROWD_MOODS.includes(n.mood)) bad(p + ".mood", "must be " + UKIYOE_CROWD_MOODS.join(", "));
        if (n.direction !== undefined && !["left", "right", "both"].includes(n.direction)) bad(p + ".direction", "must be left, right or both");
        (n.cast ?? []).forEach((l, j) => {
          if (l.hair && !UKIYOE_HAIRS.includes(l.hair)) bad(`${p}.cast[${j}].hair`, "unknown hair");
          if (l.hat && !UKIYOE_HATS.includes(l.hat)) bad(`${p}.cast[${j}].hat`, "unknown hat");
          if (l.prop && !UKIYOE_PROPS.includes(l.prop)) bad(`${p}.cast[${j}].prop`, "unknown prop");
          for (const k of ["skin", "hairColor", "hatColor", "robe", "under", "obi", "coat", "hakama", "legs", "propColor", "accent", "lips"] as const) if (l[k] !== undefined) paint(`${p}.cast[${j}].${k}`, l[k]);
        });
        break;
      case "text":
        if (!["cartouche", "caption", "seal", "plain"].includes(n.style)) bad(p + ".style", "must be cartouche, caption, seal or plain");
        if (typeof n.text !== "string" || !n.text.length || n.text.length > 400) bad(p + ".text", "must be 1..400 characters");
        if (n.color !== undefined) paint(p + ".color", n.color);
        if (n.fill !== undefined) paint(p + ".fill", n.fill);
        break;
    }
  });
  // Cycles in parent chains.
  const parent = new Map(s.nodes.map(n => [n.id, n.parent]));
  for (const n of s.nodes) {
    let at = n.parent, steps = 0;
    while (at && steps++ < 64) { if (at === n.id) { bad(`$.nodes[${s.nodes.indexOf(n)}].parent`, "parent chain forms a cycle"); break; } at = parent.get(at); }
  }
  return issues;
}

export function assertUkiyoeScene(input: unknown): asserts input is UkiyoeSceneSpec {
  const issues = inspectUkiyoeScene(input);
  if (issues.length) throw new RangeError("Invalid UKIYO1 scene:\n" + issues.slice(0, 12).map(i => `${i.path}: ${i.message}`).join("\n"));
}

/** Resolved palette for a scene. */
export const scenePalette = (s: UkiyoeSceneSpec) => palette(s.palette?.preset ?? "edo", s.palette?.roles ?? {});
