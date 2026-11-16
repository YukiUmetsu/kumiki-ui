/**
 * COSTUME1 tags: find garments and outfits by any mix of facets, written as a query string or an object.
 *
 *   findGarments("region:eastern-asia year:1700 worn:women")       // East Asian women's dress around 1700
 *   findGarments({ country: "JP", occasion: "festival" })           // Japanese festival wear, any period
 *   findOutfits("era:victorian")                                     // Victorian outfits
 *
 * Facets:
 * - `region` matches the region and everything inside it (M49 tree).
 * - `country` is ISO 3166.
 * - `year` matches records in use that year; `from`/`to` take a range; `era` takes a named era's years and place.
 * - `worn` (women, men; "all" garments match either).
 * - `role`, `occasion`, `slot`, `cut`, `fabric`, `climate`, `culture`, `tag`.
 *
 * Any word without a facet is searched in names and descriptions.
 */
import type { Climate, Cut, GarmentRecord, Occasion, Outfit, Role, Slot, WornBy } from "./costume-data";
import { ERAS, GARMENTS, OUTFITS, REGIONS } from "./costume-data";

export interface CostumeQuery {
  region?: string; country?: string; culture?: string;
  year?: number; from?: number; to?: number; era?: string;
  worn?: WornBy; role?: Role; occasion?: Occasion; slot?: Slot; cut?: Cut; fabric?: string; climate?: Climate; tag?: string;
  text?: string;
}

const FACETS = ["region", "country", "culture", "year", "from", "to", "era", "worn", "role", "occasion", "slot", "cut", "fabric", "climate", "tag"] as const;

/** Parse "region:eastern-asia year:1700 worn:women silk" into a query. Unknown facets become text. */
export function parseCostumeQuery(q: string): CostumeQuery {
  const out: Record<string, string | number> = {}, words: string[] = [];
  for (const part of q.trim().split(/\s+/).filter(Boolean)) {
    const m = /^([a-z]+):(.+)$/i.exec(part);
    if (m && (FACETS as readonly string[]).includes(m[1].toLowerCase())) {
      const k = m[1].toLowerCase(), v = m[2];
      out[k] = ["year", "from", "to"].includes(k) ? Number(v) : k === "country" ? v.toUpperCase() : v.toLowerCase();
    } else words.push(part.toLowerCase());
  }
  if (words.length) out.text = words.join(" ");
  return out as CostumeQuery;
}

/** The region and all its ancestors, nearest first. */
export function regionPath(id: string): string[] {
  const path: string[] = [];
  let r = REGIONS.find(x => x.id === id);
  while (r) { path.push(r.id); r = r.parent ? REGIONS.find(x => x.id === r!.parent) : undefined; }
  return path;
}
/** Whether region `inner` lies within `outer` (or is it). */
export const regionWithin = (inner: string, outer: string) => regionPath(inner).includes(outer);

function yearsOf(q: CostumeQuery): [number, number] | undefined {
  if (q.era) { const e = ERAS.find(x => x.id === q.era); if (e) return [e.from, e.to]; }
  if (q.year !== undefined) return [q.year, q.year];
  if (q.from !== undefined || q.to !== undefined) return [q.from ?? -10000, q.to ?? 3000];
  return undefined;
}

/** Whether a garment matches a query. */
export function garmentMatches(g: GarmentRecord, query: CostumeQuery | string): boolean {
  const q = typeof query === "string" ? parseCostumeQuery(query) : query;
  const era = q.era ? ERAS.find(x => x.id === q.era) : undefined;
  const region = q.region ?? era?.region, country = q.country ?? era?.country;
  // A "world" garment (worn everywhere) matches any region.
  if (region && g.region !== "world" && !regionWithin(g.region, region) && !regionWithin(region, g.region)) return false;
  if (country && g.countries.length && !g.countries.includes(country)) return false;
  if (q.culture && !(g.cultures ?? []).includes(q.culture)) return false;
  const span = yearsOf(q);
  if (span) { const to = g.period.to ?? 3000; if (to < span[0] || g.period.from > span[1]) return false; }
  if (q.worn && q.worn !== "all" && g.wornBy !== "all" && g.wornBy !== q.worn) return false;
  if (q.role && !(g.roles ?? []).includes(q.role)) return false;
  if (q.occasion && !g.occasions.includes(q.occasion)) return false;
  if (q.slot && g.slot !== q.slot) return false;
  if (q.cut && g.cut !== q.cut) return false;
  if (q.fabric && !(g.fabrics ?? []).some(f => f.toLowerCase() === q.fabric)) return false;
  if (q.climate && !(g.climate ?? []).includes(q.climate)) return false;
  if (q.tag && !(g.tags ?? []).includes(q.tag)) return false;
  if (q.text) {
    const hay = `${g.name} ${g.local ?? ""} ${g.description} ${(g.tags ?? []).join(" ")} ${(g.fabrics ?? []).join(" ")}`.toLowerCase();
    if (!q.text.split(" ").every(w => hay.includes(w))) return false;
  }
  return true;
}

/** Garments matching a query, oldest first. */
export const findGarments = (query: CostumeQuery | string = {}) => GARMENTS.filter(g => garmentMatches(g, query)).sort((a, b) => a.period.from - b.period.from);

/** Outfits matching a query (place, year or era, wearer, role, occasion, or any garment it contains matching the text). */
export function findOutfits(query: CostumeQuery | string = {}): Outfit[] {
  const q = typeof query === "string" ? parseCostumeQuery(query) : query, span = yearsOf(q);
  const era = q.era ? ERAS.find(x => x.id === q.era) : undefined, region = q.region ?? era?.region, country = q.country ?? era?.country;
  return OUTFITS.filter(o => {
    if (region && !regionWithin(o.region, region)) return false;
    if (country && !o.countries.includes(country)) return false;
    if (span && (o.year < span[0] - 25 || o.year > span[1] + 25)) return false;
    if (q.worn && q.worn !== "all" && o.wornBy !== "all" && o.wornBy !== q.worn) return false;
    if (q.role && !(o.roles ?? []).includes(q.role)) return false;
    if (q.occasion && o.occasion !== q.occasion) return false;
    if (q.text && !`${o.name} ${o.notes} ${o.garments.join(" ")}`.toLowerCase().includes(q.text)) return false;
    return true;
  }).sort((a, b) => a.year - b.year);
}

/** The garments of an outfit, in wearing order. */
export const outfitGarments = (o: Outfit) => o.garments.map(id => GARMENTS.find(g => g.id === id)).filter((g): g is GarmentRecord => !!g);

/** How many garments carry each value of a facet (for facet chips and filters). */
export function facetCounts(facet: "region" | "slot" | "cut" | "occasion" | "role" | "wornBy" | "climate", list: readonly GarmentRecord[] = GARMENTS) {
  const counts = new Map<string, number>();
  for (const g of list) {
    const v = g[facet as keyof GarmentRecord];
    for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) counts.set(String(x), (counts.get(String(x)) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** A garment's tags as "facet:value" strings, for display and export. */
export function garmentTags(g: GarmentRecord): string[] {
  return [
    `region:${g.region}`, ...g.countries.map(c => `country:${c}`), ...(g.cultures ?? []).map(c => `culture:${c}`),
    `from:${g.period.from}`, `to:${g.period.to ?? "now"}`, ...(g.eras ?? []).map(e => `era:${e}`),
    `worn:${g.wornBy}`, ...(g.roles ?? []).map(r => `role:${r}`), ...g.occasions.map(o => `occasion:${o}`),
    `slot:${g.slot}`, `cut:${g.cut}`, ...(g.fabrics ?? []).map(f => `fabric:${f}`), ...(g.climate ?? []).map(c => `climate:${c}`), ...(g.tags ?? []).map(t => `tag:${t}`),
  ];
}
