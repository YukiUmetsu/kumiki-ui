/**
 * STORY1: what can be known of a film before anyone draws it. It goes over every moment and asks of everyone on the picture: can a
 * person's joints do this (`JOINT_RANGES`, and what photographs of the same act show, `ACT_STUDIES`), and does an arm change sides of
 * a counter only while it is over its far edge. It also gives each act of an arm with the moment and the part of the picture where it
 * is seen best, so that one sheet shows every pose of a film. A range is no pose: look at the sheet. Pure.
 */
import { ACTS, type Act, type ActHand } from "../../rig/rig-acting";
import { ACT_STUDIES } from "../../rig/rig-act-studies";
import { JOINT_RANGES, type JointId } from "../../rig/rig-comfort";
import type { PaintedMesh } from "../../rig/rig-look-painted";
import { playRole, storyRaised, storyView, type PlannedShot, type StoryPlan, type StoryPlayed, type StoryRole } from "./storybook-film";

export interface JointFound { shot: string; actor: string; /** What the actor does then. */ acts: readonly string[]; hand?: ActHand; joint: JointId; /** Degrees, at the worst moment. */ angle: number; range: readonly [number, number]; /** `can`: no person can. `easy`: it looks strained. */ level: "can" | "easy"; /** Seconds of the film: the worst moment. */ t: number; /** How long. */ seconds: number }
export interface ArmActSeen { shot: string; actor: string; view: string; act: string; hands: readonly ActHand[]; /** Seconds of the film. */ t: number; /** Left, top, width, height: parts of the picture. */ box: readonly [number, number, number, number]; /** The act has no study. */ unstudied: boolean }
export interface StoryChecked { joints: JointFound[]; counters: string[]; acts: ArmActSeen[]; /** Acts of arms that nobody has looked at a photograph for. */ unstudied: string[] }

const ARM = /^(arm|hand)-/, RAD = Math.PI / 180;
const turnOf = (p: StoryPlayed, bone: string) => { const w = p.frame.bones.get(bone)?.world; return w ? Math.atan2(w.b, w.a) / RAD : 0; };
const between = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;
function boxOf(meshes: readonly PaintedMesh[], put: (x: number, y: number) => [number, number]): [number, number, number, number] | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const m of meshes) if ((m.opacity ?? 1) > 0.5) for (let i = 0; i < m.positions.length; i += 2) { const [x, y] = put(m.positions[i], m.positions[i + 1]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return x1 > x0 ? [x0, y0, x1, y1] : null;
}
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
function handsOf(act: Act | undefined, params: Readonly<Record<string, unknown>>, d: number): ActHand[] {
  if (!act) return [];
  const pose = act.pose({ t: d / 2, d, u: 0.5, w: 1, params: { ...params, to: undefined, from: undefined }, voice: 0 });
  return (["f", "b"] as const).filter(h => pose.reach?.[h]);
}

export interface StoryCheckOptions { /** Only these shots. */ shots?: readonly string[]; /** Moments a second. Default 12. */ rate?: number }
export function checkStory(plan: StoryPlan, o: StoryCheckOptions = {}): StoryChecked {
  const { film } = plan, library: Readonly<Record<string, Act>> = film.acts ? { ...ACTS, ...film.acts } : ACTS, out: StoryChecked = { joints: [], counters: [], acts: [], unstudied: [] }, missing = new Set<string>();
  for (const planned of plan.shots) if (!o.shots || o.shots.includes(planned.shot.id)) for (const role of planned.shot.roles ?? []) checkRole(planned, role);
  out.unstudied = [...missing].sort();
  return out;

  function checkRole({ shot, start }: PlannedShot, role: StoryRole) {
    const fps = film.fps, every = role.raise ? 1 : Math.max(1, Math.round(fps / (o.rate ?? 12))), timed = (role.acts ?? []).map(a => ({ ...a, d: a.for ?? library[a.act]?.seconds ?? 1 })).map(a => ({ ...a, hands: handsOf(library[a.act], a.params ?? {}, a.d) }));
    const worst = new Map<string, JointFound>(), was: Partial<Record<ActHand, boolean>> = {};
    for (let n = 0; n <= Math.floor(shot.seconds * fps); n += every) {
      const t = n / fps, p = playRole(film, shot, role, t), view = storyView(film, shot, t), on = timed.filter(a => t >= a.at && t <= a.at + a.d), acts = on.map(a => a.act);
      const seen = (id: string) => { const b = p.frame.bones.get(id)?.world; if (!b) return false; const [x, y] = view.put(b.e, b.f), r = view.rect; return x > r.x && y > r.y && x < r.x + r.width && y < r.y + r.height; };
      for (const { joint, hand, angle } of jointsOf(p)) {
        if (hand ? !seen(`hand-${hand}`) && !seen(`fore-${hand}`) : !seen("head")) continue;
        // a nearly straight arm turns in its shoulder as well
        const loose = hand ? 1.5 * Math.max(0, 60 - (p.arms[hand]?.bend ?? 60)) : 0;
        const studied = on.filter(a => !hand || a.hands.includes(hand)).map(a => ACT_STUDIES[a.act]?.joints?.[joint]).filter(r => !!r), { can, easy } = JOINT_RANGES[joint];
        const range = (level: "can" | "easy"): readonly [number, number] => (level === "can" ? can : [Math.min(easy[0], ...studied.map(r => r[0])), Math.max(easy[1], ...studied.map(r => r[1]))]);
        for (const level of ["can", "easy"] as const) {
          const [lo, hi] = range(level), over = Math.max(lo - angle, angle - hi) - (joint === "turn" ? loose : 0); if (over < (level === "can" ? 2 : 8)) continue;
          const key = `${level}/${joint}/${hand ?? ""}/${acts.join("+")}`, w = worst.get(key), past = w ? Math.max(w.range[0] - w.angle, w.angle - w.range[1]) : -1, long = (w?.seconds ?? 0) + every / fps;
          worst.set(key, over > past ? { shot: shot.id, actor: role.actor, acts, hand, joint, angle: Math.round(angle), range: [lo, hi], level, t: start + t, seconds: long } : { ...w!, seconds: long });
        }
      }
      if (role.raise) for (const h of ["f", "b"] as const) {
        const rule = role.raise.find(r => r.layers.includes(`hand-${h}`)), up = !!storyRaised(p, `hand-${h}`, t), before = was[h]; was[h] = up;
        if (!rule || before === undefined || before === up) continue;
        const low = boxOf(p.meshes.filter(m => m.id.split("/")[0] === `hand-${h}`), (x, y) => [x, y])?.[3], moment = `${shot.id} ${(start + t).toFixed(2)} s: hand ${h} of "${role.actor}" goes ${up ? "over" : "behind"} what is in front`;
        if (rule.edge === undefined) { if (rule.reach) out.counters.push(`${moment}, and its spot does not say where that has its far edge (raise.edge).`); }
        else if (low !== undefined && low > rule.edge + 3) out.counters.push(`${moment} while it is ${Math.round(low - rule.edge)} cm under its edge.`);
      }
    }
    for (const w of worst.values()) if (w.seconds >= (w.level === "can" ? 0.1 : 0.4) && !(w.level === "easy" && [...worst.values()].some(c => c.level === "can" && c.joint === w.joint && c.hand === w.hand && c.acts.join() === w.acts.join()))) out.joints.push(w);
    for (const a of timed) if (a.hands.length) {
      const unstudied = !ACT_STUDIES[a.act]; if (unstudied) missing.add(a.act);
      const t = Math.min(shot.seconds, Math.max(0, a.at + a.d * (ACT_STUDIES[a.act]?.best ?? 0.5))), p = playRole(film, shot, role, t), view = storyView(film, shot, t), { width: W, height: H } = film.size, r = view.rect, b = boxOf(p.meshes.filter(m => ARM.test(m.id) || /^(head|face|hair)/.test(m.id)), (x, y) => view.put(x, y)); if (!b) continue;
      const pad = 0.12 * Math.max(b[2] - b[0], b[3] - b[1]), x0 = Math.max(r.x, b[0] - pad), y0 = Math.max(r.y, b[1] - pad), x1 = Math.min(r.x + r.width, b[2] + pad), y1 = Math.min(r.y + r.height, b[3] + pad); if (x1 - x0 < 24 || y1 - y0 < 24) continue;
      out.acts.push({ shot: shot.id, actor: role.actor, view: role.view ?? Object.keys(p.actor.figures)[0], act: a.act, hands: a.hands, t: start + t, box: [x0 / W, y0 / H, (x1 - x0) / W, (y1 - y0) / H], unstudied });
    }
  }
}
