/**
 * FOOD1 rendering: cooked food as photograph-like rasters, coloured by the cooking physics (`food-physics.ts`).
 *
 * - `steak`: the cut face of a seared steak on a board. Each depth takes the colour of the peak temperature it reached
 *   (red, pink, grey-brown), under a browned crust; muscle fibres, fat marbling and a wet sheen.
 * - `egg`: a boiled egg halved lengthwise on a plate. The white is set by its peak temperature (translucent to opaque),
 *   the yolk runny and glossy, jammy or set and crumbly; a grey-green ring after a long boil.
 * - `toast`: a slice of shokupan toasted to a browning index, darker at the crust and where the crumb stands up, with
 *   its pores.
 *
 * Soft studio light from the upper left; linear light, filmic tone mapping.
 */
import { createRaster, downsample, encodeSrgb, fbm, linearOf, worley } from "../anatomy/foundation-raster";
import type { RGB3 } from "../anatomy/foundation-raster";
import { cookEgg, cookSteak, crustColour, eggColours, meatColour, toastBrowning } from "./food-physics";
import type { EggCook, SteakCook } from "./food-physics";

export interface FoodRenderOptions extends SteakCook, EggCook {
  dish: "steak" | "egg" | "toast";
  /** Toasting time, s (default 180) and power (default 1). */
  toastSeconds?: number; toastPower?: number;
  width?: number; height?: number; supersample?: number; seed?: number;
}
export interface FoodRender { width: number; height: number; rgba: Uint8ClampedArray; ms: number; caption: string }

const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a: RGB3, b: RGB3, t: number): RGB3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function renderFood(o: FoodRenderOptions): FoodRender {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const W = o.width ?? 420, H = o.height ?? 300, SS = Math.max(1, Math.round(o.supersample ?? 2)), w = W * SS, h = H * SS, seed = o.seed ?? 3;
  const out = createRaster(w, h);
  const put = (i: number, c: RGB3) => { out.rgb[i * 3] = c[0]; out.rgb[i * 3 + 1] = c[1]; out.rgb[i * 3 + 2] = c[2]; out.alpha[i] = 1; };
  let caption = "";
  // mm per pixel: the dish fills about 80% of the width
  if (o.dish === "steak") {
    const res = cookSteak(o), T = (o.thickness ?? 25), Wmm = 115, s = (Wmm / 0.8) / w;
    caption = `Core ${res.core.toFixed(0)} °C after resting: ${res.doneness.replace("-", " ")}.`;
    const board = linearOf("#6b4a30"), boardDark = linearOf("#4a3220"), fat = linearOf("#efe3c8");
    const cx = w / 2, cy = h * 0.56, faceH = T / s, faceW = Wmm / s, topH = faceH * 0.45;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, X = (x - cx) * s, Y = (y - cy) * s;
      // the board: wood grain, a soft shadow under the steak
      let c: RGB3 = mix(board, boardDark, 0.5 + 0.5 * fbm(seed, x * s / 40, y * s / 3, 4));
      const sh = Math.exp(-(Math.max(0, Math.abs(X) - Wmm / 2 + 4) ** 2 + Math.max(0, Y - T / 2 + 2) ** 2) / 30) * ss(-faceH * s, faceH * s * 0.8, Y);
      c = [c[0] * (1 - 0.6 * sh), c[1] * (1 - 0.6 * sh), c[2] * (1 - 0.6 * sh)];
      // the outline wobbles a little (a cut, not a block)
      const wob = 1.6 * fbm(seed + 5, X / 14, 0.5, 3), edgeL = -faceW / 2 * s + wob, edgeR = faceW / 2 * s - wob * 0.7;
      const yTop = -faceH / 2 * s, yBot = faceH / 2 * s + 0.8 * fbm(seed + 6, X / 10, 0.2, 2);
      const inFace = X > edgeL && X < edgeR && Y > yTop && Y < yBot;
      // the top crust seen from a little above: a strip above the cut face
      const inTop = X > edgeL + 3 && X < edgeR - 3 && Y <= yTop && Y > yTop - topH * s * (1 - ((X / (Wmm / 2)) ** 4)) + 1.2 * fbm(seed + 7, X / 6, 0.1, 2);
      if (inFace) {
        const d = 1 - (Y - yTop) / (yBot - yTop), k = Math.min(res.peak.length - 1, Math.max(0, d * (res.peak.length - 1))), k0 = Math.floor(k), f = k - k0;
        const peak = res.peak[k0] * (1 - f) + res.peak[Math.min(res.peak.length - 1, k0 + 1)] * f;
        c = meatColour(peak);
        // crust: about a millimetre at each face, ragged
        const crustD = Math.min(Y - yTop, yBot - Y), crustIdx = Y - yTop < yBot - Y ? res.crust[1] : res.crust[0];
        c = mix(c, crustColour(0.25 + 0.75 * crustIdx, linearOf("#a0522d")), ss(1.6 + 0.6 * fbm(seed + 9, X / 3, Y, 2), 0.3, crustD));
        // muscle fibres run along the steak; fat marbling in thin flecks
        const fib = fbm(seed + 11, X / 9, Y / 0.35, 3), marb = fbm(seed + 13, X / 7 + 2 * fbm(seed + 17, X / 20, Y / 8, 2), Y / 2.2, 4);
        c = c.map(v => v * (0.92 + 0.12 * fib)) as unknown as RGB3;
        if (marb > 0.42) c = mix(c, peak > 60 ? linearOf("#e8d2a8") : fat, ss(0.42, 0.55, marb) * 0.9);
        // light: brighter toward the upper left, wet speckled sheen
        const lit = 0.88 + 0.18 * (1 - (X - edgeL) / (edgeR - edgeL)) * 0.6 + 0.1 * (1 - (Y - yTop) / (yBot - yTop));
        const spec = Math.pow(Math.max(0, fbm(seed + 19, X / 1.4, Y / 1.4, 2)), 6) * 1.8;
        c = [c[0] * lit + spec * 0.6, c[1] * lit + spec * 0.6, c[2] * lit + spec * 0.6];
      } else if (inTop) {
        // the seared top: a rough, uneven crust (darker where it touched the pan hardest), fat glistening on the peaks
        const bump = fbm(seed + 21, X / 1.6, Y / 0.9, 5), patch = fbm(seed + 23, X / 9, Y / 4, 3), b = Math.min(1, res.crust[1] * (0.75 + 0.35 * patch) + 0.15);
        c = crustColour(b + 0.18 * bump, linearOf("#a0522d"));
        const lit = 0.6 + 0.7 * (0.5 + 0.5 * bump) + 0.2 * ss(0, 1, -(Y - yTop) / (topH * s));
        const spec = Math.pow(Math.max(0, bump), 4) * 3.2;
        c = [c[0] * lit + spec * 0.5, c[1] * lit + spec * 0.45, c[2] * lit + spec * 0.4];
      }
      put(i, c);
    }
  } else if (o.dish === "egg") {
    const res = cookEgg(o), Wmm = o.eggWidth ?? 43, a = Wmm / 2, b = a * 1.3, s = (b * 2 / 0.78) / h;
    caption = `${o.minutes ?? 7} min in boiling water, then ice: ${res.label}${res.greenRing ? ", a grey-green ring" : ""}.`;
    const plate = linearOf("#2b2d31"), plateHi = linearOf("#3e4147");
    const cx = w / 2, cy = h / 2, yolkR = res.yolkRadius * a, yc = -b * 0.08;
    const peakAt = (rf: number) => { const k = Math.min(res.peak.length - 1, Math.max(0, rf * (res.peak.length - 1))), k0 = Math.floor(k); return res.peak[k0] + (res.peak[Math.min(res.peak.length - 1, k0 + 1)] - res.peak[k0]) * (k - k0); };
    const centreSet = eggColours(res.peak[0], true).set;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, X = (x - cx) * s, Y = (y - cy) * s;
      // a pointed oval: narrower toward the top (the pointed end)
      const bY = Y < 0 ? b * 1.06 : b * 0.94, e = (X / (a * (1 - 0.06 * (Y / b)))) ** 2 + (Y / bY) ** 2;
      let c: RGB3 = mix(plate, plateHi, 0.5 + 0.5 * Math.exp(-((X + 20) ** 2 + (Y + 25) ** 2) / 900));
      const sh = Math.exp(-Math.max(0, Math.sqrt(((X - 2) / a) ** 2 + ((Y - 3) / b) ** 2) - 1) * 12) * 0.6;
      c = c.map(v => v * (1 - sh)) as unknown as RGB3;
      if (e < 1) {
        const dyolk = Math.hypot(X, Y - yc) / yolkR;
        const rf = dyolk < 1 ? dyolk * res.yolkRadius : res.yolkRadius + (Math.sqrt(e) - 0) * 0 + (1 - res.yolkRadius) * Math.min(1, Math.max(0, (Math.sqrt(e) - res.yolkRadius * 0.8) / (1 - res.yolkRadius * 0.8)));
        const peak = peakAt(rf), inYolk = dyolk < 1 + 0.03 * fbm(seed, X / 2, Y / 2, 2);
        const ec = eggColours(peak, inYolk);
        c = ec.colour;
        if (inYolk) {
          // a set yolk is crumbly and matte; a runny one glossy, slightly domed, catching a highlight
          const wr = worley(seed + 3, X / 1.1, Y / 1.1);
          if (ec.set > 0.6) c = c.map(v => v * (0.9 + 0.12 * Math.min(1, wr.f1 * 1.6))) as unknown as RGB3;
          const runny = 1 - centreSet, dome = Math.sqrt(Math.max(0, 1 - dyolk * dyolk));
          c = c.map(v => v * (0.8 + 0.25 * dome)) as unknown as RGB3;
          if (runny > 0.3) { const hl = Math.exp(-((X + yolkR * 0.35) ** 2 + (Y - yc + yolkR * 0.35) ** 2) / (yolkR * yolkR * 0.03)); c = c.map(v => v + hl * 1.2 * runny) as unknown as RGB3; }
          if (res.greenRing && dyolk > 0.86) c = mix(c, linearOf("#7a7d55"), ss(0.86, 0.97, dyolk) * 0.85);
        } else {
          // the white: smooth, faintly translucent toward the edge (bluish), lit from the upper left
          const edge = ss(0.75, 1, Math.sqrt(e));
          c = mix(c, linearOf("#c9d0d6"), edge * 0.35 * (1 - ec.set * 0.5));
          const lit = 0.9 + 0.12 * (-X / a - Y / b) * 0.5;
          c = c.map(v => v * lit) as unknown as RGB3;
        }
      }
      put(i, c);
    }
  } else {
    const bIdx = toastBrowning(o.toastSeconds ?? 180, o.toastPower ?? 1), side = 120, s = (side / 0.78) / h;
    caption = `${o.toastSeconds ?? 180} s: browning ${(bIdx * 100).toFixed(0)}%.`;
    const plate = linearOf("#e9e6e0"), crumb = linearOf("#ecdcb8");
    const cx = w / 2, cy = h / 2 + 4 / s;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, X = (x - cx) * s, Y = (y - cy) * s;
      let c: RGB3 = plate;
      // a shokupan slice: square below, a domed top
      const half = side / 2, top = -half - Math.max(0, 1 - (X / half) ** 2) * 14 + 6 * (Math.abs(X) > half * 0.6 ? ((Math.abs(X) - half * 0.6) / (half * 0.4)) ** 2 : 0);
      const inside = Math.abs(X) < half && Y < half && Y > top;
      const shadow = Math.exp(-Math.max(0, Math.max(Math.abs(X - 3) - half, Y - 4 - half, top - Y + 4)) * 0.35);
      c = c.map(v => v * (1 - 0.35 * shadow)) as unknown as RGB3;
      if (inside) {
        const edgeD = Math.min(half - Math.abs(X), half - Y, Y - top), crust = ss(6, 3.5, edgeD);
        const bump = fbm(seed + 2, X / 2.5, Y / 2.5, 4), pore = worley(seed + 5, X / 0.9, Y / 0.9);
        // heat browns raised crumb and the edges first
        const b = Math.min(1, bIdx * (0.85 + 0.35 * bump) + 0.12 * ss(14, 2, edgeD) * bIdx * 2);
        c = mix(mix(crumb, crustColour(b, crumb), Math.min(1, bIdx * 2.2)), crustColour(Math.min(1, b + 0.35), crumb), crust);
        const pit = ss(0.3, 0.05, pore.f1) * (1 - crust);
        const lit = 0.92 + 0.14 * bump - 0.3 * pit;
        c = c.map(v => v * lit) as unknown as RGB3;
      }
      put(i, c);
    }
  }
  const fin = downsample(out, SS), rgba = encodeSrgb(fin, { toneMap: "filmic", exposure: 1.05, white: 3 });
  return { width: W, height: H, rgba, ms: (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0, caption };
}
