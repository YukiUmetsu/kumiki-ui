/**
 * A painted figure as the cutter writes it (`scripts/storybook-art.py`) → a figure that a film can cast. The cut is data:
 * layers, joints in centimetres, loose parts, and how the body stands. Nothing here knows who the figure is.
 */
import type { ActingBody, ActPoint } from "../../rig/rig-acting";
import { personFromJoints } from "../../rig/rig-joints";
import type { ExtraBone, PersonJoints } from "../../rig/rig-joints";
import type { PaintedArt } from "../../rig/rig-look-painted";
import type { StoryFigure } from "./storybook-film";

export interface PaintedCut {
  art: Omit<PaintedArt, "pose">; joints: PersonJoints; extra?: readonly ExtraBone[]; provenance?: string;
  /** How it stands and moves; what is not said is a relaxed adult. */
  body?: { stance?: Readonly<Record<string, number>>; palm?: ActPoint; limits?: ActingBody["limits"]; follow?: ActingBody["follow"]; plant?: boolean; /** False: it only stands. */ sits?: false; /** Degrees that the body is turned to the viewer, when its shoulders do not say it. */ facing?: number };
  walk?: StoryFigure["walk"];
}

/** Arms a little away from the body and bent, as a person stands. */
const AT_EASE: Readonly<Record<string, number>> = { "arm-f": 13, "fore-f": -9, "hand-f": -2, "arm-b": -9, "fore-b": -11, "hand-b": -2 };
/** Degrees from hanging straight, for a figure that faces right. */
const LIMITS: NonNullable<ActingBody["limits"]> = { head: [-26, 26], neck: [-14, 22], torso: [-16, 62], "arm-f": [-185, 60], "arm-b": [-185, 60], "fore-f": [-150, 4], "fore-b": [-150, 4], "hand-f": [-65, 65], "hand-b": [-65, 65], "thigh-f": [-110, 30], "thigh-b": [-110, 30], "shin-f": [-4, 140], "shin-b": [-4, 140] };

/** `url` turns the file name of a painting into its address. */
export function storyFigure(cut: PaintedCut, url: (file: string) => string): StoryFigure {
  const person = personFromJoints(cut.art.id, cut.joints, { extra: cut.extra, plant: cut.body?.plant });
  const held = cut.art.sockets ?? {}, art: PaintedArt = { ...cut.art, ...(held["tray-f"] && held["tray-b"] ? { sockets: { ...held, /** Between two palms, or between two thumbs that hold the corners of something. */ hands: { between: ["tray-f", "tray-b"], layer: "arm-f" } } } : {}), pose: person.pose, images: Object.fromEntries(Object.entries(cut.art.images).map(([id, i]) => [id, { ...i, src: url(i.src) }])) };
  // limbs hang at ease; a loose part stays as it was painted, or hangs by itself
  const loose = Object.fromEntries((cut.extra ?? []).map(e => [e.id, e.hang ? 0 : (person.pose[e.id] ?? 0)]));
  const follow = cut.body?.follow ?? (cut.extra ?? []).filter(e => !e.hang).map(e => ({ bone: e.id, of: e.parent === "head" || e.parent === "neck" ? "head" : "torso", gain: 0.55, lag: 0.22, limit: 9, ...e.sway }));
  return { art, person, walk: cut.walk, body: { spec: person.spec, height: person.height, facing: cut.body?.facing ?? person.facing, stance: { ...loose, ...(cut.body?.stance ?? AT_EASE) }, limits: cut.body?.limits ?? LIMITS, follow, ...(cut.body?.sits === false ? { sits: false as const } : {}), ...(cut.body?.palm ? { palm: cut.body.palm } : {}) } };
}
