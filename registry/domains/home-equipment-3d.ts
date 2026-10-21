/** Stand-alone home equipment as HeroAssets (meters, origin on the floor at the unit's center).
 *
 * Wraps the home kit builders so equipment can be inspected, compared at true
 * scale (`ComparisonStage`) or animated on its own: outdoor condensing unit
 * (fan spins), air handler / furnace cabinet, tank water heater and a
 * wall-hung tankless water heater on a backer board. Each part is a named
 * semantic group; resources are owned and disposed by the asset.
 */
import { BoxGeometry, CylinderGeometry, Group, Matrix4, MeshStandardMaterial, SphereGeometry, TorusGeometry } from "three";
import type { Material } from "three";
import { createAssetResources } from "../craft/hero-asset";
import type { HeroAsset } from "../craft/hero-asset";
import type { HeroActionSpec, HeroActionState } from "../craft/hero-action";
import { createHomeMaterials } from "./home-materials-3d";
import type { HomeMaterials } from "./home-materials-3d";
import { buildAirHandler, buildCondenser, buildWaterHeater, createGeometryBatch, meshIn } from "./home-parts-3d";
import type { AssetResources } from "../craft/hero-asset";
import { HOUSE_PALETTES } from "./home-model";
import type { HousePaletteName } from "./home-model";

export type HomeEquipmentKind = "condenser" | "air-handler" | "tank-water-heater" | "tankless-water-heater";

export const HOME_EQUIPMENT_LABELS: Record<HomeEquipmentKind, string> = {
  condenser: "Outdoor condensing unit",
  "air-handler": "Air handler / furnace",
  "tank-water-heater": "Tank water heater",
  "tankless-water-heater": "Tankless water heater",
};

export interface HomeEquipmentOptions {
  kind: HomeEquipmentKind;
  /** Overall size in meters [w, h, d]; defaults are typical residential units. */
  size?: readonly [number, number, number];
  palette?: HousePaletteName;
  seed?: number;
}

const DEFAULT_SIZE: Record<HomeEquipmentKind, readonly [number, number, number]> = {
  condenser: [.78, .74, .78],
  "air-handler": [.56, 1.35, .6],
  "tank-water-heater": [.56, 1.52, .56],
  "tankless-water-heater": [.36, .62, .24],
};

/** Wall-hung tankless (condensing) water heater on a backer board; local origin on the floor below the unit's center. */
export function buildTanklessHeater(res: AssetResources, m: HomeMaterials, size: readonly [number, number, number]): Group {
  const group = new Group();
  const [w, h, d] = size, mount = 1.05; // bottom of the unit above the floor
  const y0 = mount, cy = y0 + h / 2, zBack = -d / 2;
  meshIn(res, group, new BoxGeometry(w + .24, h + .62, .019).translate(0, cy + .12, zBack - .0095), m.osb, "backer-board");
  const body = createGeometryBatch();
  body.at([w, h, d - .03], [0, cy, -.015]);
  body.at([w - .02, h - .02, .03], [0, cy, d / 2 - .03]); // front cover, slightly inset edges
  meshIn(res, group, body.build(), m.cabinet, "cabinet");
  meshIn(res, group, new BoxGeometry(w * .42, h * .13, .006).translate(0, cy + h * .22, d / 2 - .012), m.polymer, "control-panel");
  meshIn(res, group, new BoxGeometry(w * .2, h * .045, .002).translate(-w * .06, cy + h * .23, d / 2 - .008), m.meterGlass, "display");
  meshIn(res, group, new BoxGeometry(w * .46, h * .1, .002).translate(0, cy - h * .3, d / 2 - .012), m.label, "rating-plate");
  // Concentric vent collar and PVC exhaust/intake rising to the ceiling.
  const vent = createGeometryBatch();
  vent.geometry(new CylinderGeometry(.06, .06, .08, 28), new Matrix4().makeTranslation(-w * .18, y0 + h + .04, 0));
  vent.geometry(new CylinderGeometry(.05, .05, .5, 24), new Matrix4().makeTranslation(-w * .18, y0 + h + .33, 0));
  vent.geometry(new CylinderGeometry(.04, .04, .45, 24), new Matrix4().makeTranslation(w * .2, y0 + h + .26, 0));
  meshIn(res, group, vent.build(), m.label, "vent-pipes");
  // Gas, cold-in and hot-out lines, each with a quarter-turn isolation valve whose handle is its own pivot
  // (`unit.valve-*`, declared motion: rotate 90° about the stem; the rest pose is closed, across the pipe).
  const pipes = createGeometryBatch(), gas = createGeometryBatch();
  const run = .55;
  const valves: [string, number, Material][] = [
    ["unit.valve-cold", -w * .3, res.own(new MeshStandardMaterial({ color: "#2f6fd6", roughness: .45, metalness: .1 }))],
    ["unit.valve-gas", 0, m.brass],
    ["unit.valve-hot", w * .3, res.own(new MeshStandardMaterial({ color: "#c8342b", roughness: .45, metalness: .1 }))],
  ];
  for (const [id, x, handleMat] of valves) {
    (id === "unit.valve-gas" ? gas : pipes).geometry(new CylinderGeometry(.011, .011, run, 12), new Matrix4().makeTranslation(x, y0 - run / 2, .02));
    pipes.geometry(new CylinderGeometry(.02, .02, .05, 12), new Matrix4().makeTranslation(x, y0 - .14, .02));
    const pivot = new Group();
    pivot.position.set(x, y0 - .14, .05);
    pivot.userData.motion = { type: "rotate", axis: "z", amount: Math.PI / 2 };
    meshIn(res, pivot, new BoxGeometry(.07, .012, .02).translate(.03, 0, 0), handleMat, "handle");
    meshIn(res, pivot, new CylinderGeometry(.008, .008, .03, 10).rotateX(Math.PI / 2).translate(0, 0, -.012), m.brushed, "stem");
    group.add(res.name(pivot, id));
  }
  meshIn(res, group, pipes.build(), m.copper, "water-lines");
  meshIn(res, group, gas.build(), m.steel, "gas-line");
  // Display backlight: toggled by mechanisms through its emissive intensity.
  const backlight = res.own(new MeshStandardMaterial({ color: "#0d1b20", emissive: "#53d8ff", emissiveIntensity: 0, roughness: .3 }));
  backlight.userData.onIntensity = 2.4;
  res.name(meshIn(res, group, new BoxGeometry(w * .2, h * .045, .003).translate(-w * .06, cy + h * .23, d / 2 - .006), backlight, "display-backlight")!, "unit.display");
  const relief = createGeometryBatch();
  relief.geometry(new SphereGeometry(.022, 14, 10), new Matrix4().makeTranslation(w * .3 + .05, y0 - .26, .02));
  relief.geometry(new TorusGeometry(.03, .008, 8, 20, Math.PI), new Matrix4().makeRotationZ(Math.PI).setPosition(-w * .1, y0 - .4, .05));
  meshIn(res, group, relief.build(), m.brass, "relief-and-trap");
  return group;
}

/** Build a piece of home equipment as a self-contained HeroAsset. */
export function createHomeEquipment3D(options: HomeEquipmentOptions): HeroAsset {
  const res = createAssetResources();
  const kind = options.kind, size = options.size ?? DEFAULT_SIZE[kind];
  const m = createHomeMaterials({ palette: HOUSE_PALETTES[options.palette ?? "harbor"], seed: options.seed ?? 11, detail: .75 });
  const root = new Group();
  root.name = kind;
  let fan: Group | null = null, top = size[1];
  if (kind === "condenser") {
    const built = buildCondenser(res, m, size as [number, number, number]);
    fan = built.fan; root.add(res.name(built.group, "unit"));
    res.name(built.fan, "unit.fan");
    // Status light on the service panel (toggled through its emissive intensity).
    const led = res.own(new MeshStandardMaterial({ color: "#1c2a1c", emissive: "#5dff7a", emissiveIntensity: 0, roughness: .25 }));
    led.userData.onIntensity = 3;
    res.name(meshIn(res, built.group, new SphereGeometry(.012, 14, 10).translate(size[0] * .26, .1 + size[1] * .58, -size[2] / 2 - .022), led, "status-led")!, "unit.status-light");
    top = size[1] + .1;
  } else if (kind === "air-handler") {
    const g = buildAirHandler(res, m, size as [number, number, number]);
    g.position.y = size[1] / 2 + .05;
    root.add(res.name(g, "unit"));
    meshIn(res, root, new BoxGeometry(size[0] + .1, .05, size[2] + .1).translate(0, .025, 0), m.cmu, "stand");
  } else if (kind === "tank-water-heater") {
    const r = size[0] / 2 - .02, g = buildWaterHeater(res, m, r, size[1] - .1);
    root.add(res.name(g, "unit"));
    top = size[1] + .06;
  } else {
    const g = buildTanklessHeater(res, m, size);
    root.add(res.name(g, "unit"));
    top = 1.05 + size[1] + .6;
  }
  const actions: HeroActionSpec[] = fan ? [{ id: "run", label: "Fan running", durationFrames: 120, loop: true, meaning: "The condenser fan spins while the compressor runs (illustrative speed)." }] : [];
  const half = Math.max(size[0], size[2]) / 2 + .12;
  const bounds = kind === "tankless-water-heater"
    ? { min: [-size[0] / 2 - .14, 0, -size[2] / 2 - .03] as [number, number, number], max: [size[0] / 2 + .14, top, size[2] / 2 + .06] as [number, number, number] }
    : { min: [-half, 0, -half] as [number, number, number], max: [half, top, half] as [number, number, number] };
  return {
    id: `equipment-${kind}`, group: root, bounds, parts: res.parts, tier: "supporting", metersPerUnit: 1, exposure: .95,
    studio: { palette: "slate", keyAzimuth: -38, environmentIntensity: .6, floorY: 0 },
    craft: { materials: ["painted steel cabinets", "copper and brass fittings", "PVC venting", "OSB backer"], details: ["louvered coil guard and swept fan", "relief valve and discharge", "isolation valves", "concentric vent"] },
    actions,
    pose(state: HeroActionState) {
      if (fan) fan.rotation.y = state.id === "run" ? -(state.frame / (state.fps ?? 30)) * Math.PI * 2 * 3.5 : 0;
    },
    dispose() { res.dispose(); m.dispose(); },
  };
}
