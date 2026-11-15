/**
 * UKIYO1 oni weapons and fighting, after the iron-shod kanabō in museum photographs and Kuniyoshi's and Toyoharu's oni:
 * the club drawn in detail (a long shaft swelling toward the head, rows of iron studs over the striking half, iron
 * bands, a cord-wrapped grip and an iron ring at the butt) and its own timeline (`clubAt`), so a blow holds after its
 * action and each move starts from the last pose:
 *
 * - at rest the club lies over the shoulder; once fighting, it is held up before the body in both hands;
 * - `smash`: a long wind-up overhead, then the club comes down on an aimed point of the ground on the contact frame — dust
 *   bursts, the ground cracks, the camera shakes — and is dragged up again;
 * - `swing`: wound back low, swept forward through an aimed point (a parried swing stops on the blade);
 * - `parry`: the club held across to receive a cut at an aimed point;
 * - `drop`: struck, the oni lets the club fall; it lies on the ground (and stays there when he falls).
 *
 * `oniFight` builds a fight between a hero (samurai or Momotarō) and an oni from these and the duel's aimed contact.
 */
import type { Pt } from "./ukiyoe-core";
import { add, carvedLine, clamp01, DEG, lerp, smooth, smoothD } from "./ukiyoe-core";
import type { UkiyoeCameraShake } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoeFill, UkiyoePaint } from "./ukiyoe-pigments";
import type { UkiyoeAction, UkiyoeFigureLook } from "./ukiyoe-figure";
import type { UkiyoeNode } from "./ukiyoe-scene";
import { UKIYOE_SAMURAI_LOOK } from "./ukiyoe-katana";

/** The club's length as a share of the figure's height. */
export const CLUB = .62;
const IRON: UkiyoeFill = { type: "linear", angle: 90, stops: [[0, "usuzumi", 1], [.35, "sumi", 1], [.75, "kogecha", 1], [1, "sumi", 1]] };

// ---- The club's timeline --------------------------------------------------------------------------------------------------------

export interface ClubState {
  /** The right hand's grip relative to the neck in height units (facing right), and the club's angle (degrees). */
  T: Pt;
  a: number;
  /** 0 = one hand, 1 = both. */
  grip: number;
  /** Aimed blows: the club is turned to pass through this point (local px, facing right, feet at the origin). */
  aim?: Pt;
  aimW: number;
  /** 0 = in the hands, 1 = dropped and lying on the ground. */
  dropped: number;
}
export interface ClubAction { type: string; start: number; end: number; aim?: readonly [number, number]; contact?: number; parried?: boolean }

const REST: ClubState = { T: [.06, .05], a: -158, grip: 0, aimW: 0, dropped: 0 };
const READY: ClubState = { T: [.16, .22], a: -52, grip: 1, aimW: 0, dropped: 0 };
const turnTo = (a: number, b: number, turn: 0 | 1 | -1): number => {
  let d = ((b - a) % 360 + 540) % 360 - 180;
  if (turn > 0 && d < 0) d += 360;
  if (turn < 0 && d > 0) d -= 360;
  return a + d;
};
const mix = (p: ClubState, q: ClubState, m: number, turn: 0 | 1 | -1 = 0): ClubState => ({
  T: [lerp(p.T[0], q.T[0], m), lerp(p.T[1], q.T[1], m)], a: lerp(p.a, turnTo(p.a, q.a, turn), m), grip: lerp(p.grip, q.grip, m),
  aim: q.aim ?? p.aim, aimW: lerp(p.aimW, q.aimW, m), dropped: lerp(p.dropped, q.dropped, m),
});
const CLUB_ACTIONS = new Set(["smash", "swing", "parry", "drop"]);
/** True when the figure's actions use the club timeline (otherwise the club is the simple hand-held prop). */
export const usesClub = (actions: readonly { type: string }[]): boolean => actions.some(a => CLUB_ACTIONS.has(a.type));

/** The club at `frame`. Between actions it holds the last pose; before the first it lies on the shoulder. */
export function clubAt(actions: readonly ClubAction[], frame: number): ClubState {
  let rest = REST;
  for (const a of [...actions].filter(x => CLUB_ACTIONS.has(x.type)).sort((p, q) => p.start - q.start)) {
    if (frame < a.start) break;
    const len = Math.max(1, a.end - a.start), done = frame >= a.end, f = frame;
    const span = (f0: number, f1: number) => clamp01((f - f0) / Math.max(1, f1 - f0));
    const aim: Pt | undefined = a.aim ? [a.aim[0], a.aim[1]] : undefined;
    let now: ClubState, end: ClubState = READY;
    if (a.type === "smash") {
      // Wind up slowly overhead, bring it down in the last seven frames, rest on the ground ten frames, drag it up.
      const c = a.contact ?? Math.round(a.start + len * .5), raised: ClubState = { T: [-.02, -.13], a: -112, grip: 1, aimW: 0, dropped: 0 };
      const struck: ClubState = { T: [.3, .27], a: 64, grip: 1, aim, aimW: aim ? 1 : 0, dropped: 0 };
      now = f < c - 7 ? mix(rest, raised, smooth(span(a.start, c - 7))) : f <= c ? mix(raised, struck, span(c - 7, c) ** 1.8, 1)
        : f < c + 10 ? struck : mix(struck, READY, smooth(span(c + 10, a.end)), -1);
    } else if (a.type === "swing") {
      // Wound back low behind, swept forward through the aim; parried it stops on the blade, else it carries up.
      const c = a.contact ?? Math.round(a.start + len * .5), back: ClubState = { T: [-.05, .2], a: 172, grip: 1, aimW: 0, dropped: 0 };
      const hit: ClubState = { T: [.12, .15], a: -4, grip: 1, aim, aimW: aim ? 1 : 0, dropped: 0 }, over: ClubState = { T: [.18, .02], a: -72, grip: 1, aimW: 0, dropped: 0 };
      now = f < c - 7 ? mix(rest, back, smooth(span(a.start, c - 7))) : f <= c ? mix(back, hit, span(c - 7, c) ** 1.6, -1)
        : a.parried ? (f < c + 5 ? hit : mix(hit, READY, smooth(span(c + 5, a.end))))
        : f < c + 8 ? mix(hit, over, smooth(span(c, c + 8)), -1) : mix(over, READY, smooth(span(c + 8, a.end)));
    } else if (a.type === "parry") {
      const c = a.contact ?? Math.round(a.start + len * .5), guard: ClubState = { T: [.0, .1], a: -18, grip: 1, aim, aimW: aim ? 1 : 0, dropped: 0 };
      now = f < c - 4 ? mix(rest, guard, smooth(span(a.start, c - 4))) : f < c + 6 ? guard : mix(guard, READY, smooth(span(c + 6, a.end)));
    } else {
      end = { ...rest, aimW: 0, dropped: 1 };
      now = mix(rest, end, span(a.start, a.end) ** 2);
    }
    rest = done ? end : now;
    if (!done) return now;
  }
  return rest;
}

/** Where the club lies, for a figure facing right: the grip in the figure's frame and the angle (lying once dropped). */
export function clubGeometry(st: ClubState, neck: Pt, H: number): { grip: Pt; a: number } {
  const g: Pt = [neck[0] + st.T[0] * H, neck[1] + st.T[1] * H];
  let a = st.a;
  if (st.aim && st.aimW > 0) {
    // A blow aimed at the ground (aim y ≥ 0) is turned so the head comes to rest exactly on it, wherever the body has
    // thrown the hands; any other aim turns the club through the point.
    const L = CLUB * H, toAim = st.aim[1] >= 0 && Math.abs(g[1]) < L ? Math.asin(Math.min(1, -g[1] / L)) / DEG : Math.atan2(st.aim[1] - g[1], st.aim[0] - g[0]) / DEG;
    a = lerp(st.a, turnTo(st.a, toAim, 0), st.aimW);
  }
  // Dropped, it falls to lie along the ground in front of his feet.
  const lie: Pt = [H * .06, -H * .028];
  return { grip: [lerp(g[0], lie[0], st.dropped), lerp(g[1], lie[1], st.dropped)], a: lerp(a, turnTo(a, 2, 0), st.dropped) };
}

// ---- Drawing ----------------------------------------------------------------------------------------------------------------------

/**
 * The kanabō: gripped at `grip`, pointing at `a`, `H` the figure's height. The shaft swells from the grip to the head;
 * the striking half carries rows of iron studs (cones on the edges, round heads down the middle), iron bands close the
 * studded part, the grip is wrapped in cord and an iron ring hangs from the butt. `scale` foreshortens it.
 */
export function kanabo(grip: Pt, a: number, H: number, lw: number, opts: { scale?: number; studs?: UkiyoePaint } = {}): Prim[] {
  const sc = opts.scale ?? 1, L = CLUB * H * sc, u: Pt = [Math.cos(a * DEG), Math.sin(a * DEG)], n: Pt = [-u[1], u[0]], out: Prim[] = [];
  const at = (t: number, d: number): Pt => [grip[0] + u[0] * L * t + n[0] * d, grip[1] + u[1] * L * t + n[1] * d];
  const half = (t: number) => H * (t < .3 ? lerp(.016, .019, t / .3) : t < .45 ? lerp(.019, .03, (t - .3) / .15) : t < .92 ? lerp(.03, .036, (t - .45) / .47) : .036 * Math.sqrt(Math.max(0, 1 - ((t - .92) / .1) ** 2)));
  const ts = Array.from({ length: 26 }, (_, i) => -.1 + 1.12 * i / 25), top = ts.map(t => at(t, -half(t))), bot = ts.map(t => at(t, half(t)));
  // The ring at the butt first, under the shaft.
  const ring = at(-.13, 0);
  out.push({ t: "fill", d: ellipseD(ring[0], ring[1], H * .03, H * .03) + ellipseD(ring[0], ring[1], H * .019, H * .019), fill: "sumi", outline: lw * .7 });
  out.push({ t: "fill", d: smoothD([...top, ...[...bot].reverse()], true, .2), fill: IRON, outline: lw, grain: .5 });
  // A highlight down one facet.
  out.push({ t: "line", d: carvedLine(ts.slice(2, 24).map(t => at(t, -half(t) * .45)), lw * .8, { taper: "both", smooth: true }), color: "gofun", opacity: .3 });
  // The grip's cord wrap.
  const wraps: string[] = [];
  for (let i = 0; i < 9; i++) { const t0 = -.08 + i * .035, p = at(t0, -half(t0)), q = at(t0 + .03, half(t0)); wraps.push(`M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`); }
  out.push({ t: "stroke", d: wraps.join(""), color: "cha", width: Math.max(.6, H * .006), opacity: .9 });
  // Iron bands at both ends of the studded part.
  for (const t of [.43, .96]) out.push({ t: "line", d: carvedLine([at(t, -half(t) * 1.08), at(t, half(t) * 1.08)], H * .008, { taper: "none" }), color: "usuzumi" });
  // Studs: cones standing out of both edges, round heads down the middle, staggered.
  const cones: string[] = [], heads: string[] = [];
  for (let i = 0; i < 11; i++) {
    const t = .48 + i * .044, h = half(t), off = i % 2 ? .45 : -.45;
    for (const sgn of [-1, 1]) { const base = at(t, sgn * h * .92), tip = at(t, sgn * h * 1.55), w = H * .009; cones.push(smoothD([add(base, [u[0] * w, u[1] * w]), tip, add(base, [-u[0] * w, -u[1] * w])], true, .1)); }
    heads.push(circleD(...at(t, off * h), H * .0085));
  }
  out.push({ t: "fill", d: cones.join(""), fill: opts.studs ?? "usuzumi", outline: lw * .6 });
  out.push({ t: "fill", d: heads.join(""), fill: opts.studs ?? "usuzumi", outline: lw * .5 });
  out.push({ t: "dots", d: Array.from({ length: 11 }, (_, i) => { const t = .48 + i * .044; return circleD(...at(t, (i % 2 ? .45 : -.45) * half(t) - H * .003), H * .0032); }).join(""), color: "gofun" });
  return out;
}

/**
 * The ground where the club struck: a burst of dust rolling out low and rising, pebbles thrown up and falling back, and
 * jagged cracks running out along the ground that stay a while and fade.
 */
export function groundCrack(c: Pt, H: number, age: number, seed: number): Prim[] {
  if (age < 0 || age > 150) return [];
  const dust: Prim[] = [];
  if (age < 34) {
    const puffs: string[] = [], pebbles: string[] = [];
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1, sp = .5 + ((seed * 7 + i * 13) % 10) / 12, x = c[0] + side * H * .012 * age * sp, y = c[1] - H * (.004 * age * (.3 + (i % 4) * .2)) + H * .0001 * age * age;
      const r = H * (.025 + .0025 * age) * (.7 + (i % 3) * .2);
      puffs.push(ellipseD(x, Math.min(c[1] - r * .4, y), r, r * .7));
    }
    for (let i = 0; i < 9; i++) { const a = (-90 + ((seed + i * 37) % 120) - 60) * DEG, v = H * .012 * (.6 + (i % 3) * .3), x = c[0] + Math.cos(a) * v * age, y = c[1] + Math.sin(a) * v * age + H * .0012 * age * age; if (y < c[1] + 2) pebbles.push(circleD(x, y, H * .005)); }
    dust.push({ t: "fill", d: puffs.join(""), fill: "kincha", opacity: .5 * (1 - age / 34), noPrint: true }, { t: "dots", d: pebbles.join(""), color: "kogecha", opacity: 1 - age / 34 });
  }
  const fade = 1 - clamp01((age - 90) / 60), open = clamp01(age / 4), out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dir = i % 2 ? 1 : -1, len = H * (.12 + .1 * ((seed * 13 + i * 7) % 10) / 10) * open, pts: Pt[] = [c];
    for (let j = 1; j <= 4; j++) pts.push([c[0] + dir * len * j / 4 * (.6 + .5 * ((i + j) % 3) / 2), c[1] + H * .004 * ((i * 3 + j * 5) % 5 - 2) * (j / 4) + H * .006 * (i % 3 - 1) * j / 4]);
    out.push("M" + pts.map(q => q[0].toFixed(1) + " " + q[1].toFixed(1)).join("L"));
  }
  return [{ t: "fill", d: ellipseD(c[0], c[1] + H * .004, H * .07 * open, H * .012 * open), fill: "kogecha", opacity: .55 * fade, noPrint: true },
    { t: "stroke", d: out.join(""), color: "sumi", width: Math.max(.8, H * .005), opacity: .85 * fade }, ...dust];
}

// ---- Looks and the fight ----------------------------------------------------------------------------------------------------------

/** An oni after the prints: red skin, wild hair, two horns, tiger-skin loincloth, the kanabō. */
export const UKIYOE_ONI_LOOK: UkiyoeFigureLook = {
  build: "brute", skin: "shu", legs: "shu", upper: "bare", lower: "loincloth", robe: "ki", robePattern: { type: "tora", color: "sumi", scale: 1.1 },
  hair: "wild", face: "oni", horns: 2, prop: "kanabo", feet: "bare", obi: "kogecha",
};
/** Momotarō as the prints show him: a youth with a white headband, a red vest with peach crests over the kimono, hakama, a katana. */
export const UKIYOE_MOMOTARO_LOOK: UkiyoeFigureLook = {
  build: "slim", hair: "topknot", hat: "headband", hatColor: "gofun", robe: "ki", robePattern: { type: "sakura", color: "beni", scale: .5, opacity: .7 },
  kataginu: "beni", crest: "shu", lower: "hakama", hakama: "ai", feet: "tabi", swords: "katana", accent: "beni", under: "gofun",
};

export interface OniFightOptions {
  id: string;
  /** Where the hero stands (feet), facing right; the oni faces him. */
  x: number;
  y: number;
  scale?: number;
  /** Frame the fight starts (default 0). */
  start?: number;
  hero?: UkiyoeFigureLook;
  oni?: UkiyoeFigureLook;
  /** Heights the looks stand at (defaults 250 and 300: average and brute builds). */
  heroHeight?: number;
  oniHeight?: number;
}

/**
 * A fight between a hero and an oni, as scene nodes plus camera shakes. The hero draws; the oni smashes where he stood
 * (he springs back; dust, a cracked ground, a shake); the hero cuts and the oni blocks with the club (sparks); the oni
 * swings at his chest and the hero parries (sparks), driven back a step; the oni smashes again and misses; the hero's
 * last cut strikes home — the club drops, the oni topples back, the hero holds, clears his blade and sheathes it. Every
 * contact is aimed at one point, as in the duels, so blade and club meet exactly there.
 */
export function oniFight(o: OniFightOptions): { nodes: UkiyoeNode[]; shake: UkiyoeCameraShake[] } {
  const k = o.scale ?? 1, s = o.start ?? 0, Hs = o.heroHeight ?? 250, Ho = o.oniHeight ?? 300;
  // Distances in local px (the nodes share one scale). The hero's guard reaches a point a little over half his height
  // ahead; the oni stands so that point falls in reach of his club.
  const gap = .49 * Hs + .3 * Ho, back = .42 * Hs, step = .14 * Hs;
  const hero: UkiyoeAction[] = [{ type: "draw", start: s, end: s + 60 }], oni: UkiyoeAction[] = [];
  const bursts: { frame: number; x: number; y: number; radius: number }[] = [], dust: { frame: number; x: number; y: number; radius: number; color: UkiyoePaint; count: number }[] = [];
  const shake: UkiyoeCameraShake[] = [];
  let heroX = 0;     // the hero's travel so far (local px)
  const oniX = gap;  // the oni stays put
  const evade = (from: number, dist: number) => { hero.push({ type: "evade", start: from, end: from + 12, to: heroX - dist }); heroX -= dist; };
  // 1. The smash where he stood: he springs back just before it lands.
  const c1 = s + 112, imp1: [number, number] = [CLUB * Ho * Math.cos(Math.asin(.535 * Ho / (CLUB * Ho)) ) + .3 * Ho, 0];
  oni.push({ type: "smash", start: s + 70, end: c1 + 30, aim: imp1, contact: c1 });
  evade(c1 - 12, back);
  shake.push({ frame: c1, duration: 12, amount: 1.6 });
  // He steps back in to cutting distance.
  hero.push({ type: "evade", start: c1 + 34, end: c1 + 52, to: -step }); heroX = -step;
  // 2. The hero cuts; the oni blocks with the club.
  const c2 = s + 190, cut: [number, number] = [.49 * Hs, -.935 * Hs], gap2 = oniX - heroX;
  hero.push({ type: "cut", start: c2 - 34, end: c2 + 30, aim: cut, contact: c2, parried: true });
  oni.push({ type: "parry", start: c2 - 22, end: c2 + 28, aim: [gap2 - cut[0], cut[1]], contact: c2 });
  bursts.push({ frame: c2, x: o.x + (heroX + cut[0]) * k, y: o.y + cut[1] * k, radius: 60 * k });
  // 3. The oni swings at his chest; he parries and is driven back a step.
  const c3 = s + 262, chest: [number, number] = [.3 * Hs, -.76 * Hs], gap3 = oniX - heroX;
  oni.push({ type: "swing", start: c3 - 30, end: c3 + 26, aim: [gap3 - chest[0], chest[1]], contact: c3, parried: true });
  hero.push({ type: "parry", start: c3 - 22, end: c3 + 28, aim: chest, contact: c3 });
  bursts.push({ frame: c3, x: o.x + (heroX + chest[0]) * k, y: o.y + chest[1] * k, radius: 70 * k });
  evade(c3 + 2, step);
  // 4. The second smash misses as he springs back again.
  const c4 = s + 336, gap4 = oniX - heroX, imp4: [number, number] = [Math.min(imp1[0], gap4 - 10), 0];
  oni.push({ type: "smash", start: c4 - 40, end: c4 + 30, aim: imp4, contact: c4 });
  evade(c4 - 12, .28 * Hs);
  shake.push({ frame: c4, duration: 12, amount: 1.6 });
  // 5. While the club is down he closes to sword's reach of the oni's chest and strikes home.
  const reach = .6 * Hs, closeTo = oniX - (reach + .08 * Ho);
  hero.push({ type: "evade", start: c4 + 6, end: c4 + 22, to: closeTo }); heroX = closeTo;
  const c5 = s + 380;
  hero.push({ type: "cut", start: c5 - 26, end: c5 + 30, aim: [reach, -.62 * Ho], contact: c5, parried: false });
  oni.push({ type: "recoil", start: c5, end: c5 + 400 }, { type: "drop", start: c5 + 4, end: c5 + 20 }, { type: "fall", start: c5 + 18, end: c5 + 46 });
  shake.push({ frame: c5 + 46, duration: 10, amount: 1.1 });
  dust.push({ frame: c5 + 46, x: o.x + (oniX + .55 * Ho) * k, y: o.y, radius: 110 * k, color: "cha", count: 46 });
  hero.push({ type: "kamae", start: c5 + 60, end: c5 + 90, form: "chudan" }, { type: "sheathe", start: c5 + 110, end: c5 + 200 });
  const heroLook = o.hero ?? UKIYOE_SAMURAI_LOOK, oniLook = o.oni ?? UKIYOE_ONI_LOOK;
  return {
    nodes: [
      { id: `${o.id}-oni`, kind: "figure", x: o.x + oniX * k, y: o.y, scale: k, look: { ...oniLook, view: "profile" }, facing: "left", actions: oni },
      { id: `${o.id}-hero`, kind: "figure", x: o.x, y: o.y, scale: k, look: { ...heroLook, view: heroLook.view === "three-quarter" ? "three-quarter" : "profile" }, facing: "right", actions: hero },
      { id: `${o.id}-sparks`, kind: "particles", type: "sparks", bursts },
      { id: `${o.id}-dust`, kind: "particles", type: "spray", bursts: dust, color: "cha", angle: 0 },
    ],
    shake,
  };
}
