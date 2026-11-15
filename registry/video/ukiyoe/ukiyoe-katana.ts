/**
 * UKIYO1 swords and the samurai's formal dress, after the Met's mounted swords (katana and daishō) and Shunshō's and
 * Kuniyoshi's prints: the katana drawn in detail (the curved blade with its ridge line, its temper line along the edge and
 * the tip's yokote, the gold habaki, the guard, the hilt's silk diamond wrap over ray skin, the end cap), the black
 * lacquered scabbards with their cord, the pair worn edge-up through the obi at the left hip, and the kamishimo's stiff
 * winged vest with crests.
 *
 * The sword's motion is a timeline of its own (`swordAt`), so a stance holds after its action ends and every move starts
 * from where the last one left off: `draw` (the hand reaches the hilt, pulls the blade out along the scabbard and sweeps
 * it forward in a rising cut, then settles into the middle guard), `kamae` (chūdan, jōdan, hassō or waki), `cut` (raise,
 * a fast diagonal strike, follow-through and hold) and `sheathe` (the flick that clears the blade, the tip finding the
 * scabbard's mouth, the slow slide home). The figure's hands are put on the hilt by two-bone IK.
 */
import type { Pt } from "./ukiyoe-core";
import { add, carvedLine, clamp01, DEG, lerp, polar, smooth, smoothD } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoeFill, UkiyoePaint } from "./ukiyoe-pigments";
import type { UkiyoeAction, UkiyoeFigureLook } from "./ukiyoe-figure";

export type UkiyoeKamae = "chudan" | "jodan" | "hasso" | "waki";
export const UKIYOE_KAMAE: readonly UkiyoeKamae[] = ["chudan", "jodan", "hasso", "waki"];

/** Proportions of the height: the blade, the hilt, the blade's width. */
export const BLADE = .44, HILT = .16, BLADE_W = .016;
/** The worn scabbard points back and a little down (degrees, figure facing right); the hilt points the opposite way. */
export const SAYA_ANGLE = 162;

const STEEL: UkiyoeFill = { type: "linear", angle: 0, stops: [[0, "usuzumi", 1], [.5, "gofun", 1], [1, "usuzumi", 1]] };
const LACQUER: UkiyoeFill = { type: "linear", angle: 90, stops: [[0, "sumi", 1], [.4, "kogecha", 1], [1, "sumi", 1]] };

// ---- The sword's timeline ---------------------------------------------------------------------------------------------------------

/** Where the sword is at a frame. `T` is the guard's position relative to the neck in height units (facing right). */
export interface SwordState {
  /** In the hand (otherwise sheathed, or being reached for). */
  held: boolean;
  /** How far the right hand has gone to the hilt while it is not yet held (the start of a draw, the end of a sheathe). */
  reach: number;
  /** How much of the blade is out of the scabbard (1 = drawn). */
  out: number;
  /** While `out` < 1 the sword lies along the scabbard; once drawn it is free: guard position and blade angle. */
  T: Pt;
  a: number;
  /** 0 = the right hand alone, 1 = both hands on the hilt. */
  grip: number;
  /** 0 = the sword lies along the scabbard (`out` of it drawn), 1 = free at `T` and `a`; between, it blends. */
  free: number;
}

export interface SwordAction { type: string; start: number; end: number; form?: UkiyoeKamae }

const FORMS: Readonly<Record<UkiyoeKamae, { T: Pt; a: number }>> = {
  chudan: { T: [.13, .29], a: -16 },
  jodan: { T: [.03, -.13], a: -148 },
  hasso: { T: [.08, .02], a: -100 },
  waki: { T: [-.02, .32], a: 166 },
};
const SHEATHED: SwordState = { held: false, reach: 0, out: 0, T: [0, 0], a: SAYA_ANGLE, grip: 0, free: 0 };
/**
 * The blade turns from one angle to the next the short way round (hassō to waki goes back over the shoulder, not round
 * the front), unless `turn` forces the way: +1 forward through the top (the strike), −1 down through the bottom.
 */
const turnTo = (a: number, b: number, turn: 0 | 1 | -1): number => {
  let d = ((b - a) % 360 + 540) % 360 - 180;
  if (turn > 0 && d < 0) d += 360;
  if (turn < 0 && d > 0) d -= 360;
  return a + d;
};
const mixState = (p: SwordState, q: SwordState, m: number, turn: 0 | 1 | -1 = 0): SwordState => ({
  held: m < .5 ? p.held : q.held, reach: lerp(p.reach, q.reach, m), out: lerp(p.out, q.out, m),
  T: [lerp(p.T[0], q.T[0], m), lerp(p.T[1], q.T[1], m)], a: lerp(p.a, turnTo(p.a, q.a, turn), m), grip: lerp(p.grip, q.grip, m), free: lerp(p.free, q.free, m),
});
const held = (T: Pt, a: number, grip = 1): SwordState => ({ held: true, reach: 1, out: 1, T, a, grip, free: 1 });

/** The sword at `frame`, from the sword actions in time order; between actions it holds the last pose. */
export function swordAt(actions: readonly SwordAction[], frame: number): SwordState {
  let rest: SwordState = SHEATHED;
  for (const a of [...actions].filter(x => x.type === "draw" || x.type === "kamae" || x.type === "cut" || x.type === "sheathe").sort((p, q) => p.start - q.start)) {
    if (frame < a.start) break;
    const len = Math.max(1, a.end - a.start), k = clamp01((frame - a.start) / len), done = frame >= a.end;
    const seg = (k0: number, k1: number) => smooth(clamp01((k - k0) / (k1 - k0)));
    const chudan = held(FORMS.chudan.T, FORMS.chudan.a);
    let now: SwordState, end: SwordState;
    if (a.type === "draw") {
      // Reach for the hilt; pull the blade out along the scabbard; sweep it forward and up in one cut; settle in chūdan.
      const out = seg(.22, .55), release = held([.24, .2], 4, 0);
      end = chudan;
      // Once clear of the scabbard the blade swings down and forward through the free position (the figure blends from
      // the scabbard line to it), rising into the cut.
      if (k < .22) now = { ...SHEATHED, reach: seg(0, .22) };
      else if (k < .55) now = { ...SHEATHED, held: true, reach: 1, out };
      else if (k < .78) now = { ...release, free: seg(.55, .78) };
      else now = mixState(release, chudan, seg(.78, 1));
    } else if (a.type === "kamae") {
      // From the low guard behind the hip the blade comes forward low, under, to the middle guard.
      const f = FORMS[a.form ?? "chudan"], target = held(f.T, f.a), turn = a.form === "chudan" && Math.cos(rest.a * DEG) < -.5 && Math.sin(rest.a * DEG) > 0 ? -1 : 0;
      end = target; now = mixState(rest, target, smooth(clamp01((frame - a.start) / Math.min(24, len * .5))), turn);
    } else if (a.type === "cut") {
      // Raise slowly into jōdan, strike fast on the diagonal, overshoot a little, hold low.
      const raised = held(FORMS.jodan.T, FORMS.jodan.a), struck = held([.25, .36], 38), over = held([.22, .4], 52);
      end = held([.22, .37], 40);
      now = k < .36 ? mixState(rest, raised, seg(0, .36)) : k < .46 ? mixState(raised, struck, clamp01((k - .36) / .1) ** 1.6, 1)
        : k < .6 ? mixState(struck, over, seg(.46, .53) - seg(.53, .6) * .6) : mixState(mixState(struck, over, .4), end, seg(.6, .75));
    } else {
      // Sheathe (nōtō): the flick that clears the blade (chiburi), the blade brought round to the scabbard's mouth, the slow
      // slide home, the hands let go.
      const flick = held([.22, .3], 64, .4), after = mixState(rest, flick, .2);
      end = SHEATHED;
      now = k < .2 ? mixState(rest, flick, Math.sin(Math.PI * seg(0, .2)) * .8 + seg(0, .2) * .2)
        : k < .42 ? { ...after, grip: lerp(after.grip, 0, seg(.2, .42)), free: 1 - seg(.2, .42) }
        : k < .9 ? { ...SHEATHED, held: true, reach: 1, out: 1 - seg(.42, .9) } : { ...SHEATHED, reach: 1 - seg(.9, 1) };
    }
    rest = done ? end : now;
    if (!done) return now;
  }
  return rest;
}

// ---- Two-bone IK -------------------------------------------------------------------------------------------------------------------

/** Elbow and wrist reaching from `sh` toward `target` with upper and fore lengths; the elbow bends to the `bend` side. */
export function reachArm(sh: Pt, target: Pt, l1: number, l2: number, bend: 1 | -1): [Pt, Pt] {
  const dx = target[0] - sh[0], dy = target[1] - sh[1], d = Math.min(Math.hypot(dx, dy) || 1e-6, l1 + l2 - 1e-6), base = Math.atan2(dy, dx);
  const c = clamp01(((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d) + 1) / 2) * 2 - 1, off = Math.acos(c) * bend;
  const el: Pt = [sh[0] + Math.cos(base + off) * l1, sh[1] + Math.sin(base + off) * l1];
  return [el, [sh[0] + Math.cos(base) * d, sh[1] + Math.sin(base) * d]];
}

// ---- Drawing -----------------------------------------------------------------------------------------------------------------------

/**
 * The katana: guard at `tsuba`, the blade pointing at `a` degrees, `H` the figure's height. `shown` is how much of the
 * blade shows from the guard (the rest still in the scabbard); `open` widens the guard and the blade for a three-quarter
 * or foreshortened view; `scale` shortens the whole sword (foreshortening in the square views).
 */
export function katana(tsuba: Pt, a: number, H: number, lw: number, opts: { shown?: number; open?: number; scale?: number; hiltOnly?: boolean } = {}): Prim[] {
  const out: Prim[] = [], shown = opts.shown ?? 1, open = opts.open ?? 0, sc = opts.scale ?? 1;
  const u: Pt = [Math.cos(a * DEG), Math.sin(a * DEG)], n: Pt = [-u[1], u[0]];   // n: the edge side
  const L = BLADE * H * sc, w = BLADE_W * H * (1 + open * .2), sori = .035 * L;
  const at = (t: number, d: number): Pt => [tsuba[0] + u[0] * L * t + n[0] * (d - sori * t * t) , tsuba[1] + u[1] * L * t + n[1] * (d - sori * t * t)];
  // Hilt: rayskin under a silk wrap crossed in diamonds, the collar (fuchi) and the end cap (kashira).
  const hl = HILT * H * sc, hw = H * .0135, hp = (t: number, d: number): Pt => [tsuba[0] - u[0] * hl * t + n[0] * d, tsuba[1] - u[1] * hl * t + n[1] * d];
  out.push({ t: "fill", d: smoothD([hp(0, -hw), hp(1, -hw * .92), hp(1.03, 0), hp(1, hw * .92), hp(0, hw)], true, .2), fill: "gofun", outline: lw });
  out.push({ t: "dots", d: Array.from({ length: 10 }, (_, i) => circleD(...hp(.08 + i * .088, (i % 2 ? .35 : -.35) * hw), hw * .16)).join(""), color: "usuzumi" });
  const wraps: string[] = [];
  for (let i = 0; i < 7; i++) {
    const t0 = .06 + i * .13, t1 = t0 + .13;
    wraps.push(smoothD([hp(t0, -hw), hp((t0 + t1) / 2 - .02, -hw * .1), hp(t1, hw), hp(t1 - .03, hw), hp((t0 + t1) / 2 - .05, 0), hp(t0 + .03, -hw)], true, .2));
    wraps.push(smoothD([hp(t0, hw), hp((t0 + t1) / 2 - .02, hw * .1), hp(t1, -hw), hp(t1 - .03, -hw), hp((t0 + t1) / 2 - .05, 0), hp(t0 + .03, hw)], true, .2));
  }
  out.push({ t: "fill", d: wraps.join(""), fill: "kogecha", outline: lw * .4 });
  out.push({ t: "fill", d: smoothD([hp(.92, -hw * 1.05), hp(1.05, -hw * .9), hp(1.08, 0), hp(1.05, hw * .9), hp(.92, hw * 1.05)], true, .3), fill: "sumi", outline: lw * .7 });
  out.push({ t: "fill", d: smoothD([hp(0, -hw * 1.08), hp(.06, -hw * 1.05), hp(.06, hw * 1.05), hp(0, hw * 1.08)], true, .1), fill: "kin", outline: lw * .6 });
  // The blade beyond the guard: steel with the temper line (hamon) frosting the edge, the ridge line (shinogi), the tip.
  if (!opts.hiltOnly && shown > .01) {
    const tEnd = Math.min(1, shown), N = 18, back: Pt[] = [], edge: Pt[] = [], ham: Pt[] = [], ridge: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const t = tEnd * i / N, taper = 1 - .25 * t, tip = tEnd >= .999 && t > .9;
      const ww = w * taper * (tip ? Math.max(0, (1 - t) / .1) ** .7 : 1);
      back.push(at(t, -ww * .5)); edge.push(at(t, ww * .5 + (tip ? 0 : 0)));
      ham.push(at(t, ww * (.5 - .32 - .08 * Math.sin(t * 46)) ));
      if (t < .9) ridge.push(at(t, ww * .05));
    }
    out.push({ t: "fill", d: smoothD([...back, ...[...edge].reverse()], true, .2), fill: STEEL, outline: lw });
    out.push({ t: "fill", d: smoothD([...ham, ...[...edge].reverse()], true, .2), fill: "gofun", opacity: .92 });
    if (ridge.length > 1) out.push({ t: "line", d: carvedLine(ridge, lw * .55, { taper: "none", smooth: true }), color: "usuzumi", opacity: .7 });
    if (tEnd >= .999) out.push({ t: "line", d: carvedLine([at(.9, -w * .38), at(.9, w * .38)], lw * .5, { taper: "none" }), color: "usuzumi", opacity: .8 });
    // The gold habaki at the guard.
    out.push({ t: "fill", d: smoothD([at(0, -w * .62), at(.05, -w * .6), at(.05, w * .6), at(0, w * .62)], true, .1), fill: "kin", outline: lw * .6 });
  }
  // The guard (tsuba), seen edge-on from the side, opening toward us in three-quarter.
  const gr = H * .03 * Math.max(sc, .7), gt = H * (.006 + .016 * open);
  out.push({ t: "fill", d: smoothD(Array.from({ length: 16 }, (_, i) => { const th = i / 16 * Math.PI * 2; return add(tsuba, [n[0] * Math.cos(th) * gr + u[0] * Math.sin(th) * gt, n[1] * Math.cos(th) * gr + u[1] * Math.sin(th) * gt]); }), true, .4), fill: { type: "linear", angle: 90, stops: [[0, "kogecha", 1], [1, "sumi", 1]] }, outline: lw * .8 });
  return out;
}

/** A scabbard (saya) from its mouth `koi` pointing at `a`: black lacquer, the knob (kurikata) and its tied cord, the end cap. */
export function saya(koi: Pt, a: number, len: number, H: number, lw: number, cord: UkiyoePaint, sway: number): Prim[] {
  const u: Pt = [Math.cos(a * DEG), Math.sin(a * DEG)], n: Pt = [-u[1], u[0]], w = H * .02, bend = len * .03;
  const at = (t: number, d: number): Pt => [koi[0] + u[0] * len * t + n[0] * (d + bend * t * t), koi[1] + u[1] * len * t + n[1] * (d + bend * t * t)];
  const pts: Pt[] = [], ret: Pt[] = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(at(t, -w * .5 * (1 - .15 * t))); ret.push(at(t, w * .5 * (1 - .15 * t))); }
  const out: Prim[] = [{ t: "fill", d: smoothD([...pts, at(1.02, 0), ...ret.reverse()], true, .25), fill: LACQUER, outline: lw }];
  out.push({ t: "line", d: carvedLine([at(.05, -w * .2), at(.9, -w * .2)], lw * .6, { taper: "both" }), color: "gofun", opacity: .35 });
  out.push({ t: "fill", d: smoothD([at(.95, -w * .55), at(1.03, -w * .4), at(1.03, w * .4), at(.95, w * .55)], true, .2), fill: "kogecha", outline: lw * .6 });
  out.push({ t: "fill", d: smoothD([at(0, -w * .58), at(.03, -w * .58), at(.03, w * .58), at(0, w * .58)], true, .1), fill: "kogecha", outline: lw * .5 });
  // Kurikata on the edge side, its cord (sageo) looped through and hanging.
  const k = at(.14, -w * .62), hang: Pt = [k[0] + sway * H * .02, k[1] + H * .1];
  out.push({ t: "fill", d: ellipseD(k[0], k[1], w * .3, w * .3), fill: "sumi", outline: lw * .5 });
  out.push({ t: "line", d: carvedLine([k, [lerp(k[0], hang[0], .5) + H * .01, lerp(k[1], hang[1], .5)], hang, [hang[0] - H * .015, hang[1] - H * .03]], H * .006, { taper: "none", smooth: true }), color: cord });
  return out;
}

/** A pale fan of air behind a fast blade: the sweep between its last and present angle (radians apart). */
export function swordSmear(tsuba: Pt, a0: number, a1: number, H: number): Prim[] {
  if (Math.abs(a1 - a0) < 9) return [];
  const L = BLADE * H, pts: Pt[] = [tsuba];
  for (let i = 0; i <= 8; i++) pts.push(polar(tsuba, lerp(a0, a1, i / 8), L * (i === 0 || i === 8 ? .98 : 1.02)));
  return [{ t: "fill", d: smoothD(pts, true, .2), fill: "gofun", opacity: .4, noPrint: true }];
}

// ---- Kamishimo -------------------------------------------------------------------------------------------------------------------

/** A crest (mon): a white disc with a simple five-petal flower, generic rather than any family's. */
export function mon(c: Pt, r: number, lw: number, color: UkiyoePaint): Prim[] {
  return [{ t: "fill", d: ellipseD(c[0], c[1], r, r), fill: "gofun", outline: lw * .5 },
    { t: "fill", d: [0, 72, 144, 216, 288].map(t => ellipseD(...polar(c, t - 90, r * .45), r * .3, r * .3)).join(""), fill: color, opacity: .9 },
    { t: "dots", d: circleD(c[0], c[1], r * .15), color: "gofun" }];
}

/**
 * Where the drawn or sheathed katana lies for a figure facing right: `neck` and `koi` (the scabbard's mouth at the left
 * hip) in the figure's frame. While the blade comes out of (or goes back into) the scabbard the left hand pulls the
 * scabbard back and tips its mouth up (saya-biki), so the arm can clear the long blade.
 */
export function swordGeometry(st: SwordState, neck: Pt, koi: Pt, H: number): { tsuba: Pt; a: number; shown: number; sayaA: number; koi: Pt } {
  const pull = st.held ? (1 - st.free) * st.out : 0, sayaA = SAYA_ANGLE - 25 * pull, k: Pt = [koi[0] - H * .09 * pull, koi[1]];
  const d = (sayaA - 180) * DEG, along: Pt = [k[0] + Math.cos(d) * (.012 + BLADE * st.out) * H, k[1] + Math.sin(d) * (.012 + BLADE * st.out) * H];
  const free: Pt = [neck[0] + st.T[0] * H, neck[1] + st.T[1] * H];
  return { tsuba: [lerp(along[0], free[0], st.free), lerp(along[1], free[1], st.free)], a: lerp(sayaA, st.a, st.free), shown: st.free > 0 ? 1 : st.out, sayaA, koi: k };
}

/** The sword handed to the square (front/back) drawing: its state and its profile placement relative to the neck (height units). */
export interface SquareSword { st: SwordState; a: number; shown: number; sayaA: number; tsuba: Pt; koi: Pt }

/** A samurai in kamishimo (indigo kataginu and hakama with crests over a brown kimono) wearing the pair of swords. */
export const UKIYOE_SAMURAI_LOOK: UkiyoeFigureLook = {
  hair: "chonmage", robe: "cha", under: "gofun", kataginu: "ai", crest: "ai", lower: "hakama", hakama: "ai", feet: "tabi", swords: "daisho", accent: "ai", obi: "kogecha",
};

/** A solo kata starting at `start`: draw, the overhead guard, a cut, hassō, waki, the middle guard and the sheathe. */
export function samuraiKata(start = 0): UkiyoeAction[] {
  const t = (f: number) => start + f;
  return [
    { type: "draw", start: t(20), end: t(80) }, { type: "kamae", start: t(100), end: t(130), form: "jodan" }, { type: "cut", start: t(140), end: t(200) },
    { type: "kamae", start: t(220), end: t(250), form: "hasso" }, { type: "kamae", start: t(260), end: t(290), form: "waki" },
    { type: "kamae", start: t(300), end: t(320), form: "chudan" }, { type: "sheathe", start: t(330), end: t(420) }, { type: "bow", start: t(436), end: t(476), angle: 26 },
  ];
}
