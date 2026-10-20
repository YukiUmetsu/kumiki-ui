/** Contract shared by crafted hero assets across domains.
 *
 * A hero asset is a self-contained Three.js group with named semantic parts,
 * authored world bounds (for camera framing before any render), studio hints
 * and explicit resource ownership. It never owns a renderer, camera or clock.
 */
import type { BufferGeometry, Group, Material, Object3D, Texture } from "three";
import type { HeroBounds, HeroStudioOptions } from "./hero-studio";
import type { HeroActionSpec, HeroActionState } from "./hero-action";

export type HeroFidelityTier = "hero" | "supporting" | "background";

export interface HeroAsset {
  id: string;
  group: Group;
  /** Authored, deterministic world bounds including any plinth/base. */
  bounds: HeroBounds;
  /** Stable semantic part names → objects, for camera targets and callouts. */
  parts: ReadonlyMap<string, Object3D>;
  tier: HeroFidelityTier;
  /** Recommended tone-mapping exposure (paper/white subjects < 1 < dark metals). */
  exposure?: number;
  /** Suggested studio configuration; callers may override. */
  studio?: Partial<Omit<HeroStudioOptions, "bounds">>;
  /** Short craft notes: what it's made of and which details prove construction. */
  craft: { materials: readonly string[]; details: readonly string[]; stylization?: string };
  /**
   * Real-world size of one world unit in meters (e.g. .05 when 1 unit = 50 mm).
   * Lets compositions place a card, an ATM and a building at true relative scale.
   */
  metersPerUnit: number;
  /** Signature, frame-addressed actions this asset can perform. */
  actions?: readonly HeroActionSpec[];
  /** Pose the asset for an action at a local frame (null id = rest). Pure: no hidden state. */
  pose?(state: HeroActionState): void;
  dispose(): void;
}

/** Collects disposable GPU resources and named parts for an asset build. */
export function createAssetResources() {
  const disposables = new Set<BufferGeometry | Material | Texture>();
  const parts = new Map<string, Object3D>();
  return {
    parts,
    own<T extends BufferGeometry | Material | Texture>(resource: T): T { disposables.add(resource); return resource; },
    name<T extends Object3D>(object: T, name: string): T {
      object.name = name; object.userData.partRole = name;
      if (!parts.has(name)) parts.set(name, object);
      return object;
    },
    dispose() { for (const resource of disposables) resource.dispose(); disposables.clear(); },
  };
}
export type AssetResources = ReturnType<typeof createAssetResources>;
