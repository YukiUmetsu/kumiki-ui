/**
 * STORY1: what can be known of a film before anyone draws it. It goes over every moment and asks of everyone on the picture: can a
 * person's joints do this (`JOINT_RANGES`, and what photographs of the same act show, `ACT_STUDIES`), and does an arm change sides of
 * a counter only while it is over its far edge, does an elbow go its way without a jump, and is a hand that does something seen. It also gives each act of an arm with the moment and the part of the picture where it
 * is seen best, so that one sheet shows every pose of a film. A range is no pose: look at the sheet. Pure.
 */
import { ACTS, actParams, type Act, type ActHand } from "../../rig/rig-acting";
import { ACT_STUDIES } from "../../rig/rig-act-studies";
import { JOINT_RANGES, type JointId } from "../../rig/rig-comfort";
import type { PaintedMesh } from "../../rig/rig-look-painted";
import { playRole, storyDepth, storyRaised, storyView, type PlannedShot, type StoryPlan, type StoryPlayed, type StoryRole } from "./storybook-film";

export interface JointFound { shot: string; actor: string; /** What the actor does then. */ acts: readonly string[]; hand?: ActHand; joint: JointId; /** Degrees, at the worst moment. */ angle: number; range: readonly [number, number]; /** `can`: no person can. `easy`: it looks strained. */ level: "can" | "easy"; /** Seconds of the film: the worst moment. */ t: number; /** How long. */ seconds: number; /** Past the band of the wrist that the study of the act shows (`ACT_STUDIES` hand), not past what is easy. */ studied?: boolean }
export interface ArmActSeen { shot: string; actor: string; view: string; act: string; hands: readonly ActHand[]; /** Seconds of the film. */ t: number; /** Left, top, width, height: parts of the picture. */ box: readonly [number, number, number, number]; /** The act has no study. */ unstudied: boolean }
export interface StoryChecked { joints: JointFound[]; counters: string[]; /** Elbows that jump from one frame to the next. */ jumps: string[]; /** Hands that do something behind someone else. */ hidden: string[]; /** Hands drawn with a grip that the study of the act does not show. */ grips: string[]; /** Forearms drawn so short that a painting shows a lump. */ short: string[]; acts: ArmActSeen[]; /** Acts of arms that nobody has looked at a photograph for. */ unstudied: string[] }

const ARM = /^(arm|hand)-/, BODY = /^(torso|trunk|arm-|head|leg-|skirt|coat)/, RAD = Math.PI / 180;
const turnOf = (p: StoryPlayed, bone: string) => { const w = p.frame.bones.get(bone)?.world; return w ? Math.atan2(w.b, w.a) / RAD : 0; };
const between = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;
function boxOf(meshes: readonly PaintedMesh[], put: (x: number, y: number) => [number, number]): [number, number, number, number] | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const m of meshes) if ((m.opacity ?? 1) > 0.5) for (let i = 0; i < m.positions.length; i += 2) { const [x, y] = put(m.positions[i], m.positions[i + 1]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return x1 > x0 ? [x0, y0, x1, y1] : null;
}
const over = (meshes: readonly PaintedMesh[], x: number, y: number) => meshes.some(m => {
  for (let i = 0; i < m.indices.length; i += 3) {
    const [a, b, c] = [0, 1, 2].map(k => 2 * m.indices[i + k]), side = (p: number, q: number) => (m.positions[q] - m.positions[p]) * (y - m.positions[p + 1]) - (m.positions[q + 1] - m.positions[p + 1]) * (x - m.positions[p]), u = side(a, b), v = side(b, c), w = side(c, a);
    if ((u >= 0 && v >= 0 && w >= 0) || (u <= 0 && v <= 0 && w <= 0)) return true;
  }
  return false;
});
/** A place in the frame of a bone, at the size of the bone. */
const within = (b: { a: number; b: number; e: number; f: number }, x: number, y: number): [number, number] => { const k = b.a * b.a + b.b * b.b || 1, dx = x - b.e, dy = y - b.f; return [(dx * b.a + dy * b.b) / Math.sqrt(k), (dy * b.a - dx * b.b) / Math.sqrt(k)]; };
/** Centimetres that an elbow's way may change from one frame to the next, at 24 frames a second. */
const STEADY = 3;
/** How far an angle has to be over what a person can before it is a fault: a drawing says only which of four sides of a hand is seen. */
const SURE: Partial<Record<JointId, number>> = { turn: 20 };
/** Seconds that a joint has to be there. The drawing of a hand changes at once, while a forearm would turn. */
const LASTS = { can: 0.1, drawing: 0.25, easy: 0.4 };
/** Of its length, the shortest that a forearm is drawn: shorter, it points at the viewer, and a flat painting of it is a lump as wide as its elbow. Looked at in six films: sleeves drawn at 30–46 % read as cloth, a bare forearm at 35–38 % as a lump (the owner's finding on Daichi). */
const LUMP = { bare: 0.5, sleeve: 0.3 };
/** The cutter (`scripts/storybook-rig.py`) puts a hand over a bare forearm and under a sleeve. */
const bareArm = (p: StoryPlayed, h: ActHand) => { const z = (id: string) => p.figure.art.layers.find(l => l.id === id)?.z, arm = z(`arm-${h}`), hand = z(`hand-${h}`); return arm !== undefined && hand !== undefined && hand > arm; };
/** The joints of one figure at one moment. */
function jointsOf(p: StoryPlayed): { joint: JointId; hand?: ActHand; angle: number }[] {
  const found: { joint: JointId; hand?: ActHand; angle: number }[] = [];
  for (const h of ["f", "b"] as const) for (const [joint, angle] of Object.entries(p.arms[h] ?? {})) found.push({ joint: joint as JointId, hand: h, angle: angle! });
  // how far a head turns in depth is bound by its painting. In the picture a head or a back that turns goes to a side for a body that faces the viewer, and forward for one that is seen from the side
  const facing = p.figure.body.facing ?? 45, front = Math.abs(Math.sin(facing * RAD)) > 0.8, flip = p.frame.root.facing, head = between(turnOf(p, "torso"), turnOf(p, "head")) * flip, back = between(turnOf(p, "pelvis"), turnOf(p, "torso")) * flip;
  found.push({ joint: front ? "neck-tilt" : "neck-nod", angle: head }, { joint: front ? "back-tilt" : "back-bend", angle: back });
  return found;
}
/** The hands that an act moves. */
function handsOf(act: Act | undefined, params: Readonly<Record<string, unknown>>, d: number, facing?: number): ActHand[] {
  if (!act) return [];
  const pose = act.pose({ t: d / 2, d, u: 0.5, w: 1, params: { ...actParams(params, facing), to: undefined, from: undefined }, voice: 0 });
  return (["f", "b"] as const).filter(h => pose.reach?.[h]);
}

export interface StoryCheckOptions { /** Only these shots. */ shots?: readonly string[]; /** Moments a second. Default 12. */ rate?: number }
export function checkStory(plan: StoryPlan, o: StoryCheckOptions = {}): StoryChecked {
  const { film } = plan, library: Readonly<Record<string, Act>> = film.acts ? { ...ACTS, ...film.acts } : ACTS, out: StoryChecked = { joints: [], counters: [], jumps: [], hidden: [], grips: [], short: [], acts: [], unstudied: [] }, missing = new Set<string>();
  for (const planned of plan.shots) if (!o.shots || o.shots.includes(planned.shot.id)) for (const role of planned.shot.roles ?? []) checkRole(planned, role);
  out.unstudied = [...missing].sort();
  return out;

  function checkRole({ shot, start }: PlannedShot, role: StoryRole) {
    const fps = film.fps, every = Math.max(1, Math.round(fps / (o.rate ?? 12))), facing = playRole(film, shot, role, 0, true).figure.body.facing, timed = (role.acts ?? []).map(a => ({ ...a, d: a.for ?? library[a.act]?.seconds ?? 1 })).map(a => ({ ...a, hands: handsOf(library[a.act], a.params ?? {}, a.d, facing) }));
    const worst = new Map<string, JointFound>(), lump = new Map<string, { least: number; t: number; seconds: number; hand: ActHand; acts: readonly string[] }>(), was: Partial<Record<ActHand, boolean>> = {}, way: Record<ActHand, [number, number][]> = { f: [], b: [] }, jump = new Map<ActHand, { by: number; t: number; acts: readonly string[] }>();
    for (let n = 0; n <= Math.floor(shot.seconds * fps); n++) {
      const t = n / fps, p = playRole(film, shot, role, t), view = storyView(film, shot, t), on = timed.filter(a => t >= a.at && t <= a.at + a.d), acts = on.map(a => a.act);
      const seen = (id: string) => { const b = p.frame.bones.get(id)?.world; if (!b) return false; const [x, y] = view.put(b.e, b.f), r = view.rect; return x > r.x && y > r.y && x < r.x + r.width && y < r.y + r.height; };
      const torso = p.frame.bones.get("torso")?.world;
      for (const h of ["f", "b"] as const) {
        const e = p.frame.bones.get(`fore-${h}`)?.world, w = way[h]; if (!torso || !e) continue;
        w.push(within(torso, e.e, e.f)); if (w.length > 3) w.shift();
        const by = w.length < 3 ? 0 : Math.hypot(w[2][0] - 2 * w[1][0] + w[0][0], w[2][1] - 2 * w[1][1] + w[0][1]) * (fps / 24) ** 2;
        if (by > Math.max(STEADY, jump.get(h)?.by ?? 0) && seen(`fore-${h}`)) jump.set(h, { by, t: start + t, acts });
      }
      if (n % every === 0) for (const { joint, hand, angle } of jointsOf(p)) {
        if (hand ? !seen(`hand-${hand}`) && !seen(`fore-${hand}`) : !seen("head")) continue;
        // a nearly straight arm turns in its shoulder as well
        const loose = hand ? 1.5 * Math.max(0, 60 - (p.arms[hand]?.bend ?? 60)) : 0;
        const mine = on.filter(a => !hand || a.hands.includes(hand)), studied = mine.map(a => ACT_STUDIES[a.act]?.joints?.[joint]).filter(r => !!r), held = hand ? mine.map(a => ACT_STUDIES[a.act]?.hand?.wrist?.[joint]).filter(r => !!r) : [], { can, easy } = JOINT_RANGES[joint];
        // how the hand does the act is narrower than what is easy: the study of the act says so
        const range = (level: "can" | "easy"): readonly [number, number] => (level === "can" ? can : held.length ? [Math.min(...held.map(r => r[0])), Math.max(...held.map(r => r[1]))] : [Math.min(easy[0], ...studied.map(r => r[0])), Math.max(easy[1], ...studied.map(r => r[1]))]);
        for (const level of ["can", "easy"] as const) {
          const [lo, hi] = range(level), past = Math.max(lo - angle, angle - hi) - (joint === "turn" ? loose : 0); if (past < (level === "can" ? (SURE[joint] ?? 5) : 8)) continue;
          const key = `${level}/${joint}/${hand ?? ""}/${acts.join("+")}`, w = worst.get(key), before = w ? Math.max(w.range[0] - w.angle, w.angle - w.range[1]) : -1, long = (w?.seconds ?? 0) + every / fps;
          worst.set(key, past > before ? { shot: shot.id, actor: role.actor, acts, hand, joint, angle: Math.round(angle), range: [lo, hi], level, t: start + t, seconds: long, ...(level === "easy" && held.length ? { studied: true } : {}) } : { ...w!, seconds: long });
        }
      }
      if (n % every === 0) for (const h of ["f", "b"] as const) {
        const e = p.frame.bones.get(`fore-${h}`), w = p.frame.bones.get(`hand-${h}`)?.world, k = e && w ? Math.hypot(w.e - e.world.e, w.f - e.world.f) / (e.length * Math.hypot(p.frame.toScene.c, p.frame.toScene.d) || 1) : 1;
        if (k >= LUMP[bareArm(p, h) ? "bare" : "sleeve"] || !seen(`fore-${h}`)) continue;
        const key = `${h}/${acts.join("+")}`, was = lump.get(key), long = (was?.seconds ?? 0) + every / fps;
        lump.set(key, !was || k < was.least ? { least: k, t: start + t, seconds: long, hand: h, acts } : { ...was, seconds: long });
      }
      if (role.raise) for (const h of ["f", "b"] as const) {
        const rule = role.raise.find(r => r.layers.includes(`hand-${h}`)), up = !!storyRaised(p, `hand-${h}`, t), before = was[h]; was[h] = up;
        if (!rule || before === undefined || before === up) continue;
        const low = boxOf(p.meshes.filter(m => m.id.split("/")[0] === `hand-${h}`), (x, y) => [x, y])?.[3], moment = `${shot.id} ${(start + t).toFixed(2)} s: hand ${h} of "${role.actor}" goes ${up ? "over" : "behind"} what is in front`;
        if (rule.edge === undefined) { if (rule.reach) out.counters.push(`${moment}, and its spot does not say where that has its far edge (raise.edge).`); }
        else if (low !== undefined && low > rule.edge + 3) out.counters.push(`${moment} while it is ${Math.round(low - rule.edge)} cm under its edge.`);
      }
    }
    for (const l of lump.values()) if (l.seconds >= LASTS.easy) out.short.push(`${shot.id} ${l.t.toFixed(2)} s, ${role.actor}${l.acts.length ? ` (${l.acts.join(", ")})` : ""}: forearm ${l.hand} is drawn at ${Math.round(100 * l.least)} % of its length for ${l.seconds.toFixed(1)} s. A painted forearm that points at the viewer is a lump as wide as its elbow: put the hand where its act's photographs show the forearm across (ACT_STUDIES seen).`);
    for (const [h, j] of jump) out.jumps.push(`${shot.id} ${j.t.toFixed(2)} s, ${role.actor} (${j.acts.join(", ")}): elbow ${h} jumps ${j.by.toFixed(1)} cm.`);
    for (const w of worst.values()) if (w.seconds >= LASTS[w.level === "can" && w.joint === "turn" ? "drawing" : w.level] && !(w.level === "easy" && [...worst.values()].some(c => c.level === "can" && c.joint === w.joint && c.hand === w.hand && c.acts.join() === w.acts.join()))) out.joints.push(w);
    for (const a of timed) if (a.hands.length) {
      const unstudied = !ACT_STUDIES[a.act]; if (unstudied) missing.add(a.act);
      const t = Math.min(shot.seconds, Math.max(0, a.at + a.d * (ACT_STUDIES[a.act]?.best ?? 0.5))), p = playRole(film, shot, role, t), view = storyView(film, shot, t), { width: W, height: H } = film.size, r = view.rect, b = boxOf(p.meshes.filter(m => ARM.test(m.id) || /^(head|face|hair)/.test(m.id)), (x, y) => view.put(x, y)); if (!b) continue;
      const front = (shot.roles ?? []).filter(q => q !== role && storyDepth(film, shot, q, t) > storyDepth(film, shot, role, t)).flatMap(q => playRole(film, shot, q, t).meshes.filter(m => BODY.test(m.id)));
      const grips = ACT_STUDIES[a.act]?.hand?.grips, drawings = p.figure.body.hands ?? {};
      // another act that has the hand now (one without a study, or one that holds it so) draws it
      for (const h of a.hands) { const drawn = p.hands[`hand-${h}`], of = drawn && (drawings[drawn]?.as ?? drawn), now = timed.filter(o => o.hands.includes(h) && t >= o.at && t <= o.at + o.d); if (grips && of && now.every(o => !ACT_STUDIES[o.act]?.hand?.grips.includes(of) && !!ACT_STUDIES[o.act]?.hand)) out.grips.push(`${shot.id} ${(start + t).toFixed(2)} s: hand ${h} of "${role.actor}" (${a.act}) is drawn "${drawn}"; the study of the act holds it ${grips.map(g => `"${g}"`).join(" or ")}.`); }
      for (const h of a.hands) { const q = storyRaised(p, `hand-${h}`, t) ? null : boxOf(p.meshes.filter(m => m.id.split("/")[0] === `hand-${h}`), (x, y) => [x, y]); if (q && over(front, (q[0] + q[2]) / 2, (q[1] + q[3]) / 2)) out.hidden.push(`${shot.id} ${(start + t).toFixed(2)} s: hand ${h} of "${role.actor}" (${a.act}) is behind someone.`); }
      const pad = 0.12 * Math.max(b[2] - b[0], b[3] - b[1]), x0 = Math.max(r.x, b[0] - pad), y0 = Math.max(r.y, b[1] - pad), x1 = Math.min(r.x + r.width, b[2] + pad), y1 = Math.min(r.y + r.height, b[3] + pad); if (x1 - x0 < 24 || y1 - y0 < 24) continue;
      out.acts.push({ shot: shot.id, actor: role.actor, view: role.view ?? Object.keys(p.actor.figures)[0], act: a.act, hands: a.hands, t: start + t, box: [x0 / W, y0 / H, (x1 - x0) / W, (y1 - y0) / H], unstudied });
    }
  }
}
