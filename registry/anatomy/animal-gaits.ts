/**
 * ANIM1 gaits: how four-legged animals move, in one table every art style shares.
 *
 * Footfall orders and timings are from Muybridge's *Animals in Motion* (1899) and Hildebrand's gait studies:
 * - the lateral-sequence walk (left hind, left fore, right hind, right fore, a quarter apart);
 * - the diagonal trot;
 * - the three-beat canter;
 * - the transverse gallop of horses, cattle, deer, pigs and bears (Muybridge: "the bear, raccoon and hog" share it);
 * - the rotary gallop of dogs and cats, with the spine flexing between an extended and a gathered suspension;
 * - the half-bound of hares and weasels.
 *
 * Speeds and stride times come from body size, not hand tuning:
 * - Dynamic similarity (Alexander & Jayes 1983): animals of any size change gait at about the same Froude number
 *   v² / (g·h), with h the hip height. They walk below about 0.5 and trot to about 2.5.
 * - Stride frequency (Heglund & Taylor 1988) falls with body mass as about M^-0.14.
 *
 * `quadFootfalls` turns a gait and a time into each leg's state, which any rig (RIG1, UKIYO1, crayon, pencil) can pose.
 */

export type GaitId = "walk" | "trot" | "canter" | "gallop" | "rotary" | "bound" | "amble";
export type QuadLeg = "hind-far" | "fore-far" | "hind-near" | "fore-near";
export const QUAD_LEGS: readonly QuadLeg[] = ["hind-far", "fore-far", "hind-near", "fore-near"];

export interface AnimalGait {
  id: GaitId;
  label: string;
  /** Footfall phases, listed hind-far, fore-far, hind-near, fore-near: a leg lands when (cycle + phase) wraps to 0. */
  phases: readonly [number, number, number, number];
  /** Share of the stride each foot is on the ground (the duty factor). */
  stance: number;
  /** Stride length in fore-leg lengths. */
  stride: number;
  /** Foot lift at mid-swing, in leg lengths. */
  lift: number;
  /** Body bob (in % of hip height), its phase and how many times per stride. */
  bob: number; bobPhase: number; bobH: 1 | 2;
  /** Body pitch in degrees and its phase. */
  pitch: number; pitchPhase: number;
  /** How far the body sinks into the stance (% of hip height). */
  sink: number;
  /** Head and neck nod in degrees, beats per stride, phase. */
  neck: number; neckH: 1 | 2; neckPhase: number;
  /** Spine flexion (0–1) and its phase: the rotary gallop's coiling back. */
  flex: number; flexPhase: number;
  /** Froude number v²/(g·h) the gait typically runs at (dynamic similarity). */
  froude: number;
  /** Airborne phases: none, gathered (legs folded under), or extended and gathered (the rotary gallop). */
  suspension: "none" | "gathered" | "extended-and-gathered";
  beats: number;
  /** What a viewer sees, and what the timing comes from. */
  notes: string;
}

/**
 * The gait table. Walk, trot and canter let the shoulder blade and pelvis follow the legs further (more reach); the
 * gallop keeps the hips steadier so the planted legs visibly sweep from forward-sloping to back-sloping.
 */
export const ANIMAL_GAITS: Readonly<Record<GaitId, AnimalGait>> = {
  walk: { id: "walk", label: "Walk", phases: [0, .75, .5, .25], stance: .64, stride: 1.02, lift: .13, bob: .6, bobPhase: .2, bobH: 2, pitch: 0, pitchPhase: 0, sink: .6,
    neck: 3, neckH: 2, neckPhase: .15, flex: .25, flexPhase: .2, froude: .25, suspension: "none", beats: 4,
    notes: "Lateral-sequence walk: left hind, left fore, right hind, right fore, a quarter apart; three or two feet always down; the head nods twice per stride." },
  amble: { id: "amble", label: "Amble", phases: [0, .85, .5, .35], stance: .55, stride: 1.25, lift: .15, bob: .5, bobPhase: .2, bobH: 2, pitch: .3, pitchPhase: .2, sink: .6,
    neck: 2, neckH: 2, neckPhase: .15, flex: .2, flexPhase: .2, froude: .5, suspension: "none", beats: 4,
    notes: "A fast lateral walk, the hind and fore of one side landing close together (bears, elephants, some horses): it rolls side to side, never airborne. Phases estimated from that description." },
  trot: { id: "trot", label: "Trot", phases: [0, .5, .5, 0], stance: .4, stride: 1.95, lift: .22, bob: 1.8, bobPhase: .45, bobH: 2, pitch: .8, pitchPhase: .2, sink: 1.2,
    neck: 2, neckH: 2, neckPhase: .3, flex: .3, flexPhase: .2, froude: 1, suspension: "gathered", beats: 2,
    notes: "Diagonal pairs land together with a short suspension between them; the body is highest in the suspension." },
  canter: { id: "canter", label: "Canter", phases: [0, .7, .7, .5], stance: .42, stride: 2.2, lift: .26, bob: 2.4, bobPhase: .96, bobH: 1, pitch: 3.4, pitchPhase: .7, sink: 1.5,
    neck: 5, neckH: 1, neckPhase: .3, flex: .6, flexPhase: .1, froude: 2, suspension: "gathered", beats: 3,
    notes: "Three beats (outside hind, the diagonal pair, the leading fore) and a suspension; the body rocks once per stride." },
  gallop: { id: "gallop", label: "Transverse gallop", phases: [0, .73, .9, .6], stance: .3, stride: 3.2, lift: .38, bob: 1.8, bobPhase: .86, bobH: 1, pitch: 4, pitchPhase: .55, sink: 1.6,
    neck: 7, neckH: 1, neckPhase: .43, flex: 1, flexPhase: .1, froude: 3.5, suspension: "gathered", beats: 4,
    notes: "Muybridge's 15-frame stride: the hinds land at 0 and .1, the fores at .27 and .4, each foot down ~30%, then ~30% gathered suspension with the legs folded under the body. Horses, cattle, deer, pigs, bears. No 'flying gallop' with all four legs flung out ever occurs: that is an old artistic convention." },
  rotary: { id: "rotary", label: "Rotary gallop", phases: [0, .46, .92, .56], stance: .27, stride: 3.1, lift: .3, bob: 2.5, bobPhase: .9, bobH: 1, pitch: 3, pitchPhase: .55, sink: 1.4,
    neck: 3, neckH: 1, neckPhase: .45, flex: 1, flexPhase: .1, froude: 4, suspension: "extended-and-gathered", beats: 4,
    notes: "Dogs, cats, deer at speed: left hind, right hind, right fore, left fore round the body; an extended and a gathered suspension, the spine coiling and stretching between them." },
  bound: { id: "bound", label: "Half-bound", phases: [0, .55, .08, .45], stance: .3, stride: 2.4, lift: .3, bob: 3, bobPhase: .85, bobH: 1, pitch: 6, pitchPhase: .55, sink: 1.5,
    neck: 3, neckH: 1, neckPhase: .45, flex: 1.2, flexPhase: .1, froude: 2.5, suspension: "gathered", beats: 3,
    notes: "Hares, rabbits, weasels, squirrels: the hind feet land almost together, ahead of where the fore feet landed one after the other; the back arches high in the gathered phase. Phases estimated from Hildebrand's description of the half-bound." },
};

export interface LegState {
  leg: QuadLeg;
  /** 0–1 through this leg's own cycle; 0 = foot lands. */
  phase: number;
  onGround: boolean;
  /** 0 → 1 through the stance (foot under the shoulder at about .5), or through the swing. */
  progress: number;
  /** Foot height off the ground, 0 at stance, peaking at mid-swing (in leg lengths × gait lift). */
  lift: number;
}

/** Each leg's state at `t` (0–1 through the stride). */
export function quadFootfalls(gait: GaitId | AnimalGait, t: number): LegState[] {
  const g = typeof gait === "string" ? ANIMAL_GAITS[gait] : gait;
  return QUAD_LEGS.map((leg, i) => {
    const phase = (((t + g.phases[i]) % 1) + 1) % 1, onGround = phase < g.stance;
    const progress = onGround ? phase / g.stance : (phase - g.stance) / (1 - g.stance);
    return { leg, phase, onGround, progress, lift: onGround ? 0 : Math.sin(Math.PI * progress) * g.lift };
  });
}

/** Body bob, pitch and spine flexion at `t`, in the gait's own units. */
export function quadBody(gait: GaitId | AnimalGait, t: number): { bob: number; pitch: number; flex: number; neck: number } {
  const g = typeof gait === "string" ? ANIMAL_GAITS[gait] : gait, tau = Math.PI * 2;
  return {
    bob: g.bob * Math.sin(tau * (t * g.bobH + g.bobPhase)),
    pitch: g.pitch * Math.sin(tau * (t + g.pitchPhase)),
    flex: g.flex * Math.sin(tau * (t + g.flexPhase)),
    neck: g.neck * Math.sin(tau * (t * g.neckH + g.neckPhase)),
  };
}

const G = 9.81;
/** Typical speed (m/s) of a gait for an animal whose hip stands `hipHeightM` metres high (dynamic similarity). */
export function gaitSpeed(gait: GaitId, hipHeightM: number): number { return Math.sqrt(ANIMAL_GAITS[gait].froude * G * hipHeightM); }
/**
 * Stride time (s) for a gait, from body mass (Heglund & Taylor 1988: stride frequency at the trot–gallop transition is
 * about 4.48·M^-0.14 Hz) scaled for the gait (walk slower, gallop a little faster; the per-gait factors are estimates).
 * Use it to set a cycle in frames.
 */
export function strideSeconds(gait: GaitId, massKg: number): number {
  const base = 4.48 * Math.pow(Math.max(.01, massKg), -.14), k: Record<GaitId, number> = { walk: .55, amble: .7, trot: .9, canter: .95, gallop: 1.05, rotary: 1.1, bound: 1.05 };
  return 1 / (base * k[gait]);
}
/** Stride time in frames at `fps`. */
export const strideFrames = (gait: GaitId, massKg: number, fps = 30) => Math.round(strideSeconds(gait, massKg) * fps);

/**
 * Hildebrand's gait diagram data: for each leg, the share of the stride it is on the ground, as [start, end] pairs
 * (an interval that wraps past 1 is split in two). Draw one bar per leg.
 */
export function footfallBars(gait: GaitId | AnimalGait): { leg: QuadLeg; spans: [number, number][] }[] {
  const g = typeof gait === "string" ? ANIMAL_GAITS[gait] : gait;
  return QUAD_LEGS.map((leg, i) => {
    const land = (1 - g.phases[i]) % 1, lift = land + g.stance;
    return { leg, spans: lift <= 1 ? [[land, lift]] : [[land, 1], [0, lift - 1]] };
  });
}
