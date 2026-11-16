/**
 * ANIM1 postures: how a four-legged animal sits, lies, rests and rears, by body plan. Like the gait table, one record
 * serves every species of a plan and every art style; `poseAnimal(c, { posture, amount })` builds it on a species'
 * construction, easing from standing (amount 0) to the full posture (1).
 *
 * Pitch is the line from the point of the buttock to the point of the shoulder, in degrees above level, the way it
 * reads in a side view.
 */
import type { BodyPlanId } from "./animal-plans";
import type { FoundationReference, Range } from "./foundation-shapes";
import { commons as C, range as r } from "./foundation-shapes";

export type PostureId = "sit" | "lie" | "rest" | "rear";
export const POSTURE_IDS: readonly PostureId[] = ["sit", "lie", "rest", "rear"];

/**
 * How the forelegs are held:
 * - straight: propping the raised chest (a dog sitting);
 * - folded: tucked under the chest, wrist forward and the foot back under it (cattle, deer, a cat's loaf);
 * - extended: forearms flat on the ground, reaching forward (a dog's sphinx);
 * - tucked: lifted, the forearm forward and the cannon hanging (a horse's levade);
 * - hang: lifted and loose in front of the chest (a bear standing up).
 */
export type ForeLegs = "straight" | "folded" | "extended" | "tucked" | "hang";
/**
 * How the hind legs are held:
 * - folded: the hock on the ground and the foot flat forward under the haunch;
 * - flexed: standing on deeply bent hocks;
 * - straight: standing upright on them.
 */
export type HindLegs = "folded" | "flexed" | "straight";

export interface PostureFit {
  pitch: Range;
  fore: ForeLegs;
  hind: HindLegs;
  /** The tail wrapped forward round the feet (a sitting cat) instead of lying behind. */
  tail?: "wrap";
}

export interface AnimalPosture {
  id: PostureId;
  label: string;
  ja: string;
  /** The plans that take this posture naturally; a plan that is absent does not. */
  plans: Partial<Record<BodyPlanId, PostureFit>>;
  /** The head held up, or lowered to rest on the ground or the forepaws. */
  head: "up" | "down";
  /** How much of the body's pitch the neck and the head follow (0 keeps them as standing). */
  neckFollows: number;
  headFollows: number;
  /** Reached from standing, in frames at 30 fps (typical). */
  frames: number;
  /** What a viewer sees. */
  drawing: readonly string[];
  references: readonly FoundationReference[];
}

const est = (min: number, typical: number, max: number, source?: string) => r(min, typical, max, "estimated", source);
const CORGI: FoundationReference = { title: "Corgi-Siberian husky sitting, side view", url: C("Corgi-Siberian_Husky_Profile.jpg"), rights: "CC0", kind: "photo" };
const STEINLEN: FoundationReference = { title: "Steinlen, Calico cat (sitting, profile)", url: C("Calico_cat_(Steinlen).jpg"), rights: "public-domain", kind: "painting" };
const COW: FoundationReference = { title: "Cow lying down in a paddock", url: C("Cow_lying_down_in_a_paddock(GN03609).jpg"), rights: "CC0", kind: "photo" };
const DOE: FoundationReference = { title: "Barye, Doe Lying Down (Walters 27.30)", url: C("Antoine-Louis_Barye_-_Doe_Lying_Down_-_Walters_2730.jpg"), rights: "public-domain", kind: "photo" };
const LEVADE: FoundationReference = { title: "Ludwig Koch, levade (1923)", url: C("KochLevade.jpeg"), rights: "public-domain", kind: "painting" };
const BEAR: FoundationReference = { title: "Brown bear standing on its hind legs", url: C("Bear_standing_on_hind_legs_and_looking_ursus_middendorffi.jpg"), rights: "public-domain", kind: "photo" };

/** Lying and resting share their plans and legs; resting lowers the head. */
const LIE_PLANS: Partial<Record<BodyPlanId, PostureFit>> = {
  ruminant: { pitch: r(2, 5, 8, "measured", "back line off the lying cow (4°) and Barye's doe (7°)"), fore: "folded", hind: "folded" },
  equid: { pitch: est(2, 5, 8, "lies on the chest like cattle, forelegs folded"), fore: "folded", hind: "folded" },
  suid: { pitch: est(0, 3, 6), fore: "folded", hind: "folded" },
  canid: { pitch: est(0, 3, 6, "the sphinx: forearms flat and forward"), fore: "extended", hind: "folded" },
  felid: { pitch: est(0, 3, 6, "the loaf: forelegs folded under the chest"), fore: "folded", hind: "folded" },
  ursid: { pitch: est(-2, 2, 6), fore: "extended", hind: "folded" },
  leporid: { pitch: est(0, 4, 8, "the form: crouched, ears laid back"), fore: "folded", hind: "folded" },
  rodent: { pitch: est(0, 3, 6), fore: "folded", hind: "folded" },
  mustelid: { pitch: est(-2, 2, 6), fore: "extended", hind: "folded" },
};

export const ANIMAL_POSTURES: Readonly<Record<PostureId, AnimalPosture>> = {
  sit: {
    id: "sit", label: "Sit", ja: "お座り",
    plans: {
      canid: { pitch: r(25, 29, 35, "measured", "buttock→shoulder line off the sitting corgi-husky; its back line rises 43°"), fore: "straight", hind: "folded" },
      felid: { pitch: r(36, 41, 46, "measured", "buttock→shoulder line off Steinlen's sitting cat; its back line rises 54°"), fore: "straight", hind: "folded", tail: "wrap" },
      ursid: { pitch: est(45, 55, 65, "bears sit back on the rump, more upright than a dog"), fore: "straight", hind: "folded" },
      leporid: { pitch: est(22, 28, 34, "a hare sitting up on its long hind feet"), fore: "straight", hind: "folded" },
      primate: { pitch: est(65, 75, 85, "a macaque sits upright on its seat pads"), fore: "straight", hind: "folded" },
    },
    head: "up", neckFollows: .85, headFollows: .15, frames: 18,
    drawing: [
      "The rump on the ground behind the folded hind legs: the hock flat, the hind foot forward under the stifle.",
      "The forelegs straight and nearly upright under the raised chest; the forefeet do not move, the hind feet step forward.",
      "The neck rises with the chest; the head stays level.",
      "A cat sits more upright than a dog, the tail wrapped round the forefeet.",
    ],
    references: [CORGI, STEINLEN],
  },
  lie: {
    id: "lie", label: "Lie down", ja: "伏せ",
    plans: LIE_PLANS,
    head: "up", neckFollows: 1, headFollows: 0, frames: 30,
    drawing: [
      "The brisket and belly on the ground, the back nearly level.",
      "Cattle, deer and horses fold the forelegs under the chest, wrist forward; dogs and bears lay the forearms flat and forward.",
      "The hind legs folded beside the belly, the hock on the ground, the foot forward.",
      "The withers sit at about half the standing height (the lying cow and doe).",
    ],
    references: [COW, DOE],
  },
  rest: {
    id: "rest", label: "Rest (head down)", ja: "休む",
    plans: LIE_PLANS,
    head: "down", neckFollows: 1, headFollows: 0, frames: 40,
    drawing: ["Lying, with the neck lowered so the chin rests on the ground or the forepaws (the lying cow's muzzle is on the grass)."],
    references: [COW],
  },
  rear: {
    id: "rear", label: "Rear up", ja: "立ち上がる",
    plans: {
      equid: { pitch: r(30, 33, 45, "reported", "Wikipedia, Airs above the ground: levade about 30–35° from the ground, pesade 45°"), fore: "tucked", hind: "flexed" },
      ursid: { pitch: est(75, 82, 88, "a bear standing up to look and smell, nearly upright"), fore: "hang", hind: "straight" },
      mustelid: { pitch: est(70, 80, 88, "a weasel standing up to look round"), fore: "hang", hind: "straight" },
      leporid: { pitch: est(55, 65, 75, "a hare standing up, or boxing"), fore: "hang", hind: "straight" },
      primate: { pitch: est(70, 80, 88), fore: "hang", hind: "straight" },
      rodent: { pitch: est(55, 65, 75, "a mouse sitting up to eat or sniff"), fore: "hang", hind: "folded" },
    },
    head: "up", neckFollows: .6, headFollows: -.1, frames: 20,
    drawing: [
      "All the weight on the hindquarters, the hind feet under the body's centre of gravity.",
      "A horse's levade: the body 30–35° up on deeply bent hocks, the forelegs tucked (forearm forward, cannon hanging), the head drawn in.",
      "A bear stands nearly upright on straight hind legs, the forelegs loose in front of the chest.",
    ],
    references: [LEVADE, BEAR],
  },
};

/** How a plan takes a posture, or undefined when it does not naturally (and, for rearing, when the species cannot). */
export function postureFit(plan: BodyPlanId, posture: PostureId, canRear = true): PostureFit | undefined {
  if (posture === "rear" && !canRear) return undefined;
  return ANIMAL_POSTURES[posture].plans[plan];
}
