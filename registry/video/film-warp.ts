/**
 * Warp maps for SVG displacement filters (registry item `material-transitions`).
 *
 * A browser draws a warp with `feDisplacementMap`, which reads each displacement from one 8-bit channel: a pixel moves
 * by scale × (C/255 − ½). One pass is precise to scale / 255, which is fine for glass that bends the picture by a few
 * dozen pixels, but a shard that falls a frame height would jitter by several pixels. Large warps take two passes:
 *
 *   1. a fine pass with the small rest of the displacement, then
 *   2. a coarse pass whose displacement is exactly representable and constant over each piece.
 *
 * At a pixel x of piece p the two passes show S(x + Q_p + d(x + Q_p)), so the fine map is written where the coarse step
 * lands: d(y) = D(y − Q_p) − Q_p. Pieces whose landing areas overlap cannot share a map, so pieces are coloured and
 * each colour is a branch of the filter, masked to its pieces and merged. Each piece's coarse step reaches a few cells
 * past its edge, so neighbouring branches agree under the mask's soft edge and no seam shows between them.
 */
import type { MaterialWarp } from "./material-kit";

export interface WarpBranch {
  /** RGBA, `cols × rows`. R and G: the displacement (a constant per piece in a two-pass warp). B: where this branch draws. */
  coarse: Uint8ClampedArray;
  /** Pixels: displacement = scale × (C/255 − ½). */
  coarseScale: number;
  /** RGBA. R and G: the rest of the displacement, read where the coarse step lands. Absent in a one-pass warp. */
  fine?: Uint8ClampedArray;
  fineScale: number;
}
export interface EncodedWarp {
  cols: number;
  rows: number;
  branches: WarpBranch[];
  /** Blur after the warp, as Gaussian standard deviations in pixels along x and y. */
  blur?: readonly [number, number];
  /** Where the blur applies (alpha, `cols × rows`). */
  blurMask?: Uint8ClampedArray;
}

/** Up to this displacement (px), one pass is precise to 0.32 px. */
const ONE_PASS_PX = 40;
/** Pieces of a smooth region are tiles of this many cells. */
const TILE = 16;
/** How far (cells) each piece's coarse step and drawing reach past its edge. */
const REACH = 2;
const MAX_COLOURS = 8;

const enc = (v: number, scale: number) => Math.max(0, Math.min(255, Math.round(127.5 + (255 * v) / scale)));
const dec = (c: number, scale: number) => scale * (c / 255 - 0.5);

/**
 * Encode a warp for a `cols × rows` grid over a frame `width × height` pixels. Returns nothing when the warp moves
 * nothing, hides nothing and blurs nothing.
 */
export function encodeWarp(warp: MaterialWarp, cols: number, rows: number, width: number, height: number): EncodedWarp | undefined {
  const n = cols * rows;
  const Dx = new Float32Array(n), Dy = new Float32Array(n);
  let largest = 0;
  for (let k = 0; k < n; k++) {
    Dx[k] = warp.dx[k] * height;
    Dy[k] = warp.dy[k] * height;
    if (!warp.owner || warp.owner[k] >= 0) largest = Math.max(largest, Math.abs(Dx[k]), Math.abs(Dy[k]));
  }
  const hides = warp.owner?.some((o) => o < 0) || warp.cover?.some((c) => c < 255);
  const blur = warp.blur && (warp.blur[0] > 0.05 || warp.blur[1] > 0.05) ? ([(warp.blur[0] * height) / 1000, (warp.blur[1] * height) / 1000] as const) : undefined;
  if (largest < 0.05 && !hides && !blur) return undefined;
  const out = (branches: WarpBranch[]): EncodedWarp => ({ cols, rows, branches, blur, blurMask: blur ? warp.blurMask : undefined });

  if (!warp.owner && largest <= ONE_PASS_PX) {
    const scale = 2 * largest + 2, coarse = new Uint8ClampedArray(n * 4);
    for (let k = 0; k < n; k++) {
      coarse[4 * k] = enc(Dx[k], scale);
      coarse[4 * k + 1] = enc(Dy[k], scale);
      coarse[4 * k + 2] = warp.cover ? warp.cover[k] : 255;
      coarse[4 * k + 3] = 255;
    }
    return out([{ coarse, coarseScale: scale, fineScale: 0 }]);
  }

  // Pieces: each owner region cut into tiles, so a piece's displacement varies little across it.
  const cw = width / cols, ch = height / rows, tilesX = Math.ceil(cols / TILE), tilesY = Math.ceil(rows / TILE);
  const pieceOf = new Int32Array(n).fill(-1), regionOf: number[] = [], ids = new Map<number, number>();
  for (let k = 0; k < n; k++) {
    const region = warp.owner ? warp.owner[k] : 0;
    if (region < 0) continue;
    const i = k % cols, j = (k - i) / cols, key = (region * tilesY + Math.floor(j / TILE)) * tilesX + Math.floor(i / TILE);
    let id = ids.get(key);
    if (id === undefined) { id = regionOf.length; ids.set(key, id); regionOf.push(region); }
    pieceOf[k] = id;
  }
  const count = regionOf.length;
  // Each piece draws its own cells, and reaches into empty cells next to it so a clip path can cut a crisp edge there.
  const draws = Int32Array.from(pieceOf);
  for (let step = 0; step < REACH; step++) {
    const before = Int32Array.from(draws);
    for (let k = 0; k < n; k++) {
      if (before[k] >= 0 || pieceOf[k] >= 0) continue;
      const i = k % cols, j = (k - i) / cols;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const a = i + di, b = j + dj;
        if (a >= 0 && b >= 0 && a < cols && b < rows && before[a + b * cols] >= 0) { draws[k] = before[a + b * cols]; break; }
      }
    }
  }
  // The coarse step of each piece: its mean displacement, rounded to a value the 8-bit map holds exactly.
  const sum = new Float64Array(count * 3);
  for (let k = 0; k < n; k++) {
    const p = pieceOf[k];
    if (p < 0) continue;
    sum[3 * p] += Dx[k]; sum[3 * p + 1] += Dy[k]; sum[3 * p + 2] += 1;
  }
  // Each piece's coarse area: the cells it draws plus REACH more, so its step is constant under its mask's soft edge.
  const cellsOf: number[][] = Array.from({ length: count }, () => []);
  for (let k = 0; k < n; k++) if (draws[k] >= 0) cellsOf[draws[k]].push(k);
  // The step must land the piece's cells inside the map, where the fine pass can be read. Only cells that show the
  // scene from inside the frame count (the rest show nothing either way): a piece near the frame's edge whose mean
  // step would carry them off the map takes a smaller step and a larger rest.
  const box = new Int32Array(count * 4);
  for (let p = 0; p < count; p++) {
    let i0 = cols, i1 = -1, j0 = rows, j1 = -1;
    for (const k of cellsOf[p]) {
      if (pieceOf[k] !== p) continue;
      const i = k % cols, j = (k - i) / cols, sx = (i + 0.5) * cw + Dx[k], sy = (j + 0.5) * ch + Dy[k];
      if (sx < 0 || sy < 0 || sx > width || sy > height) continue;
      i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j);
    }
    box.set([Math.max(0, i0 - 1), Math.min(cols - 1, i1 + 1), Math.max(0, j0 - 1), Math.min(rows - 1, j1 + 1)], 4 * p);
  }
  const fit = (v: number, lo: number, hi: number) => (lo > hi ? v : Math.min(hi, Math.max(lo, v)));
  const mx = new Float64Array(count), my = new Float64Array(count);
  let reach = 0;
  for (let p = 0; p < count; p++) {
    mx[p] = fit(sum[3 * p] / sum[3 * p + 2], -box[4 * p] * cw, (cols - 1 - box[4 * p + 1]) * cw);
    my[p] = fit(sum[3 * p + 1] / sum[3 * p + 2], -box[4 * p + 2] * ch, (rows - 1 - box[4 * p + 3]) * ch);
    reach = Math.max(reach, Math.abs(mx[p]), Math.abs(my[p]));
  }
  const coarseScale = 2 * reach + 2;
  const qx = new Float64Array(count), qy = new Float64Array(count), cx = new Uint8Array(count), cy = new Uint8Array(count);
  for (let p = 0; p < count; p++) {
    cx[p] = enc(mx[p], coarseScale); qx[p] = dec(cx[p], coarseScale);
    cy[p] = enc(my[p], coarseScale); qy[p] = dec(cy[p], coarseScale);
  }
  const area = (p: number) => {
    const seen = new Set<number>(cellsOf[p]);
    let edge = cellsOf[p];
    for (let step = 0; step < REACH; step++) {
      const next: number[] = [];
      for (const k of edge) {
        const i = k % cols, j = (k - i) / cols;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
          const a = i + di, b = j + dj, m = a + b * cols;
          if (a >= 0 && b >= 0 && a < cols && b < rows && !seen.has(m)) { seen.add(m); next.push(m); }
        }
      }
      edge = next;
    }
    return [...seen];
  };
  // Where the coarse step lands: the area shifted by the step, with one more cell for the browser's bilinear sampling.
  const landing = (p: number, cells: number[]) => {
    const si = Math.round(qx[p] / cw), sj = Math.round(qy[p] / ch), seen = new Set<number>();
    for (const k of cells) {
      const i = (k % cols) + si, j = Math.floor(k / cols) + sj;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const a = i + di, b = j + dj;
        if (a >= 0 && b >= 0 && a < cols && b < rows) seen.add(a + b * cols);
      }
    }
    return [...seen];
  };
  const coarseClaim: Int32Array[] = [], fineClaim: Int32Array[] = [], colour = new Int32Array(count);
  const areas: number[][] = [], lands: number[][] = [];
  for (let p = 0; p < count; p++) {
    areas[p] = area(p);
    lands[p] = landing(p, areas[p]);
    let best = -1, fewest = Infinity;
    for (let c = 0; c < MAX_COLOURS; c++) {
      if (c === coarseClaim.length) { coarseClaim.push(new Int32Array(n).fill(-1)); fineClaim.push(new Int32Array(n).fill(-1)); }
      let clashes = 0;
      for (const k of areas[p]) if (coarseClaim[c][k] >= 0) clashes++;
      for (const k of lands[p]) if (fineClaim[c][k] >= 0) clashes++;
      if (clashes < fewest) { fewest = clashes; best = c; }
      if (clashes === 0) break;
    }
    colour[p] = best;
    for (const k of areas[p]) if (coarseClaim[best][k] < 0) coarseClaim[best][k] = p;
    for (const k of lands[p]) if (fineClaim[best][k] < 0) fineClaim[best][k] = p;
  }
  // The displacement at a point inside piece p's region (cells), bilinear over that region's cells only.
  const region = warp.owner;
  const sample = (p: number, fi: number, fj: number): [number, number] => {
    const i0 = Math.floor(fi - 0.5), j0 = Math.floor(fj - 0.5), u = fi - 0.5 - i0, v = fj - 0.5 - j0;
    let x = 0, y = 0, w = 0;
    for (const [di, dj, weight] of [[0, 0, (1 - u) * (1 - v)], [1, 0, u * (1 - v)], [0, 1, (1 - u) * v], [1, 1, u * v]] as const) {
      const a = Math.min(cols - 1, Math.max(0, i0 + di)), b = Math.min(rows - 1, Math.max(0, j0 + dj)), m = a + b * cols;
      if (region ? region[m] !== regionOf[p] : false) continue;
      x += weight * Dx[m]; y += weight * Dy[m]; w += weight;
    }
    if (w > 1e-6) return [x / w, y / w];
    // Outside the region (its reach into empty cells): the nearest cell of the piece.
    let near = cellsOf[p][0], gap = Infinity;
    for (const k of cellsOf[p]) {
      if (pieceOf[k] !== p) continue;
      const d = ((k % cols) + 0.5 - fi) ** 2 + (Math.floor(k / cols) + 0.5 - fj) ** 2;
      if (d < gap) { gap = d; near = k; }
    }
    return [Dx[near], Dy[near]];
  };
  const branches: WarpBranch[] = [];
  for (let c = 0; c < coarseClaim.length; c++) {
    const coarse = new Uint8ClampedArray(n * 4), fineX = new Float32Array(n), fineY = new Float32Array(n);
    let used = false, rest = 0;
    for (let k = 0; k < n; k++) {
      const p = coarseClaim[c][k];
      coarse[4 * k] = p >= 0 ? cx[p] : 128;
      coarse[4 * k + 1] = p >= 0 ? cy[p] : 128;
      const drawn = draws[k] >= 0 && colour[draws[k]] === c;
      coarse[4 * k + 2] = drawn ? (warp.cover ? warp.cover[k] : 255) : 0;
      coarse[4 * k + 3] = 255;
      if (drawn) used = true;
      const q = fineClaim[c][k];
      if (q >= 0) {
        // y is this cell's centre; the coarse step came from y − Q.
        const i = k % cols, j = (k - i) / cols;
        const [dx, dy] = sample(q, i + 0.5 - qx[q] / cw, j + 0.5 - qy[q] / ch);
        fineX[k] = dx - qx[q];
        fineY[k] = dy - qy[q];
        rest = Math.max(rest, Math.abs(fineX[k]), Math.abs(fineY[k]));
      }
    }
    if (!used) continue;
    const fineScale = 2 * rest + 2, fine = new Uint8ClampedArray(n * 4);
    for (let k = 0; k < n; k++) {
      fine[4 * k] = enc(fineX[k], fineScale);
      fine[4 * k + 1] = enc(fineY[k], fineScale);
      fine[4 * k + 3] = 255;
    }
    branches.push({ coarse, coarseScale, fine, fineScale });
  }
  return out(branches);
}
