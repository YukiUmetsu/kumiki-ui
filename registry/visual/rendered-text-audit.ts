/** Check the text a browser actually drew at one frame. It reads laid-out boxes, not pixels, and needs no model.
 * `collectRenderedText` reads the DOM. `findTextProblems` is pure geometry, so it runs anywhere.
 * It cannot see text inside a canvas or an image, and it cannot judge contrast or beauty.
 */
import type { Rect } from "../motion/types";

/** One line of text. `owner` is its block, and `text` is the whole text of that block. */
export interface RenderedTextBox { text: string; rect: Rect; fontPx: number; owner: number; opacity: number; clippedBy?: Rect;
  /** Text that deliberately follows a moving subject (a label on an object), marked `data-km-text-tracks`. */
  tracks?: boolean;
  /** Styled text colour, for a contrast measure against the drawn pixels. */
  color?: readonly [number, number, number] }
export interface TextProblem {
  severity: "error" | "warning";
  code: "text-outside-frame" | "text-outside-safe-area" | "text-collision" | "text-clipped" | "text-too-small" | "text-moving-while-read";
  text: string;
  other?: string;
  rect: Rect;
}
export interface TextAuditOptions {
  frame: { width: number; height: number };
  /** Normalized platform inset. */
  safeInset?: { left: number; right: number; top: number; bottom: number };
  /** Smallest readable size as a fraction of the short side. @default 0.023 */
  minFontFraction?: number;
  /** Text below this opacity is mid-fade and is not checked. @default 0.5 */
  minOpacity?: number;
}
/** Allowance for font side-bearings, in px. */
const TOLERANCE = 2;
const right = (r: Rect) => r.x + r.width;
const bottom = (r: Rect) => r.y + r.height;
const overlap = (a: Rect, b: Rect) => {
  const width = Math.min(right(a), right(b)) - Math.max(a.x, b.x), height = Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y);
  return width > TOLERANCE && height > TOLERANCE ? { width, height } : undefined;
};
const outside = (inner: Rect, outer: Rect) => inner.x < outer.x - TOLERANCE || inner.y < outer.y - TOLERANCE ||
  right(inner) > right(outer) + TOLERANCE || bottom(inner) > bottom(outer) + TOLERANCE;
const intersect = (a: Rect | undefined, b: Rect): Rect => {
  if (!a) return b;
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  return { x, y, width: Math.max(0, Math.min(right(a), right(b)) - x), height: Math.max(0, Math.min(bottom(a), bottom(b)) - y) };
};
/** A line box holds the ascent and descent. The inked height is about 70% of it, which keeps neighbour lines apart. */
const inked = (r: Rect): Rect => ({ x: r.x, y: r.y + r.height * .15, width: r.width, height: r.height * .7 });

export function findTextProblems(boxes: readonly RenderedTextBox[], options: TextAuditOptions): TextProblem[] {
  const { frame, safeInset, minFontFraction = .023, minOpacity = .5 } = options;
  // Text wholly outside its clip cannot be seen, such as the waiting digits of a rolling counter.
  const visible = boxes.filter(box => box.opacity >= minOpacity && (!box.clippedBy || overlap(inked(box.rect), box.clippedBy))), problems: TextProblem[] = [];
  const area: Rect = { x: 0, y: 0, ...frame };
  const safe = safeInset && { x: frame.width * safeInset.left, y: frame.height * safeInset.top,
    width: frame.width * (1 - safeInset.left - safeInset.right), height: frame.height * (1 - safeInset.top - safeInset.bottom) };
  const smallest = Math.min(frame.width, frame.height) * minFontFraction;
  // A block reports each kind of problem once, however many of its lines or word spans have it.
  const seen = new Set<string>();
  const add = (problem: TextProblem, key: string) => { if (!seen.has(key)) { seen.add(key); problems.push(problem); } };
  visible.forEach((box, index) => {
    const body = inked(box.rect), base = { text: box.text, rect: box.rect };
    const once = (severity: TextProblem["severity"], code: TextProblem["code"]) => add({ severity, code, ...base }, code + box.owner);
    if (outside(body, area)) once("error", "text-outside-frame");
    else if (safe && outside(body, safe)) once("warning", "text-outside-safe-area");
    if (box.clippedBy && outside(body, box.clippedBy)) once("error", "text-clipped");
    if (box.fontPx < smallest) once("warning", "text-too-small");
    for (const other of visible.slice(index + 1)) {
      if (other.owner !== box.owner && overlap(body, inked(other.rect)))
        add({ severity: "error", code: "text-collision", ...base, other: other.text }, `collision${box.owner}-${other.owner}`);
    }
  });
  return problems;
}

/** The block's text nodes joined with spaces, since adjacent spans in a block can have none between them. */
function blockText(block: Element): string {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT), parts: string[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) parts.push(node.textContent ?? "");
  return parts.map(part => part.trim()).filter(Boolean).join(" ");
}

/** Each visible line of text under `root`, in output pixels. `scale` converts page px to output px. */
export function collectRenderedText(root: Element, scale = 1): RenderedTextBox[] {
  const origin = root.getBoundingClientRect(), boxes: RenderedTextBox[] = [], owners = new Map<Element, number>();
  const toOutput = (rect: DOMRect | Rect): Rect => ({ x: (rect.x - origin.x) * scale, y: (rect.y - origin.y) * scale, width: rect.width * scale, height: rect.height * scale });
  // A canvas resolves any CSS colour syntax to RGB.
  const paint = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgb = (css: string): readonly [number, number, number] | undefined => {
    if (!paint) return undefined;
    paint.clearRect(0, 0, 1, 1); paint.fillStyle = css; paint.fillRect(0, 0, 1, 1);
    const [r, g, b] = paint.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim(), parent = node.parentElement;
    if (!text || !parent) continue;
    // Glyphs drawn into an illustration, such as a mark on a banknote, are artwork and not copy.
    if (parent.closest('[data-km-illustration-region="art"]')) continue;
    const tracks = Boolean(parent.closest("[data-km-text-tracks]"));
    let opacity = 1, clip: Rect | undefined, hidden = false;
    for (let item: Element | null = parent; item && item !== root; item = item.parentElement) {
      const style = getComputedStyle(item);
      opacity *= Number(style.opacity);
      if (style.visibility === "hidden" || style.display === "none") hidden = true;
      if (/hidden|clip/.test(style.overflow)) clip = intersect(clip, toOutput(item.getBoundingClientRect()));
    }
    if (hidden || opacity === 0) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
    // The nearest block owns its lines and word spans, so its parts never count as a collision.
    let block: Element = parent;
    while (block !== root && block.parentElement && /^inline/.test(getComputedStyle(block).display)) block = block.parentElement;
    if (!owners.has(block)) owners.set(block, owners.size);
    for (const rect of rects) {
      const output = toOutput(rect);
      boxes.push({ text: blockText(block).slice(0, 120), rect: output, fontPx: output.height * .83, owner: owners.get(block)!, opacity, clippedBy: clip, color: rgb(getComputedStyle(parent).color), ...tracks ? { tracks } : {} });
    }
  }
  return boxes;
}

/** Text that is still moving while it is meant to be read: the same line, fully visible in two frames a few apart, displaced relative to
 * the rest of the text. Motion shared by all text (a camera push, drift or shake) is removed first, so only text sliding against the
 * frame counts. Labels that follow a moving subject (`tracks`) are left out. */
export function findMovingText(before: readonly RenderedTextBox[], after: readonly RenderedTextBox[]): TextProblem[] {
  const centre = (r: Rect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  const pairs = before.filter(a => !a.tracks && a.opacity >= .95).flatMap(a => {
    const b = after.find(item => item.text === a.text && !item.tracks && item.opacity >= .95 && Math.abs(item.fontPx - a.fontPx) < a.fontPx * .2);
    if (!b) return [];
    const p = centre(a.rect), q = centre(b.rect);
    return [{ a, dx: q.x - p.x, dy: q.y - p.y }];
  });
  if (!pairs.length) return [];
  const median = (values: number[]) => { const v = [...values].sort((x, y) => x - y); return v[Math.floor(v.length / 2)]; };
  const shared = pairs.length >= 3 ? { x: median(pairs.map(p => p.dx)), y: median(pairs.map(p => p.dy)) } : { x: 0, y: 0 };
  const seen = new Set<string>();
  return pairs.flatMap(({ a, dx, dy }) => {
    const moved = Math.hypot(dx - shared.x, dy - shared.y);
    if (moved <= Math.max(3, a.fontPx * .06) || seen.has(a.text)) return [];
    seen.add(a.text);
    return [{ severity: "warning" as const, code: "text-moving-while-read" as const, text: a.text, rect: a.rect }];
  });
}
