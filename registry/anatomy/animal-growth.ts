/**
 * ANIM1 growth: the young of a species, from its adult construction. `juvenileConstruction(c, age)` reshapes the side
 * view for an age from 0 (newborn, or the youngest that stands) to 1 (adult), so a foal, a puppy or a fawn comes out of
 * the same species record as its parent, in any art style.
 *
 * What changes, by kind of body:
 * - Each leg segment has its own share of adult length at birth, so the long-legged foal comes from its near-adult
 *   cannons on a body still growing.
 * - The young face is the baby schema: a larger head for the body, larger eyes, a shorter muzzle, a rounder crown,
 *   larger ears.
 * - Height at birth as a share of adult height, which scales the drawing against its parent.
 *
 * Sources:
 * - Horse: "61, 84, 92 and 95 percent of its mature size at birth, 6, 12 and 18 months" (horses.extension.org); "the
 *   cannon bone is the most mature bone in terms of length at birth" (same); "the cannon bones only grow about 20
 *   percent in length after birth, while the humerus and femur increase 100 percent" (Butler farrier school).
 * - Dog: Helmsmüller et al. (2013), BMC Vet Res 9:203, Beagles from 9 to 51 weeks. Withers height rose 37–42% and
 *   trunk length 37–44%. The manus fell from 21.2% to 19.6% of the fore limb and the pes from 35.2% to 30.4% of the
 *   hind limb: a puppy's feet are large for its legs.
 * - The face: juvenile animals have "smaller snouts, higher foreheads, and larger eyes" (Wikipedia, Cuteness, after
 *   Jones); neotenous domestic animals show "large eyes, rounded forehead, large ears, and shortened muzzle"
 *   (Wikipedia, Neoteny). The amounts are estimated.
 */
import type { BodyPlanId } from "./animal-plans";
import type { Range } from "./foundation-shapes";
import { range as r } from "./foundation-shapes";
import type { AnimalConstruction } from "./animal-construct";
import type { AnimalSpecies, Swatch } from "./animal-species";

export type GrowthKind = "ungulate" | "carnivore" | "small" | "primate" | "bird";

export interface GrowthRule {
  kind: GrowthKind;
  /** What "age 0" is: newborn, or the youngest that stands and walks. */
  youngest: string;
  /** Shoulder height at age 0 ÷ adult. */
  height: Range;
  /** Each leg segment's length at age 0 ÷ adult: upper (humerus / femur), lower (radius / tibia), cannon or foot, toes. */
  legSegments: readonly [number, number, number, number];
  /** Trunk length (withers to buttock) at age 0 ÷ adult. */
  trunk: number;
  /** Neck length at age 0 ÷ adult. */
  neck: number;
  /** Head length at age 0 ÷ adult. */
  head: number;
  /** The muzzle's share of the head, × at age 0. */
  muzzle: number;
  /** Eye size and ear height, × their adult share of the head at age 0. */
  eye: number;
  ear: number;
  /** Tail length at age 0 ÷ adult. */
  tail: number;
  notes: readonly string[];
}

const est = (min: number, typical: number, max: number, source?: string) => r(min, typical, max, "estimated", source);

export const GROWTH: Readonly<Record<GrowthKind, GrowthRule>> = {
  ungulate: {
    kind: "ungulate", youngest: "newborn (stands within hours)",
    height: r(.58, .61, .64, "reported", "horses.extension.org: 61% of mature size at birth, 84% at 6 months, 92% at 12, 95% at 18"),
    // The cannon grows about 20% after birth (so it is 83% of adult at birth) and the humerus and femur double (50%).
    legSegments: [.5, .62, .83, .85], trunk: .5, neck: .5, head: .62, muzzle: .85, eye: 1.45, ear: 1.15, tail: .5,
    notes: ["Long-legged and short-bodied: the cannons are nearly grown at birth while the upper legs and the body have far to go (reported for the horse).", "The face short and the eye large; a fluffy short tail."],
  },
  carnivore: {
    kind: "carnivore", youngest: "about 9 weeks (walking, weaned)",
    height: r(.68, .71, .74, "measured", "Beagle withers height rose 37–42% from 9 to 51 weeks (Helmsmüller et al. 2013)"),
    // Paws and feet are proportionally larger young (manus 21.2% vs 19.6%, pes 35.2% vs 30.4% of the limb).
    legSegments: [.68, .68, .77, .84], trunk: .7, neck: .65, head: .78, muzzle: .78, eye: 1.3, ear: 1.15, tail: .6,
    notes: ["Big paws for the legs (measured in Beagles).", "A rounder head with a short muzzle and larger eyes; a shorter tail."],
  },
  small: {
    kind: "small", youngest: "a few weeks (furred, out of the nest)",
    height: est(.6, .65, .7), legSegments: [.62, .62, .72, .8], trunk: .62, neck: .65, head: .78, muzzle: .8, eye: 1.25, ear: 1.05, tail: .65,
    notes: ["A round ball of a body, a short face and big eyes."],
  },
  primate: {
    kind: "primate", youngest: "a few months (riding on the mother)",
    height: est(.4, .45, .5), legSegments: [.42, .42, .5, .55], trunk: .42, neck: .5, head: .7, muzzle: .8, eye: 1.3, ear: 1.1, tail: .6,
    notes: ["A large head and big eyes on a small body; the face pinker and paler than the adult's."],
  },
  bird: {
    kind: "bird", youngest: "chick (down)",
    height: est(.3, .35, .4), legSegments: [.45, .45, .5, .7], trunk: .38, neck: .35, head: .6, muzzle: .6, eye: 1.3, ear: 1, tail: .2,
    notes: ["Downy and round: big feet and head, a short bill, almost no tail."],
  },
};

const KIND: Partial<Record<BodyPlanId, GrowthKind>> = {
  equid: "ungulate", ruminant: "ungulate", suid: "ungulate",
  canid: "carnivore", felid: "carnivore", ursid: "carnivore", mustelid: "carnivore",
  leporid: "small", rodent: "small", primate: "primate",
};

/** The growth rule a plan follows (fish have none). */
export function growthRule(plan: BodyPlanId, group: "mammal" | "bird" | "fish"): GrowthRule | undefined {
  if (group === "bird") return GROWTH.bird;
  const k = KIND[plan];
  return k ? GROWTH[k] : undefined;
}

/** Shoulder height (or total length for birds) at `age` ÷ adult: from the rule's youngest to 1, eased like a growth curve (fast early). */
export function heightAt(rule: GrowthRule, age: number) {
  const a = Math.min(1, Math.max(0, age)), k = 1 - (1 - a) ** 2;
  return rule.height.typical + (1 - rule.height.typical) * k;
}

/**
 * The construction of a young animal at `age` (0 the rule's youngest, 1 adult). Lengths stay in units of the young
 * animal's own shoulder height (as every construction), so draw it scaled by `heightAt` beside its parent.
 */
export function juvenileConstruction(c: AnimalConstruction, age: number): AnimalConstruction {
  const rule = growthRule(c.plan.id, c.plan.group);
  if (!rule || age >= 1) return c;
  const a = Math.min(1, Math.max(0, age)), k = 1 - (1 - a) ** 2, mix = (young: number) => young + (1 - young) * k;
  const h = mix(rule.height.typical);
  if (c.plan.group === "bird") {
    // Birds are measured in total lengths: the parts are shares of the bird, so each part's growth ÷ the bird's.
    const len = h;
    const birdFace = c.species?.face && { ...c.species.face, eye: Math.min(.3, c.species.face.eye * mix(rule.eye) ), eyeFromNose: c.species.face.eyeFromNose * (1 - (1 - mix(rule.muzzle)) * .5) };
    return {
      ...c, trunk: c.trunk * mix(rule.trunk) / len * 1.35, chestDepth: c.chestDepth * 1.35 * mix(rule.trunk) / len, head: c.head * mix(rule.head) / len,
      muzzle: c.muzzle * mix(rule.muzzle), neck: c.neck * mix(rule.neck) / len, tail: c.tail * mix(rule.tail) / len,
      legClearance: c.legClearance * mix(rule.legSegments[1]) / len,
      species: c.species && birdFace ? { ...c.species, face: birdFace } : c.species,
    };
  }
  // Leg segments in adult shoulder heights, grown each by its own share, then back to the young animal's height.
  const grow = (fr: readonly [number, number, number, number]) => {
    const g = fr.map((f, i) => f * mix(rule.legSegments[i])), sum = g.reduce((s, x) => s + x, 0);
    return { fractions: g.map(x => x / sum) as unknown as [number, number, number, number], length: sum };
  };
  const fore = grow(c.fore), hind = grow(c.hind);
  // The shoulder joint sits about 28% of the way from the brisket to the withers; the legs reach it from the ground.
  const shoulder0 = c.legClearance + .28 * (1 - c.legClearance), shoulderY = Math.min(.9, shoulder0 * fore.length / h);
  const legClearance = Math.min(.8, (shoulderY - .28) / .72);
  const face = c.species?.face;
  const youngFace = face && {
    ...face,
    eye: Math.min(.3, face.eye * mix(rule.eye)), ear: face.ear !== undefined ? face.ear * mix(rule.ear) : undefined,
    // A shorter muzzle brings the eye closer to the nose.
    eyeFromNose: face.eyeFromNose * (1 - (1 - mix(rule.muzzle)) * .6), depth: Math.min(1.1, face.depth * (1 + (1 - k) * .15)),
  };
  return {
    ...c,
    trunk: c.trunk * mix(rule.trunk) / h, neck: c.neck * mix(rule.neck) / h, head: c.head * mix(rule.head) / h,
    muzzle: c.muzzle * mix(rule.muzzle), tail: c.tail * mix(rule.tail) / h,
    legClearance, chestDepth: c.chestDepth * (1 - legClearance) / Math.max(.05, 1 - c.legClearance),
    fore: fore.fractions, hind: hind.fractions,
    ear: c.ear && { ...c.ear, length: c.ear.length * mix(rule.ear) },
    species: c.species && youngFace ? { ...c.species, face: youngFace } : c.species,
  };
}

/**
 * The coat at `age`: the adult palette with the swatches of any young coat worn at that age (`CoatVariant.age`)
 * laid over it, a swatch replacing the adult one for the same region and fill.
 */
export function coatAt(sp: AnimalSpecies, age: number): readonly Swatch[] {
  const young = sp.coat.variants.filter(v => v.age && age >= v.age[0] && age < v.age[1]);
  if (!young.length) return sp.coat.palette;
  const key = (s: Swatch) => `${s.region}:${s.fill ?? "area"}`, out = new Map(sp.coat.palette.map(s => [key(s), s] as const));
  for (const v of young) for (const s of v.palette) out.set(key(s), s);
  return [...out.values()];
}

