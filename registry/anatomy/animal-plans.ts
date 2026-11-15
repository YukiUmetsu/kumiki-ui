/**
 * ANIM1 body plans: what a whole group of animals shares, so a species only states how it differs.
 *
 * A plan fixes the things that stay true across a family and across every art style:
 * - how the foot meets the ground (plantigrade, digitigrade, unguligrade);
 * - the skeleton's construction in side view (chest and pelvis masses, leg segments, head and muzzle);
 * - the natural gaits, and whether it can rear;
 * - the body parts every member has;
 * - the coat regions a fur map is painted over;
 * - the footfall sound;
 * - the construction notes a draughtsman needs in any medium.
 *
 * Proportions are in units of the shoulder (withers) height for four-legged animals, and of the body length (bill to
 * tail tip) for birds and fish. They are typical values for the plan; a species overrides them with its own measured or
 * reported numbers (see `animal-species.ts`).
 */
import type { GaitId } from "./animal-gaits";

export type BodyPlanId = "ursid" | "canid" | "felid" | "suid" | "ruminant" | "equid" | "leporid" | "rodent" | "mustelid" | "primate"
  | "bird-perching" | "bird-wader" | "bird-raptor" | "bird-galliform" | "bird-waterfowl" | "fish";
export type FootPosture = "plantigrade" | "digitigrade" | "unguligrade" | "bird" | "fin";

/** A named part every member of a plan has (species add their own: tusks, antlers, a crescent). */
export interface AnimalPart { id: string; name: string; ja?: string; region: AnimalRegion; note?: string }
/** Regions a coat, a colour zone or a fur map refers to. */
export type AnimalRegion = "head" | "face" | "muzzle" | "ears" | "eyes" | "neck" | "throat" | "chest" | "back" | "flank" | "belly" | "rump" | "fore-leg" | "hind-leg"
  | "feet" | "tail" | "wings" | "crown" | "breast" | "fins" | "scales";

/** Side-view construction, in shoulder heights (quadrupeds) or body lengths (birds, fish). */
export interface PlanConstruction {
  /** Trunk length, point of shoulder to point of buttock, ÷ shoulder height (the draughtsman's body length). For birds
   * and fish: the body mass (egg or spindle) ÷ total length. Head-and-body length ≈ trunk + neck + head. */
  trunk: number;
  /** Withers to brisket ÷ shoulder height. With `legClearance` it adds up to about 1: what is left over is how far the
   * shoulder blades rise above the rib cage. */
  chestDepth: number;
  /** Clearance under the chest (ground to brisket) ÷ shoulder height: how much leg shows. */
  legClearance: number;
  /** Head length (occiput to nose; with the bill for birds) ÷ shoulder height, and the muzzle's (bill's) share of it. */
  head: number; muzzle: number;
  /** Neck length ÷ shoulder height and its angle above horizontal at rest (deg). */
  neck: number; neckAngle: number;
  /** Tail length ÷ head-and-body length. */
  tail: number;
  /** Fore leg segments (upper arm, forearm, cannon/hand, toes) and hind (thigh, shank, cannon/foot, toes), as shares of the leg's length. */
  fore: readonly [number, number, number, number];
  hind: readonly [number, number, number, number];
  /** Back line: level, sloping (withers high), arched, or roached (rising to the loins). */
  back: "level" | "sloping" | "arched" | "roached";
  /** Upper-leg width ÷ shoulder height: a bear's columns (.17) or a deer's sticks (.07). */
  girth: number;
  /** Depth of the waist ÷ depth of the chest: 1 is a barrel (bear, boar), .72 a tucked-up dog. */
  barrel: number;
  /** How far the head's axis (occiput to nose) points below horizontal at rest (deg). */
  headAngle: number;
  /** Ear length and width ÷ head length, and its shape. */
  ear?: { length: number; width: number; shape: "round" | "pointed" | "leaf" | "long" };
  /** How the tail is carried at rest. */
  tailCarriage: "stub" | "hanging" | "raised" | "curled" | "up" | "trailing" | "level";
  /** Birds: the body's axis above horizontal when standing (deg). */
  bodyAngle?: number;
}

export interface BodyPlan {
  id: BodyPlanId;
  label: string;
  group: "mammal" | "bird" | "fish";
  posture: FootPosture;
  feet: string;
  construction: PlanConstruction;
  gaits: readonly GaitId[];
  /** The fastest gait the plan uses. */
  gallop?: GaitId;
  /** Can it stand up on its hind legs? */
  canRear: boolean;
  parts: readonly AnimalPart[];
  /** Regions with their own coat length or colour, for fur maps. */
  regions: readonly AnimalRegion[];
  /** What a footfall sounds like (picks the foley). */
  footfall: "hoof" | "pad" | "claw-pad" | "light" | "none";
  /** Construction notes that hold in any medium. */
  drawing: readonly string[];
}

const QUAD_PARTS: readonly AnimalPart[] = [
  { id: "skull", name: "skull", region: "head" }, { id: "muzzle", name: "muzzle", region: "muzzle" }, { id: "nose", name: "nose leather", region: "muzzle" },
  { id: "eye", name: "eye", region: "eyes" }, { id: "ears", name: "ears", region: "ears" }, { id: "neck", name: "neck", region: "neck" },
  { id: "withers", name: "withers", region: "back", note: "Top of the shoulder blades: the shoulder height is measured here." },
  { id: "chest", name: "chest (rib cage)", region: "chest" }, { id: "brisket", name: "brisket", region: "chest" }, { id: "loins", name: "loins", region: "back" },
  { id: "croup", name: "croup", region: "rump" }, { id: "elbow", name: "elbow", region: "fore-leg" }, { id: "carpus", name: "wrist (carpus)", region: "fore-leg" },
  { id: "stifle", name: "stifle (knee)", region: "hind-leg" }, { id: "hock", name: "hock (heel)", region: "hind-leg", note: "Points backward: the hind leg's 'backward knee' is the heel." },
  { id: "tail", name: "tail", region: "tail" },
];
const BIRD_PARTS: readonly AnimalPart[] = [
  { id: "bill", name: "bill", region: "head" }, { id: "eye", name: "eye", region: "eyes" }, { id: "crown", name: "crown", region: "crown" },
  { id: "neck", name: "neck", region: "neck", note: "An S-curve of many vertebrae; held folded, it looks much shorter than it is." },
  { id: "breast", name: "breast", region: "breast" }, { id: "back", name: "mantle and back", region: "back" },
  { id: "coverts", name: "wing coverts", region: "wings" }, { id: "secondaries", name: "secondaries", region: "wings" }, { id: "primaries", name: "primaries", region: "wings" },
  { id: "tail", name: "tail feathers", region: "tail" },
  { id: "tibia", name: "tibiotarsus (drumstick)", region: "hind-leg", note: "Mostly hidden in the belly feathers; the visible 'backward knee' is the ankle." },
  { id: "tarsus", name: "tarsometatarsus (shank)", region: "hind-leg" }, { id: "toes", name: "toes", region: "feet" },
];

const QUAD_REGIONS: readonly AnimalRegion[] = ["head", "muzzle", "ears", "neck", "throat", "chest", "back", "flank", "belly", "rump", "fore-leg", "hind-leg", "feet", "tail"];
const BIRD_REGIONS: readonly AnimalRegion[] = ["crown", "face", "neck", "throat", "breast", "back", "belly", "wings", "tail", "hind-leg", "feet"];

const quad = (o: Omit<BodyPlan, "group" | "parts" | "regions"> & { parts?: readonly AnimalPart[] }): BodyPlan => ({ group: "mammal", regions: QUAD_REGIONS, ...o, parts: [...QUAD_PARTS, ...o.parts ?? []] });
const bird = (o: Omit<BodyPlan, "group" | "parts" | "regions" | "posture" | "footfall" | "canRear"> & { parts?: readonly AnimalPart[] }): BodyPlan =>
  ({ group: "bird", posture: "bird", footfall: "light", canRear: false, regions: BIRD_REGIONS, ...o, parts: [...BIRD_PARTS, ...o.parts ?? []] });

export const BODY_PLANS: Readonly<Record<BodyPlanId, BodyPlan>> = {
  ursid: quad({ id: "ursid", label: "Bears", posture: "plantigrade", feet: "Five toes with long, non-retractile claws; the whole sole down when walking, so the heel and the wrist are on the ground.",
    construction: { trunk: 1.25, chestDepth: .55, legClearance: .4, head: 0.42, muzzle: .42, neck: 0.25, neckAngle: 5, tail: .06, fore: [.36, .34, .14, .16], hind: [.4, .36, .16, .08], back: "arched", girth: 0.17, barrel: 1.0, headAngle: 15, ear: { length: 0.3, width: 0.3, shape: "round" }, tailCarriage: "stub" },
    gaits: ["walk", "amble", "trot", "gallop"], gallop: "gallop", canRear: true, footfall: "claw-pad",
    parts: [{ id: "claws", name: "claws", region: "feet", note: "Longest on the fore feet; they show beyond the toe fur." }, { id: "hump", name: "shoulder hump", region: "back" }],
    drawing: ["A heavy barrel: the chest and the pelvis masses are nearly the same size, joined by a back that arches over the loins.", "The head is carried low, at or below the shoulder line; the neck is short and thick with long hair.", "Walking, the whole sole meets the ground: the fore feet turn slightly in, the hind feet place flat with the heel down.", "The legs are thick columns: no slim lower legs, no visible hock angle when standing."] }),
  canid: quad({ id: "canid", label: "Dogs, wolves, foxes and raccoon dogs", posture: "digitigrade", feet: "Four toes in front (and a dewclaw) and four behind, on pads; blunt claws that touch the ground.",
    construction: { trunk: 1.1, chestDepth: .48, legClearance: .52, head: 0.4, muzzle: .5, neck: 0.32, neckAngle: 40, tail: .45, fore: [.32, .36, .16, .16], hind: [.34, .36, .22, .08], back: "level", girth: 0.08, barrel: 0.72, headAngle: 10, ear: { length: 0.42, width: 0.3, shape: "pointed" }, tailCarriage: "hanging" },
    gaits: ["walk", "trot", "canter", "rotary"], gallop: "rotary", canRear: false, footfall: "pad",
    parts: [{ id: "stop", name: "stop", region: "face", note: "The step between forehead and muzzle." }, { id: "pads", name: "pads", region: "feet" }],
    drawing: ["The chest is deep and narrow; the belly tucks up behind it.", "Walking on the toes: the 'backward knee' of the hind leg is the heel (hock), held well off the ground.", "The trot is the travelling gait: diagonal pairs, the back level, the head forward."] }),
  felid: quad({ id: "felid", label: "Cats", posture: "digitigrade", feet: "Five toes in front, four behind, retractile claws (sheathed when walking, so the pads leave no claw marks).",
    construction: { trunk: 1.35, chestDepth: .45, legClearance: .55, head: 0.32, muzzle: .28, neck: 0.3, neckAngle: 30, tail: .65, fore: [.34, .34, .16, .16], hind: [.36, .34, .22, .08], back: "level", girth: 0.09, barrel: 0.78, headAngle: 5, ear: { length: 0.3, width: 0.28, shape: "pointed" }, tailCarriage: "raised" },
    gaits: ["walk", "trot", "rotary"], gallop: "rotary", canRear: true, footfall: "pad",
    parts: [{ id: "whiskers", name: "whiskers", region: "muzzle" }, { id: "pads", name: "pads", region: "feet" }],
    drawing: ["A long, supple spine that coils and stretches; the shoulder blades ride high when it stalks.", "The head is round with a short muzzle; the eyes are large and set forward.", "The hind feet step into the fore feet's prints (direct register)."] }),
  suid: quad({ id: "suid", label: "Pigs and wild boar", posture: "unguligrade", feet: "Cloven hooves on the two middle toes, two dewclaws behind and above them.",
    construction: { trunk: 1.2, chestDepth: .52, legClearance: .45, head: 0.6, muzzle: .55, neck: 0.15, neckAngle: 0, tail: .15, fore: [.3, .32, .26, .12], hind: [.36, .32, .24, .08], back: "sloping", girth: 0.1, barrel: 1.0, headAngle: 25, ear: { length: 0.28, width: 0.2, shape: "pointed" }, tailCarriage: "hanging" },
    gaits: ["walk", "trot", "gallop"], gallop: "gallop", canRear: false, footfall: "hoof",
    parts: [{ id: "disc", name: "snout disc", region: "muzzle", note: "A flat, bare disc with the two nostrils, at the end of a long, straight snout." },
      { id: "hooves", name: "cloven hooves", region: "feet" }, { id: "dewclaws", name: "dewclaws", region: "feet" }],
    drawing: ["A wedge: high, heavy forequarters falling to lighter hindquarters, almost no visible neck.", "The head is a long, deep wedge — the forehead and snout one straight line — ending in the flat disc.", "Slender legs on small hooves carry the heavy body; walking, the body barely bobs.", "Hogs gallop with the same footfall sequence as bears (Muybridge)."] }),
  ruminant: quad({ id: "ruminant", label: "Deer and cattle", posture: "unguligrade", feet: "Cloven hooves, dewclaws behind.",
    construction: { trunk: 1.1, chestDepth: .45, legClearance: .55, head: 0.4, muzzle: .45, neck: 0.45, neckAngle: 45, tail: .1, fore: [.28, .32, .3, .1], hind: [.32, .32, .3, .06], back: "level", girth: 0.07, barrel: 0.95, headAngle: 30, ear: { length: 0.42, width: 0.2, shape: "leaf" }, tailCarriage: "hanging" },
    gaits: ["walk", "trot", "gallop", "rotary"], gallop: "gallop", canRear: false, footfall: "hoof",
    parts: [{ id: "hooves", name: "cloven hooves", region: "feet" }, { id: "dewclaws", name: "dewclaws", region: "feet" }],
    drawing: ["Long cannon bones: the 'knee' in front is the wrist and the hock is the heel, both high up the leg.", "Deer: slim legs, a long neck held up, large ears; cattle: a massive body on short columns, the dewlap hanging under the throat."] }),
  equid: quad({ id: "equid", label: "Horses", posture: "unguligrade", feet: "One toe on each foot, standing on a single hoof.",
    construction: { trunk: 1.03, chestDepth: .45, legClearance: .55, head: 0.42, muzzle: .5, neck: 0.55, neckAngle: 50, tail: .45, fore: [.28, .3, .26, .16], hind: [.32, .3, .3, .08], back: "level", girth: 0.08, barrel: 0.9, headAngle: 50, ear: { length: 0.28, width: 0.11, shape: "pointed" }, tailCarriage: "hanging" },
    gaits: ["walk", "trot", "canter", "gallop"], gallop: "gallop", canRear: true, footfall: "hoof",
    parts: [{ id: "mane", name: "mane", region: "neck" }, { id: "hoof", name: "hoof", region: "feet" }, { id: "fetlock", name: "fetlock", region: "feet" }],
    drawing: ["The body fits a square: the length from point of shoulder to buttock is about the height at the withers.", "The long head hangs from an arched neck; the jowl is a large round mass at the back of the jaw.", "In the gallop the legs fold under the body; it never flings all four out at once (Muybridge)."] }),
  leporid: quad({ id: "leporid", label: "Hares and rabbits", posture: "digitigrade", feet: "Furred soles, no pads; very long hind feet.",
    construction: { trunk: 1.4, chestDepth: .55, legClearance: .3, head: 0.45, muzzle: .3, neck: 0.1, neckAngle: 30, tail: .07, fore: [.3, .38, .16, .16], hind: [.3, .32, .3, .08], back: "roached", girth: 0.1, barrel: 0.95, headAngle: 15, ear: { length: 1.0, width: 0.24, shape: "long" }, tailCarriage: "up" },
    gaits: ["walk", "bound"], gallop: "bound", canRear: true, footfall: "light",
    parts: [{ id: "ears", name: "long ears", region: "ears" }, { id: "hind-feet", name: "long hind feet", region: "feet" }],
    drawing: ["Sitting, it is a pear: the back rounds up to the loins, the long hind feet flat under the haunch.", "The hind feet land ahead of the fore feet in the bound."] }),
  rodent: quad({ id: "rodent", label: "Mice and rats", posture: "plantigrade", feet: "Four fingers, five toes, the whole sole down.",
    construction: { trunk: 2.3, chestDepth: .7, legClearance: .25, head: 0.9, muzzle: .5, neck: 0.05, neckAngle: 10, tail: .95, fore: [.3, .3, .2, .2], hind: [.3, .3, .3, .1], back: "roached", girth: 0.12, barrel: 1.0, headAngle: 10, ear: { length: 0.35, width: 0.35, shape: "round" }, tailCarriage: "trailing" },
    gaits: ["walk", "trot", "bound"], gallop: "bound", canRear: true, footfall: "light",
    parts: [{ id: "incisors", name: "incisors", region: "muzzle" }, { id: "whiskers", name: "whiskers", region: "muzzle" }],
    drawing: ["A teardrop body low to the ground, the head a third of the body with large round ears and bead eyes.", "The tail is long, bare and ringed."] }),
  mustelid: quad({ id: "mustelid", label: "Weasels and martens", posture: "plantigrade", feet: "Five toes with sharp claws, semi-plantigrade.",
    construction: { trunk: 2.8, chestDepth: .6, legClearance: .35, head: 0.7, muzzle: .35, neck: 0.45, neckAngle: 20, tail: .45, fore: [.32, .32, .18, .18], hind: [.34, .32, .24, .1], back: "arched", girth: 0.1, barrel: 0.9, headAngle: 5, ear: { length: 0.15, width: 0.2, shape: "round" }, tailCarriage: "trailing" },
    gaits: ["walk", "bound"], gallop: "bound", canRear: true, footfall: "light",
    drawing: ["A long tube of a body on short legs; bounding, the back arches into a hoop.", "The neck is long and the head small and flat."] }),
  primate: quad({ id: "primate", label: "Monkeys", posture: "plantigrade", feet: "Hands and feet with opposable thumbs and great toes; nails, not claws.",
    construction: { trunk: 0.95, chestDepth: .5, legClearance: .45, head: 0.45, muzzle: .2, neck: 0.1, neckAngle: 30, tail: .15, fore: [.4, .38, .12, .1], hind: [.38, .36, .16, .1], back: "sloping", girth: 0.08, barrel: 0.9, headAngle: 0, ear: { length: 0.14, width: 0.12, shape: "round" }, tailCarriage: "stub" },
    gaits: ["walk", "bound"], gallop: "bound", canRear: true, footfall: "light",
    parts: [{ id: "hands", name: "hands", region: "feet" }, { id: "face", name: "bare face", region: "face" }],
    drawing: ["On all fours the fore limbs are as long as the hind, so the back runs level or slopes back from the shoulders.", "The face is flat and bare with forward eyes; it sits upright, using its hands."] }),
  "bird-perching": bird({ id: "bird-perching", label: "Perching birds", feet: "Three toes forward, one back, gripping a perch.",
    construction: { trunk: 0.45, chestDepth: .32, legClearance: .1, head: 0.22, muzzle: .35, neck: 0.08, neckAngle: 60, tail: .38, fore: [.3, .3, .2, .2], hind: [.36, .36, .2, .08], back: "level", girth: 0.03, barrel: 1, headAngle: 0, tailCarriage: "level", bodyAngle: 35 },
    gaits: ["walk", "bound"], drawing: ["An egg for the body, a smaller ball for the head with almost no neck showing; the tail extends the body's axis.", "Folded wings cross over the back with the primary tips above the tail."] }),
  "bird-wader": bird({ id: "bird-wader", label: "Cranes and herons", feet: "Long toes for wading; cranes have a raised hind toe and cannot perch, herons can.",
    construction: { trunk: 0.35, chestDepth: .2, legClearance: .7, head: 0.2, muzzle: .6, neck: 0.45, neckAngle: 70, tail: .14, fore: [.3, .3, .2, .2], hind: [.4, .44, .1, .06], back: "level", girth: 0.015, barrel: 1, headAngle: 5, tailCarriage: "level", bodyAngle: 15 },
    gaits: ["walk"], drawing: ["Stilts and a snake: the body is small between very long legs and a long S-shaped neck.", "Herons fly with the neck folded back; cranes fly with it stretched out."] }),
  "bird-raptor": bird({ id: "bird-raptor", label: "Hawks and eagles", feet: "Strong toes with long curved talons.",
    construction: { trunk: 0.45, chestDepth: .3, legClearance: .14, head: 0.18, muzzle: .35, neck: 0.08, neckAngle: 70, tail: .42, fore: [.3, .3, .2, .2], hind: [.38, .36, .18, .08], back: "level", girth: 0.04, barrel: 1, headAngle: 0, tailCarriage: "level", bodyAngle: 60 },
    gaits: ["walk"], drawing: ["Upright on the perch; the hooked bill, a brow ridge over the eye, feathered 'trousers' down the leg.", "Accipiters have short broad wings and a long tail for flying through woods."] }),
  "bird-galliform": bird({ id: "bird-galliform", label: "Pheasants and fowl", feet: "Strong walking feet; males carry spurs.",
    construction: { trunk: 0.38, chestDepth: .26, legClearance: .14, head: 0.1, muzzle: .3, neck: 0.14, neckAngle: 60, tail: .55, fore: [.3, .3, .2, .2], hind: [.38, .36, .18, .08], back: "level", girth: 0.03, barrel: 1, headAngle: 0, tailCarriage: "level", bodyAngle: 10 },
    gaits: ["walk", "trot"], parts: [{ id: "wattle", name: "facial wattle", region: "face" }, { id: "spur", name: "spur", region: "hind-leg" }],
    drawing: ["A round body on the ground; males trail a long tail, half the length of the bird.", "They run rather than fly, bursting up only when flushed."] }),
  "bird-waterfowl": bird({ id: "bird-waterfowl", label: "Ducks", feet: "Webbed feet set far back.",
    construction: { trunk: 0.5, chestDepth: .3, legClearance: .06, head: 0.14, muzzle: .38, neck: 0.18, neckAngle: 60, tail: .14, fore: [.3, .3, .2, .2], hind: [.38, .36, .18, .08], back: "level", girth: 0.03, barrel: 1, headAngle: 0, tailCarriage: "level", bodyAngle: 0 },
    gaits: ["walk"], drawing: ["Afloat, a boat: the waterline runs along the lower breast and the tail tilts up.", "Ashore, a waddle: the feet set far back, the body upright."] }),
  fish: { id: "fish", label: "Fish", group: "fish", posture: "fin", feet: "Paired pectoral and pelvic fins, dorsal, anal and tail fins.",
    construction: { trunk: 0.75, chestDepth: .28, legClearance: 0, head: 0.25, muzzle: .3, neck: 0, neckAngle: 0, tail: .2, fore: [.3, .3, .2, .2], hind: [.3, .3, .2, .2], back: "arched", girth: 0, barrel: 1, headAngle: 0, tailCarriage: "level" },
    gaits: [], canRear: false, footfall: "none", regions: ["head", "back", "flank", "belly", "fins", "tail", "scales"],
    parts: [{ id: "operculum", name: "gill cover", region: "head" }, { id: "dorsal", name: "dorsal fin", region: "fins" }, { id: "pectoral", name: "pectoral fins", region: "fins" },
      { id: "pelvic", name: "pelvic fins", region: "fins" }, { id: "anal", name: "anal fin", region: "fins" }, { id: "caudal", name: "tail fin", region: "tail" }, { id: "scales", name: "scales", region: "scales" },
      { id: "lateral-line", name: "lateral line", region: "flank" }, { id: "barbels", name: "barbels", region: "head" }],
    drawing: ["Swims by a travelling wave down the body, its amplitude growing toward the tail.", "Scales overlap toward the tail in diagonal rows; the lateral line runs along the flank."] },
};
