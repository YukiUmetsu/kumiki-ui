/**
 * ANIM1 checks: measure any drawing or rig of an animal against its species' graded ranges, so a style can stylise on
 * purpose and not by accident (a woodblock boar with a dachshund's legs, a fox with a cat's head).
 *
 * The workflow:
 * 1. Give `measureAnimal` landmarks read off a render or a rig: withers, brisket, point of shoulder, point of
 *    buttock, occiput, nose, and the ground line.
 * 2. Pass the ratios to `checkAnimalProportions`. Each finding says whether the value is inside the species' range
 *    (widened by a tolerance for stylisation), and what grade of evidence the range has.
 *
 * `checkSpeciesData` cross-checks a species record against its own reported sizes.
 */
import { BODY_PLANS } from "./animal-plans";
import type { PlanConstruction } from "./animal-plans";
import { ANIMAL_SPECIES, findAnimal } from "./animal-species";
import type { AnimalSpecies, ConstructionKey, Grade } from "./animal-species";
import { headBodyLength } from "./animal-construct";
import type { AnimalPoint } from "./animal-construct";

export interface ProportionFinding {
  key: ConstructionKey;
  value: number;
  /** The accepted range (the species' graded range, or the plan's typical value ± 20 %), before tolerance. */
  min: number; max: number;
  grade: Grade | "plan";
  status: "ok" | "low" | "high";
  message: string;
}

const LABEL: Record<ConstructionKey, string> = {
  trunk: "trunk length", chestDepth: "chest depth", legClearance: "leg clearance under the chest", head: "head length", muzzle: "muzzle share of the head",
  neck: "neck length", neckAngle: "neck angle", tail: "tail length", girth: "upper-leg width", barrel: "waist depth", headAngle: "head angle", bodyAngle: "body angle",
};

/** The range a species (or its plan) accepts for one construction value. */
export function proportionRange(subject: string | AnimalSpecies, key: ConstructionKey): { min: number; typical: number; max: number; grade: Grade | "plan" } | undefined {
  const sp = typeof subject === "string" ? findAnimal(subject) : subject;
  const r = sp?.proportions[key];
  if (r) return r;
  const plan = sp ? BODY_PLANS[sp.plan] : BODY_PLANS[subject as keyof typeof BODY_PLANS];
  const v = plan?.construction[key as keyof PlanConstruction];
  return typeof v === "number" ? { min: v * .8, typical: v, max: v * 1.2, grade: "plan" } : undefined;
}

/**
 * Check measured ratios (in shoulder heights, as `PlanConstruction` defines them) against a species.
 * `tolerance` widens each range by that share (default .1) to allow a style's stylisation.
 */
export function checkAnimalProportions(subject: string | AnimalSpecies, measured: Partial<Record<ConstructionKey, number>>, tolerance = .1): ProportionFinding[] {
  const sp = typeof subject === "string" ? findAnimal(subject) : subject;
  const name = sp?.name ?? String(subject);
  const out: ProportionFinding[] = [];
  for (const [key, value] of Object.entries(measured) as [ConstructionKey, number][]) {
    const r = proportionRange(subject, key);
    if (!r || !Number.isFinite(value)) continue;
    const lo = r.min * (1 - tolerance), hi = r.max * (1 + tolerance);
    const status = value < lo ? "low" : value > hi ? "high" : "ok";
    const range = `${r.min.toFixed(2)}–${r.max.toFixed(2)} (${r.grade})`;
    out.push({ key, value, min: r.min, max: r.max, grade: r.grade, status,
      message: status === "ok" ? `${LABEL[key]} ${value.toFixed(2)} is inside ${name}'s ${range}.` : `${LABEL[key]} ${value.toFixed(2)} is ${status === "low" ? "below" : "above"} ${name}'s ${range}, beyond ${Math.round(tolerance * 100)} % stylisation.` });
  }
  return out;
}

/** Landmarks read off a side view (any units, y up or down as `yUp` says). */
export interface AnimalLandmarks {
  ground: number; withers: AnimalPoint; brisket: AnimalPoint; pointOfShoulder: AnimalPoint; pointOfButtock: AnimalPoint;
  occiput?: AnimalPoint; nose?: AnimalPoint; tailTip?: AnimalPoint; tailRoot?: AnimalPoint;
}

/** Ratios from landmarks, in shoulder heights. Pass `yUp: false` for screen coordinates (y grows downward). */
export function measureAnimal(l: AnimalLandmarks, yUp = true): Partial<Record<ConstructionKey, number>> {
  const h = (p: AnimalPoint) => (yUp ? p[1] - l.ground : l.ground - p[1]);
  const H = h(l.withers), d = (a: AnimalPoint, b: AnimalPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const out: Partial<Record<ConstructionKey, number>> = {
    legClearance: h(l.brisket) / H, chestDepth: (h(l.withers) - h(l.brisket)) / H, trunk: Math.abs(l.pointOfShoulder[0] - l.pointOfButtock[0]) / H,
  };
  if (l.occiput && l.nose) out.head = d(l.occiput, l.nose) / H;
  return out;
}

export interface SpeciesDataFinding { species: string; message: string }
/**
 * Cross-check species records against their own reported sizes: trunk + neck + head must give the reported
 * head-and-body length ÷ shoulder height (within `tolerance`), and every range must be ordered. Every mammal has a
 * face, with its shares of the head length in range.
 */
export function checkSpeciesData(species: readonly AnimalSpecies[] = ANIMAL_SPECIES, tolerance = .15): SpeciesDataFinding[] {
  const out: SpeciesDataFinding[] = [];
  for (const sp of species) {
    for (const [k, r] of Object.entries(sp.proportions)) if (typeof r === "object" && "min" in r && !(r.min <= r.typical && r.typical <= r.max)) out.push({ species: sp.id, message: `${k} range is not ordered` });
    for (const [k, r] of Object.entries(sp.size)) if (r && !(r.min <= r.typical && r.typical <= r.max)) out.push({ species: sp.id, message: `size.${k} range is not ordered` });
    if (BODY_PLANS[sp.plan].group === "mammal") {
      const f = sp.face;
      if (!f) out.push({ species: sp.id, message: "mammal has no face" });
      else for (const [k, v, lo, hi] of [["eyeFromNose", f.eyeFromNose, .2, .8], ["eye", f.eye, .02, .25], ["ear", f.ear, .05, 1.2], ["depth", f.depth, .3, 1.1], ["eyeSpacing", f.eyeSpacing, .2, .95]] as const)
        if (!(v >= lo && v <= hi)) out.push({ species: sp.id, message: `face.${k} ${v} is outside ${lo}–${hi}` });
    }
    if (BODY_PLANS[sp.plan].group !== "mammal" || !sp.size.shoulder || sp.size.length.grade !== "reported" || sp.size.shoulder.grade !== "reported") continue;
    const plan = BODY_PLANS[sp.plan].construction, pick = (k: "trunk" | "neck" | "head") => sp.proportions[k]?.typical ?? plan[k];
    const built = headBodyLength({ trunk: pick("trunk"), neck: pick("neck"), head: pick("head") }), reported = sp.size.length.typical / sp.size.shoulder.typical;
    if (Math.abs(built / reported - 1) > tolerance) out.push({ species: sp.id, message: `trunk + neck + head = ${built.toFixed(2)} shoulder heights, but the reported head-and-body length is ${reported.toFixed(2)}` });
  }
  return out;
}
