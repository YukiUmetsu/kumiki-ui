/**
 * UKIYO1 other realms, after Kuniyoshi's *Recovering the Stolen Jewel from the Palace of the Dragon King* (Met DP146820:
 * the sea's interior as a mass of blue-green breakers and white spray, the dragon coiling, sea creatures), Shunsai
 * Toshimasa's *Origin of the Cave Door Dance* (orange and gold rays bursting from the rock cave, Uzume dancing on an upturned
 * tub, the gods with drums), Yoshitoshi's *Gekkyū no mukae* (Kaguya rising on clouds with her attendants and the parasol,
 * the old man reaching after her) and Hiroshige's *Tanabata Festival* (Met DP121512: bamboo poles hung with paper strips,
 * gourds and streamers over the roofs). Public domain or CC0.
 *
 * Motifs: `ryugu` (the Dragon King's palace: vermilion halls on stone, green-tiled curving roofs, a round gate),
 * `seabed` (rocks, branching red coral, seaweed swaying), `lightrays` (pale shafts from above swaying, for under the sea or
 * from the cave), `moonpalace` (the full moon with the palace of the moon people in it, clouds below), `amanogawa` (the
 * Milky Way, a river of stars), `magpies` (the magpie bridge forming across it by `progress`), `iwato` (the rock cave whose
 * boulder rolls aside by `open`, light bursting out), `onigashima` (the oni island: crags, a black palisade, the iron
 * gate), `sasa` (a Tanabata bamboo pole hung with paper strips and streamers fluttering).
 * Particles: `bubbles` (rising and wobbling).
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp, clamp01, hash01, lerp, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD, rectD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";
import type { UkiyoeAction, UkiyoeFigureLook } from "./ukiyoe-figure";
import type { UkiyoeNode, UkiyoeSceneSpec } from "./ukiyoe-scene";

type P = Readonly<Record<string, unknown>>;
interface C { seed: number; frame: number; wind: number; progress: number }
const num = (p: P, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;
const f1 = (n: number) => n.toFixed(1);

/** A curving Chinese-style roof (green glaze) over [x0, x1] at eave height y, ridge height h; corners swept up. */
function curvedRoof(x0: number, x1: number, y: number, h: number, lw: number, color: UkiyoePaint = "asagi"): Prim[] {
  const w = x1 - x0, ov = w * .12, L: Pt = [x0 - ov, y - h * .35], R: Pt = [x1 + ov, y - h * .35];
  const d = smoothD([L, [x0 + w * .1, y], [x1 - w * .1, y], R, [x1 - w * .12, y - h * .55], [x1 - w * .25, y - h], [x0 + w * .25, y - h], [x0 + w * .12, y - h * .55]], true, .3);
  return [{ t: "fill", d, fill: { type: "linear", angle: 90, stops: [[0, color, 1], [1, "matsu", 1]] }, outline: lw * 1.2 },
    { t: "stroke", d: Array.from({ length: 12 }, (_, i) => { const x = lerp(x0 + w * .05, x1 - w * .05, i / 11); return `M${f1(x)} ${f1(y - h * .02)}L${f1(lerp(x0 + w * .25, x1 - w * .25, i / 11))} ${f1(y - h * .95)}`; }).join(""), color: "matsu", width: lw * .7, opacity: .6 },
    { t: "fill", d: rectD(x0 + w * .22, y - h * 1.04, w * .56, h * .07), fill: "kin", outline: lw * .8 },
    { t: "fill", d: [L, R].map(q => circleD(q[0], q[1], h * .06)).join(""), fill: "kin" }];
}

/** The Dragon King's palace. Params: width, height. */
export function ryugu(p: P, cx: C): Prim[] {
  const W = num(p, "width", 900), H = num(p, "height", 600), lw = Math.max(1, W * .002), out: Prim[] = [];
  // Stone platform with steps, the lower hall with vermilion columns, the round moon gate, the upper hall, side towers.
  out.push({ t: "fill", d: rectD(-W * .5, -H * .1, W, H * .1), fill: { type: "linear", angle: 90, stops: [[0, "paper", 1], [1, "usuzumi", 1]] }, outline: lw, grain: .6 });
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? -W * .48 : W * .3;
    out.push({ t: "fill", d: rectD(x0, -H * .5, W * .18, H * .4), fill: "shu", outline: lw });
    out.push({ t: "stroke", d: [.2, .5, .8].map(k => `M${f1(x0 + W * .18 * k)} ${f1(-H * .5)}v${f1(H * .4)}`).join(""), color: "beni", width: lw * 2 });
    out.push(...curvedRoof(x0, x0 + W * .18, -H * .5, H * .12, lw));
    out.push(...curvedRoof(x0 + W * .03, x0 + W * .15, -H * .64, H * .1, lw));
  }
  out.push({ t: "fill", d: rectD(-W * .3, -H * .42, W * .6, H * .32), fill: "shu", outline: lw });
  out.push({ t: "fill", d: ellipseD(0, -H * .23, W * .08, W * .08), fill: { type: "radial", stops: [[0, "kin", 1], [1, "sumi", 1]] }, outline: lw * 1.4 });
  out.push({ t: "stroke", d: Array.from({ length: 7 }, (_, i) => `M${f1(-W * .28 + i * W * .093)} ${f1(-H * .42)}v${f1(H * .32)}`).join(""), color: "beni", width: lw * 2.4 });
  out.push(...curvedRoof(-W * .32, W * .32, -H * .42, H * .14, lw));
  out.push({ t: "fill", d: rectD(-W * .18, -H * .7, W * .36, H * .16), fill: "shu", outline: lw });
  out.push({ t: "stroke", d: Array.from({ length: 9 }, (_, i) => `M${f1(-W * .16 + i * W * .04)} ${f1(-H * .67)}v${f1(H * .1)}`).join(""), color: "kin", width: lw * 1.2 });
  out.push(...curvedRoof(-W * .2, W * .2, -H * .7, H * .16, lw));
  // A dragon finial on the top ridge, glinting.
  out.push({ t: "fill", d: smoothD([[-W * .05, -H * .86], [-W * .02, -H * .94], [W * .03, -H * .9], [W * .05, -H * .86]], true, .4), fill: "kin", outline: lw });
  out.push({ t: "glow", cx: 0, cy: -H * .9, r: W * .08, color: "ki", opacity: .3 + .1 * Math.sin(cx.frame / 15) });
  return out;
}

/** The sea floor: rocks, branching red coral, seaweed swaying with the water. Params: width, height. */
export function seabed(p: P, cx: C): Prim[] {
  const W = num(p, "width", 1920), H = num(p, "height", 300), lw = Math.max(1, W * .001), out: Prim[] = [];
  const rocks: string[] = [];
  for (let i = 0; i < 12; i++) { const x = -W / 2 + W * (i + .5) / 12 + (hash01(cx.seed, i, 1) - .5) * W * .05, r = H * (.12 + .12 * hash01(cx.seed, i, 2)); rocks.push(ellipseD(x, -r * .4, r * 1.4, r)); }
  out.push({ t: "fill", d: rectD(-W / 2, -H * .08, W, H * .1), fill: "kincha", opacity: .8 }, { t: "fill", d: rocks.join(""), fill: { type: "linear", angle: 90, stops: [[0, "usuzumi", 1], [1, "ai", 1]] }, outline: lw, union: true, grain: .7 });
  for (let i = 0; i < 18; i++) {
    const x = -W / 2 + W * hash01(cx.seed, i, 3), h = H * (.4 + .6 * hash01(cx.seed, i, 4)), sway = Math.sin(cx.frame / 25 + i) * h * .15, pts: Pt[] = [];
    for (let j = 0; j <= 8; j++) { const u = j / 8; pts.push([x + Math.sin(u * 4 + i) * h * .06 + sway * u * u, -u * h]); }
    if (i % 3 === 0) {
      // Coral: a red branching tree.
      const br: string[] = [carvedLine([[x, 0], [x, -h * .5]], h * .05, { taper: "end", minRatio: .6 })];
      for (let k = 0; k < 4; k++) { const y = -h * (.2 + .1 * k), dir = k % 2 ? 1 : -1; br.push(carvedLine([[x, y], [x + dir * h * .12, y - h * .15], [x + dir * h * .15, y - h * .3]], h * .035, { taper: "end", minRatio: .4, smooth: true })); }
      out.push({ t: "fill", d: br.join(""), fill: "shu", outline: lw });
    } else out.push({ t: "fill", d: carvedLine(pts, h * .07, { taper: "end", minRatio: .2, smooth: true }), fill: i % 2 ? "matsu" : "kusa", outline: lw * .6, opacity: .9 });
  }
  return out;
}

/** Shafts of pale light from above, fanning down and swaying. Params: width, height, count, color. */
export function lightrays(p: P, cx: C): Prim[] {
  const W = num(p, "width", 1400), H = num(p, "height", 1000), n = clamp(Math.round(num(p, "count", 7)), 1, 30), color = typeof p.color === "string" ? p.color as UkiyoePaint : "gofun";
  const out: Prim[] = [];
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + W * (i + .5) / n + Math.sin(cx.frame / 40 + i) * W * .02, w0 = W * .02, w1 = W * (.06 + .04 * hash01(cx.seed, i, 1)), lean = (i - n / 2) * W * .03;
    out.push({ t: "fill", d: `M${f1(x - w0)} 0L${f1(x + w0)} 0L${f1(x + lean + w1)} ${f1(H)}L${f1(x + lean - w1)} ${f1(H)}Z`, fill: { type: "linear", angle: 90, stops: [[0, color, .35], [1, color, 0]] }, noPrint: true });
  }
  return out;
}

/** The moon with the palace of the moon people in it and clouds drifting below. Params: radius. */
export function moonpalace(p: P, cx: C): Prim[] {
  const R = num(p, "radius", 260), lw = Math.max(1, R * .006), out: Prim[] = [];
  out.push({ t: "glow", cx: 0, cy: 0, r: R * 2.2, color: "gofun", opacity: .45 }, { t: "fill", d: ellipseD(0, 0, R, R), fill: { type: "radial", stops: [[0, "gofun", 1], [1, "ki", .85]] }, outline: lw });
  // The palace in silhouette inside the moon: halls and a tower on a terrace.
  const pal = (x: number, y: number, w: number, h: number) => [{ t: "fill" as const, d: rectD(x - w / 2, y - h, w, h), fill: "kincha" as UkiyoePaint, opacity: .55 }, ...curvedRoof(x - w / 2, x + w / 2, y - h, h * .4, lw * .6, "kincha").map(q => ({ ...q, opacity: .55 } as Prim))];
  out.push(...pal(0, R * .3, R * .7, R * .3), ...pal(-R * .45, R * .35, R * .3, R * .2), ...pal(R * .45, R * .35, R * .3, R * .2), ...pal(0, R * -.05, R * .3, R * .22));
  out.push({ t: "fill", d: rectD(-R * .8, R * .3, R * 1.6, R * .06), fill: "kincha", opacity: .5 });
  const clouds: string[] = [];
  for (let i = 0; i < 6; i++) { const x = -R * 1.2 + i * R * .5 + Math.sin(cx.frame / 60 + i) * R * .05; clouds.push(ellipseD(x, R * .85 + (i % 2) * R * .1, R * .35, R * .12)); }
  out.push({ t: "fill", d: clouds.join(""), fill: "gofun", outline: lw, outlineColor: "usuzumi", union: true, opacity: .9 });
  return out;
}

/** The Milky Way: a broad river of stars across the sky, dense at its heart, with a few bright stars. Params: width, height. */
export function amanogawa(p: P, cx: C): Prim[] {
  const W = num(p, "width", 1920), H = num(p, "height", 600), out: Prim[] = [];
  out.push({ t: "fill", d: smoothD([[-W / 2, H * .1], [0, -H * .25], [W / 2, -H * .05], [W / 2, H * .25], [0, H * .05], [-W / 2, H * .4]], true, .4), fill: { type: "linear", angle: 90, stops: [[0, "sora", .3], [1, "gofun", .15]] }, noPrint: true });
  const stars: string[] = [], bright: string[] = [];
  for (let i = 0; i < 700; i++) {
    const u = hash01(cx.seed, i, 1), x = -W / 2 + W * u, band = lerp(H * .07, H * .12, u) + Math.sin(u * 3) * H * .15 - H * .1, off = (hash01(cx.seed, i, 2) + hash01(cx.seed, i, 3) - 1) * H * .25;
    stars.push(circleD(x, band + off, .6 + 1.4 * hash01(cx.seed, i, 4) * (1 - Math.abs(off) / (H * .3))));
  }
  for (let i = 0; i < 12; i++) { const x = -W / 2 + W * hash01(cx.seed, i, 5), y = -H / 2 + H * hash01(cx.seed, i, 6), tw = .7 + .3 * Math.sin(cx.frame / 9 + i); bright.push(circleD(x, y, 2.5 * tw)); }
  out.push({ t: "dots", d: stars.join(""), color: "gofun", opacity: .8 }, { t: "dots", d: bright.join(""), color: "ki", opacity: .95 });
  return out;
}

/** The magpie bridge: magpies wing to wing in an arc across the river, more of them as `progress` (keys) rises. Params: width, height. */
export function magpies(p: P, cx: C): Prim[] {
  const W = num(p, "width", 900), H = num(p, "height", 200), n = 26, shown = Math.round(n * clamp01(cx.progress)), out: Prim[] = [];
  for (let i = 0; i < n; i++) {
    // The bridge fills from both ends toward the middle.
    const order = Math.min(i, n - 1 - i) * 2 + (i < n / 2 ? 0 : 1);
    if (order >= shown) continue;
    const u = i / (n - 1), x = (u - .5) * W, y = -Math.sin(Math.PI * u) * H, flap = Math.sin(cx.frame / 3 + i * 1.3) * 10, s = W * .03;
    out.push({ t: "group", transform: `translate(${f1(x)} ${f1(y)})`, prims: [
      { t: "fill", d: smoothD([[-s, 0], [-s * .4, -s * .3], [s * .5, -s * .25], [s * .9, 0], [s * .3, s * .2], [-s * .6, s * .15]], true, .4), fill: "sumi", outline: .8 },
      { t: "fill", d: ellipseD(s * .1, s * .02, s * .35, s * .12), fill: "gofun" },
      { t: "fill", d: smoothD([[-s * .2, -s * .1], [-s * .8, -s * (.9 + flap / 20)], [s * .3, -s * .2]], true, .4) + smoothD([[-s * .2, s * .05], [-s * .9, s * (.6 - flap / 30)], [s * .2, s * .1]], true, .4), fill: "sumi", opacity: .95 },
      { t: "fill", d: smoothD([[-s, 0], [-s * 1.6, -s * .1], [-s * 1.5, s * .1]], true, .3), fill: "ai" }] });
  }
  return out;
}

/** The rock cave (Ama-no-Iwato / the mouth of Yomi): a crag with a dark cave, its boulder rolled aside by `open`, light rays bursting out when `light`. Params: width, height, open, light. */
export function iwato(p: P, cx: C): Prim[] {
  const W = num(p, "width", 700), H = num(p, "height", 600), open = clamp01(num(p, "open", 0) + num(p, "opens", 0) * cx.progress), light = clamp01(num(p, "light", 1)), lw = Math.max(1, W * .003), out: Prim[] = [];
  const cave: Pt = [0, -H * .3], cw = W * .22, ch = H * .3;
  if (light > 0 && open > .05) {
    // Rays of orange and gold radiating from the cave mouth (Toshimasa), widening as it opens.
    const rays: string[] = [];
    for (let i = 0; i < 16; i++) { const a = (-170 + i * 11) * Math.PI / 180, a2 = a + .05, L = W * 1.6; rays.push(`M${f1(cave[0])} ${f1(cave[1])}L${f1(cave[0] + Math.cos(a) * L)} ${f1(cave[1] + Math.sin(a) * L)}L${f1(cave[0] + Math.cos(a2) * L)} ${f1(cave[1] + Math.sin(a2) * L)}Z`); }
    out.push({ t: "glow", cx: cave[0], cy: cave[1], r: W * open, color: "ki", opacity: .8 * light }, { t: "fill", d: rays.join(""), fill: { type: "radial", stops: [[0, "ki", .9 * light * open], [1, "tan", 0]] }, noPrint: true });
  }
  out.push({ t: "fill", d: smoothD([[-W * .55, 0], [-W * .5, -H * .45], [-W * .3, -H * .8], [-W * .05, -H], [W * .25, -H * .85], [W * .5, -H * .5], [W * .55, 0]], true, .3), fill: { type: "linear", angle: 0, stops: [[0, "usuzumi", 1], [.5, "kogecha", 1], [1, "sumi", 1]] }, outline: lw * 1.4, grain: .9 });
  out.push({ t: "stroke", d: Array.from({ length: 8 }, (_, i) => smoothD([[-W * .4 + i * W * .1, -H * (.2 + .1 * (i % 3))], [-W * .35 + i * W * .1, -H * (.5 + .1 * (i % 2))], [-W * .38 + i * W * .1, -H * .7]], false, .5)).join(""), color: "sumi", width: lw, opacity: .5 });
  out.push({ t: "fill", d: smoothD([[cave[0] - cw, 0], [cave[0] - cw * .9, cave[1] - ch * .4], [cave[0], cave[1] - ch], [cave[0] + cw * .9, cave[1] - ch * .4], [cave[0] + cw, 0]], true, .4), fill: light > 0 && open > .05 ? { type: "radial", stops: [[0, "gofun", 1], [.5, "ki", 1], [1, "tan", 1]] } : "sumi", outline: lw });
  // The boulder: rolled to the right as it opens, turning as it rolls.
  const br = cw * 1.15, bx = cave[0] + open * cw * 2.3, rot = open * 120;
  out.push({ t: "group", transform: `translate(${f1(bx)} ${f1(-br * .9)}) rotate(${f1(rot)})`, prims: [
    { t: "fill", d: smoothD([[-br, 0], [-br * .8, -br * .7], [0, -br * .95], [br * .85, -br * .6], [br, br * .2], [br * .5, br * .85], [-br * .5, br * .8]], true, .35), fill: { type: "linear", angle: 0, stops: [[0, "usuzumi", 1], [1, "sumi", 1]] }, outline: lw * 1.4, grain: .8 },
    { t: "stroke", d: `M${f1(-br * .5)} ${f1(-br * .3)}q${f1(br * .4)} ${f1(-br * .2)} ${f1(br * .8)} ${f1(br * .1)}`, color: "sumi", width: lw, opacity: .6 }] });
  // A sacred rope across the top of the cave.
  out.push({ t: "stroke", d: smoothD([[cave[0] - cw * 1.2, cave[1] - ch * 1.05], [cave[0], cave[1] - ch * .9], [cave[0] + cw * 1.2, cave[1] - ch * 1.05]], false, .5), color: "kincha", width: W * .02 });
  return out;
}

/** Onigashima: a craggy island in the sea, a black palisade with towers, the great iron-studded gate, smoke. Params: width, height. */
export function onigashima(p: P, cx: C): Prim[] {
  const W = num(p, "width", 1200), H = num(p, "height", 700), lw = Math.max(1, W * .002), out: Prim[] = [];
  out.push({ t: "fill", d: smoothD([[-W * .5, 0], [-W * .45, -H * .3], [-W * .3, -H * .5], [-W * .2, -H * .85], [-W * .05, -H * .6], [W * .1, -H * 1.0], [W * .28, -H * .55], [W * .4, -H * .4], [W * .5, 0]], true, .2), fill: { type: "linear", angle: 0, stops: [[0, "sumi", 1], [.5, "kogecha", 1], [1, "sumi", 1]] }, outline: lw * 1.4, grain: 1 });
  out.push({ t: "stroke", d: Array.from({ length: 10 }, (_, i) => `M${f1(-W * .4 + i * W * .08)} ${f1(-H * .1)}l${f1(W * .03)} ${f1(-H * (.3 + .2 * hash01(cx.seed, i, 1)))}`).join(""), color: "usuzumi", width: lw * 1.2, opacity: .5 });
  // Palisade of black stakes with points, two towers, the gate.
  const py = -H * .28;
  out.push({ t: "fill", d: Array.from({ length: 30 }, (_, i) => { const x = -W * .38 + i * W * .026; return `M${f1(x)} ${f1(py + H * .1)}V${f1(py - H * .06)}l${f1(W * .011)} ${f1(-H * .03)}l${f1(W * .011)} ${f1(H * .03)}V${f1(py + H * .1)}Z`; }).join(""), fill: "sumi", outline: lw * .6 });
  for (const sx of [-1, 1]) out.push({ t: "fill", d: rectD(sx * W * .2 - W * .04, py - H * .22, W * .08, H * .3), fill: "kogecha", outline: lw }, { t: "fill", d: smoothD([[sx * W * .2 - W * .06, py - H * .22], [sx * W * .2, py - H * .3], [sx * W * .2 + W * .06, py - H * .22]], true, .2), fill: "sumi", outline: lw });
  out.push({ t: "fill", d: rectD(-W * .08, py - H * .15, W * .16, H * .25), fill: { type: "linear", angle: 0, stops: [[0, "shu", 1], [.5, "beni", 1], [1, "shu", 1]] }, outline: lw * 1.2 });
  out.push({ t: "dots", d: Array.from({ length: 20 }, (_, i) => circleD(-W * .065 + (i % 5) * W * .032, py - H * .12 + Math.floor(i / 5) * H * .05, W * .005)).join(""), color: "kin" });
  out.push({ t: "stroke", d: `M0 ${f1(py - H * .15)}v${f1(H * .25)}`, color: "sumi", width: lw * 1.6 });
  // Smoke from fires inside, drifting.
  const smoke: string[] = [];
  for (let i = 0; i < 5; i++) { const u = ((cx.frame / 120 + i / 5) % 1); smoke.push(ellipseD(W * .05 + u * W * .2 + cx.wind * u * W * .1, py - H * (.3 + .6 * u), W * (.04 + .06 * u), H * (.03 + .04 * u))); }
  out.push({ t: "fill", d: smoke.join(""), fill: "usuzumi", opacity: .5, union: true });
  return out;
}

/** A Tanabata bamboo pole hung with coloured paper strips, a gourd and streamers fluttering. Params: height, lean. */
export function sasa(p: P, cx: C): Prim[] {
  const H = num(p, "height", 600), lean = num(p, "lean", 0), lw = Math.max(1, H * .003), out: Prim[] = [], sway = cx.wind * H * .03 + Math.sin(cx.frame / 30 + cx.seed) * H * .01;
  const pole: Pt[] = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10; pole.push([lean * u * H * .1 + sway * u * u, -u * H]); }
  out.push({ t: "line", d: carvedLine(pole, H * .012, { taper: "end", minRatio: .4, smooth: true }), color: "matsu" });
  const leaves: string[] = [], strips: Prim[] = [];
  const cols: UkiyoePaint[] = ["beni", "ki", "sora", "gofun", "murasaki", "kusa"];
  for (let i = 4; i <= 10; i++) {
    const q = pole[i];
    for (const sx of [-1, 1]) { const tip: Pt = [q[0] + sx * H * .07 + sway * .3, q[1] + H * .02]; leaves.push(carvedLine([q, [(q[0] + tip[0]) / 2, q[1] - H * .01], tip], H * .015, { taper: "both" })); }
    const flut = Math.sin(cx.frame / 6 + i) * H * .008 + cx.wind * H * .01, c = cols[i % cols.length], x = q[0] + (i % 2 ? H * .03 : -H * .03);
    strips.push({ t: "fill", d: smoothD([[x - H * .008, q[1]], [x + H * .008, q[1]], [x + H * .008 + flut, q[1] + H * .06], [x - H * .008 + flut, q[1] + H * .06]], true, .1), fill: c, outline: lw * .6 });
  }
  out.push({ t: "fill", d: leaves.join(""), fill: "kusa", opacity: .9 }, ...strips);
  // A streamer of paper links trailing from the top, and a gourd.
  const top = pole[10], tail: Pt[] = [];
  for (let j = 0; j <= 10; j++) { const u = j / 10; tail.push([top[0] + u * H * .3 + cx.wind * u * H * .2, top[1] + u * H * .25 + Math.sin(u * 6 + cx.frame / 8) * H * .03]); }
  out.push({ t: "line", d: carvedLine(tail, H * .012, { taper: "end", minRatio: .5, smooth: true }), color: "beni" });
  const g = pole[7];
  out.push({ t: "fill", d: ellipseD(g[0] + H * .05, g[1] + H * .04, H * .02, H * .025) + ellipseD(g[0] + H * .05, g[1] + H * .01, H * .012, H * .014), fill: "ki", outline: lw * .6, union: true });
  return out;
}

export const REALM_MOTIFS = { ryugu, seabed, lightrays, moonpalace, amanogawa, magpies, iwato, onigashima, sasa };
export const ANIMATED_REALMS = ["ryugu", "seabed", "lightrays", "moonpalace", "amanogawa", "magpies", "iwato", "onigashima", "sasa"] as const;

/** Bubbles rising through the area, wobbling, each its own size and speed. */
export function bubbles(count: number, area: readonly [number, number, number, number], frame: number, seed: number, size: number): Prim[] {
  const [ax, ay, aw, ah] = area, rings: string[] = [], hi: string[] = [];
  for (let i = 0; i < count; i++) {
    const sp = .8 + 1.6 * hash01(seed, i, 1), r = (2 + 6 * hash01(seed, i, 2)) * size, y = ay + ah - (((hash01(seed, i, 3) * ah + frame * sp) % ah) + ah) % ah, x = ax + aw * hash01(seed, i, 4) + Math.sin(frame / 12 + i) * 6;
    rings.push(circleD(x, y, r)); hi.push(circleD(x - r * .35, y - r * .35, r * .25));
  }
  return [{ t: "fill", d: rings.join("") || "M0 0", fill: "gofun", opacity: .25, outline: .8, outlineColor: "gofun" }, { t: "dots", d: hi.join("") || "M0 0", color: "gofun", opacity: .8 }];
}

// ---- Scenes ------------------------------------------------------------------------------------------------------------------------

export type UkiyoeRealmScene = "ryugu" | "moon" | "tanabata" | "iwato" | "yomi" | "onigashima";
export const UKIYOE_REALM_SCENES: readonly UkiyoeRealmScene[] = ["ryugu", "moon", "tanabata", "iwato", "yomi", "onigashima"];

/**
 * Each realm with its way in: `ryugu` (Urashima rides the turtle down from the waves; the camera follows him below the
 * surface to the Dragon Palace among fish and coral), `moon` (Kaguya rises on a cloud from her house and the camera rises
 * after her to the moon palace), `tanabata` (the weaver and the cowherd on either bank of the Milky Way while the magpies
 * form the bridge), `iwato` (the boulder rolls aside and the sun goddess's light floods out while Uzume dances),
 * `yomi` (Izanagi flees the dark cave of the dead as the soul-flames follow and the boulder closes), `onigashima`
 * (Momotarō's boat crosses to the oni island).
 */
export function realmScene(kind: UkiyoeRealmScene = "ryugu", frames = 360): UkiyoeSceneSpec {
  const nodes: UkiyoeNode[] = [];
  const fig = (id: string, look: UkiyoeFigureLook, x: number, y: number, scale: number, actions: UkiyoeAction[], facing: "left" | "right" = "right", extra: Record<string, unknown> = {}) =>
    nodes.push({ id, kind: "figure", x, y, scale, look, facing, actions, ...extra } as unknown as UkiyoeNode);
  const c = (id: string, species: string, x: number, y: number, look: Record<string, unknown>, actions: unknown[], facing: "left" | "right" = "right", extra: Record<string, unknown> = {}) =>
    nodes.push({ id, kind: "creature", species, x, y, facing, look, actions, ...extra } as unknown as UkiyoeNode);
  let camera: UkiyoeSceneSpec["camera"], preset: "edo" | "night" = "night";
  const urashima: UkiyoeFigureLook = { hair: "chonmage", robe: "ai", robePattern: { type: "shima", color: "gofun", scale: .5 }, lower: "tucked", legs: "hada", feet: "bare", build: "average" };
  if (kind === "ryugu") {
    // A tall world: sky and waves above (y < 1000), the sea's interior below down to the palace on the floor at 2100.
    nodes.push({ id: "sky", kind: "motif", motif: "sky", params: { width: 2400, height: 1080, band: .5, horizon: "beni" } } as UkiyoeNode);
    nodes.push({ id: "deep", kind: "block", x: 960, y: 1640, shape: { type: "rect", width: 2400, height: 1300 }, fill: { type: "linear", angle: 90, stops: [[0, "asagi", 1], [.4, "ai", 1], [1, "bero", 1]] }, line: 0 } as unknown as UkiyoeNode);
    nodes.push({ id: "rays", kind: "motif", motif: "lightrays", x: 960, y: 1000, params: { width: 1800, height: 1100, count: 9, color: "sora" } } as UkiyoeNode);
    nodes.push({ id: "palace", kind: "motif", motif: "ryugu", x: 1250, y: 2050, params: { width: 1000, height: 700 } } as UkiyoeNode);
    nodes.push({ id: "seabed", kind: "motif", motif: "seabed", x: 960, y: 2160, params: { width: 2400, height: 260 } } as UkiyoeNode);
    for (let i = 0; i < 4; i++) c("fish" + i, "carp", 260 + i * 260, 1300 + (i % 2) * 220, { size: 140, color: (["shu", "ki", "sora", "sakura"] as const)[i] }, [{ type: "float", start: 0, end: frames, to: (i % 2 ? -1 : 1) * 260 }], i % 2 ? "left" : "right");
    c("octopus", "octopus", 520, 2040, { size: 180 }, [{ type: "dance", start: 0, end: frames }]);
    nodes.push({ id: "bubbles", kind: "particles", type: "bubbles", count: 60, area: [200, 1050, 1500, 1050] } as unknown as UkiyoeNode);
    // Urashima on the turtle's back, gliding down from the surface to the palace gate.
    nodes.push({ id: "ride", kind: "group", x: 500, y: 960, keys: [{ frame: 0, x: 500, y: 960 }, { frame: 60, x: 560, y: 1010 }, { frame: 260, x: 1000, y: 1900, ease: "inOut" }, { frame: frames, x: 1060, y: 1960 }] } as unknown as UkiyoeNode);
    c("turtle", "turtle", 0, 0, { size: 260 }, [{ type: "float", start: 0, end: frames, to: 0 }], "right", { parent: "ride" });
    fig("urashima", urashima, -20, -60, 1.1, [{ type: "kneel", start: 0, end: frames }], "right", { parent: "ride" });
    nodes.push({ id: "sea", kind: "motif", motif: "sea", y: 1000, params: { width: 2400, height: 160, rows: 5 }, opacity: .9 } as UkiyoeNode);
    camera = { keys: [{ frame: 0, x: 960, y: 540 }, { frame: 70, x: 960, y: 600 }, { frame: 280, x: 1060, y: 1600, ease: "inOut" }, { frame: frames, x: 1080, y: 1620 }] };
    preset = "edo";
  } else if (kind === "moon") {
    nodes.push({ id: "sky", kind: "block", x: 960, y: 0, shape: { type: "rect", width: 2400, height: 2400 }, fill: { type: "linear", angle: 90, stops: [[0, "yoru", 1], [.6, "ai", 1], [1, "murasaki", 1]] }, line: 0 } as unknown as UkiyoeNode);
    nodes.push({ id: "moon", kind: "motif", motif: "moonpalace", x: 1100, y: -560, params: { radius: 300 } } as UkiyoeNode);
    nodes.push({ id: "ground", kind: "block", x: 960, y: 1000, shape: { type: "rect", width: 2400, height: 300 }, fill: { type: "linear", angle: 90, stops: [[0, "ai", 1], [1, "yoru", 1]] }, line: 0 } as unknown as UkiyoeNode);
    nodes.push({ id: "house", kind: "motif", motif: "minka", x: 500, y: 880, params: { width: 520, light: 1 } } as UkiyoeNode);
    nodes.push({ id: "bamboo", kind: "motif", motif: "bamboo", x: 1600, y: 900, params: { width: 700, height: 720, stalks: 8 } } as UkiyoeNode);
    fig("cutter", { hair: "elder", robe: "cha", lower: "tucked", legs: "hada", feet: "waraji", beard: true }, 760, 930, 1.6, [{ type: "brace", start: 60, end: frames, angle: -10 }], "right");
    nodes.push({ id: "ascent", kind: "group", x: 960, y: 820, keys: [{ frame: 0, x: 960, y: 820 }, { frame: 300, x: 1080, y: -260, ease: "inOut" }, { frame: frames, x: 1090, y: -300 }] } as unknown as UkiyoeNode);
    nodes.push({ id: "cloud", kind: "motif", motif: "kumo", parent: "ascent", params: { width: 420 } } as unknown as UkiyoeNode);
    fig("kaguya", { hair: "heian", robe: "gofun", layers: ["sora", "ai", "beni"], lower: "hakama", hakama: "beni", feet: "bare", build: "slim", sleeves: "long", stole: "kin" }, 0, -10, 1.4, [{ type: "look", start: 0, end: frames, back: true }], "right", { parent: "ascent" });
    camera = { keys: [{ frame: 0, x: 960, y: 540 }, { frame: 80, x: 960, y: 540 }, { frame: 320, x: 1060, y: -380, ease: "inOut" }, { frame: frames, x: 1060, y: -400 }] };
  } else if (kind === "tanabata") {
    nodes.push({ id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .7, top: "yoru", mid: "ai", horizon: "murasaki" } } as UkiyoeNode);
    nodes.push({ id: "river", kind: "motif", motif: "amanogawa", x: 960, y: 520, params: { width: 1920, height: 700 } } as UkiyoeNode);
    nodes.push({ id: "bridge", kind: "motif", motif: "magpies", x: 960, y: 640, params: { width: 1000, height: 220 }, keys: [{ frame: 0, progress: 0 }, { frame: 60, progress: 0 }, { frame: 240, progress: 1 }] } as unknown as UkiyoeNode);
    for (const [i, x] of [[0, 300], [1, 1620]] as const) nodes.push({ id: "cloud" + i, kind: "motif", motif: "kumo", x, y: 760, params: { width: 380 }, flip: i === 1 } as unknown as UkiyoeNode);
    fig("orihime", { hair: "heian", robe: "sakura", layers: ["beni", "ki", "kusa"], lower: "hakama", hakama: "beni", feet: "bare", build: "slim", sleeves: "long", stole: "sora" }, 300, 740, 1.4, [{ type: "walk", start: 250, end: frames, to: 300 }]);
    fig("hikoboshi", { hair: "mizura", robe: "ai", lower: "hakama", hakama: "gofun", feet: "bare", build: "average" }, 1560, 740, 1.4, [{ type: "walk", start: 250, end: frames, to: -300 }], "left");
    c("ox", "ox", 1730, 762, { size: 150 }, [{ type: "look", start: 0, end: frames }], "left");
  } else if (kind === "iwato") {
    nodes.push({ id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .5, top: "yoru", mid: "ai", horizon: "ai" } } as UkiyoeNode);
    nodes.push({ id: "ground", kind: "block", x: 960, y: 1000, shape: { type: "rect", width: 1920, height: 300 }, fill: { type: "linear", angle: 90, stops: [[0, "kogecha", 1], [1, "sumi", 1]] }, line: 0 } as unknown as UkiyoeNode);
    nodes.push({ id: "cave", kind: "motif", motif: "iwato", x: 1250, y: 920, params: { width: 900, height: 760, opens: 1 }, keys: [{ frame: 0, progress: 0 }, { frame: 150, progress: 0 }, { frame: 260, progress: 1 }] } as unknown as UkiyoeNode);
    nodes.push({ id: "tub", kind: "motif", motif: "tarai", x: 560, y: 960, params: { radius: 110 } } as UkiyoeNode);
    fig("uzume", { hair: "long", robe: "gofun", lower: "hakama", hakama: "beni", feet: "bare", build: "slim", sleeves: "long", prop: "fan" }, 560, 915, 1.5, [{ type: "dance", start: 0, end: frames }]);
    fig("god", { hair: "mizura", robe: "gofun", lower: "hakama", hakama: "gofun", feet: "bare", build: "stout", beads: true }, 260, 960, 1.6, [{ type: "cheer", start: 30, end: frames }]);
    fig("amaterasu", { hair: "tenko", robe: "gofun", under: "shu", obi: "kin", feet: "bare", build: "slim", prop: "mirror", beads: true, stole: "kin" }, 1250, 920, 1.6, [{ type: "walk", start: 270, end: frames, to: -120 }], "left", { from: 255 });
    nodes.push({ id: "rooster", kind: "creature", species: "pheasant", x: 860, y: 960, scale: 1.4, look: { color: "gofun" }, facing: "right", actions: [{ type: "stand", start: 0, end: frames }] } as unknown as UkiyoeNode);
  } else if (kind === "yomi") {
    nodes.push({ id: "sky", kind: "block", x: 960, y: 540, shape: { type: "rect", width: 1920, height: 1080 }, fill: { type: "linear", angle: 90, stops: [[0, "sumi", 1], [1, "kogecha", 1]] }, line: 0 } as unknown as UkiyoeNode);
    nodes.push({ id: "ground", kind: "block", x: 960, y: 1000, shape: { type: "rect", width: 1920, height: 300 }, fill: "sumi", line: 0 } as unknown as UkiyoeNode);
    nodes.push({ id: "cave", kind: "motif", motif: "iwato", x: 600, y: 920, params: { width: 900, height: 760, open: 1, opens: -1, light: 0 }, keys: [{ frame: 0, progress: 0 }, { frame: 230, progress: 0 }, { frame: 320, progress: 1 }] } as unknown as UkiyoeNode);
    for (let i = 0; i < 4; i++) c("flame" + i, "hitodama", 520 + i * 60, 700 - i * 30, { size: 46 }, [{ type: "float", start: 20 + i * 10, end: 220, to: 400 + i * 30 }]);
    fig("izanagi", { hair: "mizura", robe: "gofun", lower: "hakama", hakama: "gofun", feet: "bare", build: "average", prop: "hoko", beads: true }, 600, 940, 1.6, [{ type: "run", start: 10, end: 220, to: 600 }]);
    preset = "night";
  } else {
    nodes.push({ id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .5, horizon: "beni" } } as UkiyoeNode);
    nodes.push({ id: "island", kind: "motif", motif: "onigashima", x: 1350, y: 820, params: { width: 1100, height: 640 } } as UkiyoeNode);
    nodes.push({ id: "sea", kind: "motif", motif: "sea", y: 800, params: { width: 1920, height: 280, rows: 8 } } as UkiyoeNode);
    nodes.push({ id: "ship", kind: "group", x: 260, y: 920, keys: [{ frame: 0, x: 260, y: 920 }, { frame: frames, x: 760, y: 900 }], loops: [{ kind: "rock", amplitude: 3, period: 60 }] } as unknown as UkiyoeNode);
    nodes.push({ id: "hull", kind: "motif", motif: "boat", parent: "ship", params: { length: 460 } } as unknown as UkiyoeNode);
    fig("momotaro", { hair: "topknot", hat: "headband", robe: "gofun", robePattern: { type: "kikko", color: "beni", scale: .5 }, lower: "hakama", hakama: "ai", feet: "waraji", build: "child", swords: "katana" }, 60, -18, .9, [{ type: "point", start: 60, end: frames, angle: 70 }], "right", { parent: "ship" });
    c("dog", "dog", -60, -18, { size: 90 }, [{ type: "sit", start: 0, end: frames }], "right", { parent: "ship" });
    c("monkey", "monkey", -130, -18, { size: 70 }, [{ type: "sit", start: 0, end: frames }], "right", { parent: "ship" });
    c("pheasant", "pheasant", 160, -24, { size: 50 }, [{ type: "stand", start: 0, end: frames }], "right", { parent: "ship" });
    preset = "edo";
  }
  return { version: 1, id: `realm-${kind}`, width: 1920, height: 1080, durationFrames: frames, seed: 73, cadence: 2, palette: { preset }, wind: { base: .4, turbulence: .4 }, ...(camera ? { camera } : {}), nodes };
}
