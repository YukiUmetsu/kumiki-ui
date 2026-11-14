/**
 * UKIYO1 textures: washi fibre skin, wood-grain (itame) and baren mottle tiles, generated from a seed as PNG data
 * URIs by a tiny built-in encoder (no canvas, no network, identical bytes on every run). Each is cached.
 */
import { clamp, hash01, hashSigned, hexRgb } from "./ukiyoe-core";

const cache = new Map<string, string>();

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
/** RGBA pixels → PNG bytes (stored deflate). */
export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  if (rgba.length !== width * height * 4) throw new RangeError("UKIYO1 texture has the wrong pixel count");
  const stride = width * 4, raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  const blocks: Uint8Array[] = [new Uint8Array([0x78, 0x01])];
  for (let at = 0; at < raw.length; at += 65535) {
    const size = Math.min(65535, raw.length - at), last = at + size >= raw.length;
    blocks.push(new Uint8Array([last ? 1 : 0, size & 255, size >>> 8, ~size & 255, (~size >>> 8) & 255]), raw.subarray(at, at + size));
  }
  let a = 1, b = 0;
  for (const byte of raw) { a = (a + byte) % 65521; b = (b + a) % 65521; }
  blocks.push(u32(((b << 16) | a) >>> 0));
  return concat([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", concat([u32(width), u32(height), new Uint8Array([8, 6, 0, 0, 0])])),
    chunk("IDAT", concat(blocks)), chunk("IEND", new Uint8Array())]);
}
function dataUri(width: number, height: number, rgba: Uint8Array): string {
  const png = encodePng(width, height, rgba);
  let binary = "";
  for (let i = 0; i < png.length; i += 24576) binary += String.fromCharCode(...png.subarray(i, i + 24576));
  return "data:image/png;base64," + btoa(binary);
}

/** Periodic value noise so a tile repeats without a seam. */
function tileNoise(seed: number, x: number, y: number, px: number, py: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const w = (n: number) => ((n % px) + px) % px, h = (n: number) => ((n % py) + py) % py;
  const a = hashSigned(seed, w(xi), h(yi)), b = hashSigned(seed, w(xi + 1), h(yi)), c = hashSigned(seed, w(xi), h(yi + 1)), d = hashSigned(seed, w(xi + 1), h(yi + 1));
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function tileFbm(seed: number, x: number, y: number, w: number, h: number, cx: number, cy: number, octaves: number): number {
  let sum = 0, amp = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const px = cx << o, py = cy << o;
    sum += tileNoise(seed + o * 101, x * px / w, y * py / h, px, py) * amp; norm += amp; amp *= .5;
  }
  return sum / norm;
}

/**
 * Washi skin, drawn over the finished print: long kozo fibres in light and dark, fine tooth and a few inclusions.
 * Normal blend: light fibres lift ink where they sit on top of it, as on real hand-made paper.
 */
export function washiTexture(tone: string, seed: number, fibre = .6): string {
  const key = `washi:${tone}:${seed}:${fibre}`;
  const hit = cache.get(key); if (hit) return hit;
  const W = 384, H = 384, px = new Uint8Array(W * H * 4), [r, g, b] = hexRgb(tone);
  const light = [Math.min(255, r + 26), Math.min(255, g + 24), Math.min(255, b + 20)], dark = [r * .62, g * .58, b * .5];
  const acc = new Float32Array(W * H), accD = new Float32Array(W * H);
  // Fibres: wandering curves, wrapped across the tile edges.
  const fibres = Math.round(170 * fibre);
  for (let i = 0; i < fibres; i++) {
    let x = hash01(seed, i, 1) * W, y = hash01(seed, i, 2) * H, a = hash01(seed, i, 3) * Math.PI * 2;
    const len = 20 + 90 * hash01(seed, i, 4) ** 2, isDark = hash01(seed, i, 5) < .3, strength = .2 + .4 * hash01(seed, i, 6);
    for (let s = 0; s < len; s++) {
      a += hashSigned(seed, i, s) * .07; x += Math.cos(a); y += Math.sin(a);
      const ix = ((Math.round(x) % W) + W) % W, iy = ((Math.round(y) % H) + H) % H;
      (isDark ? accD : acc)[iy * W + ix] += strength;
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, tooth = tileFbm(seed + 9, x, y, W, H, 48, 48, 2), cloud = tileFbm(seed + 19, x, y, W, H, 3, 3, 3);
    const l = clamp(acc[i] * .55 + Math.max(0, tooth) * .1 + Math.max(0, cloud) * .08, 0, 1), d = clamp(accD[i] * .4 + Math.max(0, -tooth) * .07 + Math.max(0, -cloud) * .05, 0, 1);
    const o = i * 4;
    if (l >= d) { px[o] = light[0]; px[o + 1] = light[1]; px[o + 2] = light[2]; px[o + 3] = Math.round(l * 72); }
    else { px[o] = dark[0]; px[o + 1] = dark[1]; px[o + 2] = dark[2]; px[o + 3] = Math.round(d * 64); }
  }
  // Inclusions: tiny bark flecks.
  for (let i = 0; i < 26; i++) {
    const cx = Math.floor(hash01(seed, i, 40) * W), cy = Math.floor(hash01(seed, i, 41) * H);
    for (let k = 0; k < 3; k++) { const o = (((cy + k) % H) * W + ((cx + k) % W)) * 4; px[o] = r * .45; px[o + 1] = g * .4; px[o + 2] = b * .35; px[o + 3] = 120; }
  }
  const uri = dataUri(W, H, px); cache.set(key, uri); return uri;
}

/** Itame: plank grain picked up by broad flat impressions — long horizontal streaks with drifting rings. */
export function grainTexture(tone: string, seed: number): string {
  const key = `grain:${tone}:${seed}`;
  const hit = cache.get(key); if (hit) return hit;
  const W = 512, H = 256, px = new Uint8Array(W * H * 4), [r, g, b] = hexRgb(tone);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const warp = tileFbm(seed, x, y, W, H, 2, 4, 3) * 9 + tileFbm(seed + 3, x, y, W, H, 6, 2, 2) * 2.5;
    const ring = Math.sin((y / H * 26 + warp) * Math.PI);
    const streak = tileFbm(seed + 7, x, y, W, H, 3, 64, 2);
    const v = clamp(Math.max(0, ring) ** 14 * .3 + Math.max(0, streak) ** 1.6 * .95, 0, 1);
    const o = (y * W + x) * 4;
    px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = Math.round(v * 200);
  }
  const uri = dataUri(W, H, px); cache.set(key, uri); return uri;
}

/** Baren mottle: blotchy pressure variation plus goma-zuri (sesame) speckle, in the paper colour. */
export function mottleTexture(tone: string, seed: number): string {
  const key = `mottle:${tone}:${seed}`;
  const hit = cache.get(key); if (hit) return hit;
  const W = 256, H = 256, px = new Uint8Array(W * H * 4), [r, g, b] = hexRgb(tone);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const blot = tileFbm(seed, x, y, W, H, 4, 4, 3), speck = hash01(seed, x, y), fine = tileFbm(seed + 5, x, y, W, H, 64, 64, 1);
    const v = clamp(Math.max(0, blot) * .55 + (speck > .965 ? .7 : 0) + Math.max(0, fine) * .25, 0, 1);
    const o = (y * W + x) * 4;
    px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = Math.round(v * 255);
  }
  const uri = dataUri(W, H, px); cache.set(key, uri); return uri;
}
