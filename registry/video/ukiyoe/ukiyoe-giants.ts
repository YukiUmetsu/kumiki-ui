/**
 * UKIYO1 giant monsters, after Kuniyoshi's *Takiyasha the Witch and the Skeleton Spectre* (the colossal skeleton leaning
 * in through a ruined palace, an anatomical skull, ribs and a reaching hand of finger bones), his *Kuwana* sea monk (a
 * vast smooth black head rising out of the waves over a boat, two small white eyes), Yoshitoshi's *Susanoo slays Yamata
 * no Orochi* (dark serpent coils in breaking waves) and the *Kashima kaname-ishi* namazu-e (the great black catfish,
 * whiskered, pinned under the keystone). All Wikimedia Commons, public domain.
 *
 * Yōkai (creature species), each drawn from the ground or sea line at the origin; `size` is the overall height:
 * - `gashadokuro`: the skeleton rising from the ground to the waist (`appear` raises it), the jaw working on `roar`, its
 *   near hand reaching forward on `stretch`.
 * - `umibozu`: the sea monk's black head and shoulders rising from the water (`appear`), water streaming off, swaying.
 * - `orochi`: eight serpent heads on long necks rising from a mass of coils, each swaying on its own, red-eyed, tongues
 *   flicking; `roar` rears them all.
 * - `omukade`: the giant centipede, a long segmented body travelling in waves, every leg rippling, antennae and fangs.
 * - `namazu`: the great catfish, its body thrashing, whiskers swinging, the tail beating (`shake` it with the camera).
 * - `jasei`: Kiyohime's serpent coiled round the temple bell (`size` = the bell's height; place it on the bell's base), its horned head raised,
 *   flames licking from it as the bell is heated.
 */
import type { Pt } from "./ukiyoe-core";
import { carvedLine, clamp01, hash01, lerp, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";

export type UkiyoeGiant = "gashadokuro" | "umibozu" | "orochi" | "omukade" | "namazu" | "jasei";
export const UKIYOE_GIANTS: readonly UkiyoeGiant[] = ["gashadokuro", "umibozu", "orochi", "omukade", "namazu", "jasei"];
type W = (type: string) => { w: number; t: number; len: number };
interface Look { size?: number; color?: UkiyoePaint; accent?: UkiyoePaint }
const f1 = (n: number) => n.toFixed(1);
const smooth = (t: number) => { const u = clamp01(t); return u * u * (3 - 2 * u); };
const BONE = { type: "linear" as const, angle: 0, stops: [[0, "usuzumi", 1], [.45, "paper", 1], [1, "kincha", .9]] as [number, UkiyoePaint, number][] };

/** A ribbon along a spine with width w(u). */
function ribbon(spine: readonly Pt[], w: (u: number) => number): string {
  const L: Pt[] = [], R: Pt[] = [];
  spine.forEach((q, i) => {
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(spine.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u = i / (spine.length - 1), h = w(u) / 2;
    L.push([q[0] - (b[1] - a[1]) / l * h, q[1] + (b[0] - a[0]) / l * h]); R.push([q[0] + (b[1] - a[1]) / l * h, q[1] - (b[0] - a[0]) / l * h]);
  });
  return smoothD([...L, ...R.reverse()], true, .35);
}
const rise = (w: W) => { const a = w("appear"); return a.w > 0 ? smooth(a.t / Math.max(1, a.len)) : 1; };

/** A long bone from a to b with knobbed ends. */
function bone(a: Pt, b: Pt, w: number, lw: number): Prim[] {
  return [{ t: "fill", d: carvedLine([a, b], w, { taper: "none" }) + circleD(a[0], a[1], w * .75) + circleD(b[0], b[1], w * .75), fill: BONE, outline: lw, union: true }];
}

function gashadokuro(look: Look, w: W, frame: number, seed: number): Prim[] {
  const S = look.size ?? 900, lw = Math.max(1, S * .003), out: Prim[] = [], r = rise(w), sink = (1 - r) * S * .75;
  const jaw = Math.max(w("roar").w * (.5 + .5 * Math.abs(Math.sin(frame / 5))), .08), reach = w("stretch").w;
  const lean = 12 + Math.sin(frame / 50 + seed) * 2, rad = lean * Math.PI / 180;
  // Upper body leaning forward out of the ground: pelvis below ground, the spine curving up to the skull.
  const P = (x: number, y: number): Pt => { const xx = x + y * -Math.sin(rad) * .0, yy = y; return [xx * Math.cos(rad) - yy * Math.sin(rad), xx * Math.sin(rad) + yy * Math.cos(rad) + sink]; };
  const skullC = P(S * .1, -S * .9);
  // Spine: vertebrae down the back.
  const spine: Pt[] = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14; spine.push(P(-S * .06 * Math.sin(u * Math.PI) + S * .02, -S * .1 - u * S * .66)); }
  out.push({ t: "fill", d: spine.map(q => ellipseD(q[0], q[1], S * .028, S * .02)).join(""), fill: BONE, outline: lw, union: true });
  // Far arm (behind the ribs), then the ribcage, then the near arm reaching.
  const sh = P(S * .02, -S * .7), shN = P(S * .12, -S * .68);
  const farEl = P(-S * .1, -S * .38), farWr = P(S * .05, -S * .12);
  out.push(...bone(P(-S * .08, -S * .7), farEl, S * .045, lw), ...bone(farEl, farWr, S * .035, lw));
  // Ribs: curving bars from the spine round to the breastbone, shrinking toward the bottom.
  const ribs: string[] = [];
  for (let i = 0; i < 10; i++) {
    const v = i / 9, root = spine[13 - i], span2 = S * (.22 - .06 * v) * (1 - v * .2), drop = S * (.06 + .02 * v);
    ribs.push(carvedLine([root, [root[0] + span2 * .45, root[1] - drop * .5], [root[0] + span2, root[1] + drop * .2], [root[0] + span2 * .9, root[1] + drop]], S * .026 * (1 - v * .3), { taper: "end", minRatio: .5, smooth: true }));
  }
  out.push({ t: "fill", d: ribs.join(""), fill: BONE, outline: lw });
  out.push({ t: "fill", d: carvedLine([P(S * .2, -S * .68), P(S * .19, -S * .45)], S * .04, { taper: "end" }), fill: BONE, outline: lw });
  out.push(...bone(sh, shN, S * .03, lw));
  // Skull: cranium, deep sockets, the nose cavity, cheekbone, the upper teeth and the jaw that opens.
  const Sk = (x: number, y: number): Pt => [skullC[0] + x * S * .17, skullC[1] + y * S * .17];
  out.push({ t: "fill", d: smoothD([Sk(-.9, .1), Sk(-1, -.6), Sk(-.3, -1.05), Sk(.6, -.9), Sk(1.05, -.3), Sk(1.1, .25), Sk(.9, .5), Sk(.3, .55), Sk(-.4, .6)], true, .4), fill: BONE, outline: lw * 1.4, grain: .3 });
  out.push({ t: "fill", d: smoothD([Sk(.05, -.35), Sk(.45, -.48), Sk(.62, -.1), Sk(.45, .1), Sk(.1, .05)], true, .45) + smoothD([Sk(.7, -.3), Sk(.95, -.32), Sk(1.0, -.05), Sk(.82, .05)], true, .45), fill: "sumi" });
  out.push({ t: "fill", d: smoothD([Sk(.85, .1), Sk(1.02, .32), Sk(.82, .35)], true, .3), fill: "sumi" });
  out.push({ t: "stroke", d: [-.6, -.2].map(x => `M${f1(Sk(x, -.7)[0])} ${f1(Sk(x, -.7)[1])}q${f1(S * .02)} ${f1(S * .03)} 0 ${f1(S * .06)}`).join(""), color: "usuzumi", width: lw, opacity: .6 });
  const teeth: string[] = [];
  for (let i = 0; i < 7; i++) { const q = Sk(.25 + i * .12, .52); teeth.push(`M${f1(q[0])} ${f1(q[1])}v${f1(S * .02)}`); }
  out.push({ t: "stroke", d: teeth.join(""), color: "usuzumi", width: lw * 1.2 });
  const jy = jaw * .35;
  out.push({ t: "fill", d: smoothD([Sk(-.35, .55), Sk(.25, .6 + jy), Sk(1.0, .62 + jy), Sk(1.05, .8 + jy), Sk(.6, 1.0 + jy), Sk(-.1, .95 + jy * .6), Sk(-.4, .75)], true, .35), fill: BONE, outline: lw * 1.2 });
  out.push({ t: "stroke", d: Array.from({ length: 6 }, (_, i) => { const q = Sk(.35 + i * .12, .62 + jy); return `M${f1(q[0])} ${f1(q[1])}v${f1(-S * .018)}`; }).join(""), color: "usuzumi", width: lw * 1.2 });
  // Near arm: humerus from the shoulder, forearm, the hand of finger bones spread to grasp; reaching forward on `stretch`.
  const el = P(lerp(S * .3, S * .42, reach), lerp(-S * .42, -S * .6, reach)), wr = P(lerp(S * .44, S * .72, reach), lerp(-S * .22, -S * .55, reach));
  out.push(...bone(shN, el, S * .05, lw), ...bone(el, wr, S * .04, lw));
  const fingers: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (-60 + i * 22 + 10 * Math.sin(frame / 12 + i)) * Math.PI / 180, l1 = S * (.07 - (i === 0 ? .02 : 0));
    const k1: Pt = [wr[0] + Math.cos(a) * l1, wr[1] + Math.sin(a) * l1], k2: Pt = [k1[0] + Math.cos(a + .5) * l1 * .8, k1[1] + Math.sin(a + .5) * l1 * .8], tip: Pt = [k2[0] + Math.cos(a + 1) * l1 * .6, k2[1] + Math.sin(a + 1) * l1 * .6];
    fingers.push(carvedLine([wr, k1, k2, tip], S * .016, { taper: "end", minRatio: .5 }));
  }
  out.push({ t: "fill", d: fingers.join(""), fill: BONE, outline: lw });
  // Grave earth heaped where it breaks out of the ground.
  out.push({ t: "fill", d: smoothD([[-S * .5, 4], [-S * .3, -S * .03], [0, -S * .05], [S * .35, -S * .03], [S * .55, 4]], true, .4), fill: { type: "linear", angle: 90, stops: [[0, "kogecha", 1], [1, "sumi", 1]] }, outline: lw });
  return out;
}

function umibozu(look: Look, w: W, frame: number, seed: number): Prim[] {
  const S = look.size ?? 700, lw = Math.max(1, S * .003), r = rise(w), out: Prim[] = [];
  const sway = Math.sin(frame / 60 + seed) * S * .02, top = -S * r, cx = sway;
  // The great smooth head and shoulders, a soft sheen on the crown, two small round white eyes.
  const body = smoothD([[cx - S * .6, 10], [cx - S * .55, top * .35], [cx - S * .36, top * .62], [cx - S * .28, top * .82], [cx, top], [cx + S * .28, top * .82], [cx + S * .36, top * .62], [cx + S * .55, top * .35], [cx + S * .6, 10]], true, .4);
  out.push({ t: "fill", d: body, fill: { type: "linear", angle: 0, stops: [[0, "sumi", 1], [.5, "ai", .9], [1, "sumi", 1]] }, outline: lw });
  out.push({ t: "fill", d: ellipseD(cx - S * .08, top * .9, S * .1, S * .04), fill: "sora", opacity: .25, noPrint: true });
  if (r > .5) for (const sx of [-1, 1]) { const ey = top * .78; out.push({ t: "fill", d: ellipseD(cx + sx * S * .1, ey, S * .03, S * .025), fill: "gofun", outline: lw * .7 }, { t: "fill", d: circleD(cx + sx * S * .1, ey, S * .01), fill: "sumi" }); }
  // Water pouring off the shoulders and streaming down.
  const streams: string[] = [];
  for (let i = 0; i < 9; i++) { const x = cx + (i - 4) * S * .12, y0 = top * (.35 + .25 * (1 - Math.abs(i - 4) / 4)), ph = (frame / 10 + i) % 1; streams.push(carvedLine([[x, y0 * .6 + ph * S * .08], [x + S * .01, y0 * .35 + ph * S * .08], [x, 0]], S * .01, { taper: "both" })); }
  out.push({ t: "fill", d: streams.join(""), fill: "sora", opacity: .3 });
  out.push({ t: "fill", d: Array.from({ length: 14 }, (_, i) => ellipseD(cx + (i - 6.5) * S * .09, 0, S * .06, S * .02)).join(""), fill: "gofun", opacity: .7, union: true });
  return out;
}

/** A serpent body along a spine: dark scaled back, pale belly scutes, a key line. */
function serpentBody(spine: readonly Pt[], w0: number, color: UkiyoePaint, lw: number, key: string): Prim[] {
  const d = ribbon(spine, u => w0 * (u < .06 ? .4 + u * 10 : 1 - u * .35));
  const belly = spine.map((q, i) => { const a = spine[Math.max(0, i - 1)], b = spine[Math.min(spine.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [q[0] + (b[1] - a[1]) / l * w0 * .32, q[1] - (b[0] - a[0]) / l * w0 * .32] as Pt; });
  return [{ t: "fill", d, fill: color, outline: lw * 1.2, pattern: { type: "uroko", color: "sumi", scale: w0 * .012, opacity: .5 } },
    { t: "clip", d, key, prims: [{ t: "line", d: carvedLine(belly, w0 * .3, { taper: "none" }), color: "kincha", opacity: .85 }, { t: "stroke", d: belly.filter((_, i) => i % 2).map(q => `M${f1(q[0] - w0 * .12)} ${f1(q[1])}h${f1(w0 * .24)}`).join(""), color: "kogecha", width: lw * .6 }] }];
}

/** A serpent head at `p` facing angle `a` (radians), size h: horned (optional), red eye, open jaws with fangs, flicking tongue. */
function serpentHead(p: Pt, a: number, h: number, color: UkiyoePaint, lw: number, open: number, frame: number, i: number, horns = false): Prim[] {
  const H = (x: number, y: number): Pt => [p[0] + Math.cos(a) * x * h - Math.sin(a) * y * h, p[1] + Math.sin(a) * x * h + Math.cos(a) * y * h];
  const out: Prim[] = [];
  if (horns) out.push({ t: "fill", d: smoothD([H(-.1, -.3), H(-.5, -.95), H(-.35, -.9), H(.1, -.35)], true, .3), fill: "ki", outline: lw });
  out.push({ t: "fill", d: smoothD([H(-.3, -.35), H(.4, -.42), H(1.0, -.2), H(1.1, -.02), H(.5, -.02 + open * .05), H(-.3, .1)], true, .35), fill: color, outline: lw * 1.2 });
  out.push({ t: "fill", d: smoothD([H(-.25, .1), H(.45, .05 + open * .35), H(.95, .1 + open * .55), H(.9, .25 + open * .55), H(.2, .35), H(-.3, .3)], true, .35), fill: color, outline: lw });
  if (open > .1) out.push({ t: "fill", d: smoothD([H(.1, 0), H(1.0, -.02), H(.95, .12 + open * .5), H(.4, .05 + open * .3)], true, .3), fill: "beni" }, { t: "fill", d: smoothD([H(.85, -.03), H(.88, .2), H(.8, -.02)], true, .2) + smoothD([H(.82, .1 + open * .5), H(.85, -.05 + open * .5), H(.76, .1 + open * .5)], true, .2), fill: "gofun" });
  out.push({ t: "fill", d: circleD(...H(.42, -.26), h * .08), fill: "shu", outline: lw * .6 }, { t: "fill", d: ellipseD(...H(.43, -.26), h * .02, h * .06), fill: "sumi" });
  if (Math.sin(frame / 5 + i * 1.7) > .3) { const t0 = H(1.05, .05), t1 = H(1.5, .1); out.push({ t: "stroke", d: `M${f1(t0[0])} ${f1(t0[1])}L${f1(t1[0])} ${f1(t1[1])}l${f1(h * .1)} ${f1(-h * .06)}M${f1(t1[0])} ${f1(t1[1])}l${f1(h * .1)} ${f1(h * .06)}`, color: "beni", width: lw * 1.4 }); }
  return out;
}

function orochi(look: Look, w: W, frame: number, seed: number): Prim[] {
  const S = look.size ?? 800, lw = Math.max(1, S * .003), color = look.color ?? "kogecha", out: Prim[] = [], rear = w("roar").w, r = rise(w);
  const necks: { spine: Pt[]; head: Pt; a: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const base: Pt = [(i - 3.5) * S * .07, -S * .12], ang = (-90 + (i - 3.5) * 16) * Math.PI / 180, len = S * (.55 + .2 * hash01(seed, i, 1)) * (.4 + .6 * r) * (1 + .12 * rear), spine: Pt[] = [];
    for (let j = 0; j <= 16; j++) {
      const u = j / 16, wob = Math.sin(frame / 14 + i * 1.3 + u * 4) * S * .05 * u;
      spine.push([base[0] + Math.cos(ang) * len * u + Math.sin(u * Math.PI * 1.5 + i) * S * .06 + wob, base[1] + Math.sin(ang) * len * u * (1 - .2 * u) + u * u * S * .08]);
    }
    const h = spine[16], p2 = spine[14];
    necks.push({ spine, head: h, a: Math.atan2(h[1] - p2[1], h[0] - p2[0]) + (Math.PI / 2) * (h[0] < 0 ? -.5 : .5) });
  }
  // Back necks first (outer ones), then the coiled mass, then the front necks.
  const order = [0, 7, 1, 6, 2, 5, 3, 4];
  order.slice(0, 4).forEach(i => { out.push(...serpentBody(necks[i].spine, S * .07, color, lw, `oro${i}`)); out.push(...serpentHead(necks[i].head, necks[i].a, S * .09, color, lw, .2 + .6 * rear, frame, i)); });
  const coils: string[] = [];
  for (let k = 0; k < 4; k++) coils.push(ellipseD(Math.sin(k * 2.1 + seed) * S * .15, -S * (.04 + k * .05), S * (.42 - k * .06), S * .07));
  out.push({ t: "fill", d: coils.join(""), fill: color, outline: lw * 1.2, union: true, pattern: { type: "uroko", color: "sumi", scale: S * .001, opacity: .5 } });
  order.slice(4).forEach(i => { out.push(...serpentBody(necks[i].spine, S * .07, color, lw, `oro${i}`)); out.push(...serpentHead(necks[i].head, necks[i].a, S * .09, color, lw, .2 + .6 * rear, frame, i)); });
  return out;
}

function omukade(look: Look, w: W, s: { moving: boolean; dist: number }, frame: number, seed: number): Prim[] {
  // `roar` rears the head end up.
  const S = look.size ?? 900, lw = Math.max(1, S * .002), out: Prim[] = [], n = 34, segL = S / n, wave = (s.moving ? s.dist / (S * .3) : frame / 30 + seed) * Math.PI, rear = w("roar").w;
  const spine: Pt[] = [];
  for (let i = 0; i <= n; i++) { const u = i / n; spine.push([(u - .5) * S, -S * .05 - Math.sin(u * Math.PI * 2.4 - wave) * S * .05 - (u > .9 ? (u - .9) * S * (.6 + 3 * rear) : 0)]); }
  // Legs: a pair per segment, rippling in a travelling wave; the far ones darker.
  const legs = (far: boolean) => {
    const d: string[] = [];
    for (let i = 1; i < n - 1; i++) {
      const q = spine[i], ph = Math.sin(i * .9 - wave * 2 + (far ? Math.PI : 0)), knee: Pt = [q[0] + ph * segL * .4, q[1] + S * .03], foot: Pt = [q[0] + ph * segL * .7 + segL * .2, (far ? -S * .01 : 0) - Math.max(0, ph) * S * .015];
      d.push(carvedLine([q, knee, foot], S * .008, { taper: "end", minRatio: .4 }));
    }
    return d.join("");
  };
  out.push({ t: "fill", d: legs(true), fill: "kogecha", outline: lw * .5 });
  // Segments: overlapping plates, dark brown with a red-orange edge, each with a ridge.
  for (let i = n; i >= 1; i--) {
    const q = spine[i], p = spine[i - 1], a = Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
    out.push({ t: "group", transform: `translate(${f1(q[0])} ${f1(q[1])}) rotate(${f1(a)})`, prims: [
      { t: "fill", d: smoothD([[-segL * .7, S * .025], [-segL * .6, -S * .03], [segL * .4, -S * .032], [segL * .55, S * .025], [0, S * .035]], true, .35), fill: { type: "linear", angle: 90, stops: [[0, "kogecha", 1], [1, "sumi", 1]] }, outline: lw },
      { t: "stroke", d: `M${f1(-segL * .6)} ${f1(-S * .028)}L${f1(segL * .45)} ${f1(-S * .03)}`, color: "tan", width: lw * 1.4 }] });
  }
  out.push({ t: "fill", d: legs(false), fill: "shu", outline: lw * .5 });
  // Head: a flat shield, two long antennae waving, curved fangs that open and close, glinting eyes.
  const h = spine[n], hp = spine[n - 1], ha = Math.atan2(h[1] - hp[1], h[0] - hp[0]);
  const Hd = (x: number, y: number): Pt => [h[0] + Math.cos(ha) * x * S * .05 - Math.sin(ha) * y * S * .05, h[1] + Math.sin(ha) * x * S * .05 + Math.cos(ha) * y * S * .05];
  out.push({ t: "fill", d: smoothD([Hd(-.5, -.6), Hd(.8, -.7), Hd(1.2, 0), Hd(.8, .7), Hd(-.5, .6)], true, .4), fill: "shu", outline: lw * 1.2 });
  for (const sy of [-1, 1]) {
    const ant: Pt[] = [];
    for (let j = 0; j <= 8; j++) { const u = j / 8; ant.push(Hd(1 + u * 5, sy * (.4 + u * 2.5) + Math.sin(frame / 8 + u * 3 + sy) * u * .8)); }
    out.push({ t: "line", d: carvedLine(ant, S * .006, { taper: "end", minRatio: .3, smooth: true }), color: "sumi" });
    const open = .3 + .3 * Math.sin(frame / 6);
    out.push({ t: "fill", d: smoothD([Hd(1, sy * .3), Hd(1.6, sy * (.5 + open)), Hd(1.9, sy * (.1 + open * .6)), Hd(1.5, sy * .2)], true, .3), fill: "sumi", outline: lw * .7 });
    out.push({ t: "fill", d: circleD(...Hd(.6, sy * .35), S * .008), fill: "ki" });
  }
  return out;
}

function namazu(look: Look, w: W, frame: number, seed: number): Prim[] {
  const S = look.size ?? 700, lw = Math.max(1, S * .003), out: Prim[] = [], thrash = Math.max(w("roar").w, .3), n = 20, spine: Pt[] = [];
  const beat = Math.sin(frame / (thrash > .6 ? 4 : 10) + seed);
  for (let i = 0; i <= n; i++) { const u = i / n; spine.push([(.5 - u) * S, -S * .12 + Math.sin(u * Math.PI * 1.2 + beat) * S * .05 * u * u * thrash * 2]); }
  // Body: a thick black ribbon tapering to the tail fin, a pale belly, small eye far forward, the wide mouth.
  const body = ribbon(spine, u => S * .26 * (u < .15 ? .75 + u * 1.6 : 1 - (u - .15) * .9));
  const tail = spine[n], tp = spine[n - 2], ta = Math.atan2(tail[1] - tp[1], tail[0] - tp[0]);
  out.push({ t: "fill", d: smoothD([tail, [tail[0] + Math.cos(ta - .8) * S * .12, tail[1] + Math.sin(ta - .8) * S * .12], [tail[0] + Math.cos(ta) * S * .05, tail[1] + Math.sin(ta) * S * .05], [tail[0] + Math.cos(ta + .8) * S * .12, tail[1] + Math.sin(ta + .8) * S * .12]], true, .3), fill: "sumi", outline: lw });
  out.push({ t: "fill", d: body, fill: { type: "linear", angle: 90, stops: [[0, "sumi", 1], [.7, "usuzumi", 1], [1, "paper", 1]] }, outline: lw * 1.4 });
  out.push({ t: "fill", d: smoothD([[spine[6][0], spine[6][1] - S * .1], [spine[7][0], spine[7][1] - S * .17], [spine[9][0], spine[9][1] - S * .14], [spine[9][0], spine[9][1] - S * .09]], true, .45), fill: "sumi", outline: lw });
  const head = spine[0];
  out.push({ t: "fill", d: circleD(head[0] - S * .06, head[1] - S * .05, S * .018), fill: "gofun" }, { t: "fill", d: circleD(head[0] - S * .055, head[1] - S * .05, S * .008), fill: "sumi" });
  out.push({ t: "stroke", d: `M${f1(head[0] + S * .02)} ${f1(head[1] + S * .03)}q${f1(-S * .08)} ${f1(S * .04)} ${f1(-S * .18)} ${f1(S * .01)}`, color: "gofun", width: lw * 1.5 });
  // Long whiskers swinging, two from the upper lip, two from the chin.
  for (let k = 0; k < 4; k++) {
    const root: Pt = [head[0] - S * (.02 + .03 * (k % 2)), head[1] + (k < 2 ? -S * .01 : S * .05)], pts: Pt[] = [root];
    for (let j = 1; j <= 10; j++) { const u = j / 10; pts.push([root[0] + u * S * .45, root[1] + Math.sin(u * 4 + frame / 7 + k) * S * .06 * u + (k < 2 ? -1 : 1) * u * S * .1]); }
    out.push({ t: "line", d: carvedLine(pts, S * .012, { taper: "end", minRatio: .1, smooth: true }), color: "sumi" });
  }
  return out;
}

function jasei(look: Look, w: W, frame: number, seed: number): Prim[] {
  const Hb = look.size ?? 220, R = Hb * .42, S = Math.max(R * 2, Hb), lw = Math.max(1, S * .004), color = look.color ?? "matsu", out: Prim[] = [];
  const heat = Math.max(w("roar").w, .4);
  // Flames rising round the bell as the serpent's rage heats it.
  const fl: string[] = [];
  for (let i = 0; i < 9; i++) { const x = (i - 4) * R * .26, h = Hb * (.25 + .25 * Math.abs(Math.sin(frame / 6 + i * 1.3))) * heat; fl.push(smoothD([[x - R * .14, 0], [x - R * .05, -h * .6], [x + Math.sin(frame / 5 + i) * R * .05, -h], [x + R * .06, -h * .55], [x + R * .14, 0]], true, .4)); }
  out.push({ t: "glow", cx: 0, cy: -Hb * .4, r: S * .9, color: "tan", opacity: .45 * heat }, { t: "fill", d: fl.join(""), fill: "shu", opacity: .85, outline: lw * .6, outlineColor: "kogecha", union: true });
  // The coils: three bands wrapped round the bell, each a front arc (the back of each loop hidden by the bell).
  for (let k = 0; k < 3; k++) {
    const y = -Hb * (.2 + .27 * k), arc: Pt[] = [];
    for (let j = 0; j <= 14; j++) { const u = j / 14, a = Math.PI * (1 - u); arc.push([Math.cos(a) * R * 1.12, y + Math.sin(a) * R * .3 - u * Hb * .08 + Math.sin(frame / 20 + k) * 2]); }
    out.push(...serpentBody(arc, R * .3, color, lw, `jasei${k}`));
  }
  // The head rises over the top, horned, mouth open, eyes burning.
  const neck: Pt[] = [];
  for (let j = 0; j <= 10; j++) { const u = j / 10; neck.push([R * 1.1 - u * R * .9 + Math.sin(u * 3 + frame / 15) * R * .1, -Hb * .74 - u * Hb * .5]); }
  out.push(...serpentBody(neck, R * .3, color, lw, "jasei-neck"));
  const h = neck[10], hp = neck[8];
  out.push(...serpentHead(h, Math.atan2(h[1] - hp[1], h[0] - hp[0]) - Math.PI * .45, R * .55, color, lw, .5 + .4 * Math.sin(frame / 7), frame, seed, true));
  return out;
}

/** Draw a giant monster at a frame. */
export function drawGiant(kind: UkiyoeGiant, look: Look, w: W, s: { moving: boolean; dist: number }, frame: number, seed: number): Prim[] {
  switch (kind) {
    case "gashadokuro": return gashadokuro(look, w, frame, seed);
    case "umibozu": return umibozu(look, w, frame, seed);
    case "orochi": return orochi(look, w, frame, seed);
    case "omukade": return omukade(look, w, s, frame, seed);
    case "namazu": return namazu(look, w, frame, seed);
    case "jasei": return jasei(look, w, frame, seed);
  }
}

// ---- Scenes ------------------------------------------------------------------------------------------------------------------------

export type UkiyoeGiantScene = "skeleton" | "seamonk" | "orochi" | "centipede" | "namazu" | "dojoji" | "toad" | "daidara";
export const UKIYOE_GIANT_SCENES: readonly UkiyoeGiantScene[] = ["skeleton", "seamonk", "orochi", "centipede", "namazu", "dojoji", "toad", "daidara"];

/**
 * Each giant against people or buildings for scale: `skeleton` (the gashadokuro rises in a ruined palace over two
 * samurai), `seamonk` (the umibōzu looms over a boat at night), `orochi` (the eight heads rear over a stormy sea, Susanoo
 * with his sword), `centipede` (the great centipede crawls round the mountain toward Tawara Tōda's arrow), `namazu` (the
 * earthquake catfish thrashes and the ground shakes), `dojoji` (Kiyohime's serpent round the burning bell), `toad`
 * (Jiraiya's giant toad, a frog grown huge), `daidara` (the daidarabotchi striding over the hills).
 */
export function giantScene(kind: UkiyoeGiantScene = "skeleton", frames = 300): import("./ukiyoe-scene").UkiyoeSceneSpec {
  type N = import("./ukiyoe-scene").UkiyoeNode;
  const night = kind !== "daidara" && kind !== "toad" && kind !== "centipede";
  const nodes: N[] = [{ id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .5, ...(night ? { top: "yoru", mid: "ai", horizon: kind === "dojoji" ? "beni" : "ai" } : { horizon: "beni" }) } }];
  const ground = (fill: unknown) => nodes.push({ id: "ground", kind: "block", x: 960, y: 1000, shape: { type: "rect", width: 1920, height: 300 }, fill, line: 0 } as unknown as N);
  const c = (id: string, species: string, x: number, y: number, look: Record<string, unknown>, actions: unknown[], facing: "left" | "right" = "right", scale = 1) => nodes.push({ id, kind: "creature", species, x, y, scale, facing, look, actions } as unknown as N);
  const fig = (id: string, look: Record<string, unknown>, x: number, y: number, scale: number, actions: unknown[], facing: "left" | "right" = "right") => nodes.push({ id, kind: "figure", x, y, scale, look, facing, actions } as unknown as N);
  const samurai = { hair: "chonmage", robe: "ai", lower: "hakama", hakama: "kogecha", feet: "waraji", swords: "daisho", build: "average" };
  let camera: import("./ukiyoe-scene").UkiyoeSceneSpec["camera"];
  if (kind === "skeleton") {
    ground({ type: "linear", angle: 90, stops: [[0, "kogecha", 1], [1, "sumi", 1]] });
    nodes.push({ id: "gate", kind: "motif", motif: "gate", x: 600, y: 940, params: { width: 700, height: 680, ruin: 1 } } as N);
    c("skeleton", "gashadokuro", 1250, 1000, { size: 860 }, [{ type: "appear", start: 10, end: 120 }, { type: "stretch", start: 140, end: 230 }, { type: "roar", start: 150, end: frames }], "left");
    fig("s1", { ...samurai, robe: "ai" }, 420, 980, 1.5, [{ type: "draw", start: 130, end: 170 }, { type: "kamae", start: 170, end: frames, form: "chudan" }]);
    fig("s2", { ...samurai, robe: "shu" }, 620, 990, 1.5, [{ type: "startle", start: 140, end: 200 }]);
  } else if (kind === "seamonk") {
    nodes.push({ id: "moon", kind: "motif", motif: "moon", x: 1600, y: 160, params: { radius: 50 } } as N);
    c("umibozu", "umibozu", 900, 760, { size: 800 }, [{ type: "appear", start: 20, end: 160 }]);
    nodes.push({ id: "sea", kind: "motif", motif: "sea", y: 760, params: { width: 1920, height: 320, rows: 8 } } as N);
    // A cargo boat dwarfed below the monk, its boatman bracing at the stern.
    nodes.push({ id: "boat", kind: "group", x: 700, y: 900, loops: [{ kind: "rock", amplitude: 3, period: 70 }] } as unknown as N);
    nodes.push({ id: "hull", kind: "motif", motif: "boat", parent: "boat", params: { length: 520 } } as unknown as N);
    fig("sailor", { hair: "chonmage", hat: "headband", robe: "ai", lower: "loincloth", upper: "bare", build: "average" }, 0, -18, .75, [{ type: "startle", start: 120, end: 200 }, { type: "brace", start: 200, end: frames, angle: 12 }], "right");
    (nodes[nodes.length - 1] as unknown as { parent: string; x: number }).parent = "boat";
    (nodes[nodes.length - 1] as unknown as { x: number }).x = -150;
  } else if (kind === "orochi") {
    c("orochi", "orochi", 1150, 860, { size: 900 }, [{ type: "appear", start: 0, end: 90 }, { type: "roar", start: 140, end: 230 }], "left");
    nodes.push({ id: "sea", kind: "motif", motif: "sea", y: 820, params: { width: 1920, height: 260, rows: 8 } } as N);
    nodes.push({ id: "rock", kind: "motif", motif: "rock", x: 380, y: 1000, params: { width: 420, height: 260 } } as N);
    fig("susanoo", { hair: "mizura", robe: "ai", lower: "hakama", hakama: "gofun", obi: "kin", feet: "bare", build: "stout", prop: "tsurugi", beads: true, beard: true }, 400, 760, 1.7, [{ type: "brace", start: 0, end: frames, angle: 10 }]);
    nodes.push({ id: "rain", kind: "particles", type: "rain", count: 200, angle: 20 } as unknown as N);
  } else if (kind === "centipede") {
    nodes.push({ id: "mtn", kind: "motif", motif: "mountain", x: 960, y: 900, params: { width: 1700, height: 620 } } as N);
    ground({ type: "linear", angle: 90, stops: [[0, "kusa", 1], [1, "matsu", 1]] });
    c("centipede", "omukade", 1100, 760, { size: 1200 }, [{ type: "walk", start: 0, end: 220, to: -260 }, { type: "roar", start: 220, end: frames }], "left");
    fig("toda", { hair: "chonmage", hat: "kabuto", armor: "beni", robe: "beni", lower: "hakama", hakama: "kogecha", feet: "waraji", build: "stout", prop: "yumi" }, 260, 980, 1.6, [{ type: "shoot", start: 160, end: 280, contact: 240, aim: [480, -150] }]);
  } else if (kind === "namazu") {
    ground({ type: "linear", angle: 90, stops: [[0, "kincha", 1], [1, "cha", 1]] });
    c("namazu", "namazu", 1050, 980, { size: 1100 }, [{ type: "roar", start: 60, end: 220 }]);
    nodes.push({ id: "house", kind: "motif", motif: "minka", x: 260, y: 870, params: { width: 380 }, loops: [{ kind: "rock", amplitude: 3, period: 8, start: 60, end: 220 }] } as unknown as N);
    camera = { shake: [{ frame: 60, duration: 160, amount: 1 }] };
  } else if (kind === "dojoji") {
    ground({ type: "linear", angle: 90, stops: [[0, "kogecha", 1], [1, "sumi", 1]] });
    nodes.push({ id: "hall", kind: "motif", motif: "hondo", x: 1500, y: 880, params: { width: 600, height: 360 } } as N);
    // The bell lowered over the monk who hides inside it; the serpent coils round it on the ground and burns it.
    nodes.push({ id: "fallen", kind: "block", x: 1000, y: 960, shape: { type: "polygon", points: [[-120, 0], [120, 0], [104, -300], [70, -330], [-70, -330], [-104, -300]] }, fill: { type: "linear", angle: 0, stops: [[0, "matsu", 1], [.45, "asagi", 1], [1, "matsu", 1]] }, line: 3, pattern: { type: "kikko", color: "matsu", scale: .8, opacity: .4 } } as unknown as N);
    c("serpent", "jasei", 1000, 960, { size: 330 }, [{ type: "roar", start: 0, end: frames }]);
  } else if (kind === "toad") {
    nodes.push({ id: "hills", kind: "motif", motif: "hills", x: 960, y: 800, params: { width: 2200, height: 260 } } as N);
    ground({ type: "linear", angle: 90, stops: [[0, "kusa", 1], [1, "matsu", 1]] });
    c("toad", "frog", 1100, 960, { size: 520, color: "cha" }, [{ type: "howl", start: 80, end: frames }], "left");
    fig("jiraiya", { hair: "wild", robe: "murasaki", robePattern: { type: "kikko", color: "kin", scale: .5 }, lower: "hakama", hakama: "kogecha", feet: "waraji", build: "average", swords: "katana" }, 1100, 700, 1.5, [{ type: "pray", start: 40, end: frames }], "left");
  } else {
    nodes.push({ id: "range", kind: "motif", motif: "range", x: 960, y: 900, depth: .5, params: { width: 2200, height: 380, layers: 3 } } as N);
    fig("giant", { hair: "wild", upper: "bare", lower: "loincloth", skin: "kincha", build: "brute", feet: "bare" }, 300, 1000, 3.4, [{ type: "walk", start: 0, end: frames, to: 360 }], "right");
    nodes.push({ id: "mist", kind: "block", x: 960, y: 900, shape: { type: "rect", width: 1920, height: 200 }, fill: "gofun", opacity: .55, line: 0 } as unknown as N);
    ground({ type: "linear", angle: 90, stops: [[0, "kusa", 1], [1, "matsu", 1]] });
    nodes.push({ id: "village", kind: "motif", motif: "minka", x: 1500, y: 960, params: { width: 160 } } as N);
    fig("farmer", { hair: "chonmage", robe: "cha", lower: "tucked", legs: "hada", feet: "waraji" }, 1350, 980, .8, [{ type: "startle", start: 100, end: 160 }], "left");
  }
  return { version: 1, id: `giant-${kind}`, width: 1920, height: 1080, durationFrames: frames, seed: 67, cadence: 2, palette: { preset: night ? "night" : "edo" }, wind: { base: .5, turbulence: .5 }, ...(camera ? { camera } : {}), nodes };
}
