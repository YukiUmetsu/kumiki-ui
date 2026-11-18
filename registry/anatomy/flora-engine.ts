/**
 * FLORA2 `ReferenceGuidedFloraEngine`: generates any plant from a `SpeciesMorphologyProfile`.
 *
 * The engine keeps a registry of profiles (the reference-measured ones by default; `register` adds or replaces one at
 * run time after `checkFloraProfile`). `generate` grows a few distinct specimens with the mesh builder and places them
 * with the layout manager. A field of hundreds of plants draws those few specimens many times (instancing). It is
 * renderer-neutral: `flora-three.ts` turns a scene into Three.js objects.
 */
import type { SpeciesMorphologyProfile, FloraProfileIssue } from "./flora-profile";
import { FloraProfileError, checkFloraProfile } from "./flora-profile";
import { ProceduralMeshBuilder } from "./flora-mesh";
import type { FloraFidelity, FloraSpecimen } from "./flora-mesh";
import { SpatialLayoutManager } from "./flora-layout";
import type { FloraLayout, FloraPlacement } from "./flora-layout";
import { FLORA_PROFILES } from "./flora-profiles";
import { clamp } from "./flora-math";
import type { V3 } from "./flora-math";

export interface FloraEngineConfig {
  /** A registered profile id, or a profile object (checked, not registered). */
  speciesProfile: SpeciesMorphologyProfile | string;
  /** Deterministic seed: the same seed always grows the same plants. */
  seed: number;
  fidelityLevel: FloraFidelity;
  layoutMode: FloraLayout;
  /** 0 seedling → 1 mature. */
  growthStage: number;
  /** Distinct specimens built for a layout (default 1 for a hero, 4 otherwise); the other plants are instances of them. */
  variants?: number;
  /** ± spread of growth stage between the specimens of a layout. */
  stageSpread?: number;
  /** Where the layout's centre stands (x, z in metres), to put several species in one scene. */
  origin?: readonly [number, number];
}

export interface FloraScene {
  profile: SpeciesMorphologyProfile;
  specimens: FloraSpecimen[];
  placements: FloraPlacement[];
  origin: readonly [number, number];
  bounds: { min: V3; max: V3 };
  stats: { specimens: number; plants: number; triangles: number; instances: number; drawCalls: number; ms: number };
}

export class ReferenceGuidedFloraEngine {
  readonly #profiles = new Map<string, SpeciesMorphologyProfile>();
  readonly #builders = new Map<FloraFidelity, ProceduralMeshBuilder>();
  readonly #specimens = new Map<string, FloraSpecimen>();

  constructor(profiles: readonly SpeciesMorphologyProfile[] = FLORA_PROFILES) {
    for (const p of profiles) this.register(p);
  }

  /** Adds or replaces a profile. Throws `FloraProfileError` when the check finds errors; returns the warnings. */
  register(profile: SpeciesMorphologyProfile): FloraProfileIssue[] {
    const issues = checkFloraProfile(profile);
    if (issues.some(i => i.level === "error")) throw new FloraProfileError(issues);
    this.#profiles.set(profile.id, profile);
    for (const k of [...this.#specimens.keys()]) if (k.startsWith(`${profile.id}|`)) this.#specimens.delete(k);
    return issues;
  }

  profile(id: string): SpeciesMorphologyProfile | undefined { return this.#profiles.get(id); }
  get profiles(): SpeciesMorphologyProfile[] { return [...this.#profiles.values()]; }

  /** One organ alone (a leaf, a flower head) at the origin as a scene, for close-ups. */
  organ(speciesProfile: SpeciesMorphologyProfile | string, organ: string, fidelityLevel: FloraFidelity, maturity = 1): FloraScene {
    const profile = this.#resolve(speciesProfile), sp = this.#builder(fidelityLevel).organ(profile, organ, { maturity });
    return { profile, specimens: [sp], placements: [{ x: 0, z: 0, rotation: 0, scale: 1, specimen: 0 }], origin: [0, 0], bounds: sp.bounds,
      stats: { specimens: 1, plants: 1, triangles: sp.stats.triangles, instances: sp.stats.instances, drawCalls: sp.batches.length, ms: sp.stats.ms } };
  }

  #resolve(p: SpeciesMorphologyProfile | string): SpeciesMorphologyProfile {
    const profile = typeof p === "string" ? this.#profiles.get(p) : p;
    if (!profile) throw new Error(`Unknown flora profile "${String(p)}"`);
    if (typeof p !== "string") {
      const issues = checkFloraProfile(profile);
      if (issues.some(i => i.level === "error")) throw new FloraProfileError(issues);
    }
    return profile;
  }

  #builder(fidelity: FloraFidelity): ProceduralMeshBuilder {
    let builder = this.#builders.get(fidelity);
    if (!builder) { builder = new ProceduralMeshBuilder(fidelity); this.#builders.set(fidelity, builder); }
    return builder;
  }

  /** Grows and places plants for one species. */
  generate(config: FloraEngineConfig): FloraScene {
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const profile = this.#resolve(config.speciesProfile), builder = this.#builder(config.fidelityLevel);
    const hero = config.layoutMode.mode === "hero", count = Math.max(1, Math.round(config.variants ?? (hero ? 1 : 4)));
    const stage = clamp(config.growthStage), spread = config.stageSpread ?? (hero ? 0 : 0.08);
    const specimens: FloraSpecimen[] = [];
    for (let v = 0; v < count; v++) {
      const s = config.seed + v * 7919, st = clamp(stage + (count > 1 ? spread * (2 * v / (count - 1) - 1) : 0));
      const key = `${profile.id}|${config.fidelityLevel}|${s}|${st.toFixed(3)}`;
      let sp = this.#specimens.get(key);
      if (!sp || sp.profile !== profile) {
        sp = builder.build(profile, { seed: s, stage: st });
        this.#specimens.set(key, sp);
        if (this.#specimens.size > 48) this.#specimens.delete(this.#specimens.keys().next().value!);
      }
      specimens.push(sp);
    }
    const placements = new SpatialLayoutManager(profile.layout).place(config.layoutMode, config.seed, count);
    const origin = config.origin ?? [0, 0];
    const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    let triangles = 0, instances = 0;
    for (const p of placements) {
      const sp = specimens[p.specimen], b = sp.bounds, r = Math.max(Math.abs(b.min[0]), Math.abs(b.max[0]), Math.abs(b.min[2]), Math.abs(b.max[2])) * p.scale;
      min[0] = Math.min(min[0], origin[0] + p.x - r); max[0] = Math.max(max[0], origin[0] + p.x + r);
      min[2] = Math.min(min[2], origin[1] + p.z - r); max[2] = Math.max(max[2], origin[1] + p.z + r);
      min[1] = Math.min(min[1], b.min[1] * p.scale); max[1] = Math.max(max[1], b.max[1] * p.scale);
      triangles += sp.stats.triangles; instances += sp.stats.instances;
    }
    // One instanced draw per part and per organ template of each specimen that some plant shows.
    const drawCalls = specimens.reduce((s, sp, v) => s + (placements.some(p => p.specimen === v) ? sp.parts.length + sp.batches.length : 0), 0);
    const ms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
    return { profile, specimens, placements, origin, bounds: { min, max }, stats: { specimens: specimens.length, plants: placements.length, triangles, instances, drawCalls, ms } };
  }
}
