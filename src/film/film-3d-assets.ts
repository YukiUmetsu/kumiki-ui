/** The files behind the named 3D shots of the capture page: photographed textures, the baked canyon, the physics bakes and the
 * splat capture. Each loader is imported only by a film that uses it. Provenance is in `assets/THIRD_PARTY_ASSETS.json`. */
import type { BakedPhysicalActionSpec } from "../../registry/motion/baked-physical-motion";
import type { PhysicsScene } from "../../registry/visual/physics-shots";

export async function meadowTextures() {
  const [grass, grassNormal, dirt, dirtNormal] = await Promise.all([
    import("../../assets/textures/meadow/grass_ground_diff.jpg?url"), import("../../assets/textures/meadow/grass_ground_nor_gl.jpg?url"),
    import("../../assets/textures/meadow/dirt_floor_diff.jpg?url"), import("../../assets/textures/meadow/dirt_floor_nor_gl.jpg?url"),
  ]);
  return { grass: grass.default, grassNormal: grassNormal.default, dirt: dirt.default, dirtNormal: dirtNormal.default };
}

export async function slotCanyon() {
  const [src, path, rock, sand] = await Promise.all([
    import("../../assets/baked/slot-canyon.glb?url"), import("../../assets/baked/slot-canyon.path.json"),
    import("../../assets/baked/rock-detail.jpg?url"), import("../../assets/baked/sand-detail.jpg?url"),
  ]);
  return {
    src: src.default, path: path.default.path as [number, number, number][],
    details: { wall: { src: rock.default, repeat: path.default.details.wall.repeat as [number, number] }, floor: { src: sand.default, repeat: path.default.details.floor.repeat as [number, number] } },
  };
}

type Bake = { scene: PhysicsScene; action: BakedPhysicalActionSpec };
export async function physicsBakes() {
  const [dominoes, stacks, walnut, walnutNormal, ash, ashNormal] = await Promise.all([
    import("../../assets/physics/domino-chain.json"), import("../../assets/physics/stack-compare.json"),
    import("../../assets/textures/wood/black_walnut_veneer_02_diff.jpg?url"), import("../../assets/textures/wood/black_walnut_veneer_02_nor_gl.jpg?url"),
    import("../../assets/textures/wood/ash_veneer_diff.jpg?url"), import("../../assets/textures/wood/ash_veneer_nor_gl.jpg?url"),
  ]);
  return {
    bakes: { "domino-chain": dominoes.default as unknown as Bake, "stack-compare": stacks.default as unknown as Bake },
    // Photographed CC0 veneers (Poly Haven "Black Walnut Veneer 02" and "Ash Veneer"), as in the Physics Point story.
    woods: { "stack-compare": { left: { map: walnut.default, normal: walnutNormal.default, tileMetres: .5, finish: "#6f5440" }, right: { map: ash.default, normal: ashNormal.default, tileMetres: .5, finish: "#fff0dc" } } },
  };
}

export async function clockTower() {
  const [src, splat] = await Promise.all([import("../../assets/captured/montreal-clock-tower.spz?url"), import("../../registry/visual/splat-stage-react")]);
  return { src: src.default, CapturedPlace: splat.CapturedPlace };
}

/** Growing-domino bakes for chain reactions, by number of links. */
export async function chainBakes(counts: readonly number[]) {
  const loaded = await Promise.all(counts.map(n => import(`../../assets/physics/domino-amplifier-${n}.json`).then(m => [n, m.default as Bake] as const)));
  return Object.fromEntries(loaded) as Record<number, Bake>;
}

/** Photographed walnut (Poly Haven, CC0 "Black Walnut Veneer 02") for a tabletop story's table. */
export async function walnutTable() {
  const [map, normal] = await Promise.all([import("../../assets/textures/wood/black_walnut_veneer_02_diff.jpg?url"), import("../../assets/textures/wood/black_walnut_veneer_02_nor_gl.jpg?url")]);
  return { map: map.default, normal: normal.default, tileMetres: .6 };
}

/** The race shots' car (CC BY 4.0, logos removed; see assets/models/vehicles/concept-car.LICENSE.md) and the track's CC0 surfaces and sky. */
export async function raceTrack() {
  const [car, asphalt, asphaltNormal, asphaltRough, grass, grassNormal, sky] = await Promise.all([
    import("../../assets/models/vehicles/concept-car.glb?url"),
    import("../../assets/textures/track/asphalt_track_diff_1k.jpg?url"), import("../../assets/textures/track/asphalt_track_nor_gl_1k.jpg?url"),
    import("../../assets/textures/track/asphalt_track_rough_1k.jpg?url"),
    import("../../assets/textures/meadow/grass_ground_diff.jpg?url"), import("../../assets/textures/meadow/grass_ground_nor_gl.jpg?url"),
    import("../../assets/textures/sky/kloofendal_48d_partly_cloudy_puresky_1k.hdr?url"),
  ]);
  // Your own cars, by file name, from the git-ignored local-assets/vehicles: for local renders only, never committed.
  const local = import.meta.glob("../../local-assets/vehicles/*.glb", { query: "?url", import: "default" });
  const cars: Record<string, string> = { "concept-car": car.default };
  for (const [path, load] of Object.entries(local)) cars[path.split("/").pop()!.replace(/\.glb$/, "")] = await load() as string;
  return { car: car.default, cars, track: { asphalt: { map: asphalt.default, normal: asphaltNormal.default, roughness: asphaltRough.default }, grass: { map: grass.default, normal: grassNormal.default }, sky: sky.default } };
}
