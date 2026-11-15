/**
 * UKIYO1 yōkai and ghosts, drawn after the prints and scrolls that fixed their look: Toriyama Sekien's snow woman,
 * Maruyama Ōkyo's ghost, Hokusai's lantern ghost, and the umbrella and lantern spirits of the hundred-demon parades.
 *
 * - yukionna: the snow woman. A tall white figure whose robe dissolves into trailing snow, long black hair streaming in
 *   the wind, a pale face and red lips; `blow` sends out her freezing breath, snow swirls round her.
 * - yurei: a ghost of the dead. The white burial robe (closed right over left), the paper triangle on the brow, long
 *   loose hair, forearms raised with the hands hanging limp; she fades out below the waist, soul-flames circling her.
 * - kasaobake: an old paper umbrella with one great eye and a lolling tongue, hopping on its single leg in a geta.
 * - chochinobake: a paper lantern torn open into a grin with a long tongue, its light flickering, swaying on its hook.
 * - hitodama: a soul-flame, blue-white, its tail wavering as it drifts.
 *
 * Every pose is a pure function of the frame. Origin: the ground point under the figure (ghosts hover above it);
 * authored facing right.
 */
import type { Pt } from "./ukiyoe-core";
import { add, carvedLine, clamp01, hash01, hashSigned, lerp, noise1, polar, polyD, smooth, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";
import { akaname } from "./ukiyoe-folkyokai";
import type { UkiyoeGiant } from "./ukiyoe-giants";
import { drawGiant, UKIYOE_GIANTS } from "./ukiyoe-giants";

export type UkiyoeYokai = "yukionna" | "yurei" | "rokurokubi" | "kasaobake" | "chochinobake" | "hitodama" | "kappa" | "tengu" | "karasutengu" | "nurikabe" | "tsuchigumo" | "okiku" | "akaname" | UkiyoeGiant;
export const UKIYOE_YOKAI: readonly UkiyoeYokai[] = ["yukionna", "yurei", "rokurokubi", "kasaobake", "chochinobake", "hitodama", "kappa", "tengu", "karasutengu", "nurikabe", "tsuchigumo", "okiku", "akaname", ...UKIYOE_GIANTS];

/** What the yōkai drawing needs to know about the creature's actions at this frame. */
export interface YokaiState {
  /** Weight 0..1 of an action type and the frames since it began. */
  w: (type: string) => { w: number; t: number; len: number };
  moving: boolean;
  dist: number;
}
export interface YokaiLook { color?: UkiyoePaint; accent?: UkiyoePaint; size?: number; flames?: number }

const lerp2 = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
/** A quadratic curve through three points, sampled. */
function curve(a: Pt, b: Pt, c: Pt, n = 10): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]); }
  return out;
}
/** A tapered ribbon along a spine: width w0 at the start to w1 at the end (both sides), as a closed path. */
function ribbon(spine: readonly Pt[], w0: number, w1: number, profile: (u: number) => number = () => 1): string {
  const L: Pt[] = [], R: Pt[] = [];
  spine.forEach((q, i) => {
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(spine.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u = i / (spine.length - 1);
    const w = lerp(w0, w1, u) * profile(u) / 2, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
    L.push([q[0] + nx * w, q[1] + ny * w]); R.push([q[0] - nx * w, q[1] - ny * w]);
  });
  return smoothD([...L, ...R.reverse()], true, .35);
}
/** A soul-flame: a round head with a wavering tail, blue-white, glowing. */
function soulFlame(c: Pt, r: number, frame: number, seed: number, color: UkiyoePaint = "sora"): Prim[] {
  const fl = .8 + .2 * Math.abs(noise1(seed, frame / 3));
  const tail: Pt[] = [];
  for (let i = 0; i <= 8; i++) { const u = i / 8; tail.push([c[0] - r * (.2 + 2.6 * u) + Math.sin(frame / 6 + u * 4 + seed) * r * .5 * u, c[1] - r * (.6 + 1.6 * u) + Math.cos(frame / 7 + u * 3) * r * .2 * u]); }
  const body = ribbon([c, ...tail], r * 2 * fl, r * .1, u => u < .15 ? 1 : 1 - (u - .15) * .6);
  return [{ t: "glow", cx: c[0], cy: c[1], r: r * 3.4, color, opacity: .5 * fl },
    { t: "fill", d: body, fill: { type: "linear", angle: 0, stops: [[0, "gofun", .95], [.5, color, .8], [1, color, .1]] }, noPrint: true },
    { t: "fill", d: circleD(c[0] + r * .15, c[1] + r * .05, r * .55), fill: "gofun", opacity: .9, noPrint: true },
    // An inner tongue of flame licking back from the core, and a few sparks shed from the tail.
    { t: "fill", d: ribbon([add(c, [r * .1, 0]), ...tail.slice(0, 4).map(q => lerp2(c, q, .7))], r * .7 * fl, r * .05), fill: "gofun", opacity: .55, noPrint: true },
    { t: "dots", d: [0, 1, 2, 3, 4].map(i => { const life = (frame / 30 + i / 5) % 1, q = tail[Math.min(8, 3 + Math.floor(life * 6))]; return circleD(q[0] - life * r * 1.5, q[1] - life * r + Math.sin(frame / 5 + i) * r * .3, r * .12 * (1 - life)); }).join(""), color: "gofun", opacity: .8 }];
}
/** Snowflakes drifting and swirling in a loose cloud around a point. */
function snowSwirl(c: Pt, rx: number, ry: number, n: number, frame: number, seed: number, opacity = 1): Prim {
  const dots: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = frame / (40 + 30 * hash01(seed, i)) + hash01(seed, i, 2) * 6.3, rr = .4 + .6 * hash01(seed, i, 3);
    const x = c[0] + Math.cos(a) * rx * rr - (frame * (.6 + hash01(seed, i, 5)) % (rx * 2)) * .2, y = c[1] + Math.sin(a * 1.3) * ry * rr + ((frame * .4 + hash01(seed, i, 6) * ry) % ry) * .3;
    dots.push(circleD(x, y, .8 + 1.8 * hash01(seed, i, 4)));
  }
  return { t: "dots", d: dots.join(""), color: "gofun", opacity };
}

// ---- Women of the snow and of the dead -------------------------------------------------------------------------------------------------

/**
 * The robed spirit women share one construction: hair mass behind, far sleeve, the robe (dissolving below), the obi,
 * the face in profile with its front hair, then the near sleeve and hand. `kind` decides the robe's end (snow tendrils
 * or a fade), the hair (streaming back or hanging forward), the arms and the face.
 */
function spiritWoman(kind: "yukionna" | "yurei" | "rokurokubi", look: YokaiLook, s: YokaiState, frame: number, wind: number, seed: number): Prim[] {
  const H = look.size ?? 190, out: Prim[] = [], line = Math.max(.8, H / 190 * 1.1);
  const rk = kind === "rokurokubi";
  const robe = look.color ?? (rk ? "beni" : "gofun"), shade = look.accent ?? (kind === "yukionna" ? "sora" : rk ? "murasaki" : "usuzumi"), skin = rk ? "hada" : "gofun";
  const snowW = kind === "yukionna";
  // The rokurokubi is a living woman who stands on the ground; the spirits hover.
  const hover = rk ? 0 : H * .1 + Math.sin(frame / 22 + seed) * H * .018, sway = (Math.sin(frame / 31 + seed) * 1.4 + wind * 2.5) * (rk ? .3 : 1);
  const blow = s.w("blow"), beckonW = s.w("beckon").w;
  // Authored in heights: u across (facing right), v up from the hem line (negative), the figure leaning with the sway.
  const P = (u: number, v: number): Pt => [u * H + (-v) * sway * .012 * H, -hover + v * H];
  const gust = snowW ? clamp01(Math.abs(wind) * .5 + .45) : .08, wv = (u: number, k = 1) => Math.sin(frame / 11 - u * 5 + seed) * u * .03 * k;
  if (snowW) out.push({ t: "glow", cx: P(0, -.6)[0], cy: P(0, -.6)[1], r: H * .7, color: "sora", opacity: .3 });
  // ---- Hair behind: a full mass from the crown down the back; the snow woman's lifts and streams on the wind into
  // separate locks, the ghost's hangs heavy and straight. (The rokurokubi's hair is dressed up, and goes with her head.)
  if (!rk) {
    const L: Pt[] = [], R2: Pt[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, lift = snowW ? gust * t ** 1.6 : 0;
      const cx = lerp(-.005, -.09, Math.min(1, t * 1.6)) - lift * .34 + wv(t, snowW ? 1.6 : .3), cy = lerp(-.985, -.5, t) + lift * .2 * (1 - t * .3) + (snowW ? Math.cos(frame / 13 + t * 4) * t * .015 : 0);
      const w = (.05 + .06 * Math.sin(Math.PI * Math.min(1, t * 1.15 + .1)) ** .7) * (snowW ? 1 + gust * .4 * t : 1);
      const ang = Math.atan2(.48 - lift * .2, -.09 - lift * .34) + Math.PI / 2;
      L.push(P(cx + Math.cos(ang) * w * .5, cy + Math.sin(ang) * w * .5)); R2.push(P(cx - Math.cos(ang) * w * .5, cy - Math.sin(ang) * w * .5));
    }
    const dir: Pt = [L[14][0] - L[12][0] + R2[14][0] - R2[12][0], L[14][1] - L[12][1] + R2[14][1] - R2[12][1]];
    // Ending in locks: pointed strands fanning from the mass's end.
    const locks: Pt[] = [];
    for (let k = 0; k <= 6; k++) {
      const base = lerp2(R2[14], L[14], k / 6), len = H * (.05 + .07 * hash01(seed, k, 1)) * (snowW ? 1 + gust : .7), spread = (k / 6 - .5) * .7;
      const a = Math.atan2(dir[1], dir[0]) + spread + Math.sin(frame / 9 + k) * .12;
      locks.push(base, [base[0] + Math.cos(a) * len, base[1] + Math.sin(a) * len]);
    }
    const mass = polyD([...smoothPtsY(L), ...locks, ...smoothPtsY(R2).reverse()]);
    out.push({ t: "fill", d: mass, fill: "sumi", outline: line * .5 });
    const strands: string[] = [];
    for (let k = 1; k < 7; k++) strands.push(smoothD(L.slice(1, 14).map((q, i) => lerp2(q, R2[i + 1], k / 7)), false, .4));
    out.push({ t: "stroke", d: strands.join(""), color: "usuzumi", width: .6, opacity: .45 });
    if (snowW) {
      const loose: string[] = [];
      for (let k = 0; k < 5; k++) { const a = L[5 + k * 2], b = add(a, [-H * (.07 + .05 * k) * gust, -H * (.02 + .02 * Math.sin(frame / 7 + k))]); loose.push(carvedLine(curve(a, add(lerp2(a, b, .5), [0, -H * .02]), b, 6), Math.max(.7, H * .004), { taper: "end", minRatio: .1 })); }
      out.push({ t: "fill", d: loose.join(""), fill: "sumi", opacity: .85 });
    }
  }
  // ---- Sleeves: soft drapes hanging from the forearm; `cuff` and `elbow` decide where the arm is.
  const drape = (shoulder: Pt, elbow: Pt, cuff: Pt, drop: number, back: number): { d: string; folds: string } => {
    const dn = (q: Pt, k: number): Pt => [q[0] - back * H * k, q[1] + drop * H * k];
    const pts: Pt[] = [shoulder, add(elbow, [0, -H * .02]), add(cuff, [0, -H * .015]), add(cuff, [H * .01, H * .02]), dn(cuff, .85), dn(lerp2(cuff, elbow, .5), 1.04), dn(elbow, .95), add(dn(elbow, .5), [-H * .03, 0]), add(shoulder, [-H * .035, H * .05])];
    const folds = [.3, .62].map(f => { const a = lerp2(elbow, cuff, f), b = dn(lerp2(elbow, cuff, f + .05), .85); return `M${a[0].toFixed(1)} ${(a[1] + H * .02).toFixed(1)}Q${(lerp(a[0], b[0], .5) - H * .01).toFixed(1)} ${lerp(a[1], b[1], .5).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`; }).join("");
    return { d: smoothD(pts, true, .3), folds };
  };
  // Arm poses: the snow woman's hands rest together at the breast, lift to her lips to breathe, or reach out; the
  // ghost's forearms are raised before her, the hands hanging limp from the wrists.
  const rest: Pt = [.12, -.63], toLips: Pt = [.115, -.8], reachOut: Pt = [.2, -.66], ghostArm: Pt = [.2, -.69];
  let cuffN = snowW || rk ? lerp2(lerp2(rest, toLips, blow.w), reachOut, beckonW) : ghostArm;
  cuffN = [cuffN[0] + wv(.4) * .3, cuffN[1]];
  const elbowN: Pt = snowW || rk ? lerp2([.06, -.6], [.07, -.64], blow.w) : [.08, -.66];
  const far = drape(P(-.03, -.745), P(elbowN[0] - .06, elbowN[1] + .01), P(cuffN[0] - .055, cuffN[1] + .01), .17, .015 + gust * .02);
  out.push({ t: "fill", d: far.d, fill: robe, outline: line }, { t: "fill", d: far.d, fill: shade, opacity: .4, noPrint: true });
  // ---- Robe: an S-curve from the collar over the breast, in at the waist, sweeping out over the hips and down; the
  // snow woman's hem tears into tendrils of snow trailing on the wind, the ghost's fades away.
  const front: Pt[] = [P(.035, -.775), P(.075, -.735), P(.1, -.66), P(.086, -.56), P(.098, -.46), P(.112, -.34), P(.11, -.24)];
  const backL: Pt[] = [P(-.105 - gust * .03, -.22), P(-.1, -.36), P(-.088, -.48), P(-.082, -.58), P(-.08, -.68), P(-.055, -.75)];
  // The rokurokubi's kimono reaches the ground, the hem flaring a little over the feet.
  const robeD = rk ? smoothD([...front, P(.12, -.12), P(.14, -.01), P(.06, 0), P(-.1, 0), P(-.11, -.1), ...backL], true, .4)
    : snowW ? smoothD([...front, P(.04, -.19), P(-.05, -.2), ...backL], true, .4) : smoothD([...front, P(.1, -.06), P(-.08, -.05), ...backL], true, .4);
  const fade = rk ? [[0, robe, 1], [1, robe, 1]] : snowW ? [[0, robe, 1], [.6, robe, 1], [.9, shade, .85], [1, shade, .6]] : [[0, robe, .96], [.4, robe, .92], [.72, robe, .35], [1, robe, 0]];
  out.push({ t: "stroke", d: robeD, color: "sumi", width: line * 2, opacity: snowW || rk ? 1 : .5 });
  out.push({ t: "fill", d: robeD, fill: { type: "linear", angle: 90, stops: fade as [number, UkiyoePaint, number][] }, noPrint: !rk, ...(rk ? { pattern: { type: "kanoko" as const, color: "gofun", scale: .55, opacity: .8 }, grain: .4 } : {}) });
  if (rk) out.push({ t: "fill", d: smoothD([P(.06, -.02), P(.13, -.02), P(.15, .0), P(.05, .0)], true, .4) + smoothD([P(-.02, -.015), P(.05, -.015), P(.06, 0), P(-.03, 0)], true, .4), fill: "gofun", outline: line * .7 });
  if (snowW) {
    const tendrils: string[] = [];
    for (let k = 0; k < 7; k++) {
      const u = k / 6, root = P(lerp(.1, -.1, u), -.24 + Math.sin(u * Math.PI) * .04), len = H * (.26 + .16 * hash01(seed, k, 9)) * (1 + gust * .4);
      const mid = add(root, [-len * .42 + Math.sin(frame / 10 + k) * H * .02, len * .26]), tip = add(root, [-len + Math.sin(frame / 8 + k * 1.7) * H * .04, len * .3 + Math.cos(frame / 12 + k) * H * .03]);
      tendrils.push(ribbon(curve(root, mid, tip, 12), H * (.08 - .015 * Math.abs(u - .5)), H * .003, v => 1 - v * .15));
    }
    out.push({ t: "fill", d: tendrils.join(""), fill: { type: "linear", angle: 0, stops: [[0, shade, 0], [.45, robe, .5], [1, robe, .95]] }, noPrint: true },
      { t: "stroke", d: tendrils.join(""), color: "sora", width: .6, opacity: .45 });
  }
  // Folds down the skirt, bending back with the trail; the underlayer showing at the front edge; collar and sash.
  const folds: string[] = [];
  for (let k = 0; k < 4; k++) folds.push(smoothD([P(.07 - k * .045, -.47), P(.08 - k * .05 - gust * .02, -.33), P(.07 - k * .06 - gust * .07, -.2)], false, .4));
  out.push({ t: "stroke", d: folds.join(""), color: snowW ? "ai" : "usuzumi", width: .7, opacity: snowW ? .45 : .3 });
  out.push({ t: "line", d: carvedLine([P(.083, -.6), P(.09, -.46), P(.106, -.3), P(.108, -.22)], H * .012, { taper: "end", minRatio: .2, smooth: true }), color: shade, opacity: .8 });
  // The living close the robe left over right; the dead, right over left.
  out.push({ t: "line", d: carvedLine(snowW || rk ? [P(.058, -.765), P(.06, -.7), P(.098, -.62)] : [P(-.005, -.77), P(.05, -.71), P(.098, -.62)], H * .015, { taper: "both", minRatio: .3, smooth: true }), color: snowW ? "hanada" : rk ? "gofun" : "usuzumi", opacity: .75 });
  out.push({ t: "fill", d: smoothD([P(-.086, -.575), P(.088, -.585), P(.09, -.515), P(-.085, -.505)], true, .3), fill: snowW ? "sora" : rk ? "kin" : "gofun", outline: line * .8, opacity: snowW || rk ? 1 : .85, ...(rk ? { pattern: { type: "asanoha" as const, color: "kincha", scale: .4, opacity: .7 } } : {}) });
  // ---- Head and neck: a long neck, the long oval face of a bijin in profile — small nose, a long narrow eye, small
  // lips; the ghost gaunt and grey with the paper triangle on her brow.
  // The rokurokubi's neck stretches: the head rises on a thin, swaying S of neck, turning to look down and about.
  const stretch = s.w("stretch"), len = rk ? H * .85 * smooth(clamp01(stretch.t / Math.max(1, stretch.len * .45))) * stretch.w : 0;
  const Dh: Pt = len > .5 ? [Math.sin(frame / 23 + seed) * len * .3 + len * .25, -len * .8 + Math.cos(frame / 29 + seed) * len * .06] : [0, 0];
  const F = (u: number, v: number): Pt => add(P(.03 + u, -.885 + v), Dh);
  if (len > .5) {
    const base = P(.04, -.77), top = F(0, .05), c1 = add(lerp2(base, top, .33), [Math.sin(frame / 17 + seed) * len * .35, 0]), c2 = add(lerp2(base, top, .7), [-Math.sin(frame / 17 + seed + 1.3) * len * .3, 0]);
    const spine: Pt[] = [];
    for (let i = 0; i <= 24; i++) { const t2 = i / 24, u = 1 - t2; spine.push([u * u * u * base[0] + 3 * u * u * t2 * c1[0] + 3 * u * t2 * t2 * c2[0] + t2 * t2 * t2 * top[0], u * u * u * base[1] + 3 * u * u * t2 * c1[1] + 3 * u * t2 * t2 * c2[1] + t2 * t2 * t2 * top[1]]); }
    out.push({ t: "fill", d: ribbon(spine, H * .05, H * .04, u => u < .1 ? 1.15 - u * 1.5 : 1), fill: skin, outline: line * .8 });
    out.push({ t: "stroke", d: smoothD(spine.slice(2, -2).map(q => add(q, [-H * .01, 0])), false, .4), color: "cha", width: .7, opacity: .3 });
  } else {
    const neck = ribbon([P(.04, -.83), P(.036, -.77)], H * .042, H * .048);
    out.push({ t: "fill", d: neck, fill: skin, outline: line * .7 });
  }
  if (rk) {
    // Dressed hair: the shimada bun behind and above, the side wings, a comb and hairpins (kanzashi).
    out.push({ t: "fill", d: smoothD([F(-.075, .0), F(-.095, -.035), F(-.07, -.065), F(-.03, -.06), F(-.03, -.01)], true, .4), fill: "sumi", outline: line * .5 });
    out.push({ t: "fill", d: smoothD([F(-.06, -.07), F(-.045, -.115), F(.0, -.125), F(.03, -.1), F(.0, -.075)], true, .45), fill: "sumi", outline: line * .5 });
    out.push({ t: "fill", d: smoothD([F(-.035, -.078), F(.025, -.083), F(.022, -.07), F(-.03, -.066)], true, .3), fill: "beni", outline: line * .5 });
    out.push({ t: "line", d: carvedLine([F(-.08, -.11), F(.04, -.125)], Math.max(.8, H * .005), { taper: "none" }), color: "kin" });
    out.push({ t: "dots", d: circleD(...F(.045, -.127), H * .007) + circleD(...F(-.085, -.108), H * .006), color: "beni" });
  }
  const face: Pt[] = [F(-.03, -.07), F(.025, -.064), F(.05, -.042), F(.064, -.012), F(.072, .006), F(.066, .014), F(.069, .024), F(.064, .03), F(.067, .037), F(.06, .048), F(.045, .058), F(.015, .062), F(-.025, .045), F(-.04, 0)];
  out.push({ t: "fill", d: smoothD(face, true, .32), fill: skin });
  out.push({ t: "line", d: carvedLine(smoothPtsY(face.slice(0, 12)), Math.max(.7, H * .005), { taper: "both", minRatio: .3, smooth: true }), color: "sumi" });
  if (snowW || rk) out.push({ t: "fill", d: smoothD([F(-.02, .03), F(.03, .04), F(.01, .06)], true, .5), fill: rk ? "sakura" : "sora", opacity: .35, noPrint: true });
  else out.push({ t: "fill", d: smoothD([F(0, .0), F(.045, .02), F(.035, .05), F(-.005, .045)], true, .5), fill: "usuzumi", opacity: .25, noPrint: true });
  const blink = ((frame + seed * 7) % 160) < 6, ex = .037, ey = -.012, ew = .022;
  out.push({ t: "line", d: carvedLine([F(ex - ew * .7, ey - .001), F(ex, ey - (blink ? .0005 : .004)), F(ex + ew * .55, ey + .003)], Math.max(.8, H * .0055), { taper: "both", minRatio: .25, smooth: true }), color: "sumi" });
  if (!blink) out.push({ t: "fill", d: ellipseD(...F(ex + .004, ey + .002), H * .005, H * .0028), fill: "sumi", opacity: snowW ? .95 : .7 });
  out.push({ t: "line", d: carvedLine([F(ex - ew * .6, ey - .02), F(ex + ew * .1, ey - .025), F(ex + ew * .55, ey - .02)], Math.max(.5, H * .003), { taper: "both" }), color: "sumi", opacity: .6 });
  if (snowW || rk) out.push({ t: "fill", d: ellipseD(...F(.066, .032), H * .0055, H * .0035), fill: "beni", noPrint: true });
  else out.push({ t: "line", d: carvedLine([F(.056, .032), F(.066, .034)], Math.max(.5, H * .003)), color: "sumi", opacity: .8 });
  // Front hair: the forelock over the brow and side locks falling in front of the shoulder; the ghost's falls forward
  // in a curtain across her cheek.
  const fh: Pt[] = rk
    ? [F(-.045, -.03), F(-.03, -.08), F(.02, -.082), F(.05, -.055), F(.03, -.05), F(.005, -.045), F(-.008, -.01), F(-.015, .03), F(-.035, .04)]
    : snowW
    ? [F(-.045, -.03), F(-.03, -.08), F(.02, -.082), F(.05, -.055), F(.03, -.05), F(.005, -.045), F(-.008, -.01), F(-.012, .04), P(.03 + wv(.3), -.76), P(.045 + wv(.4), -.7), P(.025 + wv(.4), -.71), P(.0, -.79), F(-.035, .04)]
    : [F(-.045, -.03), F(-.03, -.085), F(.025, -.085), F(.058, -.05), F(.05, .0), F(.042, .04), P(.085 + wv(.4, .3), -.7), P(.078 + wv(.5, .3), -.64), P(.06, -.66), F(.012, .04), F(-.01, .0), F(-.03, .04)];
  out.push({ t: "fill", d: smoothD(fh, true, .32), fill: "sumi", outline: line * .5 });
  if (!snowW && !rk) {
    out.push({ t: "fill", d: polyD([F(.006, -.07), F(.03, -.118), F(.052, -.064)]), fill: "gofun", outline: line * .7 });
    const wisps: string[] = [];
    for (let k = 0; k < 7; k++) { const a = F(.02 + k * .006, -.05 + k * .012), b = add(a, [H * (.012 + .012 * hash01(seed, k, 21)) + Math.sin(frame / 15 + k) * H * .004, H * (.06 + .06 * hash01(seed, k, 22))]); wisps.push(carvedLine(curve(a, add(lerp2(a, b, .5), [H * .006, 0]), b, 5), Math.max(.5, H * .0035), { taper: "end", minRatio: .1 })); }
    out.push({ t: "fill", d: wisps.join(""), fill: "sumi", opacity: .9 });
  }
  // ---- Near sleeve and hand, over the body.
  const near = drape(P(.045, -.74), P(...elbowN), P(...cuffN), .16, .01 + gust * .02);
  out.push({ t: "fill", d: near.d, fill: robe, outline: line });
  out.push({ t: "fill", d: near.d, fill: { type: "linear", angle: 90, stops: [[0, shade, 0], [.6, shade, .15], [1, shade, .4]] }, noPrint: true });
  out.push({ t: "stroke", d: near.folds, color: snowW ? "ai" : "usuzumi", width: .7, opacity: .45 });
  const cuffW = P(...cuffN);
  if (snowW || rk) {
    const handA = blow.w > .3 ? -70 : beckonW > .3 ? 20 : -10, tip = polar(cuffW, handA, H * .04);
    out.push({ t: "fill", d: ribbon(curve(cuffW, lerp2(cuffW, tip, .5), tip, 5), H * .022, H * .008), fill: skin, outline: line * .6 });
  } else {
    // Limp hands, hanging from the wrists, fingers together.
    const hang = curve(cuffW, add(cuffW, [H * .02, H * .008]), add(cuffW, [H * .026, H * .05]), 6);
    out.push({ t: "fill", d: ribbon(hang, H * .022, H * .01), fill: skin, outline: line * .6 });
    const farHang = curve(add(cuffW, [-H * .05, -H * .01]), add(cuffW, [-H * .03, -H * .002]), add(cuffW, [-H * .024, H * .04]), 6);
    out.push({ t: "fill", d: ribbon(farHang, H * .02, H * .009), fill: skin, outline: line * .6, opacity: .85 });
  }
  // ---- The freezing breath, the swirling snow; the ghost's soul-flames.
  if (snowW && blow.w > .05) {
    const mouth = F(.072, .032), puffs: string[] = [], streaks: string[] = [];
    for (let i = 0; i < 50; i++) {
      const life = ((blow.t * (.8 + .5 * hash01(seed, i, 31)) / 26) + hash01(seed, i, 32)) % 1, spread = (hash01(seed, i, 33) - .5) * .55;
      const x = mouth[0] + life * H * .95, y = mouth[1] + life * H * .9 * spread + Math.sin(life * 7 + i) * H * .015;
      puffs.push(circleD(x, y, (.8 + 2.4 * hash01(seed, i, 34)) * (1 - life * .5)));
      if (i % 4 === 0) streaks.push(`M${x.toFixed(1)} ${y.toFixed(1)}l${(H * .045 * (1 - life)).toFixed(1)} ${(H * .045 * spread * (1 - life)).toFixed(1)}`);
    }
    // A cone of cold light behind the frost so the white breath reads on snow as well as against the night.
    const cone = polyD([mouth, add(mouth, [H * .95, -H * .3]), add(mouth, [H * 1.05, H * .32])]);
    out.push({ t: "fill", d: cone, fill: { type: "linear", angle: 0, stops: [[0, "hanada", .35 * blow.w], [1, "hanada", 0]] }, noPrint: true });
    out.push({ t: "glow", cx: mouth[0] + H * .3, cy: mouth[1], r: H * .4 * blow.w, color: "hanada", opacity: .35 * blow.w });
    out.push({ t: "dots", d: puffs.join(""), color: "gofun", opacity: .95 * blow.w }, { t: "stroke", d: streaks.join(""), color: "sora", width: .9, opacity: .8 * blow.w });
  }
  if (snowW) out.push(snowSwirl(P(0, -.5), H * .55, H * .45, 36, frame, seed + 3, .85));
  else if (!rk) for (let f = 0; f < (look.flames ?? 2); f++) {
    const a = frame / 34 + f * Math.PI, c: Pt = P(Math.cos(a) * .22 + .04, -.55 + Math.sin(a * 1.4) * .12);
    out.push(...soulFlame(c, H * .03, frame, seed + f * 9));
  }
  return out;
}
/**
 * Okiku of the plate mansion, after Hokusai's *Sarayashiki*: she rises out of the well where she was thrown, her neck a
 * long coil of the blue-and-white plates she was accused of losing, her black hair streaming down beside it, a white
 * face in profile breathing out a curl of cold vapour. The origin is the well's mouth (place her on a `well` motif's
 * mouth). `appear` raises her out of the well; she sways while she hovers; `howl` moves her lips as she counts the plates.
 */
function okiku(look: YokaiLook, s: YokaiState, frame: number, wind: number, seed: number): Prim[] {
  const H = look.size ?? 220, out: Prim[] = [], line = Math.max(.8, H / 190 * 1.1);
  const ap = s.w("appear"), rise = ap.w > 0 ? smooth(clamp01(ap.t / Math.max(1, ap.len))) : 1, sway = Math.sin(frame / 37 + seed) * H * .05 + wind * H * .04;
  // The coil: an S rising from the well, its top bending forward under the head.
  const top: Pt = [H * .18 + sway, -H * rise], spine: Pt[] = [];
  for (let i = 0; i <= 30; i++) {
    const u = i / 30, y = -H * rise * u;
    spine.push([Math.sin(u * Math.PI * 1.6 + frame / 41 + seed) * H * .09 * (1 - u * .3) + top[0] * u ** 2, y]);
  }
  // Hair behind the coil: a heavy mass from the crown down beside it to the water, its back edge rippling.
  const back: Pt[] = [], front: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const u = i / 18, q = spine[Math.round(30 - u * 30)], ripple = Math.sin(u * 9 - frame / 9 + seed) * H * .015 * u;
    back.push([q[0] - H * (.09 + .1 * u) + ripple - wind * H * .05 * u, q[1] + H * .03]);
    front.push([q[0] + H * (.03 + .04 * u) + ripple * .5, q[1] + H * .03]);
  }
  out.push({ t: "fill", d: smoothD([...back, ...front.reverse()], true, .35), fill: "sumi", outline: line * .5 });
  const strands: string[] = [];
  for (let k = 1; k < 5; k++) strands.push(smoothD(back.map((q, i) => lerp2(q, front[18 - i] ?? q, k / 5)), false, .4));
  out.push({ t: "stroke", d: strands.join(""), color: "usuzumi", width: .6, opacity: .4 });
  // Plates stacked up the coil, each a white dish with blue rings and a painted centre, set across the coil and
  // overlapping the one below.
  for (let i = 0; i < 17; i++) {
    const u = (i + .5) / 17, q = spine[Math.min(30, Math.round(u * 30))], q2 = spine[Math.min(30, Math.round(u * 30) + 1)];
    if (-q[1] > H * rise - H * .12) break;
    const a = Math.atan2(q2[1] - q[1], q2[0] - q[0]) * 180 / Math.PI + 90, rx = H * (.11 - .035 * u), ry = H * .036;
    const t = `translate(${q[0].toFixed(1)} ${q[1].toFixed(1)}) rotate(${a.toFixed(1)})`;
    out.push({ t: "group", transform: t, prims: [
      { t: "fill", d: ellipseD(0, 0, rx, ry), fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [1, "sora", 1]] }, outline: line * .8 },
      { t: "stroke", d: ellipseD(0, 0, rx * .82, ry * .7), color: "ai", width: line * 1.4, opacity: .9 },
      { t: "fill", d: ellipseD(0, -ry * .1, rx * .42, ry * .3), fill: "ai", opacity: .75 },
      { t: "stroke", d: [-.6, -.2, .2, .6].map(k => `M${(rx * k).toFixed(1)} ${(-ry * .55).toFixed(1)}l${(rx * .06).toFixed(1)} ${(ry * .2).toFixed(1)}`).join(""), color: "hanada", width: line * .7 },
    ] });
  }
  // The head in profile: a long pale face, half-closed eye, the hair parted over the crown and down behind.
  const F = (u: number, v: number): Pt => [top[0] + u * H * 1.55, top[1] + v * H * 1.55];
  const face: Pt[] = [F(-.045, -.06), F(.02, -.075), F(.05, -.05), F(.062, -.015), F(.072, .005), F(.064, .014), F(.067, .025), F(.061, .03), F(.064, .04), F(.055, .052), F(.035, .062), F(.0, .058), F(-.035, .035), F(-.05, -.01)];
  out.push({ t: "fill", d: smoothD(face, true, .32), fill: "gofun", outline: line * .9 });
  out.push({ t: "fill", d: smoothD([F(-.055, .02), F(-.06, -.05), F(-.02, -.09), F(.04, -.085), F(.06, -.05), F(.035, -.055), F(.0, -.04), F(-.015, .0), F(-.03, .05)], true, .35), fill: "sumi", outline: line * .5 });
  out.push({ t: "line", d: carvedLine([F(.022, -.008), F(.036, -.004), F(.05, -.002)], Math.max(.8, H * .005), { taper: "both" }), color: "sumi" });
  out.push({ t: "line", d: carvedLine([F(.02, -.03), F(.04, -.034), F(.052, -.028)], Math.max(.5, H * .003), { taper: "both" }), color: "sumi", opacity: .6 });
  const m = s.w("howl").w > 0 ? Math.abs(Math.sin(frame / 3.2)) : .25;
  out.push({ t: "fill", d: ellipseD(...F(.061, .033), H * .005, H * (.002 + .005 * m)), fill: "kogecha" });
  // Her breath: a thin curl of vapour drifting out from the lips, coiling and fading (Hokusai's single wisp).
  const wisp: Pt[] = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16; wisp.push([F(.065, .032)[0] + u * H * .32, F(.065, .032)[1] - u * H * .1 + Math.sin(u * 8 - frame / 8) * H * .025 * u]); }
  const curlC = wisp[16], curl: Pt[] = [];
  for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI * 1.6 + frame / 20; curl.push([curlC[0] + Math.cos(a) * H * .03 * (1 - i / 14), curlC[1] - Math.sin(a) * H * .03 * (1 - i / 14)]); }
  out.push({ t: "line", d: carvedLine([...wisp, ...curl], Math.max(.8, H * .007), { taper: "both", minRatio: .2, smooth: true }), color: "gofun", opacity: .75 * rise });
  return out;
}

/** Densify a polyline through a Catmull-Rom spline (open). */
function smoothPtsY(points: readonly Pt[], per = 4): Pt[] {
  const n = points.length, out: Pt[] = [], at = (i: number) => points[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  out.push(points[n - 1]);
  return out;
}

// ---- Umbrella and lantern spirits ------------------------------------------------------------------------------------------------------

/** An eye that blinks and glances: sclera, red-rimmed lid, iris and pupil, catchlight. */
function bigEye(c: Pt, r: number, frame: number, seed: number, look: number): Prim[] {
  const blink = ((frame + seed * 13) % 120) < 5;
  if (blink) return [{ t: "line", d: carvedLine([[c[0] - r, c[1]], [c[0], c[1] + r * .25], [c[0] + r, c[1]]], r * .18, { taper: "both", minRatio: .4, smooth: true }), color: "sumi" }];
  const gx = Math.sin(frame / 37 + seed) * r * .35 + look * r * .4, gy = Math.cos(frame / 53 + seed) * r * .15;
  const veins: string[] = [];
  for (let i = 0; i < 5; i++) { const a = i * 72 + 20, p0 = polar(c, a, r * .95), p1 = polar(c, a + 12, r * .6); veins.push(`M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}Q${(p0[0] + p1[0]) / 2 + r * .1} ${(p0[1] + p1[1]) / 2} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`); }
  return [{ t: "fill", d: ellipseD(c[0], c[1], r, r * .82), fill: "gofun", outline: Math.max(1, r * .1) },
    { t: "stroke", d: veins.join(""), color: "beni", width: Math.max(.5, r * .04), opacity: .6 },
    { t: "dots", d: circleD(c[0] + gx, c[1] + gy, r * .48), color: "kogecha" }, { t: "dots", d: circleD(c[0] + gx, c[1] + gy, r * .26), color: "sumi" },
    { t: "dots", d: circleD(c[0] + gx + r * .15, c[1] + gy - r * .15, r * .1), color: "gofun" },
    { t: "line", d: carvedLine([[c[0] - r * 1.05, c[1] - r * .1], [c[0], c[1] - r * .92], [c[0] + r * 1.05, c[1] - r * .1]], r * .2, { taper: "both", minRatio: .3, smooth: true }), color: "beni", opacity: .8 }];
}
/** A long red tongue lolling from `root`, flapping with the motion. */
function tongue(root: Pt, len: number, w: number, frame: number, lag: number, seed: number): Prim[] {
  const sw = Math.sin(frame / 6 + seed) * .25 + lag;
  const spine = curve(root, add(root, [len * (.25 + sw * .3), len * .45]), add(root, [len * (.1 + sw * .6), len]), 10);
  const d = ribbon(spine, w, w * .8, u => u > .85 ? .7 : 1);
  return [{ t: "fill", d, fill: "beni", outline: Math.max(.8, w * .08) }, { t: "stroke", d: smoothD(spine.slice(1, -2), false, .4), color: "shu", width: Math.max(.6, w * .1), opacity: .6 }];
}

function kasaObake(look: YokaiLook, s: YokaiState, frame: number, wind: number, seed: number): Prim[] {
  const H = look.size ?? 150, out: Prim[] = [], line = Math.max(1, H / 150 * 1.2), paper = look.color ?? "kincha", band = look.accent ?? "beni";
  const hop = s.w("hop").w * (s.moving ? 1 : 0), ph = s.dist / (H * .7) * Math.PI * 2;
  const air = hop * Math.max(0, Math.sin(ph)), land = hop * Math.max(0, -Math.sin(ph));
  const idleBob = Math.sin(frame / 16 + seed) * .03 * (1 - hop);
  const squash = 1 - land * .18 + air * .08 + idleBob, stretch = 1 / Math.sqrt(squash);
  const legLen = H * .3 * (1 - land * .35), lift = air * H * .45;
  const foot: Pt = [0, -lift], hip: Pt = [hop * Math.sin(ph) * H * .02, -lift - legLen];
  // The leg: a hairy shin bending at the knee, the foot in a geta (two teeth, red thong).
  const knee: Pt = [hip[0] + H * .05 * (1 + land), lerp(hip[1], foot[1], .5)];
  const legD = ribbon(curve(hip, knee, foot, 10), H * .07, H * .05);
  out.push({ t: "fill", d: ellipseD(0, 1, H * .18 * (1 - air * .5), H * .025), fill: "sumi", opacity: .12, noPrint: true });
  out.push({ t: "fill", d: legD, fill: "hada", outline: line });
  out.push({ t: "stroke", d: Array.from({ length: 12 }, (_, i) => { const q = curve(hip, knee, foot, 11)[i]; return `M${q[0].toFixed(1)} ${q[1].toFixed(1)}l${(-H * .02).toFixed(1)} ${(H * .012).toFixed(1)}`; }).join(""), color: "kogecha", width: .7, opacity: .6 });
  const geta = add(foot, [H * .02, 0]);
  out.push({ t: "fill", d: polyD([add(geta, [-H * .09, -H * .03]), add(geta, [H * .1, -H * .03]), add(geta, [H * .1, -H * .015]), add(geta, [-H * .09, -H * .015])]), fill: "cha", outline: line * .8 },
    { t: "fill", d: polyD([add(geta, [-H * .06, -H * .015]), add(geta, [-H * .04, -H * .015]), add(geta, [-H * .04, 0]), add(geta, [-H * .06, 0])]) + polyD([add(geta, [H * .05, -H * .015]), add(geta, [H * .07, -H * .015]), add(geta, [H * .07, 0]), add(geta, [H * .05, 0])]), fill: "kogecha" },
    { t: "line", d: carvedLine([add(foot, [-H * .03, -H * .035]), add(foot, [H * .02, -H * .06]), add(foot, [H * .06, -H * .035])], H * .012, { taper: "none" }), color: "shu" });
  // The canopy: a half-closed wagasa, its oiled paper panels gathered between the ribs, a dark band round the rim,
  // torn here and there, the wrapped finial on top.
  const base: Pt = [hip[0], hip[1] + H * .02], cH = H * .62 * stretch, cW = H * .5 * squash, tilt = (wind * 4 + Math.sin(frame / 19 + seed) * 2 + hop * Math.cos(ph) * 6);
  const R = (x: number, y: number): Pt => { const a = tilt * Math.PI / 180, px = x * cW, py = -y * cH; return [base[0] + px * Math.cos(a) - py * Math.sin(a), base[1] + px * Math.sin(a) + py * Math.cos(a)]; };
  const rim: Pt[] = [], ribs: string[] = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10; rim.push(R(-.5 + u, .05 + .06 * Math.sin(u * Math.PI * 5) * (i % 2 ? 1 : -1) * .5)); }
  const canopy = smoothD([R(-.5, .05), R(-.36, .5), R(-.08, .98), R(0, 1), R(.08, .98), R(.36, .5), R(.5, .05), ...rim.slice().reverse().slice(1, -1)], true, .25);
  out.push({ t: "fill", d: canopy, fill: { type: "linear", angle: 0, stops: [[0, paper, 1], [.55, paper, 1], [1, "cha", 1]] }, outline: line * 1.1, grain: .6 });
  for (let i = 1; i < 8; i++) { const u = i / 8, a = R(0, 1), b = R(-.5 + u, .06); ribs.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${lerp(a[0], b[0], .5).toFixed(1)} ${(lerp(a[1], b[1], .5) - H * .01).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`); }
  const inside: Prim[] = [
    { t: "fill", d: smoothD([R(-.52, .02), R(-.46, .2), R(.46, .2), R(.52, .02)], true, .3), fill: band, opacity: .9 },
    { t: "stroke", d: ribs.join(""), color: "kogecha", width: .8, opacity: .6 },
    { t: "fill", d: smoothD([R(-.2, .62), R(-.12, .7), R(-.08, .58), R(-.16, .54)], true, .4) + smoothD([R(.28, .3), R(.36, .38), R(.38, .26)], true, .4), fill: "sumi", opacity: .75 },
  ];
  out.push({ t: "clip", d: canopy, key: "kasa", prims: inside });
  out.push({ t: "fill", d: ellipseD(...R(0, 1.04), cW * .06, cH * .05), fill: "kogecha", outline: line * .8 });
  // One great eye, and the mouth splitting the paper with its tongue lolling out.
  out.push(...bigEye(R(0, .55), H * .1, frame, seed, s.w("look").w));
  const mouthL = R(-.18, .3), mouthR = R(.18, .3);
  out.push({ t: "fill", d: smoothD([mouthL, R(0, .26), mouthR, R(0, .2)], true, .4), fill: "sumi", opacity: .9 });
  out.push(...tongue(R(.04, .24), H * .28, H * .07, frame, hop * Math.cos(ph) * .4 - wind * .2, seed));
  return out;
}

function chochinObake(look: YokaiLook, s: YokaiState, frame: number, wind: number, seed: number): Prim[] {
  const H = look.size ?? 120, out: Prim[] = [], line = Math.max(1, H / 120 * 1.1), paper = look.color ?? "gofun";
  const flicker = .75 + .25 * Math.abs(noise1(seed, frame / 3)) * (1 - .3 * Math.abs(noise1(seed + 7, frame / 11)));
  // Hung from a hook on a bent pole above (unless floating), swinging like a pendulum.
  const hookY = -H * 1.45, swing = (Math.sin(frame / 24 + seed) * 7 + wind * 9) * Math.PI / 180, cordL = H * .22;
  const top: Pt = [Math.sin(swing) * cordL, hookY + Math.cos(swing) * cordL];
  const bob = s.moving ? Math.sin(frame / 9) * H * .02 : 0;
  const R = (x: number, y: number): Pt => [top[0] + (x * Math.cos(swing) - y * Math.sin(swing)), top[1] + bob + (x * Math.sin(swing) + y * Math.cos(swing))];
  const w = H * .36, h = H * .9;
  out.push({ t: "line", d: carvedLine([[-H * .5, hookY - H * .08], [-H * .05, hookY - H * .12], [0, hookY]], Math.max(2, H * .03), { taper: "none", smooth: true }), color: "kogecha" });
  out.push({ t: "line", d: carvedLine([[0, hookY], top], Math.max(.8, H * .008), { taper: "none" }), color: "sumi" });
  // Glow from the flame inside.
  out.push({ t: "glow", cx: R(0, h * .55)[0], cy: R(0, h * .55)[1], r: H * .9, color: "ki", opacity: .45 * flicker });
  // The paper barrel between lacquered caps, its bamboo ribs; the torn grin with a long tongue; one great eye.
  const body: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const v = i / 12, bulge = Math.sin(Math.PI * v) ** .7; body.push(R(-w * (.62 + .38 * bulge), h * (.08 + .84 * v))); }
  for (let i = 12; i >= 0; i--) { const v = i / 12, bulge = Math.sin(Math.PI * v) ** .7; body.push(R(w * (.62 + .38 * bulge), h * (.08 + .84 * v))); }
  const bodyD = smoothD(body, true, .35);
  out.push({ t: "fill", d: bodyD, fill: { type: "radial", stops: [[0, "ki", .95 * flicker], [.55, paper, 1], [1, "kincha", 1]] }, outline: line * 1.1, grain: .5 });
  const ribLines: string[] = [];
  for (let i = 1; i < 12; i++) { const v = i / 12, bulge = Math.sin(Math.PI * (.08 + .84 * v) / .92 * .92) ** .7, a = R(-w * (.62 + .38 * bulge), h * (.08 + .84 * v)), b = R(w * (.62 + .38 * bulge), h * (.08 + .84 * v)); ribLines.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2 + H * .015).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`); }
  out.push({ t: "clip", d: bodyD, key: "chochin", prims: [{ t: "stroke", d: ribLines.join(""), color: "kogecha", width: .8, opacity: .55 }] });
  out.push({ t: "fill", d: smoothD([R(-w * .66, h * .02), R(w * .66, h * .02), R(w * .6, h * .1), R(-w * .6, h * .1)], true, .2) + smoothD([R(-w * .66, h * .9), R(w * .66, h * .9), R(w * .6, h * .99), R(-w * .6, h * .99)], true, .2), fill: "sumi", outline: line * .7 });
  // The grin: the paper split along a rib, jagged teeth of torn paper, the dark inside lit from within.
  const mouthY = h * .66;
  const lower: Pt[] = [], upper: Pt[] = [];
  for (let i = 0; i <= 8; i++) { const u = i / 8, x = -w * .82 + w * 1.64 * u; upper.push(R(x, mouthY - (i % 2 ? h * .02 : 0))); lower.push(R(x, mouthY + h * (.1 + .05 * Math.sin(frame / 8)) * Math.sin(Math.PI * u) + (i % 2 ? -h * .02 : 0))); }
  out.push({ t: "fill", d: polyD([...upper, ...lower.slice().reverse()]), fill: "sumi", opacity: .92, outline: line * .7 });
  out.push({ t: "fill", d: ellipseD(...R(0, mouthY + h * .04), w * .3, h * .03), fill: "shu", opacity: .55 * flicker, noPrint: true });
  out.push(...tongue(R(w * .1, mouthY + h * .08), H * .45, H * .09, frame, s.moving ? .2 : Math.sin(swing) * 2, seed));
  out.push(...bigEye(R(-w * .05, h * .38), H * .13, frame, seed, s.w("look").w));
  // A family crest painted beside the eye.
  out.push({ t: "stroke", d: circleD(...R(-w * .5, h * .86), H * .035), color: "beni", width: 1.3, opacity: .65 });
  return out;
}

// ---- Kappa ------------------------------------------------------------------------------------------------------------------------------

/**
 * The kappa of the river, after Sekien: a crouching, child-sized creature, green and mottled, a turtle's shell on its
 * back and plates on its belly, webbed hands and feet, a beak, round staring eyes, and on its head the dish of water
 * (sara) ringed by a fringe of hair. It waddles (`walk`), dances (`dance`), and — as in the old stories — bows politely
 * (`bow`), spilling the water from its dish.
 */
function kappa(look: YokaiLook, s: YokaiState, frame: number, seed: number): Prim[] {
  const H = look.size ?? 110, out: Prim[] = [], line = Math.max(.9, H / 110 * 1.1), skin = look.color ?? "kusa", shellC = look.accent ?? "cha";
  const walk = s.w("walk").w * (s.moving ? 1 : 0), dance = s.w("dance").w, bowA = s.w("bow"), bow = bowA.w * Math.sin(Math.PI * clamp01(bowA.t / Math.max(1, bowA.len)));
  const ph = s.dist / (H * .5) * Math.PI * 2, idle = Math.sin(frame / 18 + seed);
  const waddle = walk * Math.sin(ph) * 5, lift = (side: number) => walk * Math.max(0, Math.sin(ph + side * Math.PI)) * H * .07;
  const tilt = 22 + bow * 50 + waddle + dance * Math.sin(frame / 6) * 6, hip: Pt = [0, -H * (.3 + .015 * idle) + walk * Math.abs(Math.sin(ph)) * H * -.02];
  const T = (x: number, y: number): Pt => { const a = tilt * Math.PI / 180, px = x * H, py = -y * H; return [hip[0] + px * Math.cos(a) - py * Math.sin(a), hip[1] + px * Math.sin(a) + py * Math.cos(a)]; };
  const leg = (side: number, near: boolean): Prim[] => {
    // Frog-legged crouch: the thigh forward, the knee high, the shin back down to a broad webbed foot.
    const foot: Pt = [H * (.08 + side * .07) + walk * Math.sin(ph + side * Math.PI) * H * .08, -lift(side)], knee: Pt = [H * (.17 + side * .05), -H * .2 - lift(side) * .5], root = T(.02, .02);
    const d = ribbon(curve(root, add(knee, [H * .03, -H * .02]), knee, 6), H * .1, H * .065) + ribbon(curve(knee, add(lerp2(knee, foot, .5), [H * .03, 0]), foot, 6), H * .065, H * .045);
    const toes = [-10, 15, 40].map(a => ribbon([foot, polar(foot, a, H * .08)], H * .03, H * .015)).join("");
    const web = polyD([foot, polar(foot, -10, H * .075), polar(foot, 15, H * .07), polar(foot, 40, H * .065)]);
    return [{ t: "fill", d: d + toes, fill: skin, outline: line, opacity: near ? 1 : .9 }, { t: "fill", d: web, fill: skin, opacity: .8 }, ...(near ? [] : [{ t: "fill" as const, d: d, fill: "sumi", opacity: .2 }])];
  };
  const arm = (near: boolean): Prim[] => {
    const sh = T(.06, .3), up = dance > .05 ? -60 + Math.sin(frame / 7 + (near ? 0 : 2)) * 40 : bow > .2 ? 70 : 55 + idle * 6 + walk * Math.sin(ph + (near ? 0 : Math.PI)) * 18;
    const el = polar(sh, up + tilt * .3, H * .14), wr = polar(el, up + tilt * .3 + (dance > .05 ? -40 : 30), H * .13);
    const fingers = [-25, 0, 25].map(a => ribbon([wr, polar(wr, up + tilt * .3 + 40 + a, H * .06)], H * .025, H * .012)).join("");
    const web = polyD([wr, polar(wr, up + tilt * .3 + 15, H * .055), polar(wr, up + tilt * .3 + 40, H * .058), polar(wr, up + tilt * .3 + 65, H * .055)]);
    return [{ t: "fill", d: ribbon(curve(sh, lerp2(sh, el, .6), el, 5), H * .06, H * .045) + ribbon(curve(el, lerp2(el, wr, .5), wr, 5), H * .045, H * .035) + fingers, fill: skin, outline: line, opacity: near ? 1 : .9 },
      { t: "fill", d: web, fill: skin, opacity: .8 }];
  };
  out.push({ t: "fill", d: ellipseD(H * .1, 1, H * .22, H * .03), fill: "sumi", opacity: .12, noPrint: true });
  out.push(...leg(-1, false), ...arm(false));
  // Shell (back) and body: the shell a dome of plates with a rim, the belly plates in front.
  const body = smoothD([T(-.06, -.02), T(.12, .02), T(.17, .15), T(.15, .3), T(.08, .38), T(-.04, .36), T(-.1, .2)], true, .45);
  const shell = smoothD([T(-.02, .0), T(-.14, .06), T(-.2, .2), T(-.15, .36), T(-.02, .42), T(.04, .36), T(-.04, .2)], true, .45);
  out.push({ t: "fill", d: body, fill: skin, outline: line, grain: .4 });
  out.push({ t: "clip", d: body, key: "kbelly", prims: [{ t: "fill", d: smoothD([T(.06, .0), T(.18, .08), T(.18, .3), T(.08, .32), T(.04, .15)], true, .4), fill: "ki", opacity: .9 },
    { t: "stroke", d: [.08, .15, .22, .28].map(y => `M${T(.06, y)[0].toFixed(1)} ${T(.06, y)[1].toFixed(1)}L${T(.2, y)[0].toFixed(1)} ${T(.2, y)[1].toFixed(1)}`).join(""), color: "kincha", width: .8, opacity: .8 },
    { t: "dots", d: Array.from({ length: 14 }, (_, i) => circleD(...T(-.06 + hash01(seed, i, 1) * .14, .02 + hash01(seed, i, 2) * .34), H * (.006 + .01 * hash01(seed, i, 3)))).join(""), color: "matsu", opacity: .6 }] });
  out.push({ t: "fill", d: shell, fill: { type: "linear", angle: 0, stops: [[0, "kogecha", 1], [1, shellC, 1]] }, outline: line * 1.1, grain: .6 });
  out.push({ t: "clip", d: shell, key: "kshell", prims: [{ t: "stroke", d: [[-.09, .12], [-.12, .25], [-.06, .33]].map(([x, y]) => polyD(Array.from({ length: 6 }, (_, k) => T(x + Math.cos(k * Math.PI / 3) * .04, y + Math.sin(k * Math.PI / 3) * .05)))).join(""), color: "sumi", width: .9, opacity: .7 },
    { t: "stroke", d: smoothD([T(-.02, .02), T(-.16, .1), T(-.19, .25), T(-.12, .38)], false, .4), color: "ki", width: H * .012, opacity: .6 }] });
  out.push(...leg(1, true));
  // Head: round, with the beak, the staring eye, the fringe of hair round the dish of water on top.
  const hc = T(.1, .5), hr = H * .13, ha = tilt * .6 + bow * 30;
  const HP = (x: number, y: number): Pt => { const a = ha * Math.PI / 180, px = x * hr, py = y * hr; return [hc[0] + px * Math.cos(a) - py * Math.sin(a), hc[1] + px * Math.sin(a) + py * Math.cos(a)]; };
  out.push({ t: "fill", d: smoothD([HP(-.9, .1), HP(-.7, -.7), HP(.1, -.95), HP(.8, -.55), HP(1, .1), HP(.6, .75), HP(-.3, .85)], true, .45), fill: skin, outline: line, grain: .3 });
  out.push({ t: "fill", d: smoothD([HP(.6, -.05), HP(1.75, .1), HP(.75, .55)], true, .25), fill: "ki", outline: line });
  out.push({ t: "line", d: carvedLine([HP(.7, .26), HP(1.5, .17)], Math.max(.7, hr * .05), { taper: "end" }), color: "sumi", opacity: .7 });
  out.push({ t: "fill", d: ellipseD(...HP(.32, -.18), hr * .3, hr * .28), fill: "gofun", outline: line * .9 }, { t: "dots", d: circleD(...HP(.38, -.16), hr * .15), color: "sumi" }, { t: "dots", d: circleD(...HP(.42, -.22), hr * .05), color: "gofun" });
  // The hair fringe: short spiky locks hanging round the dish.
  const fringe: Pt[] = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14, a = Math.PI * (1.1 + .8 * u); fringe.push(HP(Math.cos(a) * .95, Math.sin(a) * .7 - .15), HP(Math.cos(a) * (1.25 + .1 * hash01(seed, i, 5)), Math.sin(a) * .7 + .25 + .15 * hash01(seed, i, 6))); }
  out.push({ t: "fill", d: polyD([HP(-.95, -.25), ...fringe, HP(.85, -.4), HP(.6, -.75), HP(-.6, -.75)]), fill: "sumi", outline: line * .5 });
  // The dish, with water in it catching the light.
  const dish = ellipseD(...HP(-.05, -.8), hr * .62, hr * .22);
  out.push({ t: "fill", d: dish, fill: "gofun", outline: line * .9 }, { t: "fill", d: ellipseD(...HP(-.05, -.82), hr * .5, hr * .14), fill: "sora", opacity: .9 * (1 - bow * .8) }, { t: "fill", d: ellipseD(...HP(-.2, -.86), hr * .15, hr * .04), fill: "gofun", opacity: .9 });
  // Bowing spills the water: drops fall from the dish's front lip and splash on the ground.
  if (bow > .15) {
    const lip = HP(.5, -.8), drops: string[] = [];
    for (let i = 0; i < 9; i++) { const life = (frame / 10 + i / 9) % 1, x = lip[0] + H * .02 * i % (H * .06) + life * H * .04, y = lip[1] + (0 - lip[1]) * life ** 1.6; drops.push(ellipseD(x, y, H * .008, H * .014)); }
    out.push({ t: "fill", d: drops.join(""), fill: "sora", opacity: .9 * bow, outline: .5, outlineColor: "hanada" });
  }
  out.push(...arm(true));
  return out;
}

// ---- Tengu ------------------------------------------------------------------------------------------------------------------------------

/**
 * The tengu of the mountains, dressed as a yamabushi: the checked robe with the pom-pom sash (yuigesa), wide trousers,
 * a tall one-toothed geta, the little black cap (tokin), great feathered wings, and the feather fan that raises a gale.
 * `variant` "red" is the long-nosed daitengu (red face, white mane and beard); "crow" the karasu-tengu with a bird's
 * head and beak. `fly` beats the wings and lifts it; `fan` sweeps the fan and sends out wind.
 */
function tengu(variant: "red" | "crow", look: YokaiLook, s: YokaiState, frame: number, wind: number, seed: number): Prim[] {
  const H = look.size ?? 200, out: Prim[] = [], line = Math.max(1, H / 200 * 1.2), crow = variant === "crow";
  const robe = look.color ?? "gofun", trousers = look.accent ?? "ai", skin = crow ? "ai" : "shu";
  const fly = s.w("fly").w, fanA = s.w("fan"), fanW = fanA.w, idle = Math.sin(frame / 20 + seed);
  const walk = s.w("walk").w * (s.moving ? 1 : 0), ph = s.dist / (H * .55) * Math.PI * 2;
  const beat = (frame / 5 + seed) % (Math.PI * 2), flap = fly > 0 ? .5 - .5 * Math.cos(beat) : .5 + idle * .05;
  const rise = fly * (H * .35 + Math.sin(frame / 14) * H * .03);
  const P = (u: number, v: number): Pt => [u * H, -rise + v * H];
  // Wings behind: rows of long dark feathers fanning from the shoulders, half open at rest, beating in flight.
  const wing = (near: boolean): Prim[] => {
    // Half folded at rest, the wings sweep back and up behind the shoulders; in flight they beat through a wide arc.
    const sh = P(-.06 + (near ? .0 : -.02), -.74), open = lerp(.6, 1, fly) * (near ? 1 : .9), up = lerp(fly > 0 ? -175 : -168, fly > 0 ? -45 : -150, flap) + (near ? 0 : -10);
    const fea: string[] = [], cov: string[] = [];
    for (let i = 0; i < 11; i++) { const u = i / 10, a = up + lerp(-15, 70, u) * open, l = H * (.55 - .22 * u) * lerp(.6, 1, open); fea.push(featherY(polar(sh, a + 90, H * .02 * u), a, l, H * .07)); }
    for (let i = 0; i < 7; i++) { const u = i / 6, a = up + lerp(0, 75, u) * open; cov.push(featherY(sh, a, H * (.26 - .06 * u) * lerp(.6, 1, open), H * .08)); }
    return [{ t: "fill", d: fea.join(""), fill: "sumi", outline: line * .6, outlineColor: "usuzumi", opacity: near ? 1 : .85 },
      { t: "stroke", d: fea.join(""), color: "usuzumi", width: .5, opacity: .5 },
      { t: "fill", d: cov.join(""), fill: crow ? "sumi" : "kogecha", outline: line * .6, opacity: near ? 1 : .85 }];
  };
  out.push({ t: "fill", d: ellipseD(0, 1, H * .16 * (1 - fly * .6), H * .02), fill: "sumi", opacity: .12, noPrint: true });
  out.push(...wing(false), ...wing(true));
  // Legs in hakama, on one-toothed geta; walking swings them; in flight they hang.
  const legs: Prim[] = [];
  for (const near of [false, true]) {
    const sw = walk * Math.sin(ph + (near ? 0 : Math.PI)) * .06, foot: Pt = P(.02 + sw + (near ? .02 : -.02), -.05 + fly * .02), knee: Pt = P(.01 + sw * .5, -.27);
    const hk = ribbon(curve(P(near ? .03 : -.02, -.5), knee, add(foot, [0, -H * .03]), 6), H * .2, H * .16);
    legs.push({ t: "fill", d: hk, fill: trousers, outline: line, opacity: near ? 1 : .85, grain: .4 }, { t: "stroke", d: [-.03, .02].map(dx => smoothD([add(P(dx, -.48), [0, 0]), add(knee, [dx * H, 0]), add(foot, [dx * H * .5, -H * .05])], false, .4)).join(""), color: "sumi", width: .7, opacity: .35 });
    legs.push({ t: "fill", d: polyD([add(foot, [-H * .05, -H * .03]), add(foot, [H * .07, -H * .03]), add(foot, [H * .07, -H * .015]), add(foot, [-H * .05, -H * .015])]), fill: "cha", outline: line * .8 },
      { t: "fill", d: polyD([add(foot, [0, -H * .015]), add(foot, [H * .02, -H * .015]), add(foot, [H * .018, H * .05]), add(foot, [H * .003, H * .05])]), fill: "kogecha", outline: line * .6 });
  }
  out.push(...legs);
  // Robe: the suzukake with its checked pattern, the sleeves, the yuigesa sash with its six pom-poms down the chest.
  const torso = smoothD([P(-.1, -.48), P(-.12, -.64), P(-.09, -.77), P(.0, -.81), P(.09, -.77), P(.13, -.64), P(.12, -.48), P(.0, -.45)], true, .4);
  out.push({ t: "fill", d: torso, fill: robe, outline: line, pattern: { type: "ichimatsu", color: "sora", scale: .45, opacity: .5 }, grain: .4 });
  out.push({ t: "fill", d: smoothD([P(-.09, -.52), P(.105, -.53), P(.1, -.49), P(-.085, -.48)], true, .3), fill: "kogecha", outline: line * .7 });
  out.push({ t: "line", d: carvedLine([P(-.03, -.79), P(.04, -.7), P(.08, -.6)], H * .022, { taper: "none", smooth: true }), color: "kincha" });
  out.push(...[0, 1, 2, 3, 4, 5].map((i): Prim => { const q = P(-.0 + i * .016, -.77 + i * .035); return { t: "fill", d: smoothD(Array.from({ length: 8 }, (_, k) => polar(q, k * 45, H * (.022 + .004 * Math.sin(k * 2 + i)))), true, .5), fill: i % 2 ? "kin" : "beni", outline: line * .6 }; }));
  // The arm with the fan: at rest it holds the fan up before the chest; `fan` sweeps it forward and down, and a gust
  // of wind lines streams out from the fan's face.
  const sweep = fanW > 0 ? Math.sin(Math.PI * 2 * clamp01(fanA.t / Math.max(1, fanA.len)) * 2) : 0;
  // At rest the fan is held out at chest height; `fan` swings it up and over in big strokes.
  const sh = P(.06, -.76), handA = lerp(48, -30, (sweep + 1) / 2 * fanW) + idle * 3 - fly * 20, el = polar(sh, 75 - fly * 30, H * .14), hand = polar(el, handA - 50, H * .13);
  const sleeve = smoothD([sh, el, hand, add(hand, [-H * .02, H * .06]), add(lerp2(el, hand, .5), [-H * .03, H * .14]), add(el, [-H * .06, H * .1]), add(sh, [-H * .06, H * .05])], true, .3);
  out.push({ t: "fill", d: sleeve, fill: robe, outline: line, pattern: { type: "ichimatsu", color: "sora", scale: .45, opacity: .5 } });
  const fanAng = handA - 80;
  const fanD: string[] = [];
  for (let i = 0; i < 9; i++) fanD.push(featherY(polar(hand, fanAng, H * .03), fanAng + (i - 4) * 9, H * (.2 - Math.abs(i - 4) * .012), H * .06));
  out.push({ t: "line", d: carvedLine([hand, polar(hand, fanAng, H * .05)], H * .015, { taper: "none" }), color: "beni" });
  out.push({ t: "fill", d: fanD.join(""), fill: "gofun", outline: line * .7 }, { t: "stroke", d: fanD.join(""), color: "usuzumi", width: .5, opacity: .5 });
  out.push({ t: "fill", d: ribbon([hand, polar(hand, handA, H * .03)], H * .03, H * .025), fill: crow ? "ai" : "shu", outline: line * .6 });
  if (fanW > .1) {
    const gust: string[] = [], tipF = polar(hand, fanAng, H * .2);
    for (let i = 0; i < 9; i++) { const life = (fanA.t / 14 + i / 9) % 1, y = (i - 4) * H * .03; const a = add(tipF, [life * H * .9, y + Math.sin(life * 6 + i) * H * .02]); gust.push(carvedLine([a, add(a, [H * .2 * (1 - life), Math.sin(life * 5 + i) * H * .02])], H * .008 * (1 - life), { taper: "both", minRatio: .2 })); }
    out.push({ t: "fill", d: gust.join(""), fill: "gofun", opacity: .85 * fanW, noPrint: true }, { t: "stroke", d: gust.join(""), color: "usuzumi", width: .5, opacity: .5 * fanW });
  }
  // Head: the red daitengu with its long nose, fierce brow, white mane and beard; or the crow-headed karasu-tengu.
  const hc = P(.03, -.89), r = H * .074;
  const HQ = (x: number, y: number): Pt => [hc[0] + x * r, hc[1] + y * r];
  if (crow) {
    out.push({ t: "fill", d: smoothD([HQ(-1, .4), HQ(-.9, -.6), HQ(0, -1.05), HQ(.9, -.5), HQ(1.1, .3), HQ(.4, 1.1), HQ(-.6, .9)], true, .45), fill: "sumi", outline: line });
    out.push({ t: "stroke", d: Array.from({ length: 12 }, (_, i) => { const a = HQ(-.8 + (i % 4) * .4, -.6 + Math.floor(i / 4) * .5); return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}q${(r * .2).toFixed(1)} ${(r * .2).toFixed(1)} ${(-r * .1).toFixed(1)} ${(r * .4).toFixed(1)}`; }).join(""), color: "usuzumi", width: .6, opacity: .6 });
    out.push({ t: "fill", d: smoothD([HQ(.7, -.3), HQ(2.4, .25), HQ(1.6, .3), HQ(.8, .5)], true, .2), fill: "ki", outline: line }, { t: "fill", d: smoothD([HQ(.8, .45), HQ(2.0, .38), HQ(.9, .75)], true, .2), fill: "kincha", outline: line });
    out.push({ t: "fill", d: ellipseD(...HQ(.4, -.25), r * .3, r * .26), fill: "ki", outline: line * .8 }, { t: "dots", d: circleD(...HQ(.45, -.25), r * .14), color: "sumi" });
  } else {
    // Mane behind, streaming in the wind.
    const mane: Pt[] = [HQ(-.3, -1.1)];
    for (let i = 0; i <= 8; i++) { const u = i / 8; mane.push(HQ(-1.2 - u * 1.4 - Math.abs(wind) * u * .6, -1 + u * 2.6 + Math.sin(frame / 9 + i) * .15), HQ(-1 - u * 1.2, -.7 + u * 2.6)); }
    mane.push(HQ(-.2, 1.2));
    out.push({ t: "fill", d: polyD(mane), fill: "gofun", outline: line * .7 });
    out.push({ t: "fill", d: smoothD([HQ(-.9, .3), HQ(-.8, -.7), HQ(0, -1.05), HQ(.85, -.6), HQ(1, .1), HQ(.7, .8), HQ(-.2, 1), HQ(-.8, .8)], true, .4), fill: skin, outline: line, grain: .3 });
    // The long nose, straight out from the face.
    out.push({ t: "fill", d: smoothD([HQ(.7, -.3), HQ(2.9, -.12), HQ(3.0, .05), HQ(2.8, .16), HQ(.8, .2)], true, .25), fill: skin, outline: line });
    out.push({ t: "dots", d: circleD(...HQ(2.7, .1), r * .06), color: "sumi" });
    out.push({ t: "fill", d: ellipseD(...HQ(.35, -.32), r * .22, r * .16), fill: "gofun", outline: line * .8 }, { t: "dots", d: circleD(...HQ(.42, -.3), r * .1), color: "sumi" });
    out.push({ t: "fill", d: smoothD([HQ(-.1, -.55), HQ(.6, -.75), HQ(.9, -.5), HQ(.3, -.5)], true, .3), fill: "gofun", outline: line * .7 });
    // Beard.
    const beard: Pt[] = [HQ(.7, .45)];
    for (let i = 0; i <= 6; i++) { const u = i / 6; beard.push(HQ(.8 - u * 1.2 + Math.sin(frame / 11 + i) * .08, 1.4 + .5 * Math.sin(u * Math.PI)), HQ(.6 - u * 1.2, 1)); }
    beard.push(HQ(-.6, .6));
    out.push({ t: "fill", d: polyD(beard), fill: "gofun", outline: line * .7 });
    out.push({ t: "line", d: carvedLine([HQ(.5, .55), HQ(.85, .5)], r * .1, { taper: "both" }), color: "sumi" });
  }
  // The tokin: a little black cap on the brow, tied under the chin.
  out.push({ t: "fill", d: polyD([HQ(-.2, -.9), HQ(.15, -1.55), HQ(.6, -1.35), HQ(.55, -.85), HQ(.15, -.75)]), fill: "sumi", outline: line * .8 });
  out.push({ t: "stroke", d: smoothD([HQ(-.15, -.82), HQ(-.4, .2), HQ(-.1, .9)], false, .4), color: "sumi", width: Math.max(.8, r * .06), opacity: .8 });
  return out;
}
/** A long feather: a narrow leaf from its base to its tip. */
function featherY(base: Pt, angle: number, len: number, width: number): string {
  const tip = polar(base, angle, len), mid = polar(base, angle, len * .5), n = (angle + 90) * Math.PI / 180, nx = Math.cos(n), ny = Math.sin(n);
  return smoothD([[base[0] + nx * width * .25, base[1] + ny * width * .25], [mid[0] + nx * width * .5, mid[1] + ny * width * .5], tip, [mid[0] - nx * width * .4, mid[1] - ny * width * .4], [base[0] - nx * width * .25, base[1] - ny * width * .25]], true, .4);
}

// ---- Nurikabe ---------------------------------------------------------------------------------------------------------------------------

/**
 * The nurikabe, the wall that blocks the night road, after the Edo *Bakemono no e* scroll: a huge white beast crouched
 * low and broad as a plastered wall, its skin folded and cracked like old plaster, three eyes (one on the brow) ringed
 * in blue with petal-like lids, a curled nose, a downturned mouth with dark tusks, great round paws. It breathes, its
 * eyes roll, it shuffles (`walk`) and opens its mouth (`roar`).
 */
function nurikabe(look: YokaiLook, s: YokaiState, frame: number, seed: number): Prim[] {
  const H = look.size ?? 150, out: Prim[] = [], line = Math.max(1, H / 150 * 1.3), skin = look.color ?? "gofun";
  const walk = s.w("walk").w * (s.moving ? 1 : 0), roar = s.w("roar").w, ph = s.dist / (H * .6) * Math.PI * 2;
  const breath = Math.sin(frame / 26 + seed) * .012, bob = walk * Math.abs(Math.sin(ph)) * H * .03;
  const P = (x: number, y: number): Pt => [x * H, (-y * (1 + breath)) * H - bob];
  out.push({ t: "fill", d: ellipseD(-H * .1, 2, H * .95, H * .06), fill: "sumi", opacity: .14, noPrint: true });
  // Hind paw behind, the body like a wall, the head low at the front.
  const paw = (cx: number, lift: number): string => smoothD([P(cx - .2, .02 + lift), P(cx - .22, .2 + lift), P(cx - .05, .27 + lift), P(cx + .15, .24 + lift), P(cx + .22, .1 + lift), P(cx + .18, 0 + lift)], true, .45);
  const hind = paw(-.72, walk * Math.max(0, Math.sin(ph)) * .06), front = paw(.18, walk * Math.max(0, -Math.sin(ph)) * .06);
  const body = smoothD([P(-.92, .05), P(-1.0, .45), P(-.88, .82), P(-.45, .98), P(.05, 1.0), P(.42, .95), P(.68, .8), P(.76, .55), P(.72, .22), P(.55, .06), P(.3, .02), P(-.4, .02)], true, .38);
  for (const d of [hind]) out.push({ t: "fill", d, fill: skin, outline: line, grain: .6 });
  out.push({ t: "fill", d: body, fill: { type: "linear", angle: 90, stops: [[0, skin, 1], [.75, skin, 1], [1, "sakura", .5]] }, outline: line * 1.1, grain: .8 });
  // Folds and plaster cracks: long soft folds over the shoulder and flank, fine branching cracks, a pink tinge in the creases.
  // Skin rolls curving round the face like a heavy hood, then long folds over the haunch.
  const folds = [.18, .3, .43].map(r => smoothD([P(.5 - r * .2, .62 + r * 1.15), P(.3 - r * .9, .6 + r * .6), P(.32 - r * 1.05, .3), P(.42 - r * .7, .08)], false, .45))
    .concat([smoothD([P(-.55, .92), P(-.8, .62), P(-.72, .28)], false, .4), smoothD([P(-.88, .4), P(-.66, .3), P(-.5, .12)], false, .4)]);
  const cracks: string[] = [];
  for (let i = 0; i < 9; i++) {
    let at: Pt = P(-.85 + hash01(seed, i, 501) * 1.3, .2 + hash01(seed, i, 502) * .65); const pts: Pt[] = [at];
    for (let j = 0; j < 4; j++) { at = add(at, [hashSigned(seed, i * 7 + j, 503) * H * .06, H * (.03 + .03 * hash01(seed, i * 7 + j, 504))]); pts.push(at); }
    cracks.push(polyD(pts).replace(/Z$/, ""));
  }
  out.push({ t: "clip", d: body, key: "nuribody", prims: [
    { t: "stroke", d: folds.join(""), color: "beni", width: line * 2.2, opacity: .3 },
    { t: "stroke", d: folds.join(""), color: "usuzumi", width: line * .9, opacity: .8 },
    { t: "stroke", d: cracks.join(""), color: "usuzumi", width: .7, opacity: .5 },
    { t: "dots", d: Array.from({ length: 10 }, (_, i) => circleD(...P(.35 + hash01(seed, i, 505) * .3, .25 + hash01(seed, i, 506) * .35), H * .012)).join(""), color: "beni", opacity: .45 },
  ] });
  out.push({ t: "fill", d: front, fill: skin, outline: line, grain: .6 });
  out.push({ t: "stroke", d: [-.04, .08, .2].map(dx => smoothD([P(.18 + dx - .03, .2), P(.18 + dx, .1), P(.18 + dx - .02, .02)], false, .4)).join(""), color: "usuzumi", width: line * .8, opacity: .8 });
  // The face: three blue-ringed eyes with petal lids, rolling together; a curled nose; a frowning mouth with dark tusks.
  const roll: Pt = [Math.sin(frame / 37 + seed) * .012, Math.cos(frame / 53 + seed) * .008];
  const blink = ((frame + seed * 11) % 140) < 5;
  const eye = (cx: number, cy: number, r: number): Prim[] => {
    const c = P(cx, cy), petals: string[] = [];
    for (let i = 0; i < 10; i++) { const a = i * 36, q = polar(c, a, r * H * 1.35); petals.push(ellipseD(q[0], q[1], r * H * .32, r * H * .22)); }
    const res: Prim[] = [{ t: "stroke", d: petals.join(""), color: "beni", width: .8, opacity: .55 }, { t: "fill", d: ellipseD(c[0], c[1], r * H * 1.15, r * H), fill: "sora", outline: line * .8 }];
    if (blink) res.push({ t: "line", d: carvedLine([[c[0] - r * H, c[1]], [c[0], c[1] + r * H * .3], [c[0] + r * H, c[1]]], r * H * .25, { taper: "both" }), color: "sumi" });
    else res.push({ t: "fill", d: ellipseD(c[0], c[1], r * H * .78, r * H * .7), fill: "gofun" }, { t: "dots", d: circleD(c[0] + roll[0] * H, c[1] + roll[1] * H, r * H * .45), color: "sumi" }, { t: "dots", d: circleD(c[0] + roll[0] * H + r * H * .15, c[1] + roll[1] * H - r * H * .15, r * H * .12), color: "gofun" });
    return res;
  };
  out.push(...eye(.46, .8, .062), ...eye(.36, .6, .072), ...eye(.58, .6, .072));
  // Brow ridges over the lower eyes, curling.
  out.push({ t: "stroke", d: smoothD([P(.27, .68), P(.36, .73), P(.44, .69)], false, .4) + smoothD([P(.5, .69), P(.58, .73), P(.66, .67)], false, .4), color: "usuzumi", width: line, opacity: .9 });
  out.push({ t: "fill", d: smoothD([P(.62, .5), P(.7, .47), P(.71, .4), P(.64, .38), P(.58, .42)], true, .5), fill: "sakura", outline: line * .7 });
  out.push({ t: "stroke", d: smoothD([P(.6, .45), P(.65, .43), P(.64, .4)], false, .5), color: "beni", width: .8 });
  const open = roar * (.6 + .3 * Math.sin(frame / 4));
  out.push({ t: "fill", d: smoothD([P(.4, .33), P(.52, .37 + .02 * open), P(.66, .32), P(.64, .3 - .07 * open), P(.52, .27 - .1 * open), P(.41, .3 - .06 * open)], true, .4), fill: open > .1 ? "sumi" : "beni", outline: line * .9, opacity: open > .1 ? .9 : .75 });
  // The dark tusks hang down from the frowning lip.
  out.push({ t: "fill", d: polyD([P(.45, .3), P(.47, .16), P(.5, .29)]) + polyD([P(.58, .29), P(.61, .16), P(.63, .28)]), fill: "sumi", outline: line * .6 });
  return out;
}

// ---- Tsuchigumo -------------------------------------------------------------------------------------------------------------------------

/**
 * The tsuchigumo, the earth spider of the Raikō tale: a giant spider with a striped abdomen, a hairy cephalothorax
 * with two great glaring eyes among smaller ones, hooked fangs, and eight jointed legs banded in yellow, each arching
 * high at the knee. It creeps (`walk`, a four-and-four gait) and rears with its forelegs raised and fangs spread
 * (`roar`); standing still, it trails a thread of silk up from its spinnerets.
 */
function tsuchigumo(look: YokaiLook, s: YokaiState, frame: number, seed: number): Prim[] {
  const H = look.size ?? 160, out: Prim[] = [], line = Math.max(1, H / 160 * 1.2), body = look.color ?? "kogecha", band = look.accent ?? "ki";
  const walk = s.w("walk").w * (s.moving ? 1 : 0), roar = s.w("roar").w, ph = s.dist / (H * .5) * Math.PI * 2;
  const idle = Math.sin(frame / 20 + seed), rear = roar * (.8 + .2 * Math.sin(frame / 7));
  const bodyY = -H * (.42 + .02 * idle + rear * .12), tilt = -rear * 22;
  const C: Pt = [H * .05, bodyY];
  const T = (x: number, y: number): Pt => { const a = tilt * Math.PI / 180, px = x * H, py = -y * H; return [C[0] + px * Math.cos(a) - py * Math.sin(a), C[1] + px * Math.sin(a) + py * Math.cos(a)]; };
  out.push({ t: "fill", d: ellipseD(0, 2, H * .9, H * .05), fill: "sumi", opacity: .13, noPrint: true });
  // Eight legs: hip on the cephalothorax, knee arched high, foot on the ground. Far legs first (darker), near legs after.
  const legs = (near: boolean): Prim[] => {
    const res: Prim[] = [];
    for (let i = 0; i < 4; i++) {
      const fore = i === 0, hipQ = T(.12 + (i - 1.5) * .045, .02), spread = [-.55, -.2, .25, .62][i] * (near ? 1 : .88), phase = (i % 2 === (near ? 0 : 1) ? 0 : Math.PI);
      const step = walk * Math.sin(ph + phase), lift = walk * Math.max(0, Math.cos(ph + phase)) * H * .1;
      let foot: Pt = [H * (.05 + spread * 1.1) + step * H * .12 + (near ? H * .03 : -H * .03), -lift];
      if (fore && rear > .05) foot = lerp2(foot, T(.85, .55 + .1 * Math.sin(frame / 6 + (near ? 0 : 1))), rear);
      const knee: Pt = [lerp(hipQ[0], foot[0], .45) + spread * H * .1, Math.min(hipQ[1], foot[1]) - H * (.32 - .06 * Math.abs(spread))];
      const seg = curveY(hipQ, knee, 4).concat(curveY(knee, foot, 6).slice(1));
      const d = ribbonY(seg, H * .055, H * .015);
      res.push({ t: "fill", d, fill: body, outline: line, opacity: near ? 1 : .85 });
      // Yellow bands at the joints and bristles along the leg.
      const bands = [.25, .5, .7, .85].map(f => { const q = seg[Math.round(f * (seg.length - 1))], q2 = seg[Math.min(seg.length - 1, Math.round(f * (seg.length - 1)) + 1)], a = Math.atan2(q2[1] - q[1], q2[0] - q[0]) * 180 / Math.PI + 90, w = H * .03 * (1 - f * .6); return carvedLine([polar(q, a, w), polar(q, a + 180, w)], H * .018, { taper: "none" }); }).join("");
      res.push({ t: "clip", d, key: "lb" + i + (near ? "n" : "f"), prims: [{ t: "fill", d: bands, fill: band, opacity: .9 }] });
      res.push({ t: "stroke", d: seg.slice(1, -1).map((q, j) => j % 2 ? "" : `M${q[0].toFixed(1)} ${q[1].toFixed(1)}l${(H * .015).toFixed(1)} ${(-H * .02).toFixed(1)}`).join(""), color: "sumi", width: .8, opacity: .6 });
      if (!near) res.push({ t: "fill", d, fill: "sumi", opacity: .2 });
    }
    return res;
  };
  out.push(...legs(false));
  // Silk thread rising from the spinnerets while it stands still.
  if (!s.moving && rear < .1) out.push({ t: "stroke", d: `M${T(-.62, .05).join(" ")}Q${T(-.7, .5)[0].toFixed(1)} ${(T(-.7, .5)[1]).toFixed(1)} ${T(-.66, 2.2).join(" ")}`, color: "gofun", width: .8, opacity: .6 });
  // Abdomen: a big egg with tiger stripes and a hairy fringe; the cephalothorax in front, hairy, with the face.
  const abd = smoothD([T(-.05, .02), T(-.25, -.12), T(-.58, -.08), T(-.72, .1), T(-.62, .32), T(-.3, .38), T(-.06, .22)], true, .45);
  out.push({ t: "fill", d: abd, fill: { type: "linear", angle: 90, stops: [[0, body, 1], [1, "sumi", 1]] }, outline: line * 1.1, grain: .6 });
  const stripes: string[] = [];
  for (let i = 0; i < 6; i++) { const x = -.12 - i * .1; stripes.push(carvedLine([T(x + .03, .38), T(x, .15), T(x + .02, -.1)], H * .035, { taper: "both", minRatio: .2, smooth: true })); }
  out.push({ t: "clip", d: abd, key: "abd", prims: [{ t: "fill", d: stripes.join(""), fill: band, opacity: .85 }, { t: "dots", d: Array.from({ length: 22 }, (_, i) => circleD(...T(-.15 - hash01(seed, i, 601) * .5, -.05 + hash01(seed, i, 602) * .38), H * .008)).join(""), color: "sumi", opacity: .6 }] });
  const ceph = smoothD([T(-.06, .02), T(.08, -.08), T(.28, -.02), T(.34, .12), T(.24, .26), T(.02, .26), T(-.08, .16)], true, .45);
  out.push({ t: "fill", d: ceph, fill: body, outline: line, grain: .5 });
  out.push({ t: "stroke", d: Array.from({ length: 26 }, (_, i) => { const q = T(-.04 + hash01(seed, i, 603) * .34, .0 + hash01(seed, i, 604) * .26); return `M${q[0].toFixed(1)} ${q[1].toFixed(1)}l${(H * .02).toFixed(1)} ${(-H * .015).toFixed(1)}`; }).join(""), color: "sumi", width: .7, opacity: .55 });
  // Eyes: two great glaring ones and a row of small ones; the fangs hook down and spread when it rears.
  const blink = ((frame + seed * 5) % 150) < 4;
  for (const [x, y, r] of [[.24, .17, .045], [.15, .2, .04]] as const) {
    const c = T(x, y);
    out.push({ t: "fill", d: ellipseD(c[0], c[1], H * r, H * r * .9), fill: "ki", outline: line * .9 });
    if (!blink) out.push({ t: "dots", d: circleD(c[0] + H * .01, c[1], H * r * .5), color: "sumi" }, { t: "dots", d: circleD(c[0] + H * .015, c[1] - H * r * .25, H * r * .15), color: "gofun" });
    else out.push({ t: "line", d: carvedLine([[c[0] - H * r, c[1]], [c[0] + H * r, c[1]]], H * .01), color: "sumi" });
  }
  out.push({ t: "dots", d: [[.29, .1], [.3, .05], [.2, .26], [.1, .27]].map(([x, y]) => circleD(...T(x, y), H * .012)).join(""), color: "shu" });
  const spreadF = rear * .06;
  for (const side of [0, 1]) {
    const base = T(.3, .06 - side * .04), tip = T(.36 + spreadF, -.08 - side * .03 - spreadF);
    out.push({ t: "fill", d: ribbonY(curveY(base, T(.4 + spreadF, -.02 - side * .03), 5).concat([tip]), H * .03, H * .004), fill: "sumi", outline: line * .6 });
  }
  out.push(...legs(true));
  return out;
}
/** Points along a quadratic-ish arc from a to b bulging a little upward. */
function curveY(a: Pt, b: Pt, n: number): Pt[] {
  const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - Math.hypot(b[0] - a[0], b[1] - a[1]) * .08];
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * m[0] + t * t * b[0], u * u * a[1] + 2 * u * t * m[1] + t * t * b[1]]); }
  return out;
}
function ribbonY(spine: readonly Pt[], w0: number, w1: number): string { return ribbon(spine, w0, w1); }

/** Draws a yōkai. */
export function drawYokai(kind: UkiyoeYokai, look: YokaiLook, s: YokaiState, frame: number, wind: number, seed: number): Prim[] {
  let prims: Prim[];
  switch (kind) {
    case "yukionna": case "yurei": case "rokurokubi": prims = spiritWoman(kind, look, s, frame, wind, seed); break;
    case "kappa": prims = kappa(look, s, frame, seed); break;
    case "nurikabe": prims = nurikabe(look, s, frame, seed); break;
    case "tsuchigumo": prims = tsuchigumo(look, s, frame, seed); break;
    case "tengu": case "karasutengu": prims = tengu(kind === "tengu" ? "red" : "crow", look, s, frame, wind, seed); break;
    case "kasaobake": prims = kasaObake(look, s, frame, wind, seed); break;
    case "okiku": prims = okiku(look, s, frame, wind, seed); break;
    case "akaname": prims = akaname(look.size ?? 120, frame, s.moving, s.dist, seed); break;
    case "gashadokuro": case "umibozu": case "orochi": case "omukade": case "namazu": case "jasei": prims = drawGiant(kind, look, s.w, s, frame, seed); break;
    case "chochinobake": prims = chochinObake(look, s, frame, wind, seed); break;
    case "hitodama": {
      const H = look.size ?? 40, c: Pt = [Math.sin(frame / 27 + seed) * H * .4, -H * 2 - Math.cos(frame / 33 + seed) * H * .3];
      prims = soulFlame(c, H * .4, frame, seed, look.color ?? "sora");
      break;
    }
  }
  // Appearing and vanishing: the spirit fades, with snow (snow woman) or mist at the moment of its passing.
  const vanish = s.w("vanish"), appear = s.w("appear");
  let alpha = 1;
  if (vanish.w > 0) alpha *= 1 - smooth(clamp01(vanish.t / Math.max(1, vanish.len)));
  if (appear.w > 0) alpha *= smooth(clamp01(appear.t / Math.max(1, appear.len)));
  const out: Prim[] = alpha >= .999 ? [...prims] : [{ t: "group", opacity: alpha, prims }];
  const passing = Math.max(vanish.w > 0 ? Math.sin(Math.PI * clamp01(vanish.t / Math.max(1, vanish.len))) : 0, appear.w > 0 ? Math.sin(Math.PI * clamp01(appear.t / Math.max(1, appear.len))) : 0);
  if (passing > .02) {
    const H = look.size ?? 160;
    out.push(snowSwirl([0, -H * .6], H * .55 * (1 + passing), H * .5, 60, frame, seed + 51, passing));
    if (kind !== "yukionna") out.push({ t: "fill", d: [0, 1, 2, 3, 4].map(i => ellipseD(Math.sin(i * 2.1) * H * .25, -H * (.3 + i * .12), H * .25 * passing, H * .1 * passing)).join(""), fill: "gofun", opacity: .35 * passing, noPrint: true });
  }
  return out;
}
