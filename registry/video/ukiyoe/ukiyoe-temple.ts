/**
 * UKIYO1 temples, shrines, graves and their furniture, after Hiroshige's *Kinryūzan Temple at Asakusa* (Met 56689: the
 * vermilion two-storey gate and its great red lantern), *Gion Shrine in Snow* (Met 55998: stone lanterns and the shrine
 * fence), *Evening Bell at Mii Temple* (49931), Yoshitoshi's *The Southern Gate* (Rashōmon; Wikimedia Commons, public
 * domain) and a photograph of a bonshō (Saikyō-ji, Fukuoka; CC BY-SA 4.0, studied only: verdigris bronze, rows of
 * raised nubs, crossing raised bands, lotus striking seats, the dragon loop, the hanging log striker).
 *
 * Motifs: `belfry` (a shōrō with its bronze bell and log striker; `strikes` swings the log into the bell, which sways and
 * rings), `hondo` (a temple hall), `gate` (a two-storey gate: Asakusa's with its lantern, or the Rashōmon in ruin),
 * `hokora` (a small mountain shrine with its sacred rope), `graves` (a graveyard of stones and wooden sotoba), `toro`
 * (a stone lantern, lit or dark) and `hut` (a hermit's thatched hut). All stand on their base centre.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp, clamp01, hash01, lerp, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD, rectD } from "./ukiyoe-prims";
import type { UkiyoeFill } from "./ukiyoe-pigments";
import type { Box, Ctx } from "./ukiyoe-castle";
import { roof } from "./ukiyoe-castle";
import type { UkiyoeNode, UkiyoeSceneSpec } from "./ukiyoe-scene";

type P = Readonly<Record<string, unknown>>;
interface C { seed: number; frame: number; wind: number }
const num = (p: P, k: string, d: number) => typeof p[k] === "number" && Number.isFinite(p[k]) ? p[k] as number : d;
const bool = (p: P, k: string, d: boolean) => typeof p[k] === "boolean" ? p[k] as boolean : d;
const f1 = (n: number) => n.toFixed(1);
const ctx = (seed: number, W: number, p: P): Ctx => ({ seed, lw: Math.max(1, W * .005), style: "white", snow: clamp01(num(p, "snow", 0)), night: clamp01(num(p, "night", 0)), plaster: "gofun" });
const VERMILION: UkiyoeFill = { type: "linear", angle: 0, stops: [[0, "beni", 1], [.5, "shu", 1], [1, "beni", 1]] };
const WOOD: UkiyoeFill = { type: "linear", angle: 0, stops: [[0, "cha", 1], [.5, "kincha", 1], [1, "cha", 1]] };
const STONE: UkiyoeFill = { type: "linear", angle: 90, stops: [[0, "usuzumi", 1], [1, "paper", .9]] };
const BRONZE: UkiyoeFill = { type: "linear", angle: 0, stops: [[0, "matsu", 1], [.45, "asagi", 1], [1, "matsu", 1]] };

/** Stone blocks: a platform of squared stones with mortar lines. */
function stones(x0: number, y0: number, w: number, h: number, lw: number, seed: number): Prim[] {
  const lines: string[] = [], rows = Math.max(1, Math.round(h / (w * .06)));
  for (let r = 0; r < rows; r++) {
    const y = y0 - h * r / rows;
    lines.push(`M${f1(x0)} ${f1(y)}h${f1(w)}`);
    for (let x = x0 + (r % 2 ? w * .05 : 0) + w * (.08 + .04 * hash01(seed, r, 1)); x < x0 + w; x += w * (.1 + .05 * hash01(seed, r, Math.round(x)))) lines.push(`M${f1(x)} ${f1(y)}v${f1(-h / rows)}`);
  }
  return [{ t: "fill", d: rectD(x0, y0 - h, w, h), fill: STONE, outline: lw, grain: .7 }, { t: "stroke", d: lines.join(""), color: "sumi", width: lw * .6, opacity: .5 }];
}

/** The bonshō: verdigris bronze, rows of nubs in the upper panels, raised bands, lotus striking seats, dragon loop. */
function bell(top: Pt, w: number, h: number, lw: number): Prim[] {
  const x0 = top[0] - w / 2, y0 = top[1] + h * .08, out: Prim[] = [];
  out.push({ t: "fill", d: smoothD([[top[0] - w * .12, top[1] + h * .1], [top[0] - w * .1, top[1] - h * .02], [top[0], top[1] - h * .08], [top[0] + w * .1, top[1] - h * .02], [top[0] + w * .12, top[1] + h * .1]], true, .4), fill: BRONZE, outline: lw });
  const body = smoothD([[x0 + w * .08, y0 + h * .04], [x0 + w * .2, y0 - h * .02], [x0 + w * .8, y0 - h * .02], [x0 + w * .92, y0 + h * .04], [x0 + w * .97, y0 + h * .86], [x0 + w * 1.02, y0 + h * .96], [x0 - w * .02, y0 + h * .96], [x0 + w * .03, y0 + h * .86]], true, .25);
  out.push({ t: "fill", d: body, fill: BRONZE, outline: lw * 1.3, grain: .5 });
  // Raised bands: two verticals and three horizontals dividing the panels.
  const bands: string[] = [];
  for (const y of [.42, .62, .86]) bands.push(`M${f1(x0 + w * .03)} ${f1(y0 + h * y)}h${f1(w * .94)}`);
  for (const x of [.33, .67]) bands.push(`M${f1(x0 + w * x)} ${f1(y0 + h * .02)}v${f1(h * .84)}`);
  out.push({ t: "stroke", d: bands.join(""), color: "matsu", width: lw * 2.4 }, { t: "stroke", d: bands.join(""), color: "sora", width: lw * .7, opacity: .6 });
  // Nubs (chi) in rows across the upper panels.
  const nubs: string[] = [];
  for (const [a, b] of [[.08, .3], [.38, .62], [.72, .92]]) for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) nubs.push(circleD(x0 + w * lerp(a, b, (k + .5) / 3), y0 + h * (.08 + r * .08), w * .022));
  out.push({ t: "fill", d: nubs.join(""), fill: "asagi", outline: lw * .5 });
  // Two lotus striking seats low down.
  for (const x of [.17, .83]) out.push({ t: "fill", d: ellipseD(x0 + w * x, y0 + h * .74, w * .07, w * .07), fill: "matsu", outline: lw }, { t: "dots", d: [0, 1, 2, 3, 4, 5].map(i => circleD(x0 + w * x + Math.cos(i * 1.05) * w * .045, y0 + h * .74 + Math.sin(i * 1.05) * w * .045, w * .01)).join(""), color: "sora" });
  return out;
}

/**
 * The bell's strikes at a frame: `pull` (0 at rest → 1 drawn fully back; 0 on the strike frame, a little rebound after),
 * the bell's `sway` in degrees (decaying after each hit), and `ring` (frames since the latest strike, −1 if none yet or
 * long faded). The log is drawn back over 18 frames, held, and swung in fast to meet the bell on the strike frame.
 */
export function bellStrike(strikes: readonly number[], frame: number): { pull: number; sway: number; ring: number } {
  let pull = 0, sway = 0, ring = -1;
  for (const s of strikes) {
    const t = frame - s;
    if (t >= -26 && t < 0) pull = Math.max(pull, t < -8 ? (t + 26) / 18 : 1 - ((t + 8) / 8) ** 2);
    if (t >= 0 && t < 30) pull = Math.max(pull, Math.max(0, .35 * Math.sin(Math.PI * t / 14) * Math.exp(-t / 10)));
    if (t >= 0) { sway += Math.exp(-t / 45) * Math.sin(t / 6) * 4; if (t < 70 && (ring < 0 || t < ring)) ring = t; }
  }
  return { pull, sway, ring };
}

/**
 * A belfry (shōrō): a stone platform, four splayed posts tied with beams, an irimoya roof, the bronze bell and the log
 * striker on its ropes. Params: width, height, strikes (frames when the log hits), snow, night.
 */
export function belfry(p: P, cx: C): Prim[] {
  const W = num(p, "width", 240), H = num(p, "height", 320), c = ctx(cx.seed, W, p), lw = c.lw, out: Prim[] = [];
  const strikes = Array.isArray(p.strikes) ? (p.strikes as number[]).filter(n => typeof n === "number") : [];
  out.push(...stones(-W * .6, 0, W * 1.2, H * .1, lw, cx.seed));
  const beamY = -H * .74, sd = W * .16, sk = W * .07;
  // Back posts, then the bell, then the front posts over it.
  const post = (x: number, yTop: number, splay: number): Prim => ({ t: "fill", d: carvedLine([[x - splay, -H * .1], [x, yTop]], W * .05, { taper: "none" }), fill: WOOD, outline: lw, grain: .6 });
  out.push(post(-W * .38 + sd, beamY - sk, -W * .03), post(W * .38 + sd, beamY - sk, W * .03));
  out.push({ t: "fill", d: rectD(-W * .45, beamY - H * .04, W * .9 + sd, H * .04), fill: WOOD, outline: lw });
  const { pull, sway, ring } = bellStrike(strikes, cx.frame);
  const bw = H * .24, bh = H * .4, bellTop: Pt = [sd * .4, beamY + H * .02];
  out.push({ t: "stroke", d: `M${f1(bellTop[0])} ${f1(beamY)}V${f1(bellTop[1])}`, color: "sumi", width: lw * 2 });
  out.push({ t: "group", transform: `rotate(${f1(sway)} ${f1(bellTop[0])} ${f1(bellTop[1])})`, prims: bell([bellTop[0], bellTop[1] + bh * .06], bw, bh, lw) });
  // The striker: a log on two ropes from the beam, at the height of the striking seat, drawn back and swung.
  const logY = bellTop[1] + bh * .78, rest = bellTop[0] + bw * .55 + W * .02, logX = rest + pull * W * .3, logL = W * .32;
  out.push({ t: "stroke", d: `M${f1(rest + W * .02)} ${f1(beamY)}L${f1(logX + W * .02)} ${f1(logY)}M${f1(rest + logL * .8)} ${f1(beamY)}L${f1(logX + logL * .8)} ${f1(logY)}`, color: "kincha", width: lw });
  out.push({ t: "fill", d: rectD(logX, logY - W * .035, logL, W * .07), fill: WOOD, outline: lw, grain: .8 }, { t: "fill", d: ellipseD(logX, logY, W * .02, W * .035), fill: "kincha", outline: lw * .7 });
  if (ring >= 0) {
    // The ringing: arcs spreading out from the bell, fading.
    const rings: string[] = [];
    for (let k = 0; k < 3; k++) { const r = bw * (.7 + (ring + k * 12) * .05); if (ring + k * 12 < 70) rings.push(`M${f1(bellTop[0] - r)} ${f1(bellTop[1] + bh * .5 - r * .5)}A${f1(r)} ${f1(r)} 0 0 0 ${f1(bellTop[0] - r)} ${f1(bellTop[1] + bh * .5 + r * .5)}`); }
    out.push({ t: "stroke", d: rings.join(""), color: "gofun", width: lw * 1.4, opacity: .7 * (1 - ring / 70) });
  }
  out.push(post(-W * .38, beamY, -W * .04), post(W * .38, beamY, W * .04));
  out.push({ t: "fill", d: rectD(-W * .44, -H * .3, W * .88, H * .03), fill: WOOD, outline: lw * .8 });
  out.push(...roof({ x0: -W * .48, w: W * .96, y0: beamY - H * .04, h: 0, sd, sk }, H * .3, c, { top: true }));
  return out;
}

/** A temple hall (hondō): a stone podium and steps, vermilion pillars, latticed doors, a deep tiled roof with a cusped gable. Params: width, height, snow. */
export function hondo(p: P, cx: C): Prim[] {
  const W = num(p, "width", 520), H = num(p, "height", 320), c = ctx(cx.seed, W, p), lw = c.lw, out: Prim[] = [];
  out.push(...stones(-W * .55, 0, W * 1.1, H * .1, lw, cx.seed));
  out.push({ t: "fill", d: smoothD([[-W * .12, H * .0], [W * .12, 0], [W * .1, -H * .1], [-W * .1, -H * .1]], true, .05), fill: "paper", outline: lw });
  out.push({ t: "stroke", d: [1, 2, 3].map(k => `M${f1(-W * .12 + k * W * .005)} ${f1(-H * .1 * k / 4)}h${f1(W * .24 - k * W * .01)}`).join(""), color: "usuzumi", width: lw * .7 });
  const wallTop = -H * .52, sd = W * .14, sk = W * .05, bays = 5, bw = W * .8 / bays;
  out.push({ t: "fill", d: smoothD([[W * .4, -H * .1], [W * .4 + sd, -H * .1 - sk], [W * .4 + sd, wallTop - sk], [W * .4, wallTop]], true, 0), fill: "cha", outline: lw }, { t: "fill", d: smoothD([[W * .4, -H * .1], [W * .4 + sd, -H * .1 - sk], [W * .4 + sd, wallTop - sk], [W * .4, wallTop]], true, 0), fill: "sumi", opacity: .3 });
  for (let i = 0; i < bays; i++) {
    const x = -W * .4 + i * bw;
    out.push({ t: "fill", d: rectD(x, wallTop, bw, -H * .1 - wallTop), fill: i === 2 ? "sumi" : "cha", outline: lw * .7 });
    if (i !== 2) out.push({ t: "stroke", d: Array.from({ length: 6 }, (_, k) => `M${f1(x + bw * (k + .5) / 6)} ${f1(wallTop)}V${f1(-H * .1)}`).join("") + Array.from({ length: 7 }, (_, k) => `M${f1(x)} ${f1(wallTop + (-H * .1 - wallTop) * (k + .5) / 7)}h${f1(bw)}`).join(""), color: "kogecha", width: lw * .6, opacity: .7 });
  }
  for (let i = 0; i <= bays; i++) out.push({ t: "fill", d: rectD(-W * .4 + i * bw - W * .012, wallTop, W * .024, -H * .1 - wallTop), fill: VERMILION, outline: lw });
  out.push({ t: "fill", d: rectD(-W * .42, wallTop - H * .03, W * .84, H * .03), fill: VERMILION, outline: lw });
  // The bell rope and gong over the offering box in the middle bay.
  out.push({ t: "stroke", d: `M0 ${f1(wallTop)}V${f1(-H * .2)}`, color: "beni", width: lw * 2.4 }, { t: "fill", d: ellipseD(0, wallTop + H * .03, W * .03, H * .025), fill: "kin", outline: lw });
  out.push({ t: "fill", d: rectD(-W * .07, -H * .18, W * .14, H * .08), fill: WOOD, outline: lw, grain: .6 });
  out.push(...roof({ x0: -W * .45, w: W * .9, y0: wallTop - H * .03, h: 0, sd, sk }, H * .42, c, { kara: true, gables: 1 }));
  return out;
}

/**
 * A two-storey gate (rōmon): vermilion pillars, the dark opening in the middle bay, a skirt roof, the upper storey with
 * its railed balcony, the top roof. `lantern` hangs Asakusa's great red lantern in the opening; `ruin` (0–1) turns it
 * into the Rashōmon: faded wood, missing tiles, grass on the roofs, the opening black. Params: width, height, snow.
 */
export function gate(p: P, cx: C): Prim[] {
  const W = num(p, "width", 420), H = num(p, "height", 400), c = ctx(cx.seed, W, p), lw = c.lw, out: Prim[] = [], ruin = clamp01(num(p, "ruin", 0));
  const pil: UkiyoeFill = ruin > .5 ? WOOD : VERMILION;
  out.push(...stones(-W * .55, 0, W * 1.1, H * .06, lw, cx.seed));
  const y1 = -H * .42, bw = W * .8 / 3;
  for (let i = 0; i < 3; i++) out.push({ t: "fill", d: rectD(-W * .4 + i * bw, y1, bw, -H * .06 - y1), fill: i === 1 ? "sumi" : ruin > .5 ? "kogecha" : "beni", outline: lw * .7, opacity: i === 1 ? .95 : 1 });
  if (bool(p, "lantern", false) && ruin < .5) {
    // The great red lantern: a tall drum of red paper with black bands, swinging a little.
    const sw = Math.sin(cx.frame / 30) * 1.5, lx = 0, ly = y1 + H * .04;
    out.push({ t: "group", transform: `rotate(${f1(sw)} ${f1(lx)} ${f1(ly)})`, prims: [
      { t: "fill", d: smoothD([[lx - bw * .38, ly + H * .03], [lx - bw * .42, ly + H * .16], [lx - bw * .38, ly + H * .29], [lx + bw * .38, ly + H * .29], [lx + bw * .42, ly + H * .16], [lx + bw * .38, ly + H * .03]], true, .3), fill: { type: "linear", angle: 0, stops: [[0, "beni", 1], [.5, "shu", 1], [1, "beni", 1]] }, outline: lw * 1.2 },
      { t: "fill", d: rectD(lx - bw * .3, ly + H * .1, bw * .6, H * .1), fill: "sumi", opacity: .85 },
      { t: "fill", d: rectD(lx - bw * .4, ly, bw * .8, H * .035) + rectD(lx - bw * .4, ly + H * .28, bw * .8, H * .035), fill: "sumi", outline: lw }] });
  }
  for (let i = 0; i <= 3; i++) out.push({ t: "fill", d: rectD(-W * .4 + i * bw - W * .018, y1, W * .036, -H * .06 - y1), fill: pil, outline: lw, grain: .6 });
  const g: Ctx = { ...c, snow: Math.max(c.snow, ruin * 0) };
  out.push(...roof({ x0: -W * .45, w: W * .9, y0: y1, h: 0, sd: W * .12, sk: W * .04 } as Box, H * .14, g, { long: true }));
  // Upper storey: a railed balcony and the walls.
  const y2 = y1 - H * .12, y3 = y2 - H * .2;
  out.push({ t: "fill", d: rectD(-W * .36, y3, W * .72, y2 - y3), fill: ruin > .5 ? "kogecha" : "beni", outline: lw });
  out.push({ t: "stroke", d: Array.from({ length: 7 }, (_, k) => `M${f1(-W * .36 + W * .72 * (k + .5) / 7)} ${f1(y3 + H * .03)}v${f1(y2 - y3 - H * .06)}`).join(""), color: ruin > .5 ? "usuzumi" : "ki", width: lw * 1.4 });
  out.push({ t: "fill", d: rectD(-W * .42, y2 - H * .02, W * .84, H * .02), fill: pil, outline: lw }, { t: "stroke", d: Array.from({ length: 14 }, (_, k) => `M${f1(-W * .42 + W * .84 * k / 13)} ${f1(y2 - H * .02)}v${f1(-H * .04)}`).join("") + `M${f1(-W * .42)} ${f1(y2 - H * .06)}h${f1(W * .84)}`, color: ruin > .5 ? "kogecha" : "shu", width: lw * 1.4 });
  out.push(...roof({ x0: -W * .4, w: W * .8, y0: y3, h: 0, sd: W * .12, sk: W * .04 } as Box, H * .26, g, { top: true }));
  if (ruin > 0) {
    // Ruin: holes in the tiles, grass and weeds sprouting along the roofs, a crow or two.
    const holes: string[] = [], grass: string[] = [];
    for (let i = 0; i < 9; i++) { const x = -W * .38 + W * .76 * hash01(cx.seed, i, 1), y = (i % 2 ? y1 - H * .08 : y3 - H * .14) + H * .03 * hash01(cx.seed, i, 2); holes.push(ellipseD(x, y, W * .025, H * .012)); }
    for (let i = 0; i < 24; i++) { const x = -W * .48 + W * .96 * hash01(cx.seed, i, 3), y = i % 2 ? y1 - H * .005 : y3 - H * .005, h = H * (.02 + .03 * hash01(cx.seed, i, 4)); grass.push(`M${f1(x)} ${f1(y)}l${f1(-W * .008)} ${f1(-h)}M${f1(x)} ${f1(y)}l${f1(W * .006)} ${f1(-h * .8)}`); }
    out.push({ t: "fill", d: holes.join(""), fill: "sumi", opacity: .85 * ruin }, { t: "stroke", d: grass.join(""), color: "kusa", width: lw, opacity: ruin });
  }
  return out;
}

/** A small mountain shrine (hokora): stone base, a little gabled shrine with crossed finials, the sacred rope and its paper zigzags. Params: width, snow. */
export function hokora(p: P, cx: C): Prim[] {
  const W = num(p, "width", 140), lw = Math.max(1, W * .012), out: Prim[] = [], snow = clamp01(num(p, "snow", 0));
  out.push(...stones(-W * .45, 0, W * .9, W * .18, lw, cx.seed), ...stones(-W * .35, -W * .18, W * .7, W * .14, lw, cx.seed + 1));
  const y0 = -W * .32, h = W * .4;
  out.push({ t: "fill", d: rectD(-W * .28, y0 - h, W * .56, h), fill: WOOD, outline: lw, grain: .7 });
  out.push({ t: "fill", d: rectD(-W * .16, y0 - h * .85, W * .32, h * .7), fill: "sumi", opacity: .7 }, { t: "stroke", d: [1, 2, 3].map(k => `M${f1(-W * .16 + W * .32 * k / 4)} ${f1(y0 - h * .85)}v${f1(h * .7)}`).join(""), color: "kincha", width: lw });
  // Nagare roof: a long sweeping gable of copper gone green, the crossed finials (chigi) at the ridge ends.
  const rt = y0 - h - W * .26;
  out.push({ t: "fill", d: smoothD([[-W * .46, y0 - h + W * .06], [-W * .36, y0 - h - W * .02], [0, rt], [W * .38, y0 - h - W * .02], [W * .5, y0 - h + W * .1], [W * .3, y0 - h + W * .02], [0, rt + W * .06], [-W * .3, y0 - h + W * .02]], true, .3), fill: { type: "linear", angle: 90, stops: [[0, "asagi", 1], [1, "matsu", 1]] }, outline: lw * 1.2 });
  if (snow > 0) out.push({ t: "fill", d: smoothD([[-W * .4, y0 - h + W * .01], [0, rt - W * .02], [W * .42, y0 - h + W * .02], [0, rt + W * .04]], true, .3), fill: "gofun", opacity: snow });
  out.push({ t: "stroke", d: `M${f1(-W * .08)} ${f1(rt - W * .12)}L${f1(W * .06)} ${f1(rt + W * .04)}M${f1(W * .08)} ${f1(rt - W * .12)}L${f1(-W * .06)} ${f1(rt + W * .04)}`, color: "kogecha", width: lw * 2.4 });
  // The shimenawa: a thick twisted straw rope across the front, its paper shide hanging in zigzags, stirring in the wind.
  const ry = y0 - h * .95, rope = smoothD([[-W * .3, ry], [0, ry + W * .05], [W * .3, ry]], false, .5);
  out.push({ t: "stroke", d: rope, color: "kincha", width: W * .035 }, { t: "stroke", d: rope, color: "cha", width: W * .01, dash: `${f1(W * .02)} ${f1(W * .02)}` });
  for (const x of [-.15, 0, .15]) { const sx = x * W + Math.sin(cx.frame / 9 + x * 10) * W * .006 + cx.wind * W * .01, sy = ry + W * .04 - Math.abs(x) * W * .1; out.push({ t: "fill", d: `M${f1(sx)} ${f1(sy)}l${f1(W * .03)} 0l${f1(-W * .015)} ${f1(W * .03)}l${f1(W * .03)} 0l${f1(-W * .015)} ${f1(W * .03)}l${f1(W * .03)} 0l${f1(-W * .045)} ${f1(W * .03)}l${f1(-W * .015)} ${f1(-W * .03)}l${f1(W * .015)} 0l${f1(-W * .015)} ${f1(-W * .03)}l${f1(W * .015)} 0Z`, fill: "gofun", outline: lw * .5 }); }
  return out;
}

/** A stone lantern (tōrō): base, shaft, platform, the firebox (glowing when lit), a curled roof and the jewel finial. Params: height, lit, snow. */
export function toro(p: P, cx: C): Prim[] {
  const H = num(p, "height", 150), lit = clamp01(num(p, "lit", 0)), lw = Math.max(1, H * .01), snow = clamp01(num(p, "snow", 0)), out: Prim[] = [];
  const flick = lit * (.85 + .15 * Math.sin(cx.frame * .7 + cx.seed));
  if (lit > 0) out.push({ t: "glow", cx: 0, cy: -H * .62, r: H * 1.1, color: "ki", opacity: .5 * flick });
  const slab = (y: number, w: number, h: number) => out.push({ t: "fill", d: smoothD([[-w / 2, y], [w / 2, y], [w * .44, y - h], [-w * .44, y - h]], true, .1), fill: STONE, outline: lw, grain: .6 });
  slab(0, H * .5, H * .1);
  out.push({ t: "fill", d: rectD(-H * .07, -H * .48, H * .14, H * .38), fill: STONE, outline: lw, grain: .6 });
  slab(-H * .48, H * .42, H * .07);
  out.push({ t: "fill", d: rectD(-H * .14, -H * .74, H * .28, H * .19), fill: STONE, outline: lw });
  out.push({ t: "fill", d: rectD(-H * .07, -H * .71, H * .14, H * .12), fill: lit > 0 ? "ki" : "sumi", opacity: lit > 0 ? .7 + .3 * flick : .8 });
  out.push({ t: "fill", d: smoothD([[-H * .32, -H * .72], [-H * .24, -H * .8], [0, -H * .9], [H * .24, -H * .8], [H * .32, -H * .72], [H * .2, -H * .76], [-H * .2, -H * .76]], true, .3), fill: STONE, outline: lw * 1.2 });
  if (snow > 0) out.push({ t: "fill", d: smoothD([[-H * .3, -H * .74], [0, -H * .94], [H * .3, -H * .74], [0, -H * .84]], true, .4), fill: "gofun", opacity: snow });
  out.push({ t: "fill", d: smoothD([[-H * .05, -H * .9], [-H * .06, -H * .96], [0, -H * 1.04], [H * .06, -H * .96], [H * .05, -H * .9]], true, .4), fill: STONE, outline: lw });
  return out;
}

/** A graveyard: tall stones on stepped bases (some leaning, mossy), wooden sotoba slats behind, flower cups. Params: width, count, snow. */
export function graves(p: P, cx: C): Prim[] {
  const W = num(p, "width", 500), n = clamp(Math.round(num(p, "count", 7)), 1, 20), lw = Math.max(1, W * .004), out: Prim[] = [], snow = clamp01(num(p, "snow", 0));
  // Sotoba: thin wooden slats with notched tops (the five-element shape) and brushed inscriptions, behind the stones.
  for (let i = 0; i < n * 2; i++) {
    const x = -W * .48 + W * .96 * (i + .5) / (n * 2), h = W * (.11 + .05 * hash01(cx.seed, i, 1)), lean = (hash01(cx.seed, i, 2) - .5) * 8, w = W * .013;
    const slat = `M${f1(-w / 2)} 0L${f1(-w / 2)} ${f1(-h * .86)}l${f1(w * .25)} ${f1(-h * .03)}l${f1(-w * .25)} ${f1(-h * .03)}l${f1(w / 2)} ${f1(-h * .08)}l${f1(w / 2)} ${f1(h * .08)}l${f1(-w * .25)} ${f1(h * .03)}l${f1(w * .25)} ${f1(h * .03)}L${f1(w / 2)} 0Z`;
    out.push({ t: "group", transform: `translate(${f1(x)} ${f1(-W * .02)}) rotate(${f1(lean)})`, prims: [{ t: "fill", d: slat, fill: "paper", outline: lw * .7, grain: .8 }, { t: "stroke", d: [.2, .35, .5, .62].map(u => `M0 ${f1(-h * u)}v${f1(h * .06)}`).join(""), color: "sumi", width: lw, opacity: .6 }] });
  }
  for (let i = 0; i < n; i++) {
    const x = -W * .45 + W * .9 * (i + .5) / n + (hash01(cx.seed, i, 3) - .5) * W * .04, h = W * (.08 + .05 * hash01(cx.seed, i, 4)), w = h * .34, lean = (hash01(cx.seed, i, 5) - .5) * 10 * (hash01(cx.seed, i, 6) > .6 ? 1 : .2);
    const prims: Prim[] = [
      { t: "fill", d: rectD(-w * .9, -h * .1, w * 1.8, h * .1), fill: STONE, outline: lw },
      { t: "fill", d: rectD(-w * .7, -h * .2, w * 1.4, h * .1), fill: STONE, outline: lw },
      { t: "fill", d: smoothD([[-w / 2, -h * .2], [w / 2, -h * .2], [w / 2, -h * .95], [0, -h], [-w / 2, -h * .95]], true, .1), fill: STONE, outline: lw, grain: .7 },
      { t: "stroke", d: [.35, .5, .65, .8].map(u => `M0 ${f1(-h * u)}v${f1(h * .07)}`).join(""), color: "sumi", width: lw * .9, opacity: .55 },
      { t: "fill", d: ellipseD(-w * .2, -h * .3, w * .3, h * .05), fill: "matsu", opacity: .35 },
    ];
    if (snow > 0) prims.push({ t: "fill", d: smoothD([[-w * .55, -h * .95], [0, -h * 1.04], [w * .55, -h * .95], [0, -h * .92]], true, .4), fill: "gofun", opacity: snow });
    if (hash01(cx.seed, i, 7) > .5) prims.push({ t: "fill", d: rectD(w * .6, -h * .22, w * .2, h * .08), fill: "usuzumi", outline: lw * .6 }, { t: "stroke", d: `M${f1(w * .7)} ${f1(-h * .22)}l${f1(-w * .1)} ${f1(-h * .12)}M${f1(w * .7)} ${f1(-h * .22)}l${f1(w * .12)} ${f1(-h * .1)}`, color: "matsu", width: lw });
    out.push({ t: "group", transform: `translate(${f1(x)} 0) rotate(${f1(lean)})`, prims });
  }
  return out;
}

/** A hermit's hut (iori): a small thatched hut on posts, a bamboo-lattice window, a brushwood fence, smoke. Params: width, smoke, snow, light. */
export function hut(p: P, cx: C): Prim[] {
  const W = num(p, "width", 220), lw = Math.max(1, W * .008), out: Prim[] = [], light = clamp01(num(p, "light", 0)), snow = clamp01(num(p, "snow", 0));
  const h = W * .32, y0 = 0;
  out.push({ t: "fill", d: rectD(-W * .36, y0 - h, W * .72, h), fill: "kincha", outline: lw, grain: .8 }, { t: "fill", d: rectD(-W * .36, y0 - h, W * .72, h), fill: "cha", opacity: .35 });
  out.push({ t: "fill", d: rectD(-W * .26, y0 - h * .8, W * .18, h * .8), fill: "sumi", opacity: .85 });
  out.push({ t: "fill", d: rectD(W * .06, y0 - h * .75, W * .2, h * .35), fill: light > 0 ? "ki" : "sumi", opacity: light > 0 ? .9 : .7 });
  out.push({ t: "stroke", d: [1, 2, 3].map(k => `M${f1(W * .06 + W * .05 * k)} ${f1(y0 - h * .75)}v${f1(h * .35)}`).join(""), color: "kogecha", width: lw });
  if (light > 0) out.push({ t: "glow", cx: W * .16, cy: y0 - h * .6, r: W * .4, color: "ki", opacity: .4 * light });
  const top = y0 - h - W * .42;
  out.push({ t: "fill", d: smoothD([[-W * .5, y0 - h + W * .04], [-W * .2, top + W * .08], [0, top], [W * .2, top + W * .08], [W * .5, y0 - h + W * .04], [W * .3, y0 - h], [-W * .3, y0 - h]], true, .3), fill: { type: "linear", angle: 90, stops: [[0, "kogecha", 1], [1, "kincha", 1]] }, outline: lw * 1.2, grain: .9 });
  out.push({ t: "stroke", d: Array.from({ length: 22 }, (_, i) => { const x = -W * .46 + W * .92 * i / 21; return `M${f1(x * .5)} ${f1(top + W * .06)}L${f1(x)} ${f1(y0 - h + W * .03)}`; }).join(""), color: "kogecha", width: lw * .6, opacity: .45 });
  if (snow > 0) out.push({ t: "fill", d: smoothD([[-W * .45, y0 - h + W * .01], [0, top - W * .02], [W * .45, y0 - h + W * .01], [0, top + W * .06]], true, .4), fill: "gofun", opacity: snow });
  // Brushwood fence beside it.
  out.push({ t: "stroke", d: Array.from({ length: 14 }, (_, i) => { const x = W * .42 + i * W * .025; return `M${f1(x)} 0l${f1((hash01(cx.seed, i, 1) - .5) * W * .02)} ${f1(-W * (.14 + .04 * hash01(cx.seed, i, 2)))}`; }).join("") + `M${f1(W * .4)} ${f1(-W * .08)}h${f1(W * .38)}`, color: "kogecha", width: lw * 1.4 });
  if (num(p, "smoke", 0) > 0) {
    const pts: Pt[] = [];
    for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push([W * .05 + Math.sin(u * 5 + cx.frame / 20) * W * .05 * u + cx.wind * u * W * .2, top - u * W * .7]); }
    out.push({ t: "line", d: carvedLine(pts, W * .05, { taper: "end", minRatio: .3, smooth: true }), color: "usuzumi", opacity: .4 });
  }
  return out;
}

export const TEMPLE_MOTIFS = { belfry, hondo, gate, hokora, graves, toro, hut };
export const ANIMATED_TEMPLE = ["belfry", "gate", "hokora", "toro", "hut"] as const;

// ---- Scene recipes -----------------------------------------------------------------------------------------------------------------

export type UkiyoeTempleScene = "bell" | "graveyard" | "rashomon" | "shrine" | "asakusa";
export const UKIYOE_TEMPLE_SCENES: readonly UkiyoeTempleScene[] = ["bell", "graveyard", "rashomon", "shrine", "asakusa"];

/**
 * `bell`: a temple belfry at dusk, the bell struck three times. `graveyard`: a temple graveyard at night with stone
 * lanterns and soul-flames. `rashomon`: the ruined southern gate in the rain. `shrine`: a mountain shrine in snow
 * behind a torii between two lanterns. `asakusa`: the temple hall behind the vermilion gate with its great lantern.
 */
export function templeScene(kind: UkiyoeTempleScene = "bell", frames = 300): UkiyoeSceneSpec {
  const night = kind === "graveyard" || kind === "rashomon", snow = kind === "shrine" ? 1 : 0;
  const nodes: UkiyoeNode[] = [{ id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .5, ...(night ? { top: "yoru", mid: "ai", horizon: "ai" } : snow ? { top: "usuzumi", mid: "paper", horizon: "paper" } : { horizon: "beni" }) } }];
  const ground = (fill: unknown) => nodes.push({ id: "ground", kind: "block", x: 960, y: 1000, shape: { type: "rect", width: 1920, height: 300 }, fill, line: 0 } as unknown as UkiyoeNode);
  const m = (id: string, motif: string, x: number, y: number, params: Record<string, unknown>) => nodes.push({ id, kind: "motif", motif, x, y, params } as unknown as UkiyoeNode);
  if (kind === "bell") {
    m("hills", "hills", 960, 820, { width: 2200, height: 220 });
    ground({ type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] });
    m("hall", "hondo", 1450, 870, { width: 640, height: 380 });
    m("pine", "pine", 280, 900, { height: 560 });
    m("belfry", "belfry", 700, 900, { width: 300, height: 420, strikes: [70, 150, 230] });
  } else if (kind === "graveyard") {
    ground({ type: "linear", angle: 90, stops: [[0, "ai", 1], [1, "yoru", 1]] });
    m("graves", "graves", 960, 880, { width: 1400, count: 9 });
    m("toro1", "toro", 300, 900, { height: 180, lit: 1 });
    m("toro2", "toro", 1640, 900, { height: 180, lit: 1 });
    m("willow", "willow", 1500, 880, { height: 560 });
    for (let i = 0; i < 3; i++) nodes.push({ id: "flame" + i, kind: "creature", species: "hitodama", x: 600 + i * 380, y: 760 - i * 30, look: { size: 44 }, actions: [{ type: "float", start: 0, end: frames, to: (i - 1) * 60 }] } as unknown as UkiyoeNode);
  } else if (kind === "rashomon") {
    ground({ type: "linear", angle: 90, stops: [[0, "usuzumi", 1], [1, "sumi", 1]] });
    m("gate", "gate", 960, 900, { width: 800, height: 760, ruin: 1 });
    nodes.push({ id: "rain", kind: "particles", type: "rain", count: 260, angle: 10 } as unknown as UkiyoeNode);
    nodes.push({ id: "crow", kind: "creature", species: "crow", x: 760, y: 300, scale: 1.4, actions: [{ type: "stand", start: 0, end: frames }] } as unknown as UkiyoeNode);
  } else if (kind === "shrine") {
    m("pines", "pine", 1600, 860, { height: 600, snow: 1 });
    ground("gofun");
    m("shrine", "hokora", 1000, 780, { width: 280, snow: 1 });
    m("torii", "torii", 1000, 960, { width: 520, height: 400, snow: 1 });
    m("toro1", "toro", 640, 960, { height: 170, snow: 1 });
    m("toro2", "toro", 1360, 960, { height: 170, snow: 1 });
    nodes.push({ id: "snowfall", kind: "particles", type: "snow", count: 140 } as unknown as UkiyoeNode);
  } else {
    ground({ type: "linear", angle: 90, stops: [[0, "paper", 1], [1, "kincha", 1]] });
    m("pagoda", "pagoda", 1650, 880, { height: 640 });
    m("hall", "hondo", 1180, 820, { width: 600, height: 360 });
    m("gate", "gate", 520, 960, { width: 620, height: 600, lantern: true });
  }
  return { version: 1, id: `temple-${kind}`, width: 1920, height: 1080, durationFrames: frames, seed: 43, cadence: 2, palette: { preset: night ? "night" : snow ? "snow" : "edo" }, wind: { base: .3, turbulence: .3 }, nodes };
}
