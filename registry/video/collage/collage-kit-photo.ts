/**
 * COLLAGE1 photo & editorial kit: builders for explainer registers built on real images.
 *
 * - Printed cut-out collage: subject photos with halftone/duotone print, torn sticker border, a colour disc,
 *   cut-out lettering chips and paper scraps on a flat colour field.
 * - Editorial evidence: archival prints with a slow Ken Burns push and a caption tag, document scans with
 *   highlighter marks placed in the scan's own pixel coordinates and a spotlight on the passage, source lines.
 * - Dark editorial devices: label boxes, outlined year boxes, a red-bar chapter caption, giant cropped labels,
 *   film-negative strips.
 *
 * Every builder returns plain JSON-safe nodes. Images are supplied by the caller with their rights cleared.
 */
import { hash01, hashSigned, seedOf } from "./collage-geometry";
import type { CollageEase, CollageKey, CollageMove } from "./collage-motion";
import type { CollageNode, CollagePaint, CollagePhotoTreatment } from "./collage-scene";
import type { CollagePlace } from "./collage-kit";
import { place } from "./collage-kit";
import { measureText } from "./collage-type";

const f2 = (v: number) => Math.round(v * 100) / 100;

// ---- Printed cut-out register ----------------------------------------------------------------------------------------------------

export interface PhotoCutoutOptions extends CollagePlace {
  /** A transparent-background cut-out image. */
  href: string;
  width: number;
  height: number;
  /** Sticker border width in pixels (0 for none). */
  sticker?: number;
  torn?: boolean;
  treatment?: CollagePhotoTreatment;
  /** A flat colour disc behind the subject, the way cut-out collage frames its hero. */
  disc?: { radius: number; fill: CollagePaint; halftone?: CollagePaint; offset?: readonly [number, number] };
}
export function photoCutout(id: string, o: PhotoCutoutOptions): CollageNode[] {
  const nodes: CollageNode[] = [{ id, kind: "group", ...place(o) }];
  if (o.disc) nodes.push({ id: id + "-disc", kind: "cutout", parent: id, x: o.disc.offset?.[0] ?? 0, y: o.disc.offset?.[1] ?? 0,
    shape: { type: "ellipse", rx: o.disc.radius, ry: o.disc.radius }, fill: o.disc.fill, edge: "cut", shadow: .5,
    halftone: o.disc.halftone ? { color: o.disc.halftone, toward: 45, from: 0, to: .45, cell: Math.max(6, o.disc.radius * .05) } : undefined });
  nodes.push({ id: id + "-photo", kind: "image", parent: id, href: o.href, width: o.width, height: o.height, cutout: true,
    sticker: { width: o.sticker ?? Math.max(4, Math.min(o.width, o.height) * .022), torn: o.torn ?? true }, treatment: o.treatment });
  return nodes;
}

export interface CutLettersOptions extends CollagePlace {
  text: string;
  size: number;
  /** Chip (paper) colours, cycled per letter. */
  chips: readonly CollagePaint[];
  /** Letter colours, cycled per letter. */
  inks: readonly CollagePaint[];
  frame: number;
  /** Frames between letters (2 = one per drawing on twos). */
  stagger?: number;
  /** Maximum chip tilt in degrees. */
  jitter?: number;
  role?: "headline" | "body" | "label";
  align?: "start" | "middle";
}
/** Ransom-note lettering: each character on its own torn chip, tilted, slapped down one per drawing. */
export function cutLetters(id: string, o: CutLettersOptions): CollageNode[] {
  const role = o.role ?? "headline", chars = [...o.text], seed = seedOf(id);
  const gap = o.size * .08, widths = chars.map(c => c === " " ? o.size * .3 : measureText(c, { role, size: o.size }) + o.size * .22);
  const total = widths.reduce((a, b) => a + b + gap, -gap);
  let x = o.align === "middle" ? -total / 2 : 0, letter = 0;
  const nodes: CollageNode[] = [{ id, kind: "group", ...place(o) }];
  chars.forEach((ch, i) => {
    const w = widths[i];
    if (ch !== " ") {
      const k = letter++, tilt = hashSigned(seed, k) * (o.jitter ?? 7);
      nodes.push({ id: `${id}-c${i}`, kind: "text", parent: id, x: x + w / 2, y: hashSigned(seed, k, 2) * o.size * .06, rotate: tilt, text: ch, role, size: o.size, align: "middle",
        color: o.inks[k % o.inks.length], slip: { fill: o.chips[k % o.chips.length], padding: o.size * .1, edge: hash01(seed, k, 3) > .5 ? "torn" : "cut" },
        enter: { preset: "stamp", frame: o.frame + k * (o.stagger ?? 2), duration: 5 } });
    }
    x += w + gap;
  });
  return nodes;
}

export interface ScrapsOptions {
  /** Region the scraps scatter in (top-left, size), in the parent's space. */
  box: { x: number; y: number; width: number; height: number };
  count: number;
  colors: readonly CollagePaint[];
  frame: number;
  size?: number;
  parent?: string;
  depth?: number;
}
/** Paper-stencil scraps (starbursts, zigzags, triangles, dots, half discs, bars) that pop in around a subject. */
export function scraps(id: string, o: ScrapsOptions): CollageNode[] {
  const seed = seedOf(id), s = o.size ?? 60, nodes: CollageNode[] = [];
  for (let i = 0; i < o.count; i++) {
    const kind = Math.floor(hash01(seed, i, 1) * 6), x = o.box.x + hash01(seed, i, 2) * o.box.width, y = o.box.y + hash01(seed, i, 3) * o.box.height;
    const fill = o.colors[i % o.colors.length], size = s * (.7 + hash01(seed, i, 4) * .6);
    const base = { id: `${id}-${i}`, kind: "cutout" as const, parent: o.parent, depth: o.depth, x: f2(x), y: f2(y), rotate: f2(hashSigned(seed, i, 5) * 40), fill, edge: "cut" as const,
      boil: 1.6, enter: { preset: "pop" as const, frame: o.frame + i * 3, duration: 8 } };
    if (kind === 0) nodes.push({ ...base, shape: { type: "star", points: 12, outer: size * .6, inner: size * .38 } });
    else if (kind === 1) {
      const pts: [number, number][] = [];
      for (let k = 0; k <= 8; k++) pts.push([-size + k * size / 4, k % 2 ? -size * .14 : size * .14]);
      for (let k = 8; k >= 0; k--) pts.push([-size + k * size / 4, (k % 2 ? -size * .14 : size * .14) + size * .16]);
      nodes.push({ ...base, shape: { type: "polygon", points: pts } });
    } else if (kind === 2) nodes.push({ ...base, shape: { type: "polygon", points: [[0, -size * .5], [size * .48, size * .4], [-size * .48, size * .4]] } });
    else if (kind === 3) nodes.push({ ...base, shape: { type: "ellipse", rx: size * .22, ry: size * .22 } });
    else if (kind === 4) nodes.push({ ...base, shape: { type: "path", d: `M${f2(-size * .5)} 0A${f2(size * .5)} ${f2(size * .5)} 0 0 1 ${f2(size * .5)} 0Z` } });
    else nodes.push({ ...base, shape: { type: "rect", width: size * 1.2, height: size * .16 } });
  }
  return nodes;
}

// ---- Editorial evidence register -------------------------------------------------------------------------------------------------

export interface ArchivalPrintOptions extends CollagePlace {
  href: string;
  /** Picture area (inside the border). */
  width: number;
  height: number;
  border?: number;
  borderColor?: CollagePaint;
  treatment?: CollagePhotoTreatment;
  kenBurns?: { start: number; end: number; to: number; pan?: readonly [number, number] };
  /** Red caption tag on the print: place, date. */
  tag?: { text: string; fill?: CollagePaint; ink?: CollagePaint; frame?: number };
}
/** A photographic print with a cream border, cast shadow and a slow push inside its frame. */
export function archivalPrint(id: string, o: ArchivalPrintOptions): CollageNode[] {
  const b = o.border ?? Math.round(Math.min(o.width, o.height) * .045);
  const nodes: CollageNode[] = [
    { id, kind: "cutout", ...place(o), shape: { type: "rect", width: o.width + b * 2, height: o.height + b * 2 }, fill: o.borderColor ?? "#f3eee2", material: "card", edge: "cut", roughness: .8 },
    { id: id + "-photo", kind: "image", parent: id, href: o.href, width: o.width, height: o.height, edge: "clean", shadow: 0, treatment: o.treatment, kenBurns: o.kenBurns },
  ];
  if (o.tag) nodes.push({ id: id + "-tag", kind: "text", parent: id, x: -o.width / 2 + b * .5, y: o.height / 2 - b * .6, rotate: -1.5, text: o.tag.text, role: "label", size: Math.max(18, Math.min(o.height * .04, o.width * .034)),
    maxWidth: o.width * .92,
    weight: 700, letterSpacing: 1.5, uppercase: true, color: o.tag.ink ?? "#ffffff", slip: { fill: o.tag.fill ?? "#c62f26", padding: 10, edge: "clean" },
    enter: o.tag.frame !== undefined ? { preset: "slide", frame: o.tag.frame, duration: 8, from: "left", distance: 120 } : undefined });
  return nodes;
}

export interface DocumentScanOptions extends CollagePlace {
  href: string;
  /** Displayed page size. */
  width: number;
  height: number;
  /** Pixel size of the scan the rectangles below are measured in. */
  sourceWidth: number;
  sourceHeight: number;
  /** Highlighter strokes over text, as [x0, y0, x1, y1] in scan pixels (e.g. from OCR word boxes). */
  highlights?: readonly { rect: readonly [number, number, number, number]; frame: number; duration?: number; color?: CollagePaint }[];
  /** Dim the rest of the page around a passage. */
  spotlight?: { rect: readonly [number, number, number, number]; frame: number; until?: number; dim?: number };
  edge?: "torn" | "cut";
  treatment?: CollagePhotoTreatment;
}
/** A real document scan: highlighter marks and spotlight sit on the scan's own coordinates, so they land on the words. */
export function documentScan(id: string, o: DocumentScanOptions): CollageNode[] {
  const sx = o.width / o.sourceWidth, sy = o.height / o.sourceHeight;
  const local = (x: number, y: number): [number, number] => [f2(x * sx - o.width / 2), f2(y * sy - o.height / 2)];
  const nodes: CollageNode[] = [
    { id, kind: "group", ...place(o) },
    { id: id + "-page", kind: "image", parent: id, href: o.href, width: o.width, height: o.height, edge: o.edge ?? "torn", backing: { width: 3 }, treatment: o.treatment },
  ];
  o.highlights?.forEach((h, i) => {
    const [x0, y0] = local(h.rect[0], h.rect[1]), [x1, y1] = local(h.rect[2], h.rect[3]), mid = f2((y0 + y1) / 2), thick = f2((y1 - y0) * 1.25);
    nodes.push({ id: `${id}-hl-${i}`, kind: "marker", parent: id, d: `M${f2(x0 - 4)} ${mid}L${f2(x1 + 4)} ${mid}`, color: h.color ?? "#fff200", width: thick, tool: "highlighter", wobble: .5,
      enter: { preset: "draw", frame: h.frame, duration: h.duration ?? Math.max(8, Math.min(24, Math.round((x1 - x0) / 25))), ease: "inOut" } });
  });
  if (o.spotlight) {
    const r = o.spotlight.rect, [x0, y0] = local(r[0], r[1]), [x1, y1] = local(r[2], r[3]), pad = 14;
    const fadeIn: CollageMove = { preset: "fade", frame: o.spotlight.frame, duration: 10 };
    nodes.push({ id: id + "-spot", kind: "spotlight", parent: id, x: f2((x0 + x1) / 2), y: f2((y0 + y1) / 2), width: f2(x1 - x0 + pad * 2), height: f2(y1 - y0 + pad * 2),
      dim: o.spotlight.dim ?? .6, feather: 30, enter: fadeIn, exit: o.spotlight.until !== undefined ? { preset: "fade", frame: o.spotlight.until, duration: 10 } : undefined });
  }
  return nodes;
}

/** Small source credit pinned to the frame (depth 0), e.g. "The Sun (New York), 19 Nov 1883 · Library of Congress". */
export function sourceLine(id: string, o: { text: string; x: number; y: number; size?: number; color?: CollagePaint; from?: number; to?: number; align?: "start" | "end"; maxWidth?: number;
  /** A box behind the line, for when pictures pass under it. */ backing?: CollagePaint }): CollageNode {
  return { id, kind: "text", depth: 0, x: o.x, y: o.y, text: o.text, role: "label", size: o.size ?? 22, weight: 600, letterSpacing: .4, color: o.color ?? "#1d1b19", opacity: o.backing ? .92 : .8,
    align: o.align, from: o.from, to: o.to, maxWidth: o.maxWidth, enter: o.from !== undefined ? { preset: "fade", frame: o.from, duration: 8 } : undefined,
    slip: o.backing ? { fill: o.backing, padding: (o.size ?? 22) * .4, edge: "clean" } : undefined };
}

// ---- Dark editorial devices ------------------------------------------------------------------------------------------------------

/** Text set in a solid colour box (white on colour or ink on white), the dark-stage label. */
export function labelBox(id: string, o: CollagePlace & { text: string; size?: number; fill?: CollagePaint; ink?: CollagePaint; role?: "headline" | "label"; uppercase?: boolean }): CollageNode {
  return { id, kind: "text", ...place(o), text: o.text, role: o.role ?? "headline", size: o.size ?? 44, color: o.ink ?? "#1d1b19", uppercase: o.uppercase ?? true, letterSpacing: o.role === "label" ? 2 : 0,
    weight: o.role === "label" ? 700 : undefined, slip: { fill: o.fill ?? "#ffffff", padding: (o.size ?? 44) * .22, edge: "clean" } };
}
/** A year in an outlined box. */
export function yearBox(id: string, o: CollagePlace & { text: string; size?: number; color?: CollagePaint; frame?: number }): CollageNode[] {
  const size = o.size ?? 64, w = measureText(o.text, { role: "headline", size }) + size * .6, h = size * 1.15, color = o.color ?? "#ffffff";
  return [
    { id, kind: "group", ...place(o), enter: o.enter ?? (o.frame !== undefined ? { preset: "pop", frame: o.frame, duration: 8 } : undefined) },
    { id: id + "-box", kind: "marker", parent: id, d: `M${f2(-w / 2)} ${f2(-h / 2)}L${f2(w / 2)} ${f2(-h / 2)}L${f2(w / 2)} ${f2(h / 2)}L${f2(-w / 2)} ${f2(h / 2)}Z`, color, width: Math.max(2, size * .06), wobble: 0, tool: "marker" },
    { id: id + "-text", kind: "text", parent: id, text: o.text, role: "headline", size, color, align: "middle", y: size * .4 },
  ];
}
/** Chapter caption pinned to the lower left: a red vertical bar, a year and a title. */
export function chapterCaption(id: string, o: { x: number; y: number; year: string; title: string; frame: number; until?: number; bar?: CollagePaint; ink?: CollagePaint; size?: number }): CollageNode[] {
  const size = o.size ?? 40, ink = o.ink ?? "#ffffff";
  const move: CollageMove = { preset: "slide", frame: o.frame, duration: 10, from: "left", distance: 200 };
  return [
    { id, kind: "group", depth: 0, x: o.x, y: o.y, enter: move, exit: o.until !== undefined ? { preset: "fade", frame: o.until, duration: 8 } : undefined },
    { id: id + "-bar", kind: "cutout", parent: id, x: 0, y: -size * .55, shape: { type: "rect", width: size * .16, height: size * 2.3 }, fill: o.bar ?? "#d1322a", edge: "clean", shadow: 0 },
    { id: id + "-year", kind: "text", parent: id, x: size * .45, y: -size * .9, text: o.year, role: "label", size: size * .62, weight: 700, letterSpacing: 2, color: ink, opacity: .85 },
    { id: id + "-title", kind: "text", parent: id, x: size * .45, y: size * .3, text: o.title, role: "headline", size, color: ink, uppercase: true },
  ];
}
/** An oversized label that bleeds off the frame and drifts slowly while on screen. */
export function giantLabel(id: string, o: CollagePlace & { text: string; size: number; color?: CollagePaint; drift?: number; start: number; end: number; opacity?: number; ease?: CollageEase }): CollageNode {
  return { id, kind: "text", ...place(o), text: o.text, role: "headline", size: o.size, color: o.color ?? "#ffffff", uppercase: true, opacity: o.opacity ?? .92, cadence: 1,
    keys: [{ frame: o.start, x: o.x ?? 0 }, { frame: o.end, x: (o.x ?? 0) + (o.drift ?? -120), ease: o.ease ?? "linear" }] };
}
/** A strip of film negative around a photo: dark film, sprocket holes over a light table, frame numbers. */
export function filmNegative(id: string, o: CollagePlace & { href: string; width: number; height: number; label?: string; treatment?: CollagePhotoTreatment }): CollageNode[] {
  const m = o.height * .2, W = o.width + m * 1.2, H = o.height + m * 2, hole = m * .34, holes: string[] = [];
  for (let x = -W / 2 + hole; x < W / 2 - hole; x += hole * 2.1) for (const y of [-H / 2 + m * .5, H / 2 - m * .5])
    holes.push(`M${f2(x)} ${f2(y - hole * .4)}h${f2(hole)}v${f2(hole * .8)}h${f2(-hole)}Z`);
  return [
    { id, kind: "cutout", ...place(o), shape: { type: "rect", width: W, height: H }, fill: "#1b1714", edge: "clean", material: "glossy" },
    { id: id + "-holes", kind: "cutout", parent: id, shape: { type: "path", d: holes.join("") }, fill: "#e9e3d3", edge: "clean", shadow: 0 },
    { id: id + "-photo", kind: "image", parent: id, href: o.href, width: o.width, height: o.height, edge: "clean", shadow: 0, treatment: o.treatment ?? { mode: "mono", contrast: 1.2 } },
    { id: id + "-num", kind: "text", parent: id, x: -W / 2 + hole, y: H / 2 - m * .08, text: o.label ?? "12A", role: "label", size: m * .3, weight: 700, letterSpacing: 2, color: "#e2913a" },
  ];
}

// ---- Photo rigs: parts of one photograph animated separately ---------------------------------------------------------------------

/** One part cut from a photo: its own transparent layer, where it sat in the source and the axle it turns on. */
export interface PhotoRigPart {
  id: string;
  href: string;
  /** The part layer's box in source-photo pixels: [x0, y0, x1, y1]. */
  box: readonly [number, number, number, number];
  /** Axle in source-photo pixels; rotation keys turn the part about it. Defaults to the box centre. */
  pivot?: readonly [number, number];
  /** Keys relative to the pose in the photograph (rotate 0 = as photographed). */
  keys?: readonly CollageKey[];
  loops?: CollageNode["loops"];
  /** Shadow cast on the plate below (0..1). */
  shadow?: number;
  /** Height above the plate; a hand sits a hair above the dial. */
  lift?: number;
  /** Own sticker border, for parts that stick out past the plate's outline. */
  sticker?: number;
}
export interface PhotoRigOptions extends CollagePlace {
  /** The plate: the photo with every moving part removed (transparent background). */
  href: string;
  sourceWidth: number;
  sourceHeight: number;
  /** Displayed width; height follows the source aspect. */
  width: number;
  sticker?: number;
  torn?: boolean;
  /** One print treatment over the assembled rig, so plate and parts share one dot screen. */
  treatment?: CollagePhotoTreatment;
  disc?: PhotoCutoutOptions["disc"];
  /** Parts in paint order (later parts sit on top). */
  parts: readonly PhotoRigPart[];
  /** Pull the parts off the plate for an exploded view (0 = assembled, 1 = fully apart). */
  explode?: number;
}
/**
 * A photograph taken apart: the plate keeps the white sticker border and paper shadow, each part is its own layer
 * placed back exactly where it was in the photo, turning on its real axle.
 */
export function photoRig(id: string, o: PhotoRigOptions): CollageNode[] {
  const s = o.width / o.sourceWidth, height = o.sourceHeight * s;
  const cx = o.sourceWidth / 2, cy = o.sourceHeight / 2, explode = o.explode ?? 0, unit = o.width / 600;
  const t = o.treatment && o.treatment.mode !== "natural" ? o.treatment : undefined;
  // Outer group carries placement and the colour disc; the inner group prints plate and parts through one screen.
  const nodes: CollageNode[] = [{ id, kind: "group", ...place(o) }];
  if (o.disc) nodes.push({ id: id + "-disc", kind: "cutout", parent: id, x: o.disc.offset?.[0] ?? 0, y: o.disc.offset?.[1] ?? 0,
    shape: { type: "ellipse", rx: o.disc.radius, ry: o.disc.radius }, fill: o.disc.fill, edge: "cut", shadow: .5,
    halftone: o.disc.halftone ? { color: o.disc.halftone, toward: 45, from: 0, to: .45, cell: Math.max(6, o.disc.radius * .05) } : undefined });
  const inner = id + "-print";
  nodes.push({ id: inner, kind: "group", parent: id,
    print: t ? { mode: t.mode as "mono" | "duotone" | "halftone", ink: t.ink, paper: t.paper, cell: t.cell, contrast: t.contrast } : undefined });
  nodes.push({ id: id + "-plate", kind: "image", parent: inner, href: o.href, width: o.width, height: f2(height), cutout: true,
    sticker: { width: o.sticker ?? Math.max(4, o.width * .016), torn: o.torn ?? true } });
  o.parts.forEach((part, i) => {
    const [x0, y0, x1, y1] = part.box, bcx = (x0 + x1) / 2, bcy = (y0 + y1) / 2, [px, py] = part.pivot ?? [bcx, bcy];
    // Exploded view: the layers lift off as one stack toward the light (up and to the left), each a step further.
    const step = explode * (34 + i * 30) * unit;
    nodes.push({ id: `${id}-${part.id}`, kind: "image", parent: inner, href: part.href, width: f2((x1 - x0) * s), height: f2((y1 - y0) * s), cutout: true,
      sticker: part.sticker ? { width: part.sticker, torn: o.torn ?? true } : undefined,
      x: f2((bcx - cx) * s - step * .55), y: f2((bcy - cy) * s - step),
      pivot: [f2((px - bcx) * s), f2((py - bcy) * s)], shadow: part.shadow ?? .5,
      keys: mergeKeys([{ frame: 0, lift: (part.lift ?? .06) + explode * 1.1 }, ...(part.keys ?? [])]), loops: part.loops });
  });
  return nodes;
}

/** Combine keys that land on the same frame (later fields win) and sort them, as scene validation requires. */
export function mergeKeys(keys: readonly CollageKey[]): CollageKey[] {
  const byFrame = new Map<number, CollageKey>();
  for (const k of keys) byFrame.set(k.frame, { ...byFrame.get(k.frame), ...k });
  return [...byFrame.values()].sort((a, b) => a.frame - b.frame);
}

/** Clock-face angle (degrees clockwise from 12) of a hand at a time given in hours. */
export function clockAngle(unit: "hour" | "minute" | "second", hours: number): number {
  return unit === "hour" ? hours * 30 : unit === "minute" ? hours * 360 : hours * 21600;
}
/** Rotation keys for a photographed hand from clock times (hours); `photoAngle` is where it points in the photo. */
export function clockHandKeys(unit: "hour" | "minute" | "second", photoAngle: number, times: readonly { frame: number; hours: number; ease?: CollageEase }[]): CollageKey[] {
  return times.map(t => ({ frame: t.frame, rotate: f2(clockAngle(unit, t.hours) - photoAngle), ease: t.ease }));
}
/** A seconds hand that ticks once per second with a small overshoot and settle. */
export function tickingSecondKeys(photoAngle: number, o: { frame: number; startSecond: number; seconds: number; fps?: number; stepFrames?: number }): CollageKey[] {
  const fps = o.fps ?? 30, step = o.stepFrames ?? 4, keys: CollageKey[] = [{ frame: o.frame, rotate: f2(o.startSecond * 6 - photoAngle) }];
  for (let k = 1; k <= o.seconds; k++) {
    const at = o.frame + k * fps, angle = (o.startSecond + k) * 6 - photoAngle;
    keys.push({ frame: at, rotate: f2(angle - 6), ease: "hold" }, { frame: at + step, rotate: f2(angle), ease: "back" });
  }
  return keys;
}
