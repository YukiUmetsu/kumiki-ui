/** Physics shots: scenes whose motion is solved offline and baked, then played back frame by frame (recipe 9, Physics Point).
 *
 * Physics makes a point land in the body: a chain of dominoes is cause and effect you can feel, two stacks of blocks are a comparison
 * you can weigh. The solver never runs during a render. `npm run physics:bake` solves each scene once with a deterministic rigid-body
 * engine and writes a `BakedPhysicalActionSpec` (tracks and contact cues) that `sampleBakedPhysicalTrack` plays back at any frame.
 * Units are metres, Y up, 30 frames a second.
 */
import type { OrbitView, TextBeat } from "./studio-shots";

export interface PhysicsBody {
  id: string;
  /** Full box size in metres. */
  size: readonly [number, number, number];
  position: readonly [number, number, number];
  /** Yaw in degrees, about Y. */
  yaw?: number;
  /** Frame the body is released. Before it, the body is out of the simulation and hidden (scale 0), so waiting bodies never touch.
   * @default 0 */
  release?: number;
  /** A push at release, metres per second, for the first domino of a chain. */
  velocity?: readonly [number, number, number];
  angularVelocity?: readonly [number, number, number];
  /** Which material and group it belongs to, for colour and labels. */
  group: string;
}
export interface PhysicsScene {
  id: string;
  title: string;
  durationFrames: number;
  bodies: readonly PhysicsBody[];
  /** Ground friction and restitution. Wood on wood is about 0.5 and 0.1. */
  friction?: number;
  restitution?: number;
}

/** Fourteen dominoes on a gentle S-curve: the first is tipped at frame 12 and the fall travels down the line. */
export function dominoChainScene(count = 14): PhysicsScene {
  const h = .5, t = .085, w = .25, spacing = h * .62, bodies: PhysicsBody[] = [];
  let x = 0, z = 0, heading = 0;
  for (let i = 0; i < count; i++) {
    bodies.push({ id: `domino-${i}`, size: [w, h, t], position: [x, h / 2, z], yaw: -heading * 180 / Math.PI, group: i === count - 1 ? "last" : "chain",
      // The first domino is tipped toward the next: spin about up × direction of travel.
      ...(i === 0 ? { release: 12, angularVelocity: [-3.2 * Math.cos(heading), 0, -3.2 * Math.sin(heading)] as const } : {}) });
    // An S-curve: bend one way, then the other, so the chain reads as travelling, not as a line.
    heading += Math.sin(i / (count - 1) * Math.PI * 2) * .2;
    x += Math.sin(heading) * spacing; z -= Math.cos(heading) * spacing;
  }
  return { id: "domino-chain", title: "Domino chain", durationFrames: 180, bodies, friction: .5, restitution: .05 };
}

/** Two columns of blocks dropped one at a time: six on the left, eleven on the right, so the difference is felt as height and weight. */
export function stackCompareScene(left = 6, right = 11): PhysicsScene {
  const s = .22, bodies: PhysicsBody[] = [];
  const drop = (column: "left" | "right", n: number, x: number, start: number) => {
    // Each block is let go just above the stack it lands on, as a hand placing blocks would: a long fall makes a stack bounce apart.
    for (let i = 0; i < n; i++) bodies.push({ id: `${column}-${i}`, size: [s, s * .62, s], position: [x + Math.sin(i * 2.4) * .004, s * .62 * (i + .5) + .35, Math.cos(i * 1.7) * .004], yaw: Math.sin(i * 1.3) * 5, release: start + i * 7, group: column });
  };
  drop("left", left, -.32, 14);
  drop("right", right, .32, 14);
  return { id: "stack-compare", title: "Stack compare", durationFrames: 210, bodies, friction: .7, restitution: .04 };
}

export const PHYSICS_SCENES = { "domino-chain": dominoChainScene, "stack-compare": stackCompareScene } as const;
export type PhysicsSceneId = keyof typeof PHYSICS_SCENES;

/** Recipe 9 framing and text for a baked scene. */
export interface PhysicsPointSpec {
  durationFrames: number;
  view: OrbitView;
  /** Degrees the subject turns on the turntable through the shot. @default 10 */
  orbit?: number;
  title?: TextBeat;
  /** Labels pinned above groups (for a comparison), entering on their frames. */
  labels?: ReadonlyArray<{ group: string; text: string; enter: number }>;
}
export interface PhysicsShotProblem { code: string; severity: "error" | "warning"; message: string }
/** The point lands only after the physics does: text waits for the last contact, and the settled result gets time on screen. */
export function inspectPhysicsShot(spec: PhysicsPointSpec, lastContactFrame: number, fps = 30): PhysicsShotProblem[] {
  const problems: PhysicsShotProblem[] = [];
  if (spec.title && spec.title.enter < lastContactFrame) problems.push({ code: "physics-text-early", severity: "error", message: `The title enters at frame ${spec.title.enter}, before the motion settles at ${lastContactFrame}. Let the physics finish its sentence first.` });
  if ((spec.durationFrames - lastContactFrame) / fps < 1.5) problems.push({ code: "physics-hold-short", severity: "error", message: "Under 1.5 s on the settled result. The result is the point; hold it." });
  if (Math.abs(spec.orbit ?? 10) > 25) problems.push({ code: "physics-orbit-busy", severity: "warning", message: "A turn over 25° competes with the motion. Keep the camera calm so the falls read." });
  return problems;
}
