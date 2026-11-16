/**
 * FLORA1 checks.
 *
 * `checkPlantData` keeps the species records honest:
 * - ranges ordered, months valid;
 * - blossom-before-leaves agreeing with the leaf calendar;
 * - autumn colour inside the leaf months;
 * - references public domain or CC0;
 * - catalog sound ids that exist.
 *
 * `measurePlant` and `checkPlantProportions` compare a drawn or generated plant with its species:
 * - crown width;
 * - where the crown starts;
 * - trunk width.
 */
import { GROWTH_FORMS } from "./plant-forms";
import { PLANT_SPECIES, findPlant } from "./plant-species";
import type { PlantSpecies } from "./plant-species";
import { plantConstruction } from "./plant-construct";
import type { PlantSkeleton } from "./plant-construct";
import type { FPoint, Grade } from "./foundation-shapes";

export interface PlantDataFinding { species: string; message: string }

/** Problems in the species records (empty when consistent). Pass the sound catalog's ids to check `catalog` references. */
export function checkPlantData(list: readonly PlantSpecies[] = PLANT_SPECIES, soundIds?: ReadonlySet<string>): PlantDataFinding[] {
  const out: PlantDataFinding[] = [], bad = (species: string, message: string) => out.push({ species, message });
  for (const s of list) {
    if (!GROWTH_FORMS[s.form]) bad(s.id, `unknown growth form ${s.form}`);
    const ranges: [string, { min: number; typical: number; max: number } | undefined][] = [["height", s.size.height], ["trunk", s.size.trunk], ["crown", s.size.crown],
      ["leaf.length", s.leaf.length], ["flower.diameter", s.flower?.diameter], ["fruit.size", s.fruit?.size]];
    for (const [k, rg] of ranges) if (rg && !(rg.min <= rg.typical && rg.typical <= rg.max)) bad(s.id, `${k} range is not ordered`);
    const months = [...(s.flower?.months ?? []), ...(s.fruit?.months ?? []), ...(s.seasons.leaf ?? []), ...(s.seasons.autumn ?? [])];
    if (months.some(m => !Number.isInteger(m) || m < 1 || m > 12)) bad(s.id, "a month is outside 1–12");
    if (!s.leaf.evergreen && s.seasons.leaf && s.seasons.autumn?.some(m => !s.seasons.leaf!.includes(m))) bad(s.id, "autumn colour falls outside the leaf months");
    if (s.flower?.timing === "before-leaves" && s.seasons.leaf && !s.leaf.evergreen) {
      const firstLeaf = Math.min(...s.seasons.leaf), firstBloom = Math.min(...s.flower.months);
      if (firstBloom > firstLeaf) bad(s.id, "flowers before the leaves, but the first bloom month is after the first leaf month");
    }
    for (const r of s.references) if (r.rights !== "public-domain" && r.rights !== "CC0") bad(s.id, `reference ${r.title} is not PD or CC0`);
    if (soundIds) for (const snd of s.sounds) if (snd.catalog && !soundIds.has(snd.catalog)) bad(s.id, `sound ${snd.catalog} is not in the catalog`);
  }
  return out;
}

/** Landmarks read off a drawn plant (any units; y up unless `yUp` is false). */
export interface PlantLandmarks { ground: number; top: number; crownBase: number; crownLeft: number; crownRight: number; trunkWidth?: number }

/** Proportions in plant heights from landmarks. */
export function measurePlant(l: PlantLandmarks, yUp = true): { crownWidth: number; crownBase: number; trunkWidth?: number } {
  const h = (y: number) => (yUp ? y - l.ground : l.ground - y), H = h(l.top);
  return { crownWidth: Math.abs(l.crownRight - l.crownLeft) / H, crownBase: h(l.crownBase) / H, trunkWidth: l.trunkWidth === undefined ? undefined : l.trunkWidth / H };
}

/** Landmarks of a generated plant (to check the generator itself, or to compare a style's drawing with it). */
export function skeletonLandmarks(sk: PlantSkeleton): PlantLandmarks {
  const masses: FPoint[] = [...sk.foliage.flatMap(f => [[f.cx - f.rx, f.cy - f.ry], [f.cx + f.rx, f.cy + f.ry]] as FPoint[]), ...sk.branches.filter(b => b.order >= 1).flatMap(b => b.points)];
  const all: FPoint[] = [...masses, ...sk.branches.flatMap(b => b.points), ...sk.strands.flatMap(s => s.points)];
  const xs = masses.map(p => p[0]), ys = masses.map(p => p[1]);
  const stem = sk.branches.find(b => b.order === 0);
  return { ground: 0, top: Math.max(...all.map(p => p[1])), crownBase: ys.length ? Math.min(...ys) : 0, crownLeft: xs.length ? Math.min(...xs) : 0, crownRight: xs.length ? Math.max(...xs) : 0,
    trunkWidth: stem ? stem.radii[0] * 2 : undefined };
}

export interface PlantFinding { key: "crownWidth" | "crownBase" | "trunkWidth"; value: number; min: number; max: number; grade: Grade | "form"; status: "ok" | "low" | "high"; message: string }

/**
 * Compare measured proportions with a species' architecture. The ranges are the construction values ± 25 % ("form"
 * grade), or a reported crown spread over the reported height where the species has one.
 */
export function checkPlantProportions(subject: string | PlantSpecies, measured: { crownWidth?: number; crownBase?: number; trunkWidth?: number }, tolerance = .1): PlantFinding[] {
  const sp = typeof subject === "string" ? findPlant(subject) : subject, c = plantConstruction(sp ?? (subject as string)), out: PlantFinding[] = [];
  const ranges: Record<PlantFinding["key"], { min: number; max: number; grade: Grade | "form" }> = {
    crownWidth: sp?.size.crown && sp.size.crown.grade === "reported" && sp.size.height.grade === "reported"
      ? { min: sp.size.crown.min / sp.size.height.max, max: sp.size.crown.max / sp.size.height.min, grade: "reported" } : { min: c.a.crown.width * .75, max: c.a.crown.width * 1.25, grade: "form" },
    crownBase: { min: c.a.crown.base * .6, max: c.a.crown.base * 1.4 + .05, grade: "form" },
    trunkWidth: sp?.size.trunk && sp.size.trunk.grade === "reported" && sp.size.height.grade === "reported"
      ? { min: sp.size.trunk.min / 100 / sp.size.height.max, max: sp.size.trunk.max / 100 / sp.size.height.min, grade: "reported" } : { min: c.a.trunk.baseWidth * .6, max: c.a.trunk.baseWidth * 1.6, grade: "form" },
  };
  for (const key of Object.keys(ranges) as PlantFinding["key"][]) {
    const v = measured[key];
    if (v === undefined || !Number.isFinite(v)) continue;
    const r = ranges[key], lo = r.min * (1 - tolerance), hi = r.max * (1 + tolerance), status = v < lo ? "low" : v > hi ? "high" : "ok";
    out.push({ key, value: v, min: r.min, max: r.max, grade: r.grade, status, message: `${key} ${v.toFixed(2)} is ${status === "ok" ? "inside" : status === "low" ? "below" : "above"} ${r.min.toFixed(2)}–${r.max.toFixed(2)} (${r.grade}) for ${sp?.name ?? String(subject)}` });
  }
  return out;
}
