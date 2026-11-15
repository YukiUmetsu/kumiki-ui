/**
 * UKIYO1 scenery motifs for the countryside and the old stories: mountain ranges in the Kisokaidō manner, thatched
 * farmhouses (minka), and the stone figures of the roadside and the shrine (jizō, komainu). Same conventions as
 * `ukiyoe-motifs`: each motif stands on its base centre (0, 0) and grows upward (negative y), in its own local space.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp, clamp01, fbm1, hash01, hashSigned, lerp, noise1, polar, polyD, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { kasaDrop, kasaHat } from "./ukiyoe-village";
import { circleD, ellipseD, rectD } from "./ukiyoe-prims";
const lerp2 = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
import type { UkiyoePaint } from "./ukiyoe-pigments";

export interface SceneryContext { frame: number; wind: number; seed: number; progress: number }
type P = Readonly<Record<string, unknown>>;
const num = (p: P, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;
const str = (p: P, k: string, d: string): string => typeof p[k] === "string" ? p[k] as string : d;
const paint = (p: P, k: string, d: UkiyoePaint): UkiyoePaint => typeof p[k] === "string" ? p[k] as string : d;
const bool = (p: P, k: string, d: boolean) => typeof p[k] === "boolean" ? p[k] as boolean : d;

// ---- Mountain range ------------------------------------------------------------------------------------------------------------------------

/**
 * A mountain range as the Kisokaidō prints build one: ridges stacked in depth, each darker and more detailed than the
 * one behind it, their tops sharp against the sky and their feet lost in bands of mist. Steep faces carry axe-cut
 * strokes of bare rock; ridgelines carry rows of cedar and, on the near ridges, umbrella pines. `snow` lays white on
 * every upward-facing surface with the dark rock showing on the cliffs; `waterfall` drops a ribbon of white water
 * from a cleft in the second ridge.
 */
export function range(p: P, c: SceneryContext): Prim[] {
  const W = num(p, "width", 1600), H = num(p, "height", 560), layers = clamp(Math.round(num(p, "layers", 4)), 1, 6);
  const seed = c.seed + num(p, "variant", 0) * 31, snow = clamp01(num(p, "snow", 0)), trees = clamp01(num(p, "trees", .7)), mist = clamp01(num(p, "mist", .75));
  const far = paint(p, "far", "sora"), near = paint(p, "near", "ai"), green = paint(p, "green", "matsu"), rock = paint(p, "rock", "sumi"), mistC = paint(p, "mistColor", "paper");
  const out: Prim[] = [];
  const step = W / 260;
  let crestTrees: Prim[] = [];
  for (let l = 0; l < layers; l++) {
    const t = layers === 1 ? 1 : l / (layers - 1), s = seed + l * 101;
    // Far ridges stand higher on the page; near ones are lower but larger in detail.
    const base = -H * .34 * (1 - t), h = H * lerp(.66, .5, t);
    // Peaks are asymmetric (a steep face and a long slope), some with a shoulder; the near ridges are fewer, bigger masses.
    const peaks = Math.max(2, 4 + Math.floor(hash01(s, 1) * 3) - Math.round(t * 2));
    const P0: { x: number; h: number; wl: number; wr: number; kl: number; kr: number; sh: number }[] = [];
    for (let i = 0; i < peaks; i++) {
      const steepLeft = hash01(s, i, 6) < .5, wide = W / peaks;
      P0.push({ x: -W / 2 + wide * (i + .5) + hashSigned(s, i, 2) * wide * .35, h: h * (.4 + .6 * hash01(s, i, 3) ** .8),
        wl: wide * (steepLeft ? .35 + .25 * hash01(s, i, 4) : .7 + .5 * hash01(s, i, 4)), wr: wide * (steepLeft ? .7 + .5 * hash01(s, i, 5) : .35 + .25 * hash01(s, i, 5)),
        kl: steepLeft ? .8 + .3 * hash01(s, i, 7) : 1.4 + .5 * hash01(s, i, 7), kr: steepLeft ? 1.4 + .5 * hash01(s, i, 8) : .8 + .3 * hash01(s, i, 8), sh: hash01(s, i, 9) });
    }
    const ridge: Pt[] = [];
    for (let x = -W / 2 - step; x <= W / 2 + step; x += step) {
      let y = 0;
      for (const q of P0) {
        const left = x < q.x, u = Math.abs(x - q.x) / (left ? q.wl : q.wr), k = left ? q.kl : q.kr;
        let v = q.h * clamp01(1 - u) ** k;
        // A shoulder: a bench part way down the long slope.
        if (q.sh > .5 && u > .3 && u < .75 && left !== (q.kl < q.kr)) v = Math.max(v, q.h * (.42 + .1 * q.sh) * clamp01(1 - (u - .3) / .45) ** .4);
        y = Math.max(y, v);
      }
      // Jagged crests: fractal detail scaled by height, sharper on the near ridges.
      y += fbm1(s + 9, x / (70 - 35 * t), 4) * y * (.09 + .08 * t) + noise1(s + 11, x / 7) * y * .02 * t;
      ridge.push([x, base - Math.max(0, y)]);
    }
    const foot = base + H * .2;
    const shape: Pt[] = [...ridge, [W / 2 + step, foot], [-W / 2 - step, foot]];
    const d = polyD(shape);
    // Colour by depth: the far range pale blue, the near ones deep indigo-green; each darkest at the crest and paling
    // toward its foot (the bokashi that lets the mist in).
    const col = t < .5 ? far : near, top = l === layers - 1 ? green : col;
    out.push({ t: "fill", d, fill: { type: "linear", angle: 90, stops: [[0, top, lerp(.55, 1, t)], [.45, col, lerp(.45, .95, t)], [1, col, lerp(.1, .55, t)]] }, grain: .7 });
    const detail: Prim[] = [];
    // The face turned from the light (light from the left): a darker wash down each right-hand slope, from crest to foot.
    const shadeD: string[] = [];
    for (let i = 1; i < ridge.length - 1; i++) {
      if (!(ridge[i][1] < ridge[i - 1][1] && ridge[i][1] <= ridge[i + 1][1])) continue;   // a summit
      let j = i + 1;
      while (j < ridge.length - 1 && ridge[j + 1][1] >= ridge[j][1] - .5) j++;
      if (j - i < 4) continue;
      const face = ridge.slice(i, j + 1), inset = (base - ridge[i][1]) * .08;
      shadeD.push(polyD([...face, [face[face.length - 1][0], foot], [ridge[i][0] + inset, foot]]));
    }
    if (shadeD.length) detail.push({ t: "fill", d: shadeD.join(""), fill: { type: "linear", angle: 90, stops: [[0, rock, lerp(.15, .32, t)], [.5, rock, lerp(.06, .16, t)], [1, rock, 0]] } });
    // Axe-cut rock strokes down every steep face, longer where the slope is steeper; ledges as short level strokes.
    const cuts: string[] = [], ledges: string[] = [];
    for (let i = 2; i < ridge.length - 2; i += 2) {
      const a = ridge[i - 2], b = ridge[i + 2], slope = (b[1] - a[1]) / (b[0] - a[0]), q = ridge[i];
      if (Math.abs(slope) < .55 || hash01(s, i, 21) > .55 + .3 * t) continue;
      const len = (base - q[1]) * (.12 + .3 * hash01(s, i, 22)) * Math.min(2, Math.abs(slope)), lean = Math.sign(slope) * (8 + 12 * hash01(s, i, 23));
      const start: Pt = [q[0], q[1] + 3 + hash01(s, i, 24) * h * .06];
      cuts.push(carvedLine([start, polar(start, 90 + lean * .5, len * .5), polar(start, 90 + lean, len)], 1.4 + 1.8 * t, { taper: "end", minRatio: .1 }));
      if (hash01(s, i, 25) < .3) { const y = start[1] + len * (.3 + .4 * hash01(s, i, 26)); ledges.push(`M${(q[0] - 6 - 10 * t).toFixed(1)} ${y.toFixed(1)}l${(14 + 20 * t).toFixed(1)} ${(hashSigned(s, i, 27) * 2).toFixed(1)}`); }
    }
    if (cuts.length) detail.push({ t: "fill", d: cuts.join(""), fill: rock, opacity: lerp(.12, .55, t) });
    if (ledges.length) detail.push({ t: "stroke", d: ledges.join(""), color: rock, width: .8 + t, opacity: lerp(.15, .5, t) });
    // Snow: white on everything that faces up, thinning down the slopes in tongues, the cliffs left dark.
    if (snow > 0) {
      const cap: Pt[] = [];
      for (let i = 0; i < ridge.length; i++) {
        const q = ridge[i], a = ridge[Math.max(0, i - 1)], b = ridge[Math.min(ridge.length - 1, i + 1)], slope = Math.abs((b[1] - a[1]) / (b[0] - a[0]));
        const depth = (base - q[1]) * snow * (.35 + .5 * hash01(s, Math.floor(i / 3), 31)) * clamp01(1.3 - slope * .7);
        cap.push([q[0], q[1] + depth]);
      }
      detail.push({ t: "fill", d: polyD([...ridge, ...cap.slice().reverse()]), fill: "gofun", opacity: .95, grain: .4 });
      const ledgeSnow: string[] = [];
      for (let i = 0; i < 22 * snow * (1 + t); i++) {
        const q = ridge[Math.floor(hash01(s, i, 33) * ridge.length)], y = q[1] + (base - q[1]) * (.25 + .55 * hash01(s, i, 34)), w = 8 + 22 * t * hash01(s, i, 35);
        ledgeSnow.push(polyD(Array.from({ length: 7 }, (_, k): Pt => { const u = k / 6; return [q[0] - w + 2 * w * u, y - (3 + 3 * t) * Math.sin(Math.PI * u) * (.6 + .8 * hash01(s, i * 7 + k, 36)) + (k % 2) * 1.5]; }).concat([[q[0] + w * .6, y + 2], [q[0] - w * .6, y + 2.5]])));
      }
      detail.push({ t: "fill", d: ledgeSnow.join(""), fill: "gofun", opacity: .9 });
    }
    // Trees along the crest: rows of cedars (dark triangles), umbrella pines on the nearest ridge.
    if (trees > 0 && t > .2) {
      const tr: string[] = [], snowTr: string[] = [];
      const every = Math.max(1, Math.round((3 - 1.5 * t) / trees));
      for (let i = 3; i < ridge.length - 3; i += every) {
        if (hash01(s, i, 41) > .45 + .4 * trees) continue;
        const q = ridge[i], th = H * (.01 + .034 * t ** 1.5) * (.7 + .6 * hash01(s, i, 42)), tw = th * .34, y0 = q[1] + th * .15;
        if (l === layers - 1 && hash01(s, i, 43) < .22) {
          // An umbrella pine: a crooked trunk leaning off the crest, three ragged pads of needles stepping out from it.
          const lean = hashSigned(s, i, 44) * th * .35, top: Pt = [q[0] + lean, y0 - th * .95];
          tr.push(carvedLine([[q[0], y0], [q[0] + lean * .3, y0 - th * .5], top], Math.max(1, th * .08), { taper: "end", minRatio: .45, smooth: true }));
          for (let k = 0; k < 3; k++) {
            const at = lerp2([q[0] + lean * .3, y0 - th * .5], top, .4 + .3 * k), pw = th * (.55 - .1 * k), dir = k === 1 ? -1 : 1, px = at[0] + dir * pw * .4, py = at[1];
            const pad: Pt[] = Array.from({ length: 9 }, (_, m) => { const u = m / 8; return [px - pw + 2 * pw * u, py - th * .16 * Math.sin(Math.PI * u) ** .6 * (.75 + .5 * hash01(s, i * 9 + m, 46 + k))]; });
            tr.push(polyD([...pad, [px + pw * .7, py + th * .05], [px - pw * .7, py + th * .05]]));
            if (snow > 0) snowTr.push(polyD([...pad.slice(1, -1).map(q2 => [q2[0], q2[1] - 1] as Pt), [px + pw * .5, py - th * .04], [px - pw * .5, py - th * .04]]));
          }
        } else {
          tr.push(polyD([[q[0] - tw, y0], [q[0] - tw * .55, y0 - th * .45], [q[0] - tw * .75, y0 - th * .45], [q[0], y0 - th], [q[0] + tw * .75, y0 - th * .45], [q[0] + tw * .55, y0 - th * .45], [q[0] + tw, y0]]));
          if (snow > 0) snowTr.push(polyD([[q[0] - tw * .5, y0 - th * .5], [q[0], y0 - th], [q[0] + tw * .5, y0 - th * .5], [q[0], y0 - th * .62]]));
        }
      }
      // (Trees stand above the crest, so they are drawn outside the ridge's clip.)
      crestTrees = [];
      // Far ridges carry a faint fringe in their own tone; the nearest a dark one.
      if (tr.length) crestTrees.push({ t: "fill", d: tr.join(""), fill: t > .7 ? "sumi" : t > .4 ? green : "usuzumi", opacity: lerp(.28, .95, t) });
      if (snowTr.length) crestTrees.push({ t: "fill", d: snowTr.join(""), fill: "gofun", opacity: .95 });
    }
    // The waterfall, from a cleft in the second ridge from the front.
    if (bool(p, "waterfall", false) && l === layers - 1) {
      // The fall leaves a ledge on the front ridge's cliff, under its deepest cleft, and drops to the foot.
      const lo = Math.round(ridge.length * (.35 + num(p, "waterfallX", .15))), hi = Math.round(ridge.length * (.65 + num(p, "waterfallX", .15)));
      let ci = lo;
      for (let i = lo; i < Math.min(hi, ridge.length - 1); i++) if (ridge[i][1] > ridge[ci][1]) ci = i;
      const fx = ridge[ci][0], top0 = ridge[ci][1] + (foot - ridge[ci][1]) * .12, bot = foot - H * .04;
      const fw = W * .014, len = bot - top0;
      // A dark gorge cut into the cliff, the fall pouring from its lip and widening as it drops, ragged at the edges,
      // streaked with blue running down; spray where it lands.
      const gorge: Pt[] = [], fall: Pt[] = [];
      for (let k = 0; k <= 12; k++) { const u = k / 12, y = top0 + len * u - fw * .8; gorge.push([fx - fw * (1.5 + 1.2 * u) + noise1(s + 71, u * 9) * fw * .5, y]); }
      for (let k = 12; k >= 0; k--) { const u = k / 12, y = top0 + len * u - fw * .8; gorge.push([fx + fw * (1.5 + 1.2 * u) + noise1(s + 73, u * 9) * fw * .5, y]); }
      detail.push({ t: "fill", d: polyD(gorge), fill: { type: "linear", angle: 90, stops: [[0, "sumi", .55], [1, rock, .25]] } });
      for (let k = 0; k <= 16; k++) { const u = k / 16; fall.push([fx - fw * (.55 + .55 * u) + noise1(s + 75, u * 11 + c.frame / 9) * fw * .12, top0 + len * u]); }
      for (let k = 16; k >= 0; k--) { const u = k / 16; fall.push([fx + fw * (.55 + .55 * u) + noise1(s + 77, u * 11 + c.frame / 9) * fw * .12, top0 + len * u]); }
      detail.push({ t: "fill", d: smoothD(fall, true, .3), fill: "gofun", opacity: .97 });
      const streams: string[] = [];
      for (let i = 0; i < 6; i++) { const x0 = fx - fw * .45 + fw * .9 * i / 5, off = ((c.frame * 4 + i * 23) % 48) - 48; streams.push(`M${x0.toFixed(1)} ${(top0 + off + 8).toFixed(1)}L${(x0 + (i - 2.5) * fw * .12).toFixed(1)} ${bot.toFixed(1)}`); }
      detail.push({ t: "stroke", d: streams.join(""), color: "hanada", width: Math.max(1, fw * .14), opacity: .45, dash: "22 26" });
      const spray: string[] = [];
      for (let i = 0; i < 9; i++) spray.push(ellipseD(fx + hashSigned(s, i, 79) * fw * 3, bot - fw * .2 - hash01(s, i, 80) * fw * .9, fw * (.8 + hash01(s, i, 81)), fw * (.4 + .3 * hash01(s, i, 82))));
      detail.push({ t: "fill", d: spray.join(""), fill: "gofun", opacity: .75 });
    }
    out.push({ t: "clip", d, key: "range" + l, prims: detail }, ...crestTrees);
    crestTrees = [];
    // A fine key line on the crest of the near ridges.
    if (t > .4) out.push({ t: "stroke", d: polyD(ridge).replace(/Z$/, ""), color: "sumi", width: .6 + .6 * t, opacity: lerp(.2, .7, t) });
    // Mist at this range's foot, lying over it and under the next.
    if (mist > 0 && l < layers - 1 || mist > 0 && layers === 1) {
      const my = foot - H * .1, mh = H * (.16 + .08 * (1 - t));
      out.push({ t: "fill", d: rectD(-W / 2 - step, my - mh, W + step * 2, mh * 1.6), fill: { type: "linear", angle: 90, stops: [[0, mistC, 0], [.45, mistC, .85 * mist], [1, mistC, mist]] } });
    }
  }
  return out;
}

// ---- Farmhouse (minka) ---------------------------------------------------------------------------------------------------------------------

/**
 * A thatched country farmhouse. `style` "irimoya" is the low hip-and-gable kayabuki house of the plains: a deep thatch
 * with its cut edge showing at the eaves, a small gable with a smoke lattice, a ridge capped with bark and crossed
 * timbers. "gassho" is the steep praying-hands house of the snow country, its gable end stacked with storeys of small
 * windows. Walls are dark timber posts on foundation stones, white plaster panels, shoji and an earthen-floored
 * entrance. `snow` (0..1) lays a thick cap on the thatch with a drip edge and icicles, `smoke` a curl from the vent,
 * `light` (0..1) a warm glow in the paper windows.
 */
export function minka(p: P, c: SceneryContext): Prim[] {
  const W = num(p, "width", 420), style = str(p, "style", "irimoya"), gassho = style === "gassho", seed = c.seed + num(p, "variant", 0) * 13;
  const snow = clamp01(num(p, "snow", 0)), light = clamp01(num(p, "light", 0)), smokeAmt = clamp01(num(p, "smoke", 0));
  const thatchC = paint(p, "thatch", "kincha"), wood = paint(p, "wood", "kogecha"), plaster = paint(p, "plaster", "gofun");
  const out: Prim[] = [];
  const wallH = W * (gassho ? .2 : .24), wallW = W * (gassho ? .72 : .86), roofH = W * (gassho ? .78 : .5), eave = W * .5, eaveY = -wallH - W * .02;
  // Foundation stones, then the walls.
  const stones: string[] = [];
  const posts = gassho ? 5 : 7;
  for (let i = 0; i <= posts; i++) { const x = -wallW / 2 + wallW * i / posts; stones.push(ellipseD(x, -W * .008, W * .022, W * .012)); }
  out.push({ t: "fill", d: rectD(-wallW / 2 - W * .02, -W * .03, wallW + W * .04, W * .03), fill: "usuzumi", grain: .8, outline: 1 });
  out.push({ t: "fill", d: stones.join(""), fill: "usuzumi", outline: .8 });
  out.push({ t: "fill", d: rectD(-wallW / 2, -wallH - W * .02, wallW, wallH), fill: plaster, grain: .6, outline: 1.2 });
  // Bays: plaster panels above, shoji or boarding below, an earthen doorway in the second bay.
  const bays: Prim[] = [], gw = wallW / posts;
  for (let i = 0; i < posts; i++) {
    const x = -wallW / 2 + gw * i, top = -wallH - W * .02, kind = i === 1 ? "door" : hash01(seed, i, 2) < .55 ? "shoji" : "board";
    const lowY = top + wallH * .32;
    if (kind === "door") bays.push({ t: "fill", d: rectD(x + gw * .08, lowY, gw * .84, wallH * .68), fill: "sumi", opacity: .85 }, { t: "fill", d: rectD(x + gw * .08, lowY, gw * .84, wallH * .1), fill: wood });
    else if (kind === "shoji") {
      bays.push({ t: "fill", d: rectD(x + gw * .06, lowY, gw * .88, wallH * .62), fill: light > 0 ? "ki" : "gofun", opacity: light > 0 ? .55 + .45 * light * (.85 + .15 * Math.sin(c.frame / 7 + i)) : 1, noPrint: light > 0 });
      const grid: string[] = [];
      for (let g = 1; g < 4; g++) grid.push(`M${(x + gw * .06 + gw * .88 * g / 4).toFixed(1)} ${lowY.toFixed(1)}v${(wallH * .62).toFixed(1)}`);
      for (let g = 1; g < 5; g++) grid.push(`M${(x + gw * .06).toFixed(1)} ${(lowY + wallH * .62 * g / 5).toFixed(1)}h${(gw * .88).toFixed(1)}`);
      bays.push({ t: "stroke", d: grid.join(""), color: wood, width: .8 });
      if (light > 0) bays.push({ t: "glow", cx: x + gw / 2, cy: lowY + wallH * .3, r: gw * 1.1, color: "ki", opacity: .35 * light });
    } else {
      bays.push({ t: "fill", d: rectD(x + gw * .04, lowY, gw * .92, wallH * .68), fill: wood, opacity: .85, grain: .8 });
      bays.push({ t: "stroke", d: [1, 2, 3, 4, 5].map(g => `M${(x + gw * .04 + gw * .92 * g / 6).toFixed(1)} ${lowY.toFixed(1)}v${(wallH * .68).toFixed(1)}`).join(""), color: "sumi", width: .6, opacity: .5 });
    }
  }
  out.push(...bays);
  out.push({ t: "stroke", d: Array.from({ length: posts + 1 }, (_, i) => `M${(-wallW / 2 + gw * i).toFixed(1)} ${(-W * .02).toFixed(1)}v${(-wallH).toFixed(1)}`).join("") + `M${(-wallW / 2).toFixed(1)} ${(-wallH * .68 - W * .02).toFixed(1)}h${wallW.toFixed(1)}`, color: wood, width: Math.max(2, W * .012) });
  // Engawa: a veranda board along the front.
  out.push({ t: "fill", d: rectD(-wallW / 2 - W * .01, -W * .05, wallW + W * .02, W * .018), fill: wood, outline: .8 });
  // The roof.
  const ridgeY = eaveY - roofH, ridgeW = gassho ? W * .03 : W * .32;
  let roof: Pt[];
  if (gassho) roof = [[-eave * 1.02, eaveY + W * .02], [-ridgeW, ridgeY], [ridgeW, ridgeY], [eave * 1.02, eaveY + W * .02], [eave * .96, eaveY + W * .07], [-eave * .96, eaveY + W * .07]];
  else roof = [[-eave * 1.04, eaveY + W * .03], [-eave * .78, eaveY - roofH * .42], [-ridgeW, ridgeY], [ridgeW, ridgeY], [eave * .78, eaveY - roofH * .42], [eave * 1.04, eaveY + W * .03], [eave * .98, eaveY + W * .09], [-eave * .98, eaveY + W * .09]];
  const roofD = smoothD(roof, true, .12);
  out.push({ t: "fill", d: roofD, fill: { type: "linear", angle: 90, stops: [[0, "cha", 1], [.55, thatchC, 1], [1, thatchC, 1]] }, grain: 1, outline: 1.4 });
  const thatch: Prim[] = [];
  // Thatch: rows of straw strokes following the roof's fall, layered courses, moss streaks.
  const straws: string[] = [], courses: string[] = [];
  for (let i = 0; i < 900; i++) {
    const u = hash01(seed, i, 11), v = hash01(seed, i, 12), x = lerp(-eave, eave, u), topY = lerp(ridgeY, eaveY, Math.abs(x) < ridgeW ? 0 : (Math.abs(x) - ridgeW) / (eave - ridgeW) * (gassho ? 1 : .5));
    const y = lerp(topY, eaveY + W * .06, v), len = W * (.025 + .03 * hash01(seed, i, 13)), lean = x * .02;
    straws.push(`M${x.toFixed(1)} ${y.toFixed(1)}l${(lean * .3).toFixed(1)} ${len.toFixed(1)}`);
  }
  for (let r = 1; r < (gassho ? 7 : 5); r++) {
    const y = lerp(ridgeY, eaveY, r / (gassho ? 7 : 5));
    const pts: Pt[] = [];
    for (let k = 0; k <= 24; k++) pts.push([lerp(-eave, eave, k / 24), y + noise1(seed + r, k / 3) * W * .006]);
    courses.push(smoothD(pts, false, .4));
  }
  // Weathering: darker streaks running down the fall of the thatch where rain sheets off it.
  const streaks: string[] = [];
  for (let i = 0; i < 14; i++) { const x = lerp(-eave * .9, eave * .9, hash01(seed, i, 18)), w2 = W * (.012 + .025 * hash01(seed, i, 19)), y0 = lerp(ridgeY + roofH * .15, eaveY - roofH * .2, hash01(seed, i, 20)); streaks.push(polyD([[x - w2, y0], [x + w2, y0], [x + w2 * 1.4, eaveY + W * .04], [x - w2 * 1.2, eaveY + W * .04]])); }
  thatch.push({ t: "fill", d: streaks.join(""), fill: { type: "linear", angle: 90, stops: [[0, "kogecha", 0], [1, "kogecha", .28]] } });
  thatch.push({ t: "stroke", d: straws.join(""), color: "cha", width: .7, opacity: .6 });
  thatch.push({ t: "stroke", d: straws.slice(0, 200).map(d2 => d2.replace(/^M([-\d.]+) /, (_m, x) => `M${(Number(x) + W * .006).toFixed(1)} `)).join(""), color: "ki", width: .6, opacity: .45 });
  thatch.push({ t: "stroke", d: courses.join(""), color: "kogecha", width: 1.2, opacity: .4 });
  for (let m = 0; m < 6; m++) { const x = lerp(-eave * .8, eave * .8, hash01(seed, m, 15)), y = lerp(ridgeY + roofH * .3, eaveY, hash01(seed, m, 16)); thatch.push({ t: "fill", d: ellipseD(x, y, W * (.04 + .05 * hash01(seed, m, 17)), W * .012), fill: "kusa", opacity: .35 }); }
  // The cut edge of the eaves: the thatch's thickness, a pale band of straw ends.
  thatch.push({ t: "fill", d: polyD([[-eave * 1.04, eaveY + W * .03], [eave * 1.04, eaveY + W * .03], [eave * .98, eaveY + W * .09], [-eave * .98, eaveY + W * .09]]), fill: "ki", opacity: .55 });
  thatch.push({ t: "stroke", d: Array.from({ length: 70 }, (_, i) => { const x = lerp(-eave, eave, i / 69); return `M${x.toFixed(1)} ${(eaveY + W * .035).toFixed(1)}v${(W * .05).toFixed(1)}`; }).join(""), color: "cha", width: .6, opacity: .5 });
  if (!gassho) {
    // The gable: a small triangle under the ridge with a smoke lattice.
    const gy = ridgeY + roofH * .06, gh = roofH * .3, gwid = ridgeW * .7;
    thatch.push({ t: "fill", d: polyD([[-gwid, gy + gh], [0, gy], [gwid, gy + gh]]), fill: wood, outline: 1 });
    thatch.push({ t: "stroke", d: [-.5, 0, .5].map(f => `M${(f * gwid * .8).toFixed(1)} ${(gy + gh * .45).toFixed(1)}v${(gh * .5).toFixed(1)}`).join("") + `M${(-gwid * .6).toFixed(1)} ${(gy + gh * .7).toFixed(1)}h${(gwid * 1.2).toFixed(1)}`, color: "gofun", width: 1, opacity: .7 });
  }
  out.push({ t: "clip", d: roofD, key: "thatch", prims: thatch });
  if (gassho) {
    // Gassho gable end: the thick thatch frames a triangular timber-and-plaster wall stacked with storeys of windows.
    const tk = W * .085, gw2 = eave * .96 - tk * 1.5, gTop = ridgeY + tk * 2.2, gBot = eaveY + W * .02;
    const wall = polyD([[-gw2, gBot], [0, gTop], [gw2, gBot]]);
    const wallPrims: Prim[] = [{ t: "fill", d: rectD(-eave, gTop, eave * 2, gBot - gTop), fill: plaster, grain: .7 }];
    const frame: string[] = [];
    for (let r = 1; r < 4; r++) { const y = lerp(gBot, gTop, r / 4); frame.push(`M${(-eave).toFixed(1)} ${y.toFixed(1)}h${(eave * 2).toFixed(1)}`); }
    for (let k = -3; k <= 3; k++) frame.push(`M${(k * gw2 / 3.5).toFixed(1)} ${gBot.toFixed(1)}V${gTop.toFixed(1)}`);
    for (let r = 0; r < 3; r++) {
      const y0 = lerp(gBot, gTop, (r + .2) / 4), y1 = lerp(gBot, gTop, (r + .8) / 4), half = gw2 * (1 - (r + .8) / 4) * .7;
      for (let k = 0; k < 3 - r; k++) {
        const x = -half + (k + .5) * (2 * half / (3 - r)) - W * .022;
        wallPrims.push({ t: "fill", d: rectD(x, y1, W * .044, (y0 - y1) * .8), fill: light > 0 ? "ki" : "gofun", outline: .8, opacity: light > 0 ? .7 + .3 * light * (.85 + .15 * Math.sin(c.frame / 9 + r + k)) : 1, noPrint: light > 0 });
        wallPrims.push({ t: "stroke", d: `M${(x + W * .022).toFixed(1)} ${y1.toFixed(1)}v${((y0 - y1) * .8).toFixed(1)}`, color: wood, width: .7 });
        if (light > 0) wallPrims.push({ t: "glow", cx: x + W * .022, cy: (y0 + y1) / 2, r: W * .06, color: "ki", opacity: .3 * light });
      }
    }
    wallPrims.push({ t: "stroke", d: frame.join(""), color: wood, width: Math.max(1.5, W * .008) });
    out.push({ t: "clip", d: wall, key: "gable", prims: wallPrims }, { t: "fill", d: wall, fill: plaster, opacity: 0, outline: 1.2 });
  }
  const roofSnow: Prim[] = [];
  if (snow > 0) {
    // A thick cap following the roof, a soft drip edge at the eaves, icicles (drawn over the roof, outside its clip).
    const capB = eaveY + W * .015, capPts: Pt[] = [];
    for (let k = 0; k <= 30; k++) { const x = lerp(-eave * 1.06, eave * 1.06, k / 30); capPts.push([x, capB + Math.sin(k * 1.7 + seed) * W * .008 * snow + W * .012 * snow]); }
    if (gassho) {
      // Snow lies along the two thatch slopes, thick on top, drooping over the edges.
      const band = (x0: number, y0: number, x1: number, y1: number) => { const pts: Pt[] = []; for (let k = 0; k <= 14; k++) { const u = k / 14; pts.push([lerp(x0, x1, u), lerp(y0, y1, u) - W * .03 * snow]); } for (let k = 14; k >= 0; k--) { const u = k / 14; pts.push([lerp(x0, x1, u) + (x1 > x0 ? 1 : -1) * W * .01, lerp(y0, y1, u) + W * (.03 + .012 * Math.sin(k * 2.1 + seed)) * snow]); } return smoothD(pts, true, .3); };
      roofSnow.push({ t: "fill", d: band(-eave * 1.04, eaveY + W * .02, 0, ridgeY) + band(eave * 1.04, eaveY + W * .02, 0, ridgeY), fill: "gofun", opacity: lerp(.75, .98, snow), grain: .3, outline: .8, outlineColor: "usuzumi" });
    } else {
      const capTop = roof.slice(0, 6).map(q => [q[0] * 1.02, q[1] - W * .035 * snow] as Pt);
      roofSnow.push({ t: "fill", d: smoothD([...capTop, ...capPts.reverse()], true, .25), fill: "gofun", opacity: lerp(.7, .98, snow), grain: .3, outline: .8, outlineColor: "usuzumi" });
    }
    const ice: string[] = [];
    for (let k = 0; k < 18 * snow; k++) { const x = lerp(-eave * .95, eave * .95, hash01(seed, k, 51)), l = W * (.02 + .05 * hash01(seed, k, 52)); ice.push(polyD([[x - W * .005, eaveY + W * .085], [x + W * .005, eaveY + W * .085], [x, eaveY + W * .085 + l]])); }
    roofSnow.push({ t: "fill", d: ice.join(""), fill: "gofun", opacity: .9 });
  }
  out.push(...roofSnow);
  // Ridge: bark-capped with crossed timbers (umanori).
  if (!gassho) {
    out.push({ t: "fill", d: rectD(-ridgeW * 1.05, ridgeY - W * .03, ridgeW * 2.1, W * .035), fill: wood, outline: 1 });
    const xs: string[] = [];
    for (let i = 0; i < 6; i++) { const x = lerp(-ridgeW * .9, ridgeW * .9, i / 5); xs.push(carvedLine([[x - W * .018, ridgeY + W * .005], [x + W * .018, ridgeY - W * .06]], W * .008, { taper: "none" }), carvedLine([[x + W * .018, ridgeY + W * .005], [x - W * .018, ridgeY - W * .06]], W * .008, { taper: "none" })); }
    out.push({ t: "fill", d: xs.join(""), fill: wood, outline: .6 });
    if (snow > 0) out.push({ t: "fill", d: smoothD([[-ridgeW * 1.1, ridgeY - W * .03], [0, ridgeY - W * .05 - W * .02 * snow], [ridgeW * 1.1, ridgeY - W * .03], [ridgeW * 1.05, ridgeY - W * .015], [-ridgeW * 1.05, ridgeY - W * .015]], true, .3), fill: "gofun", opacity: .95 });
  }
  // Smoke rising from the vent, curling with the wind.
  if (smokeAmt > 0) {
    // A soft column of smoke from the vent: many overlapping wisps, each born small and dense, swelling, thinning and
    // drifting with the wind as it rises; together they read as one curling plume.
    const puffs: string[] = [], faint: string[] = [];
    for (let i = 0; i < 22; i++) {
      const life = (c.frame / 90 + i / 22) % 1, sway = Math.sin(c.frame / 31 + i * .9) * W * .03 * life + noise1(seed + i, life * 3) * W * .03;
      const x = c.wind * 160 * life ** 1.4 + sway, y = ridgeY - W * .02 - life * W * .62, r = W * (.018 + .06 * life) * (.8 + .4 * hash01(seed, i, 71));
      (life < .5 ? puffs : faint).push(smoothD(Array.from({ length: 7 }, (_, k) => polar([x, y], k * 51 + hash01(seed, i, k + 72) * 30, r * (.75 + .45 * hash01(seed, i, k + 80)))), true, .5));
    }
    out.push({ t: "fill", d: faint.join(""), fill: "gofun", opacity: .16 * smokeAmt }, { t: "fill", d: puffs.join(""), fill: "gofun", opacity: .3 * smokeAmt });
  }
  return out;
}

// ---- Stone figures ----------------------------------------------------------------------------------------------------------------------

/** Lichen, moss and pitting on weathered stone, as small soft spots clipped to the stone. */
function weathering(d: string, w: number, h: number, seed: number, moss: number): Prim[] {
  const spots: string[] = [], pits: string[] = [], lichen: string[] = [];
  for (let i = 0; i < 26; i++) {
    const x = hashSigned(seed, i, 61) * w * .5, y = -h * hash01(seed, i, 62), r = w * (.015 + .05 * hash01(seed, i, 63) ** 2);
    (hash01(seed, i, 64) < .55 ? lichen : spots).push(smoothD(Array.from({ length: 6 }, (_, k) => polar([x, y], k * 60 + hash01(seed, i, k) * 30, r * (.7 + .5 * hash01(seed, i, k + 7)))), true, .5));
  }
  for (let i = 0; i < 60; i++) pits.push(circleD(hashSigned(seed, i, 66) * w * .5, -h * hash01(seed, i, 67), .6 + 1.2 * hash01(seed, i, 68)));
  return [{ t: "clip", d, key: "weather", prims: [
    { t: "fill", d: lichen.join(""), fill: "kusa", opacity: .3 * moss + .1 },
    { t: "fill", d: spots.join(""), fill: "sumi", opacity: .12 },
    { t: "dots", d: pits.join(""), color: "sumi", opacity: .25 },
    { t: "fill", d: rectD(-w, -h * .25, w * 2, h * .25), fill: { type: "linear", angle: 90, stops: [[0, "kusa", 0], [1, "matsu", .45 * moss]] } },
  ] }];
}

/**
 * Roadside jizō: a small stone monk, bald, eyes closed in a faint smile, robed, holding a jewel (or a ringed staff),
 * on a lotus pedestal. Villagers dress them in a red bib (`bib`) and a knitted cap (`cap`); `snow` puts snow on the
 * head and shoulders. `count` lines up a row of them, each a little different, as at a temple path. `kasa` puts a straw
 * hat on the head and `tenugui` (true or a colour) ties a cloth over it, as in Kasa Jizō; with `kasaDrop` the hat or
 * cloth comes down onto the head as the node's progress runs 0 → 1, so a scene can key the moment it is given.
 */
export function jizo(p: P, c: SceneryContext): Prim[] {
  const h = num(p, "height", 120), count = clamp(Math.round(num(p, "count", 1)), 1, 9), seed = c.seed + num(p, "variant", 0) * 7;
  const stone = paint(p, "stone", "usuzumi"), bib = typeof p.bib === "string" ? p.bib as string : bool(p, "bib", true) ? "shu" : undefined;
  const kasaOn = bool(p, "kasa", false), drop = bool(p, "kasaDrop", false) ? kasaDrop(c.progress) : 1;
  const tenugui = typeof p.tenugui === "string" ? p.tenugui as UkiyoePaint : bool(p, "tenugui", false) ? "ai" : undefined;
  const cap = bool(p, "cap", false), snow = clamp01(num(p, "snow", 0)), staff = bool(p, "staff", false), moss = clamp01(num(p, "moss", .5));
  const out: Prim[] = [];
  for (let n = 0; n < count; n++) {
    const s = seed + n * 17, hh = h * (.88 + .2 * hash01(s, 1)), w = hh * .5, x0 = (n - (count - 1) / 2) * h * .62, lean = hashSigned(s, 2) * 3;
    const T = (x: number, y: number): Pt => { const r = lean * Math.PI / 180, px = x * w, py = y * hh; return [x0 + px * Math.cos(r) - py * Math.sin(r), px * Math.sin(r) + py * Math.cos(r)]; };
    // Lotus pedestal: a squat drum with petals.
    const ped = smoothD([T(-.62, 0), T(-.66, -.08), T(-.5, -.15), T(.5, -.15), T(.66, -.08), T(.62, 0)], true, .4);
    const body = smoothD([T(-.42, -.14), T(-.46, -.42), T(-.36, -.62), T(-.2, -.7), T(.2, -.7), T(.36, -.62), T(.46, -.42), T(.42, -.14)], true, .45);
    const head = ellipseD(...T(0, -.82), w * .27, hh * .17);
    const all = ped + body + head;
    out.push({ t: "fill", d: ellipseD(x0, 0, w * .7, hh * .04), fill: "sumi", opacity: .15, noPrint: true });
    out.push({ t: "stroke", d: all, color: "sumi", width: 2.2 }, { t: "fill", d: ped, fill: stone, grain: 1 }, { t: "fill", d: body, fill: stone, grain: 1 }, { t: "fill", d: head, fill: stone, grain: 1 });
    // Carving: petals on the pedestal, robe folds, the hands at the chest holding the jewel, the face.
    const carve: string[] = [];
    for (let k = -2; k <= 2; k++) { const a = T(k * .22 - .1, -.03), b = T(k * .22, -.14), cc = T(k * .22 + .1, -.03); carve.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${b[0].toFixed(1)} ${(b[1] - hh * .02).toFixed(1)} ${cc[0].toFixed(1)} ${cc[1].toFixed(1)}`); }
    for (const f of [-.25, -.05, .2]) { const a = T(f, -.6), b = T(f * 1.3, -.17); carve.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${(a[0] + w * .05).toFixed(1)} ${lerp(a[1], b[1], .5).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`); }
    const neck1 = T(-.22, -.66), neck2 = T(0, -.58), neck3 = T(.22, -.66);
    carve.push(`M${neck1[0].toFixed(1)} ${neck1[1].toFixed(1)}Q${neck2[0].toFixed(1)} ${(neck2[1] + hh * .04).toFixed(1)} ${neck3[0].toFixed(1)} ${neck3[1].toFixed(1)}`);
    out.push({ t: "stroke", d: carve.join(""), color: "sumi", width: 1, opacity: .55 });
    const hands = ellipseD(...T(0, -.47), w * .15, hh * .055), jewel = circleD(...T(0, -.53), w * .07);
    out.push({ t: "fill", d: hands, fill: stone, outline: .8 }, { t: "fill", d: jewel, fill: stone, outline: .8 });
    // Face: closed eyes as downward arcs, a faint smile, long earlobes.
    const [fx, fy] = T(0, -.82), e = w * .08;
    out.push({ t: "stroke", d: `M${(fx - e * 1.9).toFixed(1)} ${(fy - e * .1).toFixed(1)}q${e * .7} ${e * .45} ${e * 1.3} 0M${(fx + e * .5).toFixed(1)} ${(fy - e * .1).toFixed(1)}q${e * .7} ${e * .45} ${e * 1.3} 0M${(fx - e * .6).toFixed(1)} ${(fy + e * 1.2).toFixed(1)}q${e * .6} ${e * .35} ${e * 1.2} 0`, color: "sumi", width: 1, opacity: .75 });
    out.push({ t: "stroke", d: `M${(fx - w * .25).toFixed(1)} ${(fy - e).toFixed(1)}q${(-e * .6).toFixed(1)} ${(e * 1.5).toFixed(1)} 0 ${(e * 2.6).toFixed(1)}M${(fx + w * .25).toFixed(1)} ${(fy - e).toFixed(1)}q${(e * .6).toFixed(1)} ${(e * 1.5).toFixed(1)} 0 ${(e * 2.6).toFixed(1)}`, color: "sumi", width: .9, opacity: .5 });
    if (staff) out.push({ t: "line", d: carvedLine([T(.42, -.05), T(.32, -1.05)], Math.max(1.5, w * .04), { taper: "none" }), color: "kogecha" }, { t: "stroke", d: ellipseD(...T(.32, -1.08), w * .1, hh * .06) + ellipseD(...T(.32, -1.08), w * .05, hh * .04), color: "kogecha", width: 1.2 });
    out.push(...weathering(all, w * 1.3, hh, s, moss));
    // Bib and cap, the villagers' offerings.
    if (bib) {
      const bd = smoothD([T(-.36, -.64), T(.36, -.64), T(.3, -.48), T(0, -.38), T(-.3, -.48)], true, .4);
      out.push({ t: "fill", d: bd, fill: bib, outline: .9, grain: .5 }, { t: "stroke", d: `M${T(-.3, -.6)[0].toFixed(1)} ${T(-.3, -.6)[1].toFixed(1)}L${T(.3, -.6)[0].toFixed(1)} ${T(.3, -.6)[1].toFixed(1)}`, color: "sumi", width: .6, opacity: .4 });
    }
    if (cap) out.push({ t: "fill", d: smoothD([T(-.29, -.86), T(-.24, -.98), T(0, -1.03), T(.24, -.98), T(.29, -.86), T(0, -.9)], true, .4), fill: bib ?? "shu", outline: .9, grain: .6 });
    if (snow > 0) {
      out.push({ t: "fill", d: smoothD([T(-.3, -.88), T(-.15, -1.02 - .05 * snow), T(.15, -1.02 - .05 * snow), T(.3, -.88), T(0, -.93)], true, .4), fill: "gofun", opacity: .97 });
      out.push({ t: "fill", d: smoothD([T(-.44, -.56), T(-.36, -.66 - .04 * snow), T(-.2, -.68), T(-.24, -.62)], true, .4) + smoothD([T(.44, -.56), T(.36, -.66 - .04 * snow), T(.2, -.68), T(.24, -.62)], true, .4), fill: "gofun", opacity: .95 });
      out.push({ t: "fill", d: smoothD([T(-.66, -.08), T(-.5, -.17 - .03 * snow), T(.5, -.17 - .03 * snow), T(.66, -.08), T(0, -.12)], true, .4), fill: "gofun", opacity: .95 });
    }
    // The gift: a straw hat, or a cloth tied over the head, lowered into place.
    const lift = (1 - drop) * hh * .7;
    if (kasaOn && drop > 0) out.push({ t: "group", transform: `translate(0 ${(-lift).toFixed(1)})`, prims: kasaHat(...T(0, -.93), w * .64, 1.6, lean) });
    if (tenugui && drop > 0) out.push({ t: "group", transform: `translate(0 ${(-lift).toFixed(1)})`, opacity: Math.min(1, drop * 3), prims: [
      { t: "fill", d: smoothD([T(-.3, -.8), T(-.27, -.96), T(0, -1.03), T(.27, -.96), T(.3, -.8), T(.2, -.86), T(0, -.9), T(-.2, -.86)], true, .4), fill: tenugui, outline: .9, grain: .5, pattern: { type: "kanoko", color: "gofun", scale: .35, opacity: .7 } },
      { t: "fill", d: smoothD([T(.26, -.84), T(.42, -.8), T(.5, -.7), T(.4, -.72), T(.3, -.76)], true, .3) + smoothD([T(.28, -.82), T(.36, -.68), T(.32, -.6), T(.27, -.7)], true, .3), fill: tenugui, outline: .8 },
    ] });
  }
  return out;
}

/**
 * A komainu, the stone lion-dog that guards a shrine gate, seated on its plinth: a curled mane in carved spirals, bulging
 * eyes, a flame-like tail rising behind. `mouth` "a" is open (the first sound), "un" closed (the last); set `pair` to
 * draw both, facing each other across `gap`. Stone weathered like the jizō.
 */
export function komainu(p: P, c: SceneryContext): Prim[] {
  const h = num(p, "height", 200), pair = bool(p, "pair", false), gap = num(p, "gap", h * 2.4), seed = c.seed + num(p, "variant", 0) * 11;
  const stone = paint(p, "stone", "usuzumi"), moss = clamp01(num(p, "moss", .5)), snow = clamp01(num(p, "snow", 0));
  const one = (x0: number, dir: 1 | -1, open: boolean, s: number): Prim[] => {
    // Authored in a 200-unit frame facing right: plinth 0..-40, haunch behind, straight forelegs, a broad chest, a big
    // maned head (about two fifths of the height) and a tail climbing behind in flame-shaped tufts.
    const res: Prim[] = [], k = h / 200, T = (x: number, y: number): Pt => [x0 + x * k * dir, y * k];
    const sm = (pts: [number, number][], tension = .4) => smoothD(pts.map(q => T(q[0], q[1])), true, tension);
    const plinth = polyD([T(-66, 0), T(66, 0), T(60, -10), T(62, -40), T(-62, -40), T(-60, -10)]);
    res.push({ t: "fill", d: plinth, fill: stone, grain: 1, outline: 1.3 });
    res.push({ t: "stroke", d: `M${T(-60, -10).join(" ")}L${T(60, -10).join(" ")}M${T(-62, -34).join(" ")}L${T(62, -34).join(" ")}`, color: "sumi", width: .8, opacity: .5 });
    // Tail: three flame tufts rising from the haunch, each ending in a curl.
    const tail = sm([[-40, -70], [-62, -84], [-58, -104], [-76, -116], [-66, -136], [-82, -150], [-66, -172], [-52, -158], [-56, -140], [-42, -132], [-46, -112], [-34, -100], [-30, -80]], .35);
    const haunch = sm([[-56, -40], [-62, -64], [-52, -92], [-26, -102], [-6, -92], [-2, -60], [-6, -40]]);
    const body = sm([[-34, -96], [-14, -120], [14, -132], [34, -124], [44, -100], [40, -70], [8, -60], [-20, -66]]);
    const legNear = sm([[16, -40], [14, -90], [24, -104], [40, -100], [42, -40]], .25);
    const legFar = sm([[2, -40], [0, -84], [12, -96], [24, -92], [26, -40]], .25);
    const mane = sm([[-12, -150], [-14, -176], [2, -200], [30, -208], [52, -198], [58, -176], [52, -148], [40, -126], [18, -118], [-2, -126]], .4);
    const head = sm([[18, -178], [34, -192], [58, -190], [78, -176], [80, -156], [72, -140], [50, -134], [30, -140], [20, -156]], .38);
    const all = plinth + tail + haunch + body + legNear + legFar + mane + head;
    res.push({ t: "stroke", d: tail + haunch + body + legNear + legFar + mane + head, color: "sumi", width: 2.4 });
    for (const d of [tail, legFar, haunch, body, mane, head, legNear]) res.push({ t: "fill", d, fill: stone, grain: 1 });
    res.push({ t: "fill", d: legFar, fill: "sumi", opacity: .14 });
    // Spirals: rows of tight curls over the mane, down the back of the neck, on the tail tufts, elbows and haunch.
    const curls: string[] = [];
    const spiral = (cx: number, cy: number, r: number, turn = 1.5) => { const pts: Pt[] = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2 * turn + hash01(s, Math.round(cx * 7 + cy), 3), rr = r * (1 - i / 18); pts.push(T(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)); } curls.push(smoothD(pts, false, .4)); };
    for (let row = 0; row < 3; row++) for (let i = 0; i < 5 - row; i++) {
      const a = (-150 + i * 34 + row * 17) * Math.PI / 180, r = 34 - row * 11;
      spiral(22 + Math.cos(a) * r, -164 + Math.sin(a) * r * 1.05, 7.5 - row);
    }
    for (let i = 0; i < 4; i++) spiral(-6 + i * 2, -140 + i * 9, 6.5);
    for (const [x, y] of [[-70, -150], [-70, -124], [-62, -100]] as const) spiral(x + 6, y, 7);
    spiral(28, -108, 5.5); spiral(-30, -78, 8); spiral(-20, -62, 6);
    res.push({ t: "stroke", d: curls.join(""), color: "sumi", width: 1.1, opacity: .72 });
    // Face: a bulging eye under a heavy brow, a broad flat nose, small drooping ear, whisker pits; the mouth open (a)
    // showing fangs and tongue, or shut tight (un).
    res.push({ t: "fill", d: ellipseD(...T(52, -168), 8 * k, 7 * k), fill: stone, outline: 1.3 }, { t: "dots", d: circleD(...T(55, -168), 3.4 * k), color: "sumi" });
    res.push({ t: "line", d: carvedLine([T(38, -180), T(52, -182), T(66, -176)], 3.4 * k, { taper: "both" }), color: "sumi", opacity: .85 });
    res.push({ t: "fill", d: sm([[70, -168], [80, -164], [80, -154], [70, -154]], .4), fill: stone, outline: 1.1 }, { t: "fill", d: ellipseD(...T(77, -158), 2.6 * k, 2 * k), fill: "sumi", opacity: .7 });
    res.push({ t: "fill", d: sm([[30, -172], [24, -160], [32, -154], [38, -164]], .4), fill: stone, outline: 1 });
    res.push({ t: "dots", d: [[62, -152], [66, -150], [64, -146]].map(q => circleD(...T(q[0], q[1]), 1.2 * k)).join(""), color: "sumi", opacity: .7 });
    if (open) {
      res.push({ t: "fill", d: sm([[44, -150], [78, -148], [74, -134], [48, -136]], .3), fill: "sumi", opacity: .88 });
      res.push({ t: "fill", d: sm([[50, -140], [70, -141], [66, -136], [52, -137]], .4), fill: "shu", opacity: .45, noPrint: true });
      res.push({ t: "fill", d: polyD([T(52, -149), T(55, -142), T(58, -149)]) + polyD([T(68, -148), T(71, -141), T(74, -148)]) + polyD([T(60, -135), T(63, -141), T(66, -135)]), fill: stone, outline: .7 });
    } else res.push({ t: "line", d: carvedLine([T(46, -146), T(60, -143), T(76, -147)], 2.4 * k, { taper: "both" }), color: "sumi" }, { t: "fill", d: polyD([T(70, -146), T(72, -151), T(74, -146)]), fill: stone, outline: .7 });
    // Toes on the forepaws; the a-gyō guardian rests a paw on a carved ball.
    res.push({ t: "stroke", d: [20, 27, 34].map(x => `M${T(x, -40).join(" ")}L${T(x, -48).join(" ")}`).join(""), color: "sumi", width: 1, opacity: .7 });
    if (open) res.push({ t: "fill", d: circleD(...T(54, -54), 13 * k), fill: stone, outline: 1.2, grain: 1 }, { t: "stroke", d: smoothD([T(43, -58), T(54, -50), T(65, -58)], false, .4) + smoothD([T(46, -64), T(54, -60), T(62, -64)], false, .4), color: "sumi", width: .9, opacity: .6 });
    res.push(...weathering(all, 160 * k, 210 * k, s, moss));
    if (snow > 0) res.push({ t: "fill", d: sm([[-8, -196], [14, -212 - 4 * snow], [44, -214 - 4 * snow], [58, -198], [30, -204]], .4) + sm([[-66, -40], [-62, -46 - 3 * snow], [62, -46 - 3 * snow], [66, -40]], .4) + sm([[-70, -168], [-62, -178 - 3 * snow], [-54, -166]], .4), fill: "gofun", opacity: .95 });
    return res;
  };
  if (!pair) return one(0, num(p, "facing", 1) >= 0 ? 1 : -1, str(p, "mouth", "a") !== "un", seed);
  return [...one(-gap / 2, 1, true, seed), ...one(gap / 2, -1, false, seed + 5)];
}

/** Scenery motifs, by name, for the motif registry. */
export const SCENERY_MOTIFS = { range, minka, jizo, komainu } as const;
export const ANIMATED_SCENERY: ReadonlySet<string> = new Set(["range", "minka"]);
