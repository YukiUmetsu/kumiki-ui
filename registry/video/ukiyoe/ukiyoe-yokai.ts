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
import { add, carvedLine, clamp01, hash01, lerp, noise1, polar, polyD, smooth, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";

export type UkiyoeYokai = "yukionna" | "yurei" | "kasaobake" | "chochinobake" | "hitodama";
export const UKIYOE_YOKAI: readonly UkiyoeYokai[] = ["yukionna", "yurei", "kasaobake", "chochinobake", "hitodama"];

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
function spiritWoman(kind: "yukionna" | "yurei", look: YokaiLook, s: YokaiState, frame: number, wind: number, seed: number): Prim[] {
  const H = look.size ?? 190, out: Prim[] = [], line = Math.max(.8, H / 190 * 1.1);
  const robe = look.color ?? "gofun", shade = look.accent ?? (kind === "yukionna" ? "sora" : "usuzumi"), skin = "gofun";
  const snowW = kind === "yukionna";
  const hover = H * .1 + Math.sin(frame / 22 + seed) * H * .018, sway = Math.sin(frame / 31 + seed) * 1.4 + wind * 2.5;
  const blow = s.w("blow"), beckonW = s.w("beckon").w;
  // Authored in heights: u across (facing right), v up from the hem line (negative), the figure leaning with the sway.
  const P = (u: number, v: number): Pt => [u * H + (-v) * sway * .012 * H, -hover + v * H];
  const gust = snowW ? clamp01(Math.abs(wind) * .5 + .45) : .08, wv = (u: number, k = 1) => Math.sin(frame / 11 - u * 5 + seed) * u * .03 * k;
  if (snowW) out.push({ t: "glow", cx: P(0, -.6)[0], cy: P(0, -.6)[1], r: H * .7, color: "sora", opacity: .3 });
  // ---- Hair behind: a full mass from the crown down the back; the snow woman's lifts and streams on the wind into
  // separate locks, the ghost's hangs heavy and straight.
  {
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
  let cuffN = snowW ? lerp2(lerp2(rest, toLips, blow.w), reachOut, beckonW) : ghostArm;
  cuffN = [cuffN[0] + wv(.4) * .3, cuffN[1]];
  const elbowN: Pt = snowW ? lerp2([.06, -.6], [.07, -.64], blow.w) : [.08, -.66];
  const far = drape(P(-.03, -.745), P(elbowN[0] - .06, elbowN[1] + .01), P(cuffN[0] - .055, cuffN[1] + .01), .17, .015 + gust * .02);
  out.push({ t: "fill", d: far.d, fill: robe, outline: line }, { t: "fill", d: far.d, fill: shade, opacity: .4, noPrint: true });
  // ---- Robe: an S-curve from the collar over the breast, in at the waist, sweeping out over the hips and down; the
  // snow woman's hem tears into tendrils of snow trailing on the wind, the ghost's fades away.
  const front: Pt[] = [P(.035, -.775), P(.075, -.735), P(.1, -.66), P(.086, -.56), P(.098, -.46), P(.112, -.34), P(.11, -.24)];
  const backL: Pt[] = [P(-.105 - gust * .03, -.22), P(-.1, -.36), P(-.088, -.48), P(-.082, -.58), P(-.08, -.68), P(-.055, -.75)];
  const robeD = snowW ? smoothD([...front, P(.04, -.19), P(-.05, -.2), ...backL], true, .4) : smoothD([...front, P(.1, -.06), P(-.08, -.05), ...backL], true, .4);
  const fade = snowW ? [[0, robe, 1], [.6, robe, 1], [.9, shade, .85], [1, shade, .6]] : [[0, robe, .96], [.4, robe, .92], [.72, robe, .35], [1, robe, 0]];
  out.push({ t: "stroke", d: robeD, color: "sumi", width: line * 2, opacity: snowW ? 1 : .5 });
  out.push({ t: "fill", d: robeD, fill: { type: "linear", angle: 90, stops: fade as [number, UkiyoePaint, number][] }, noPrint: true });
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
  out.push({ t: "line", d: carvedLine(snowW ? [P(.058, -.765), P(.06, -.7), P(.098, -.62)] : [P(-.005, -.77), P(.05, -.71), P(.098, -.62)], H * .015, { taper: "both", minRatio: .3, smooth: true }), color: snowW ? "hanada" : "usuzumi", opacity: .75 });
  out.push({ t: "fill", d: smoothD([P(-.086, -.575), P(.088, -.585), P(.09, -.515), P(-.085, -.505)], true, .3), fill: snowW ? "sora" : "gofun", outline: line * .8, opacity: snowW ? 1 : .85 });
  // ---- Head and neck: a long neck, the long oval face of a bijin in profile — small nose, a long narrow eye, small
  // lips; the ghost gaunt and grey with the paper triangle on her brow.
  const neck = ribbon([P(.04, -.83), P(.036, -.77)], H * .042, H * .048);
  out.push({ t: "fill", d: neck, fill: skin, outline: line * .7 });
  const F = (u: number, v: number): Pt => P(.03 + u, -.885 + v);
  const face: Pt[] = [F(-.03, -.07), F(.025, -.064), F(.05, -.042), F(.064, -.012), F(.072, .006), F(.066, .014), F(.069, .024), F(.064, .03), F(.067, .037), F(.06, .048), F(.045, .058), F(.015, .062), F(-.025, .045), F(-.04, 0)];
  out.push({ t: "fill", d: smoothD(face, true, .32), fill: skin });
  out.push({ t: "line", d: carvedLine(smoothPtsY(face.slice(0, 12)), Math.max(.7, H * .005), { taper: "both", minRatio: .3, smooth: true }), color: "sumi" });
  if (snowW) out.push({ t: "fill", d: smoothD([F(-.02, .03), F(.03, .04), F(.01, .06)], true, .5), fill: "sora", opacity: .35, noPrint: true });
  else out.push({ t: "fill", d: smoothD([F(0, .0), F(.045, .02), F(.035, .05), F(-.005, .045)], true, .5), fill: "usuzumi", opacity: .25, noPrint: true });
  const blink = ((frame + seed * 7) % 160) < 6, ex = .037, ey = -.012, ew = .022;
  out.push({ t: "line", d: carvedLine([F(ex - ew * .7, ey - .001), F(ex, ey - (blink ? .0005 : .004)), F(ex + ew * .55, ey + .003)], Math.max(.8, H * .0055), { taper: "both", minRatio: .25, smooth: true }), color: "sumi" });
  if (!blink) out.push({ t: "fill", d: ellipseD(...F(ex + .004, ey + .002), H * .005, H * .0028), fill: "sumi", opacity: snowW ? .95 : .7 });
  out.push({ t: "line", d: carvedLine([F(ex - ew * .6, ey - .02), F(ex + ew * .1, ey - .025), F(ex + ew * .55, ey - .02)], Math.max(.5, H * .003), { taper: "both" }), color: "sumi", opacity: .6 });
  if (snowW) out.push({ t: "fill", d: ellipseD(...F(.066, .032), H * .0055, H * .0035), fill: "beni", noPrint: true });
  else out.push({ t: "line", d: carvedLine([F(.056, .032), F(.066, .034)], Math.max(.5, H * .003)), color: "sumi", opacity: .8 });
  // Front hair: the forelock over the brow and side locks falling in front of the shoulder; the ghost's falls forward
  // in a curtain across her cheek.
  const fh: Pt[] = snowW
    ? [F(-.045, -.03), F(-.03, -.08), F(.02, -.082), F(.05, -.055), F(.03, -.05), F(.005, -.045), F(-.008, -.01), F(-.012, .04), P(.03 + wv(.3), -.76), P(.045 + wv(.4), -.7), P(.025 + wv(.4), -.71), P(.0, -.79), F(-.035, .04)]
    : [F(-.045, -.03), F(-.03, -.085), F(.025, -.085), F(.058, -.05), F(.05, .0), F(.042, .04), P(.085 + wv(.4, .3), -.7), P(.078 + wv(.5, .3), -.64), P(.06, -.66), F(.012, .04), F(-.01, .0), F(-.03, .04)];
  out.push({ t: "fill", d: smoothD(fh, true, .32), fill: "sumi", outline: line * .5 });
  if (!snowW) {
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
  if (snowW) {
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
  else for (let f = 0; f < (look.flames ?? 2); f++) {
    const a = frame / 34 + f * Math.PI, c: Pt = P(Math.cos(a) * .22 + .04, -.55 + Math.sin(a * 1.4) * .12);
    out.push(...soulFlame(c, H * .03, frame, seed + f * 9));
  }
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

/** Draws a yōkai. */
export function drawYokai(kind: UkiyoeYokai, look: YokaiLook, s: YokaiState, frame: number, wind: number, seed: number): Prim[] {
  let prims: Prim[];
  switch (kind) {
    case "yukionna": case "yurei": prims = spiritWoman(kind, look, s, frame, wind, seed); break;
    case "kasaobake": prims = kasaObake(look, s, frame, wind, seed); break;
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
