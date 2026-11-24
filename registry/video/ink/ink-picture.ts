/**
 * INK-FILM1 picture: any picture as ink on paper — a photograph, a drawing, a frame of another film.
 *
 * A picture is not filtered, it is painted again from what can be measured in it: flat areas become water in a few steps of tone 墨分五色,
 * lights become paper, the way the form runs (the structure tensor) turns the bristles, and edges become pressed lines that follow it. What
 * lies at the rim of the frame goes out into the paper.
 */
import { inkFbm2, inkNoise2 } from "../ink-riso-press";
import type { InkRisoPen } from "../ink-riso-pen";
import type { InkSubject } from "./ink-cel";
import { inkPlates } from "./ink-pigments";
import type { InkPigment } from "./ink-pigments";

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a || 1e-9)); return t * t * (3 - 2 * t); };
/** Pixels, 8 bit RGBA, as `getImageData` gives them. */
export interface InkImage { width: number; height: number; data: Uint8ClampedArray | Uint8Array }
export interface InkPictureOptions {
  seed?: number;
  /** Page width; the height follows the picture. */ width?: number;
  label?: string;
  /** Depth of the water, strength of the lines, how much the bristles show, 0–1.5. */ water?: number; lines?: number; bristle?: number;
  /** Width of a line and of the smallest form kept, page units. */ lineWidth?: number; detail?: number;
  /** Steps of tone, 3–7. */ steps?: number;
  /** Luminance that is paper, and that is black, 0–1. Left out, read from the picture. */ paper?: number; black?: number;
  /** How far the rim goes out into the paper, 0–0.5 of the shorter side. */ vignette?: number;
  /** Colours kept as pigment: a hue in degrees, how far round it, and the pigment. */ accents?: readonly { hue: number; spread: number; pigment: InkPigment; amount?: number }[];
  /** A pigment laid thin through the mid tones. */ tint?: InkPigment; tintAmount?: number;
  /** Where the picture hides what is behind it: the whole frame, only its ink, or the darks of this luminance and under. */ cover?: "frame" | "ink";
}
interface Field { w: number; h: number; v: Float32Array }
const field = (w: number, h: number): Field => ({ w, h, v: new Float32Array(w * h) });
/** Gaussian blur, separable. */
function blur(f: Field, sigma: number): Field {
  if (sigma < 0.3) return f;
  const r = Math.ceil(sigma * 2.6), k = Array.from({ length: r + 1 }, (_, i) => Math.exp(-(i * i) / (2 * sigma * sigma))), sum = k[0] + 2 * k.slice(1).reduce((a, b) => a + b, 0), t = field(f.w, f.h), o = field(f.w, f.h), { w, h } = f;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = f.v[y * w + x] * k[0]; for (let i = 1; i <= r; i++) s += k[i] * (f.v[y * w + Math.max(0, x - i)] + f.v[y * w + Math.min(w - 1, x + i)]); t.v[y * w + x] = s / sum; }
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) { let s = t.v[y * w + x] * k[0]; for (let i = 1; i <= r; i++) s += k[i] * (t.v[Math.max(0, y - i) * w + x] + t.v[Math.min(h - 1, y + i) * w + x]); o.v[y * w + x] = s / sum; }
  return o;
}
/** The calmest of eight windows round a place, weighed by their calm. It flattens texture and keeps edges, as a wash does. */
function settle(f: Field, r: number): Field {
  const { w, h } = f, W = w + 1, A = new Float64Array(W * (h + 1)), B = new Float64Array(W * (h + 1)), o = field(w, h);
  for (let y = 0; y < h; y++) { let a = 0, b = 0; for (let x = 0; x < w; x++) { const v = f.v[y * w + x]; a += v; b += v * v; A[(y + 1) * W + x + 1] = A[y * W + x + 1] + a; B[(y + 1) * W + x + 1] = B[y * W + x + 1] + b; } }
  const box = (S: Float64Array, x0: number, y0: number, x1: number, y1: number) => S[y1 * W + x1] - S[y0 * W + x1] - S[y1 * W + x0] + S[y0 * W + x0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let val = 0, sum = 0;
    for (let c = 0; c < 8; c++) { const a = (c / 8) * 6.2832, cx = x + Math.cos(a) * r * 0.62, cy = y + Math.sin(a) * r * 0.62, e = r * 0.52, x0 = clamp(Math.round(cx - e), 0, w - 1), y0 = clamp(Math.round(cy - e), 0, h - 1), x1 = clamp(Math.round(cx + e) + 1, x0 + 1, w), y1 = clamp(Math.round(cy + e) + 1, y0 + 1, h), n = (x1 - x0) * (y1 - y0), m = box(A, x0, y0, x1, y1) / n, va = Math.max(0, box(B, x0, y0, x1, y1) / n - m * m), k = 1 / (4e-5 + va) ** 2.2; val += m * k; sum += k; }
    val /= sum;
    o.v[y * w + x] = val;
  }
  return o;
}
const sample = (f: Field, x: number, y: number) => { const u = clamp(x, 0, f.w - 1.001), v = clamp(y, 0, f.h - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, q = j * f.w + i; return (f.v[q] * (1 - a) + f.v[q + 1] * a) * (1 - b) + (f.v[q + f.w] * (1 - a) + f.v[q + f.w + 1] * a) * b; };
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
/** A picture painted in ink. */
export function inkPicture(image: InkImage, o: InkPictureOptions = {}): InkSubject {
  const W = o.width ?? 1600, H = Math.round((W * image.height) / image.width), seed = o.seed ?? 1, accents = o.accents ?? [], pigs: InkPigment[] = [...new Set<InkPigment>([...(o.tint ? [o.tint] : []), ...accents.map(a => a.pigment), "ink"])];
  return { id: `picture-${seed}`, label: o.label ?? "A picture painted in ink", page: { width: W, height: H }, plates: inkPlates(pigs), seed, parts: [{ id: "picture", draw: c => paint(c.page) }] };

  function paint(p: InkRisoPen) {
    const { sheet } = p, S = sheet.spec.scale, g = Math.min(1.1, Math.max(0.3, S)), gw = Math.round(W * g), gh = Math.round(H * g), Y0 = field(gw, gh), cols = accents.map(() => field(gw, gh));
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      // area sample of the picture
      const sx0 = (x / gw) * image.width, sx1 = ((x + 1) / gw) * image.width, sy0 = (y / gh) * image.height, sy1 = ((y + 1) / gh) * image.height; let R = 0, G = 0, B = 0, n = 0;
      const nx = Math.max(1, Math.min(4, Math.round(sx1 - sx0))), ny = Math.max(1, Math.min(4, Math.round(sy1 - sy0)));
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const q = (Math.min(image.height - 1, Math.floor(sy0 + ((j + 0.5) / ny) * (sy1 - sy0))) * image.width + Math.min(image.width - 1, Math.floor(sx0 + ((i + 0.5) / nx) * (sx1 - sx0)))) * 4, a = image.data[q + 3] / 255; R += image.data[q] * a + 255 * (1 - a); G += image.data[q + 1] * a + 255 * (1 - a); B += image.data[q + 2] * a + 255 * (1 - a); n++; }
      R /= n * 255; G /= n * 255; B /= n * 255;
      Y0.v[y * gw + x] = Math.cbrt(0.2126 * lin(R) + 0.7152 * lin(G) + 0.0722 * lin(B));
      if (accents.length) { const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn, hue = d < 1e-4 ? 0 : (60 * (mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4) + 360) % 360, sat = mx > 0 ? d / mx : 0; accents.forEach((a, k) => { const dh = Math.abs(((hue - a.hue + 540) % 360) - 180); cols[k].v[y * gw + x] = ss(a.spread, a.spread * 0.4, dh) * ss(0.22, 0.62, sat) * ss(0.12, 0.4, mx); }); }
    }
    // levels: what is paper and what is black
    const sorted = Float32Array.from({ length: 4000 }, (_, i) => Y0.v[Math.floor((i / 4000) * Y0.v.length)]).sort(), black = o.black ?? sorted[Math.floor(4000 * 0.02)], paper = o.paper ?? sorted[Math.floor(4000 * 0.9)];
    for (let i = 0; i < Y0.v.length; i++) Y0.v[i] = clamp((Y0.v[i] - black) / (paper - black || 1));
    const detail = (o.detail ?? 5) * g, flat = settle(settle(blur(Y0, detail * 0.3), Math.max(2, Math.round(detail))), Math.max(2, Math.round(detail * 0.7))), soft = blur(flat, 1.1 * g);
    // how the form runs
    const E = field(gw, gh), F = field(gw, gh), Gf = field(gw, gh), s1 = blur(Y0, 1.2 * g);
    for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) { const q = y * gw + x, gx = s1.v[q + 1] - s1.v[q - 1], gy = s1.v[q + gw] - s1.v[q - gw]; E.v[q] = gx * gx; F.v[q] = gx * gy; Gf.v[q] = gy * gy; }
    const eS = blur(E, 4 * g), fS = blur(F, 4 * g), gS = blur(Gf, 4 * g), tx = field(gw, gh), ty = field(gw, gh), an = field(gw, gh);
    for (let q = 0; q < gw * gh; q++) { const a = eS.v[q], b = fS.v[q], d = gS.v[q], l = (a + d) / 2 + Math.sqrt(((a - d) / 2) ** 2 + b * b), vx = b, vy = l - a, m = Math.hypot(vx, vy) || 1, l2 = a + d - l; tx.v[q] = -vy / m; ty.v[q] = vx / m; an.v[q] = l > 1e-7 ? (l - l2) / (l + l2) : 0; if (Math.hypot(b, l - a) < 1e-9) { tx.v[q] = 1; ty.v[q] = 0; } }
    // lines: a difference of blurs, run along the form so that a line is one stroke
    const lw = (o.lineWidth ?? 2.2) * g, b1 = blur(Y0, lw * 0.75), b2 = blur(Y0, lw * 1.25), dog = field(gw, gh); for (let q = 0; q < gw * gh; q++) dog.v[q] = b2.v[q] - b1.v[q];
    const walk = (f: Field, n: number, step: number) => { const r = field(gw, gh); for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { let s = sample(f, x, y), k = 1; for (const dir of [1, -1]) { let px = x, py = y, ox = 0, oy = 0; for (let i = 1; i <= n; i++) { const q = clamp(Math.round(py), 0, gh - 1) * gw + clamp(Math.round(px), 0, gw - 1); let vx = tx.v[q], vy = ty.v[q]; if (i === 1) { vx *= dir; vy *= dir; } else if (vx * ox + vy * oy < 0) { vx = -vx; vy = -vy; } px += vx * step; py += vy * step; ox = vx; oy = vy; const w = 1 - i / (n + 1); s += sample(f, px, py) * w; k += w; } } r.v[y * gw + x] = s / k; } return r; };
    const line = walk(dog, 6, 1.3), noise = field(gw, gh); for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) noise.v[y * gw + x] = inkNoise2(seed + 21, x / (1.3 * g), y / (1.3 * g)); const brush = walk(noise, 9, 1.4);
    const steps = o.steps ?? 5, water = o.water ?? 1, lines = o.lines ?? 1, bristle = o.bristle ?? 0.7, vig = (o.vignette ?? 0.14) * Math.min(W, H), ink = sheet.plates.ink, L = sheet.layer, plateOf = (id: string) => sheet.plates[id];
    for (let y = 0; y < sheet.h; y++) for (let x = 0; x < sheet.w; x++) {
      const [px, py] = p.local((x + 0.5) / S, (y + 0.5) / S); if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const wob = 3.4, gx = (px + (inkNoise2(seed + 1, px / 15, py / 15) - 0.5) * wob) * g, gy = (py + (inkNoise2(seed + 2, px / 15, py / 15) - 0.5) * wob) * g, q = clamp(Math.round(gy), 0, gh - 1) * gw + clamp(Math.round(gx), 0, gw - 1);
      // the rim is where the brush left the paper: combed along the stroke, across the page
      const rimN = inkFbm2(seed + 3, px / 210, py / 170, 4), comb = inkFbm2(seed + 8, px / 420, py / 13, 4), lr = Math.min(px, W - px) + vig * 0.5 - vig * (0.75 * rimN + 1.25 * comb), tb = Math.min(py, H - py) + vig * 0.2 - vig * (1.1 * rimN + 0.16 * comb), frame = vig > 0 ? ss(0, vig * 0.16, Math.min(lr, tb)) * (0.45 + 0.55 * ss(0, vig * 0.8, Math.min(lr, tb))) : 1; if (frame < 0.01) continue;
      const base = sample(soft, gx, gy), cloud = inkFbm2(seed + 4, px / 120, py / 120, 4), dark = clamp((1 - base) + (cloud - 0.5) * 0.12 * ss(0, 0.3, 1 - base)), k = dark * steps, n = Math.floor(k), f = k - n, stepped = (n + ss(0.36, 0.64, f)) / steps, w = 0.62 * stepped + 0.38 * dark;
      const tooth = 0.6 * inkNoise2(seed + 5, px / 2.2, py / 2.2) + 0.4 * inkNoise2(seed + 6, px / 5.4, py / 5.4), hair = (sample(brush, gx, gy) - 0.5) * 4.2 * bristle * (0.35 + 0.65 * an.v[q]), pool = 0.12 * ss(0.5, 0.2, Math.abs(f - 0.5) * 2) * ss(0.12, 0.3, w);
      let tone = Math.pow(w, 1.35) * 1.02 * water * (0.86 + 0.28 * cloud) + pool * water; tone = clamp(tone * (1 + hair * 0.5 * ss(1, 0.3, w)) + (w > 0.62 ? hair * 0.06 : 0)); tone *= ss(0.05, 0.12, w) * (0.9 + 0.2 * tooth);
      // dry brush at the edges of darks
      if (w > 0.3) tone *= 1 - 0.5 * bristle * ss(0.62, 0.8, sample(brush, gx, gy) * 0.5 + tooth * 0.55) * ss(0.9, 0.4, w);
      const e = sample(line, gx, gy), press = 0.7 + 0.6 * inkFbm2(seed + 7, px / 60, py / 60, 2), ln = ss(0.016, 0.06, e * press * (1.1 - 0.35 * tooth)) * lines * (0.62 + 0.5 * dark);
      const v = clamp(1 - (1 - tone) * (1 - clamp(ln))) * frame, z = y * sheet.w + x;
      ink.tone[z] = Math.max(ink.tone[z], Math.min(0.97, v));
      if (o.tint) { const t = plateOf(o.tint); t.tone[z] = Math.max(t.tone[z], clamp((o.tintAmount ?? 0.5) * ss(0.03, 0.3, dark) * ss(1.1, 0.5, dark) * frame * (0.5 + cloud))); }
      accents.forEach((a, i) => { const amt = sample(cols[i], gx, gy) * (a.amount ?? 1) * frame; if (amt < 0.02) return; const t = plateOf(a.pigment); t.tone[z] = Math.max(t.tone[z], clamp(amt * (0.55 + 0.4 * cloud + 0.3 * dark))); ink.tone[z] *= 1 - 0.75 * amt * (1 - ln) * ss(0.95, 0.6, dark); });
      if (L) { L.cover[z] = Math.max(L.cover[z], o.cover === "ink" ? ss(0.02, 0.2, v) : frame); L.when[z] = clamp(0.5 * (1 - dark) + 0.3 * (py / H) + 0.2 * rimN + (ln > 0.4 ? -0.1 : 0.05), 0.002, 0.998); }
    }
    if (L) L.marks.push(400);
  }
}
