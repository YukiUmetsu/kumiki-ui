/**
 * COLLAGE1 textures: tileable board, paper-fibre and film-grain images generated from a seed.
 *
 * Generated once per (material, colour, seed) and cached; the renderer places them as SVG patterns in the
 * coordinate space of the paper they belong to, so fibres travel with a moving cutout instead of crawling
 * across it. A small built-in PNG writer: no canvas, no network and identical bytes on every run.
 */
import { hash01, hashSigned } from "./collage-geometry";
import type { CollageBoardMaterial } from "./collage-scene";

const cache = new Map<string, string>();

// ---- Minimal lossless PNG writer (stored deflate), so textures need no canvas or extra dependency ----
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const u32 = (v: number) => new Uint8Array([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]);
function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const body = concat([new Uint8Array([...type].map(c => c.charCodeAt(0))), data]);
  let c = 0xffffffff;
  for (const byte of body) c = CRC[(c ^ byte) & 255] ^ (c >>> 8);
  return concat([u32(data.length), body, u32((c ^ 0xffffffff) >>> 0)]);
}
/** RGBA pixels → PNG bytes. */
export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  if (rgba.length !== width * height * 4) throw new RangeError("COLLAGE1 texture has the wrong pixel count");
  const stride = width * 4, raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  const blocks: Uint8Array[] = [new Uint8Array([0x78, 0x01])];
  for (let at = 0; at < raw.length; at += 65535) {
    const size = Math.min(65535, raw.length - at), last = at + size >= raw.length;
    blocks.push(new Uint8Array([last ? 1 : 0, size & 255, size >>> 8, ~size & 255, (~size >>> 8) & 255]), raw.subarray(at, at + size));
  }
  let a = 1, b2 = 0;
  for (const byte of raw) { a = (a + byte) % 65521; b2 = (b2 + a) % 65521; }
  blocks.push(u32(((b2 << 16) | a) >>> 0));
  return concat([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", concat([u32(width), u32(height), new Uint8Array([8, 6, 0, 0, 0])])),
    chunk("IDAT", concat(blocks)), chunk("IEND", new Uint8Array())]);
}
function toDataUri(width: number, height: number, rgba: Uint8Array): string {
  const png = encodePng(width, height, rgba);
  let binary = "";
  for (let i = 0; i < png.length; i += 24576) binary += String.fromCharCode(...png.subarray(i, i + 24576));
  return "data:image/png;base64," + btoa(binary);
}

/** Periodic value noise on a `period`-cell lattice, so a tile repeats without a seam. */
function tileNoise(seed: number, x: number, y: number, period: number, periodY = period): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const w = (n: number) => ((n % period) + period) % period, h = (n: number) => ((n % periodY) + periodY) % periodY;
  const a = hashSigned(seed, w(xi), h(yi)), b = hashSigned(seed, w(xi + 1), h(yi));
  const c = hashSigned(seed, w(xi), h(yi + 1)), d = hashSigned(seed, w(xi + 1), h(yi + 1));
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function tileFbm(seed: number, x: number, y: number, size: number, cells: number, octaves: number): number {
  let sum = 0, amp = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const period = cells << o, scale = period / size;
    sum += tileNoise(seed + o * 101, x * scale, y * scale, period) * amp;
    norm += amp; amp *= .5;
  }
  return sum / norm;
}
const hexRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const BOARD_COLORS: Readonly<Record<CollageBoardMaterial, string>> = {
  kraft: "#b48b5e", cream: "#eee5d1", newsprint: "#e6e1d4", cork: "#b98a57", card: "#c4beb2", graph: "#efeadb", blackboard: "#2a2f30",
};

/**
 * Opaque board tile. Kraft gets long fibres and dark flecks, cork round granules and pits, newsprint a
 * fine grey tooth, card a speckled pulp, blackboard chalk haze.
 */
export function boardTexture(material: CollageBoardMaterial, color: string, seed: number, size = 384): string {
  const key = ["board", material, color, seed, size].join(":");
  const hit = cache.get(key);
  if (hit) return hit;
  const [r0, g0, b0] = hexRgb(color);
  const rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let m = 1, warm = 0;
    const mottle = tileFbm(seed, x, y, size, 3, 3);
    const tooth = tileFbm(seed + 9, x, y, size, 48, 2);
    switch (material) {
      case "kraft": {
        // Fibres: noise stretched along a slightly diagonal grain.
        const fibre = tileFbm(seed + 3, x, (y + x * .08) % size, size, 6, 1) * .5 + tileFbm(seed + 5, x, y, size, 4, 1) * .2;
        const streak = tileNoise(seed + 7, x / size * 12, y / size * 96, 12, 96);
        m = 1 + mottle * .07 + tooth * .05 + fibre * .06 + streak * .035;
        const fleck = hash01(seed, x, y);
        if (fleck > .9975) m *= .62; else if (fleck < .0018) { m *= 1.18; warm = 10; }
        break;
      }
      case "cork": {
        const gran = tileFbm(seed + 3, x, y, size, 64, 2);
        const pit = tileFbm(seed + 13, x, y, size, 24, 2);
        m = 1 + gran * .2 + mottle * .08 - (pit < -.42 ? .32 : 0);
        warm = gran * 12;
        break;
      }
      case "newsprint": m = 1 + mottle * .035 + tooth * .05 + (hash01(seed, x, y) > .9985 ? -.25 : 0); break;
      case "card": m = 1 + mottle * .06 + tooth * .07 + (hash01(seed, x, y) > .996 ? -.22 : hash01(seed + 1, x, y) > .997 ? .14 : 0); break;
      case "blackboard": m = 1 + mottle * .22 + tooth * .1 + (hash01(seed, x, y) > .997 ? .5 : 0); break;
      default: {
        const fibre = tileFbm(seed + 3, x, (y * 2 + x) % size, size, 24, 2);
        m = 1 + mottle * .018 + tooth * .03 + fibre * .022 + (hash01(seed, x, y) > .9988 ? -.16 : 0);
        break;
      }
    }
    const i = (y * size + x) * 4;
    rgba[i] = Math.max(0, Math.min(255, r0 * m + warm));
    rgba[i + 1] = Math.max(0, Math.min(255, g0 * m + warm * .55));
    rgba[i + 2] = Math.max(0, Math.min(255, b0 * m));
    rgba[i + 3] = 255;
  }
  const uri = toDataUri(size, size, rgba);
  cache.set(key, uri);
  return uri;
}

/**
 * Neutral-grey fibre overlay for cutouts, for `soft-light` blending: mid-grey is invisible, darker fibres
 * and pulp specks shade the paper, lighter fibres lift it.
 */
export function fiberTexture(seed: number, size = 256): string {
  const key = "fiber:" + seed + ":" + size;
  const hit = cache.get(key);
  if (hit) return hit;
  const rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const mottle = tileFbm(seed, x, y, size, 4, 3);
    const fibre = tileFbm(seed + 21, x, (y * 3 + x) % size, size, 16, 2);
    const tooth = tileFbm(seed + 33, x, y, size, 64, 1);
    let v = 128 + mottle * 26 + fibre * 22 + tooth * 18;
    const speck = hash01(seed + 5, x, y);
    if (speck > .9978) v -= 70; else if (speck < .0016) v += 45;
    const i = (y * size + x) * 4;
    const c = Math.max(0, Math.min(255, v));
    rgba[i] = c; rgba[i + 1] = c; rgba[i + 2] = c; rgba[i + 3] = 255;
  }
  const uri = toDataUri(size, size, rgba);
  cache.set(key, uri);
  return uri;
}

/** Fine luminance grain for the finished frame; the renderer shifts it once per held pose. */
export function grainTexture(seed: number, size = 192): string {
  const key = "grain:" + seed + ":" + size;
  const hit = cache.get(key);
  if (hit) return hit;
  const rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = (hash01(seed, x, y) + hash01(seed + 1, x, y) + hash01(seed + 2, x, y)) / 3;
    const c = Math.round(128 + (n - .5) * 190);
    const i = (y * size + x) * 4;
    rgba[i] = c; rgba[i + 1] = c; rgba[i + 2] = c; rgba[i + 3] = 255;
  }
  const uri = toDataUri(size, size, rgba);
  cache.set(key, uri);
  return uri;
}

/** Radial dot tile for the halftone print filter: 0 at the centre rising to 1 at the cell corners. */
export function halftoneDotTile(cell: number): string {
  const key = "dot:" + cell;
  const hit = cache.get(key);
  if (hit) return hit;
  const size = Math.max(4, Math.round(cell * 4)), rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x + .5) / size - .5, dy = (y + .5) / size - .5;
    const d = Math.min(1, Math.hypot(dx, dy) / Math.SQRT1_2);
    const c = Math.round(d * 255), i = (y * size + x) * 4;
    rgba[i] = c; rgba[i + 1] = c; rgba[i + 2] = c; rgba[i + 3] = 255;
  }
  const uri = toDataUri(size, size, rgba);
  cache.set(key, uri);
  return uri;
}
