/**
 * COLLAGE1 kit: builders that return plain scene nodes for common editorial objects.
 *
 * Each builder is a pure function that emits JSON-safe `CollageNode`s (no new renderer features), so
 * output can be saved, edited by hand and validated like any authored node. Builders namespace their
 * node ids with the id you pass, and take every colour as a paint (hex or palette role).
 */
import type { Point } from "./collage-geometry";
import type { CollageEase, CollageKey, CollageMove } from "./collage-motion";
import type { CollageBase, CollageCutoutNode, CollageNode, CollagePaint, CollageTextNode } from "./collage-scene";

export type CollagePlace = Pick<CollageBase, "x" | "y" | "rotate" | "scale" | "parent" | "depth" | "from" | "to" | "enter" | "exit" | "keys" | "loops" | "geo" | "follow">;
const f2 = (v: number) => Math.round(v * 100) / 100;
type Place = CollagePlace;
const PLACE_KEYS = ["x", "y", "rotate", "scale", "parent", "depth", "from", "to", "enter", "exit", "keys", "loops", "geo", "follow"] as const;
/** Only the placement fields of an options object, so builder-only options never leak into nodes. */
export function place(o: Place): Place {
  const out: Record<string, unknown> = {};
  for (const k of PLACE_KEYS) if (o[k] !== undefined) out[k] = o[k];
  return out as Place;
}

/** Rounded union outline of overlapping circles, e.g. a cloud or a bush. */
export function blobOutline(circles: readonly (readonly [number, number, number])[], samples = 120): Point[] {
  const cx = circles.reduce((s, c) => s + c[0], 0) / circles.length, cy = circles.reduce((s, c) => s + c[1], 0) / circles.length;
  const pts: Point[] = [];
  for (let k = 0; k < samples; k++) {
    const a = k / samples * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
    let best = 0;
    for (const [x, y, r] of circles) {
      // Farthest intersection of the ray from the centroid with this circle.
      const ox = cx - x, oy = cy - y, b = ox * dx + oy * dy, c = ox * ox + oy * oy - r * r, disc = b * b - c;
      if (disc >= 0) best = Math.max(best, -b + Math.sqrt(disc));
    }
    pts.push([f2(cx + dx * best), f2(cy + dy * best)]);
  }
  return pts;
}

// ---- Clock -----------------------------------------------------------------------------------------------------------------------

export interface ClockOptions extends Place {
  radius: number;
  face?: CollagePaint; ink?: CollagePaint; accent?: CollagePaint;
  /** Hand keyframes as clock time in hours (e.g. 11.75 = quarter to twelve). */
  time: readonly { frame: number; hours: number; ease?: CollageEase }[];
}
/** Paper clock: card face with printed ticks, cut-paper hands on a brass brad. Hands keep their own pivots. */
export function clock(id: string, o: ClockOptions): CollageNode[] {
  const r = o.radius, ink = o.ink ?? "#1d1b19";
  const ticks: string[] = [];
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2, long = k % 3 === 0, w = long ? r * .05 : r * .028, l0 = r * (long ? .68 : .74), l1 = r * .84;
    const s = Math.sin(a), c = -Math.cos(a), px = -c, py = s;
    const p = (l: number, side: number) => `${f2(s * l + px * w * side)} ${f2(c * l + py * w * side)}`;
    ticks.push(`M${p(l0, 1)}L${p(l1, 1)}L${p(l1, -1)}L${p(l0, -1)}Z`);
  }
  const keysFor = (unit: "h" | "m"): CollageKey[] => o.time.map(t => ({
    frame: t.frame, ease: t.ease, rotate: unit === "h" ? t.hours * 30 : t.hours * 360,
  }));
  return [
    { id, kind: "group", x: o.x, y: o.y, rotate: o.rotate, scale: o.scale, parent: o.parent, depth: o.depth, from: o.from, to: o.to, enter: o.enter, exit: o.exit, keys: o.keys, loops: o.loops, geo: o.geo },
    { id: id + "-face", kind: "cutout", parent: id, shape: { type: "ellipse", rx: r, ry: r }, fill: o.face ?? "#f4ecd8", material: "card", edge: "cut", backing: { width: r * .07, color: ink, edge: "cut" },
      halftone: { color: "#b9a988", toward: 45, from: 0, to: .22, cell: Math.max(4, r * .06) } },
    { id: id + "-ticks", kind: "cutout", parent: id, shape: { type: "path", d: ticks.join("") }, fill: ink, edge: "clean", shadow: 0 },
    { id: id + "-hour", kind: "cutout", parent: id, shape: { type: "polygon", points: [[-r * .055, r * .1], [r * .055, r * .1], [r * .035, -r * .5], [0, -r * .56], [-r * .035, -r * .5]] }, fill: ink, edge: "cut", keys: keysFor("h"), cadence: 1 },
    { id: id + "-minute", kind: "cutout", parent: id, shape: { type: "polygon", points: [[-r * .04, r * .14], [r * .04, r * .14], [r * .025, -r * .78], [0, -r * .84], [-r * .025, -r * .78]] }, fill: o.accent ?? ink, edge: "cut", keys: keysFor("m"), cadence: 1 },
    { id: id + "-brad", kind: "cutout", parent: id, shape: { type: "ellipse", rx: r * .07, ry: r * .07 }, fill: "#c7a660", edge: "clean", material: "glossy", shadow: .6 },
  ];
}

// ---- Pins, stamps, bubbles -------------------------------------------------------------------------------------------------------

/** Teardrop map pin standing on its tip; drops in by default. */
export function mapPin(id: string, o: Place & { color?: CollagePaint; size?: number; dropAt?: number }): CollageNode[] {
  const s = o.size ?? 44, d = `M0 0C${f2(-s * .14)} ${f2(-s * .34)} ${f2(-s * .5)} ${f2(-s * .56)} ${f2(-s * .5)} ${f2(-s * .9)}A${f2(s * .5)} ${f2(s * .5)} 0 1 1 ${f2(s * .5)} ${f2(-s * .9)}C${f2(s * .5)} ${f2(-s * .56)} ${f2(s * .14)} ${f2(-s * .34)} 0 0Z`;
  const enter: CollageMove | undefined = o.enter ?? (o.dropAt !== undefined ? { preset: "drop", frame: o.dropAt, duration: 10, ease: "bounce" } : undefined);
  return [
    { id, kind: "cutout", ...place(o), enter, shape: { type: "path", d }, fill: o.color ?? "#cf3b2a", edge: "cut", backing: { width: 3, color: "#f7f2e6" } },
    { id: id + "-eye", kind: "cutout", parent: id, y: -s * .9, shape: { type: "ellipse", rx: s * .19, ry: s * .19 }, fill: "#f7f2e6", edge: "cut", shadow: .4 },
  ];
}
/** Round push-pin, the kind that holds clippings to a board. */
export function pushPin(id: string, o: Place & { color?: CollagePaint; size?: number }): CollageNode[] {
  const s = o.size ?? 26;
  return [{ id, kind: "cutout", ...place(o), shape: { type: "ellipse", rx: s / 2, ry: s / 2 }, fill: o.color ?? "#cf3b2a", material: "glossy", edge: "clean", shadow: 1,
    enter: o.enter ?? (o.from !== undefined ? { preset: "stamp", frame: o.from, duration: 6 } : undefined) }];
}
/** Rubber-stamp label: inked capitals in a ruled box, slammed down. */
export function stamp(id: string, o: Place & { text: string; color?: CollagePaint; size?: number; frame: number; card?: CollagePaint }): CollageNode[] {
  const size = o.size ?? 44, color = o.color ?? "#c2352a";
  const w = o.text.length * size * .52 + size * .9, h = size * 1.5;
  // Stamped straight onto busy artwork, the ink needs a paper card under it to stay readable.
  const card: CollageNode[] = o.card ? [{ id: id + "-card", kind: "cutout", parent: id, shape: { type: "rect", width: w + size * .7, height: h + size * .6 }, fill: o.card, edge: "cut" }] : [];
  return [
    { id, kind: "group", ...place(o), rotate: o.rotate ?? -8, enter: o.enter ?? { preset: "stamp", frame: o.frame, duration: 7 }, blend: o.card ? undefined : "multiply" },
    ...card,
    { id: id + "-box", kind: "marker", parent: id, d: `M${f2(-w / 2)} ${f2(-h / 2)}L${f2(w / 2)} ${f2(-h / 2)}L${f2(w / 2)} ${f2(h / 2)}L${f2(-w / 2)} ${f2(h / 2)}Z`, color, width: size * .09, tool: "brush", wobble: .4 },
    { id: id + "-text", kind: "text", parent: id, text: o.text, role: "headline", size, color, align: "middle", y: size * .36, letterSpacing: size * .06 },
  ];
}
/** Paper speech bubble with its text; the tail points at `tail` (local to the bubble centre). */
export function speechBubble(id: string, o: Place & { text: string; width: number; height: number; tail: readonly [number, number]; fill?: CollagePaint; ink?: CollagePaint; size?: number; role?: CollageTextNode["role"] }): CollageNode[] {
  const size = o.size ?? 34;
  return [
    { id, kind: "cutout", ...place(o), enter: o.enter ?? (o.from !== undefined ? { preset: "pop", frame: o.from, duration: 9 } : undefined),
      shape: { type: "bubble", width: o.width, height: o.height, tail: o.tail }, fill: o.fill ?? "#fbf7ee", edge: "cut", backing: { width: 4, color: o.ink ?? "#1d1b19" } },
    { id: id + "-text", kind: "text", parent: id, text: o.text, role: o.role ?? "headline", size, color: o.ink ?? "#1d1b19", align: "middle", y: size * .32, maxWidth: o.width - size },
  ];
}

// ---- Documents and charts --------------------------------------------------------------------------------------------------------

export interface ClippingOptions extends Place {
  width: number; height: number;
  masthead?: string; headline: string; dateline?: string; body: string;
  paper?: CollagePaint; ink?: CollagePaint;
  /** Highlighter sweep over body words [first, last] at a frame. */
  highlight?: { words: readonly [number, number]; frame: number; duration?: number; color?: CollagePaint };
}
/** Torn newspaper clipping: masthead rule, serif headline, dateline and set body copy in columns. */
export function clipping(id: string, o: ClippingOptions): CollageNode[] {
  const w = o.width, h = o.height, ink = o.ink ?? "#25221e", pad = w * .07;
  const left = -w / 2 + pad;
  const nodes: CollageNode[] = [
    { id, kind: "cutout", x: o.x, y: o.y, rotate: o.rotate, scale: o.scale, parent: o.parent, depth: o.depth, from: o.from, to: o.to, enter: o.enter, exit: o.exit, keys: o.keys, loops: o.loops,
      shape: { type: "rect", width: w, height: h }, fill: o.paper ?? "#ebe5d6", material: "newsprint", edge: "torn", roughness: 3.6,
      halftone: { color: "#b8ab92", toward: 70, from: 0, to: .12, cell: 6 } },
  ];
  let y = -h / 2 + pad;
  if (o.masthead) {
    const ms = Math.min(54, w * .085);
    nodes.push({ id: id + "-mast", kind: "text", parent: id, text: o.masthead, role: "body", size: ms, weight: 800, italic: true, color: ink, align: "middle", y: y + ms * .8 });
    y += ms * 1.15;
    nodes.push({ id: id + "-rule", kind: "cutout", parent: id, y, shape: { type: "rect", width: w - pad * 2, height: 3 }, fill: ink, edge: "clean", shadow: 0 });
    y += 14;
  }
  if (o.dateline) {
    nodes.push({ id: id + "-date", kind: "text", parent: id, text: o.dateline, role: "label", size: Math.min(24, w * .034), weight: 600, letterSpacing: 2, color: ink, x: left, y: y + 18, uppercase: true });
    y += 38;
  }
  const hs = Math.min(64, w * .095);
  nodes.push({ id: id + "-headline", kind: "text", parent: id, text: o.headline, role: "body", size: hs, weight: 800, lineHeight: 1.04, color: ink, x: left, y: y + hs * .85, maxWidth: w - pad * 2 });
  const headLines = Math.ceil(o.headline.length * hs * .5 / (w - pad * 2));
  y += hs * 1.04 * headLines + hs * .5;
  const bs = Math.min(30, w * .042);
  nodes.push({ id: id + "-body", kind: "text", parent: id, text: o.body, role: "body", size: bs, weight: 450, lineHeight: 1.42, color: ink, x: left, y: y + bs, maxWidth: w - pad * 2,
    highlight: o.highlight ? { words: o.highlight.words, frame: o.highlight.frame, duration: o.highlight.duration ?? 22, color: o.highlight.color ?? "#f7d43a" } : undefined });
  return nodes;
}

/** Paper bar chart: each bar unfolds upward from the baseline in turn. Values are 0..1 of `height`. */
export function barChart(id: string, o: Place & { values: readonly number[]; labels?: readonly string[]; width: number; height: number; colors: readonly CollagePaint[]; startFrame: number; stagger?: number; ink?: CollagePaint }): CollageNode[] {
  const n = o.values.length, gap = o.width / n, bw = gap * .62;
  const nodes: CollageNode[] = [{ id, kind: "group", x: o.x, y: o.y, rotate: o.rotate, scale: o.scale, parent: o.parent, depth: o.depth, from: o.from, to: o.to, enter: o.enter, exit: o.exit, keys: o.keys }];
  o.values.forEach((v, i) => {
    const bh = Math.max(4, v * o.height), x = -o.width / 2 + gap * (i + .5);
    const bar: CollageCutoutNode = { id: `${id}-bar-${i}`, kind: "cutout", parent: id, x, y: -bh / 2, pivot: [0, bh / 2],
      shape: { type: "rect", width: bw, height: bh }, fill: o.colors[i % o.colors.length], edge: "cut",
      enter: { preset: "unfold", frame: o.startFrame + i * (o.stagger ?? 6), duration: 14 } };
    nodes.push(bar);
    if (o.labels?.[i]) nodes.push({ id: `${id}-label-${i}`, kind: "text", parent: id, x, y: 44, text: o.labels[i], role: "label", size: 26, weight: 700, color: o.ink ?? "#1d1b19", align: "middle", uppercase: true, from: o.startFrame + i * (o.stagger ?? 6) });
  });
  nodes.push({ id: id + "-base", kind: "cutout", parent: id, shape: { type: "rect", width: o.width + 30, height: 6 }, fill: o.ink ?? "#1d1b19", edge: "cut", shadow: .5 });
  return nodes;
}

// ---- Scenery ---------------------------------------------------------------------------------------------------------------------

export type BuildingType = "house" | "tower" | "church" | "factory" | "station" | "shop";
/** Flat paper building silhouettes with cut windows printed on. Base sits at y = 0. */
export function building(id: string, o: Place & { type: BuildingType; width: number; height: number; wall: CollagePaint; roof?: CollagePaint; window?: CollagePaint }): CollageNode[] {
  const w = o.width, h = o.height, roof = o.roof ?? "#7c3b2c", win = o.window ?? "#f3d98b";
  let body: [number, number][], top: [number, number][] | undefined;
  switch (o.type) {
    case "tower": body = [[-w / 2, 0], [w / 2, 0], [w / 2, -h * .82], [-w / 2, -h * .82]]; top = [[-w * .6, -h * .8], [w * .6, -h * .8], [0, -h]]; break;
    case "church": body = [[-w / 2, 0], [w / 2, 0], [w / 2, -h * .45], [w * .18, -h * .45], [w * .18, -h * .75], [-w * .18, -h * .75], [-w * .18, -h * .45], [-w / 2, -h * .45]]; top = [[-w * .24, -h * .74], [w * .24, -h * .74], [0, -h]]; break;
    case "factory": body = [[-w / 2, 0], [w / 2, 0], [w / 2, -h * .55], [w * .25, -h * .7], [w * .25, -h * .55], [0, -h * .7], [0, -h * .55], [-w * .25, -h * .7], [-w * .25, -h * .55], [-w / 2, -h * .55]];
      top = [[w * .3, -h * .55], [w * .42, -h * .55], [w * .42, -h], [w * .3, -h]]; break;
    case "station": body = [[-w / 2, 0], [w / 2, 0], [w / 2, -h * .6], [-w / 2, -h * .6]]; top = [[-w * .58, -h * .58], [w * .58, -h * .58], [w * .36, -h * .85], [-w * .36, -h * .85]]; break;
    case "shop": body = [[-w / 2, 0], [w / 2, 0], [w / 2, -h * .8], [-w / 2, -h * .8]]; top = [[-w * .55, -h * .78], [w * .55, -h * .78], [w * .5, -h], [-w * .5, -h]]; break;
    default: body = [[-w / 2, 0], [w / 2, 0], [w / 2, -h * .6], [-w / 2, -h * .6]]; top = [[-w * .6, -h * .58], [w * .6, -h * .58], [0, -h]]; break;
  }
  const windows: string[] = [];
  const rows = o.type === "tower" ? 4 : o.type === "factory" ? 1 : 2, cols = o.type === "tower" ? 1 : o.type === "church" ? 2 : 3;
  const ww = w * (o.type === "tower" ? .28 : .14), wh = h * (o.type === "tower" ? .08 : .1), bodyTop = o.type === "tower" ? h * .82 : o.type === "church" ? h * .45 : h * .55;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = cols === 1 ? 0 : -w * .3 + c * (w * .6 / (cols - 1)), y = -bodyTop * (r + 1) / (rows + 1) - wh / 2;
    windows.push(`M${f2(x - ww / 2)} ${f2(y)}h${f2(ww)}v${f2(wh)}h${f2(-ww)}Z`);
  }
  const nodes: CollageNode[] = [
    { id, kind: "cutout", ...place(o), shape: { type: "polygon", points: body }, fill: o.wall, edge: "cut", halftone: { color: roof, toward: 0, from: 0, to: .28, cell: 7, opacity: .5 } },
    { id: id + "-windows", kind: "cutout", parent: id, shape: { type: "path", d: windows.join("") }, fill: win, edge: "cut", shadow: .3 },
  ];
  if (top) nodes.splice(1, 0, { id: id + "-roof", kind: "cutout", parent: id, shape: { type: "polygon", points: top }, fill: roof, edge: "cut" });
  return nodes;
}
/** Paper cloud from overlapping puffs. */
export function cloud(id: string, o: Place & { width: number; fill?: CollagePaint }): CollageNode[] {
  const w = o.width;
  return [{ id, kind: "cutout", ...place(o), shape: { type: "polygon", points: blobOutline([[-w * .28, 0, w * .2], [0, -w * .1, w * .26], [w * .26, 0, w * .2], [w * .05, w * .06, w * .2]]) },
    fill: o.fill ?? "#fbf7ee", edge: "torn", roughness: 2.2, loops: o.loops ?? [{ kind: "float", amplitude: 1.4, period: 160 }] }];
}
/** Sun: cut-paper disc with halftone shading and a slowly turning ray star. */
export function sun(id: string, o: Place & { radius: number; fill?: CollagePaint; rays?: CollagePaint; shade?: CollagePaint }): CollageNode[] {
  const r = o.radius;
  return [
    { id, kind: "group", ...place(o) },
    { id: id + "-rays", kind: "cutout", parent: id, shape: { type: "star", points: 14, outer: r * 1.42, inner: r * 1.06 }, fill: o.rays ?? "#f0b93a", edge: "cut", loops: [{ kind: "spin", amplitude: .05, period: 600 }] },
    { id: id + "-disc", kind: "cutout", parent: id, shape: { type: "ellipse", rx: r, ry: r }, fill: o.fill ?? "#e8a12a", edge: "cut", halftone: { color: o.shade ?? "#c4472e", toward: 45, from: 0, to: .5, cell: Math.max(5, r * .075) } },
  ];
}
/** Side-view steam locomotive and tender in cut paper; wheels turn while it travels. */
export function locomotive(id: string, o: Place & { length: number; body?: CollagePaint; trim?: CollagePaint; wheelSpin?: number }): CollageNode[] {
  const L = o.length, h = L * .42, body = o.body ?? "#2b2a2e", trim = o.trim ?? "#cf3b2a";
  const wheels: CollageNode[] = [-.32, -.08, .2].map((p, i) => ({
    id: `${id}-wheel-${i}`, kind: "cutout", parent: id, x: L * p, y: -L * .07, shape: { type: "star", points: 8, outer: L * .085, inner: L * .072 },
    fill: trim, edge: "cut", loops: o.wheelSpin ? [{ kind: "spin", amplitude: 1, period: o.wheelSpin }] : undefined,
  }));
  return [
    { id, kind: "group", ...place(o) },
    { id: id + "-boiler", kind: "cutout", parent: id, x: L * .02, y: -h * .62, shape: { type: "rect", width: L * .62, height: h * .5, radius: h * .2 }, fill: body, edge: "cut", halftone: { color: "#000000", toward: 90, from: 0, to: .3, cell: 6, opacity: .5 } },
    { id: id + "-cab", kind: "cutout", parent: id, x: -L * .33, y: -h * .78, shape: { type: "rect", width: L * .26, height: h * .82 }, fill: body, edge: "cut" },
    { id: id + "-cab-window", kind: "cutout", parent: id, x: -L * .33, y: -h * .95, shape: { type: "rect", width: L * .13, height: h * .22 }, fill: "#f3d98b", edge: "cut", shadow: .3 },
    { id: id + "-roof", kind: "cutout", parent: id, x: -L * .33, y: -h * 1.2, shape: { type: "rect", width: L * .32, height: h * .08 }, fill: trim, edge: "cut" },
    { id: id + "-stack", kind: "cutout", parent: id, x: L * .22, y: -h * 1.02, shape: { type: "polygon", points: [[-L * .04, h * .16], [L * .04, h * .16], [L * .07, -h * .18], [-L * .07, -h * .18]] }, fill: body, edge: "cut" },
    { id: id + "-chassis", kind: "cutout", parent: id, x: 0, y: -L * .14, shape: { type: "rect", width: L * .9, height: h * .12 }, fill: trim, edge: "cut" },
    { id: id + "-cow", kind: "cutout", parent: id, x: L * .45, y: -L * .1, shape: { type: "polygon", points: [[0, -h * .18], [L * .1, h * .1], [0, h * .1]] }, fill: trim, edge: "cut" },
    ...wheels,
  ];
}
/** A paper sheet that slides across the whole frame: hides a cut, then (in the next scene) slides away. */
export function coverSheet(id: string, o: { width: number; height: number; fill: CollagePaint; frame: number; duration?: number; from?: CollageMove["from"]; mode: "in" | "out"; edge?: "torn" | "cut" }): CollageNode {
  const d = o.duration ?? 14, w = o.width * 1.3, h = o.height * 1.3;
  const move: CollageMove = { preset: "slide", frame: o.frame, duration: d, from: o.from ?? "right", distance: Math.max(w, h) * 1.05, ease: o.mode === "in" ? "out" : "in" };
  return { id, kind: "cutout", x: o.width / 2, y: o.height / 2, depth: 1.08, shape: { type: "rect", width: w, height: h }, fill: o.fill, edge: o.edge ?? "torn", roughness: 7,
    ...(o.mode === "in" ? { enter: move } : { exit: move, from: 0 }) };
}
