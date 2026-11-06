/** Measure the pixels of one rendered frame. Pure arithmetic on RGBA data: no DOM, no model.
 * These catch what box geometry cannot: text that does not stand out from what is behind it, a frame that is
 * mostly empty, and an eye that lands in the wrong place. Each result is a warning, never an approval.
 */
import type { Rect } from "../motion/types";

export interface FrameImage { width: number; height: number; /** RGBA, row by row. */ data: ArrayLike<number> }
export type Rgb = readonly [number, number, number];
export interface FrameContent {
  /** Normalized box around everything that has an edge. */
  box: Rect;
  /** Share of the frame that the box covers, 0 to 1. */
  coverage: number;
  /** Normalized point with the most contrast after a strong blur: where a squinting eye lands. */
  focus: { x: number; y: number };
}
export interface FrameProblem { severity: "warning"; code: "text-low-contrast" | "frame-mostly-empty" | "focus-off-hero"; text: string; rect: Rect }

const linear = (channel: number) => { const c = channel / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
/** WCAG relative luminance, 0 to 1. */
export const luminance = (r: number, g: number, b: number) => .2126 * linear(r) + .7152 * linear(g) + .0722 * linear(b);
export const contrastRatio = (a: number, b: number) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);

/** Largest colour distance that still counts as the text, and the halo of soft edge pixels around it. The distance is
 * small on purpose: a background that is close to the text colour is the defect, so it must stay background. */
const TEXT_TOLERANCE = 16, HALO = 2;

/** Contrast between text and the part of its background that is hardest to read against, or undefined if the text
 * colour is not in the box (hidden or covered). It uses the pixels behind the text, so a scrim, an image or an
 * opacity is measured as drawn. */
export function textContrast(image: FrameImage, box: Rect, color: Rgb): number | undefined {
  const x0 = Math.max(0, Math.floor(box.x)), y0 = Math.max(0, Math.floor(box.y));
  const x1 = Math.min(image.width, Math.ceil(box.x + box.width)), y1 = Math.min(image.height, Math.ceil(box.y + box.height));
  const width = x1 - x0, height = y1 - y0, count = width * height;
  if (width < 4 || height < 4) return undefined;
  const at = (i: number) => { const p = ((y0 + Math.floor(i / width)) * image.width + x0 + i % width) * 4; return [image.data[p], image.data[p + 1], image.data[p + 2]] as const; };
  const distance = (p: Rgb, q: Rgb) => Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]));
  // The drawn text colour is the 3% of pixels nearest to the styled colour. Opacity and blending shift it.
  const histogram = new Array<number>(256).fill(0);
  for (let i = 0; i < count; i += 1) histogram[distance(at(i), color)] += 1;
  let near = 0, seen = 0;
  while (near < 255 && seen + histogram[near] < count * .03) { seen += histogram[near]; near += 1; }
  if (near > 110) return undefined;
  const sum = [0, 0, 0];
  let members = 0;
  for (let i = 0; i < count; i += 1) { const p = at(i); if (distance(p, color) <= near) { sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2]; members += 1; } }
  const drawn: Rgb = [sum[0] / members, sum[1] / members, sum[2] / members];
  const text = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) if (distance(at(i), drawn) <= TEXT_TOLERANCE) text[i] = 1;
  const excluded = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) if (text[i]) {
    const cx = i % width, cy = Math.floor(i / width);
    for (let dy = -HALO; dy <= HALO; dy += 1) for (let dx = -HALO; dx <= HALO; dx += 1) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && y >= 0 && x < width && y < height) excluded[y * width + x] = 1;
    }
  }
  const behind: number[] = [];
  for (let i = 0; i < count; i += 1) if (!excluded[i]) { const p = at(i); behind.push(luminance(p[0], p[1], p[2])); }
  // Almost nothing in the box differs from the text: the text cannot be seen.
  if (behind.length < count * .05) return 1;
  behind.sort((a, b) => a - b);
  const textLuminance = luminance(drawn[0], drawn[1], drawn[2]), median = behind[Math.floor(behind.length / 2)];
  // The hardest 15% of the background: its brightest part for light text, its darkest part for dark text.
  const hardest = behind[Math.floor(behind.length * (textLuminance > median ? .85 : .15))];
  return contrastRatio(textLuminance, hardest);
}

const EDGE = .045, GRID = 96, SQUINT = 24;
function grid(image: FrameImage, longSide: number): { cols: number; rows: number; cells: Float32Array } {
  const size = Math.max(image.width, image.height) / longSide, cols = Math.max(1, Math.round(image.width / size)), rows = Math.max(1, Math.round(image.height / size));
  const cells = new Float32Array(cols * rows), counts = new Uint32Array(cols * rows);
  // Every second pixel is enough for a mean.
  for (let y = 0; y < image.height; y += 2) for (let x = 0; x < image.width; x += 2) {
    const p = (y * image.width + x) * 4, cell = Math.min(rows - 1, Math.floor(y / size)) * cols + Math.min(cols - 1, Math.floor(x / size));
    cells[cell] += (.2126 * image.data[p] + .7152 * image.data[p + 1] + .0722 * image.data[p + 2]) / 255;
    counts[cell] += 1;
  }
  for (let i = 0; i < cells.length; i += 1) cells[i] /= counts[i] || 1;
  return { cols, rows, cells };
}

/** Where the content is, and where the eye lands. A smooth background gradient has no edge, so it is not content. */
export function frameContent(image: FrameImage): FrameContent {
  const { cols, rows, cells } = grid(image, GRID);
  const edge = (x: number, y: number) => Math.max(x + 1 < cols ? Math.abs(cells[y * cols + x] - cells[y * cols + x + 1]) : 0, y + 1 < rows ? Math.abs(cells[y * cols + x] - cells[(y + 1) * cols + x]) : 0) > EDGE;
  const perCol = new Uint16Array(cols), perRow = new Uint16Array(rows);
  for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) if (edge(x, y)) { perCol[x] += 1; perRow[y] += 1; }
  // One stray cell in a row or a column is noise.
  const first = (counts: Uint16Array) => counts.findIndex(n => n > 1), last = (counts: Uint16Array) => counts.length - 1 - [...counts].reverse().findIndex(n => n > 1);
  const left = first(perCol), top = first(perRow);
  const box = left < 0 || top < 0 ? { x: 0, y: 0, width: 0, height: 0 }
    : { x: left / cols, y: top / rows, width: (last(perCol) + 1 - left) / cols, height: (last(perRow) + 1 - top) / rows };
  const coarse = grid(image, SQUINT), mean = coarse.cells.reduce((total, value) => total + value, 0) / coarse.cells.length;
  // A cell and its neighbours, so a large shape outweighs a small bright dot.
  const pull = (index: number) => {
    const cx = index % coarse.cols, cy = Math.floor(index / coarse.cols);
    let total = 0;
    for (let y = Math.max(0, cy - 1); y <= Math.min(coarse.rows - 1, cy + 1); y += 1) for (let x = Math.max(0, cx - 1); x <= Math.min(coarse.cols - 1, cx + 1); x += 1) total += Math.abs(coarse.cells[y * coarse.cols + x] - mean);
    return total;
  };
  let peak = 0, strongest = -1;
  coarse.cells.forEach((_, index) => { const value = pull(index); if (value > strongest) { strongest = value; peak = index; } });
  return { box, coverage: box.width * box.height, focus: { x: (peak % coarse.cols + .5) / coarse.cols, y: (Math.floor(peak / coarse.cols) + .5) / coarse.rows } };
}

export interface FrameProblemOptions {
  /** Text lines with their styled colour, in image pixels. */
  texts?: readonly { text: string; rect: Rect; color: Rgb }[];
  /** Pixel box that the eye must land on. */
  hero?: { name: string; rect: Rect };
  /** @default 3, the WCAG level for large text */
  minContrast?: number;
  /** @default 0.3 */
  minCoverage?: number;
}
export function findFrameProblems(image: FrameImage, options: FrameProblemOptions = {}): { content: FrameContent; problems: FrameProblem[] } {
  const { texts = [], hero, minContrast = 3, minCoverage = .3 } = options, problems: FrameProblem[] = [], content = frameContent(image);
  const seen = new Set<string>();
  for (const item of texts) {
    const ratio = textContrast(image, item.rect, item.color);
    if (ratio === undefined || ratio >= minContrast || seen.has(item.text)) continue;
    seen.add(item.text);
    problems.push({ severity: "warning", code: "text-low-contrast", text: `${ratio.toFixed(1)}:1 ${item.text}`, rect: item.rect });
  }
  const pixels = (box: Rect): Rect => ({ x: box.x * image.width, y: box.y * image.height, width: box.width * image.width, height: box.height * image.height });
  if (content.coverage < minCoverage) problems.push({ severity: "warning", code: "frame-mostly-empty", text: `content covers ${Math.round(content.coverage * 100)}% of the frame`, rect: pixels(content.box) });
  if (hero) {
    const x = content.focus.x * image.width, y = content.focus.y * image.height, pad = Math.max(image.width, image.height) / SQUINT, r = hero.rect;
    if (x < r.x - pad || y < r.y - pad || x > r.x + r.width + pad || y > r.y + r.height + pad)
      problems.push({ severity: "warning", code: "focus-off-hero", text: `the eye lands at ${Math.round(content.focus.x * 100)}%, ${Math.round(content.focus.y * 100)}%, not on ${hero.name}`, rect: r });
  }
  return { content, problems };
}
