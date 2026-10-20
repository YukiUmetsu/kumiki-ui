/** Stage sets and true-scale composition for hero assets.
 *
 * Every HeroAsset declares `metersPerUnit`. A stage set declares its own, plus
 * named slots (surface points with a usable footprint). `composeHeroScene`
 * scales each asset by assetMetersPerUnit / setMetersPerUnit so a card, a
 * cash stack and a building keep their real relative sizes — or by an explicit
 * factor for deliberately "hero-sized" props — and returns a HeroAsset that
 * works anywhere a single asset does (viewer, finance stage, capture CLI).
 */
import {
  BoxGeometry, BufferAttribute, CylinderGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshPhysicalMaterial, Vector2, Vector3,
} from "three";
import type { BufferGeometry, Material, Object3D } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createAssetResources } from "./hero-asset";
import type { AssetResources, HeroAsset } from "./hero-asset";
import type { HeroActionSpec, HeroActionState } from "./hero-action";
import { paintWithRelief } from "./canvas-texture";
import { applySurfaceDetail } from "./surface-detail";
import type { HeroBounds } from "./hero-studio";
import type { Vec3 } from "./sdf-sculpt";

export type StageSetKind = "desk" | "street" | "vault";

export interface StageSlot {
  /** Point on the set surface (set units). */
  position: Vec3;
  /** Facing (radians about +Y); 0 faces the camera side (+Z). */
  yaw: number;
  /** Usable footprint radius in meters, a hint for choosing scale. */
  footprint: number;
}

export interface HeroStageSet {
  kind: StageSetKind;
  group: Group;
  metersPerUnit: number;
  slots: Readonly<Record<string, StageSlot>>;
  /** The set's own extent, for framing when no items are placed. */
  bounds: HeroBounds;
  /** Height of the studio floor under the set (desk legs stand on it). */
  floorY: number;
  dispose(): void;
}

// ------------------------------------------------------------------ surfaces

const woodGrain = (ctx: CanvasRenderingContext2D, w: number, h: number, random: () => number) => {
  // Quarter-sawn walnut: warped growth bands, darker latewood, open pores.
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#4a2e1c"); base.addColorStop(.5, "#553621"); base.addColorStop(1, "#452a18");
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let band = 0; band < 70; band++) {
    const y0 = band / 70 * h, amp = 6 + random() * 18, freq = .002 + random() * .003, phase = random() * 9;
    ctx.strokeStyle = `rgba(${30 + random() * 20},${16 + random() * 10},${8},${.18 + random() * .25})`;
    ctx.lineWidth = 1 + random() * 3.5;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = y0 + amp * Math.sin(x * freq + phase) + 4 * Math.sin(x * freq * 5.3 + phase * 2);
      if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(20,10,5,${.15 + random() * .3})`;
    ctx.fillRect(random() * w, random() * h, 2 + random() * 6, .8);
  }
};

const pavers = (ctx: CanvasRenderingContext2D, w: number, h: number, random: () => number) => {
  ctx.fillStyle = "#5f5d58"; ctx.fillRect(0, 0, w, h);
  const n = 4, s = w / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const tone = 150 + random() * 30;
    ctx.fillStyle = `rgb(${tone},${tone - 3},${tone - 8})`;
    ctx.fillRect(i * s + 4, j * s + 4, s - 8, s - 8);
    for (let k = 0; k < 400; k++) {
      const g = tone - 40 + random() * 60;
      ctx.fillStyle = `rgba(${g},${g},${g - 4},.35)`;
      ctx.fillRect(i * s + 4 + random() * (s - 8), j * s + 4 + random() * (s - 8), 2, 2);
    }
  }
};

function worldUv(geometry: BufferGeometry, scale: number): BufferGeometry {
  geometry.computeVertexNormals();
  const p = geometry.attributes.position, n = geometry.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ay >= ax && ay >= az ? [p.getX(i), p.getZ(i)] : ax >= az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u * scale; uv[i * 2 + 1] = v * scale;
  }
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  return geometry;
}

function mesh(res: AssetResources, group: Group, geometry: BufferGeometry, material: Material, name: string, at?: Vec3) {
  const m = new Mesh(res.own(geometry), material);
  if (at) m.position.set(...at);
  m.castShadow = true; m.receiveShadow = true;
  group.add(res.name(m, name));
  return m;
}

// ------------------------------------------------------------------ sets

function desk(res: AssetResources, group: Group): Omit<HeroStageSet, "group" | "dispose" | "kind"> {
  // 1 unit = 5 cm: a 160 × 80 cm walnut desk, 75 cm high, with a stitched leather mat.
  const wood = paintWithRelief(2048, 1024, woodGrain, { seed: 3, strength: 1.4, repeat: true, fallback: [104, 66, 41, 255] });
  res.own(wood.map); res.own(wood.normalMap);
  wood.map.repeat.set(1, 1); wood.normalMap.repeat.set(1, 1);
  const walnut = res.own(new MeshPhysicalMaterial({ map: wood.map, normalMap: wood.normalMap, normalScale: new Vector2(.35, .35),
    roughness: .48, clearcoat: .35, clearcoatRoughness: .35 }));
  const top = new RoundedBoxGeometry(32, .8, 16, 4, .12);
  top.translate(0, -.4, 0);
  const uv = top.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (top.attributes.position.getX(i) + 16) / 32, (top.attributes.position.getZ(i) + 8) / 16);
  mesh(res, group, top, walnut, "desk-walnut-top");
  const steel = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#1d1f22", metalness: .85, roughness: .38 }), { kind: "brushed", flow: [0, 1, 0] }));
  for (const x of [-14.5, 14.5]) for (const z of [-6.5, 6.5]) mesh(res, group, new BoxGeometry(.9, 14.2, .9), steel, "desk-steel-leg", [x, -7.9, z]);
  for (const x of [-14.5, 14.5]) mesh(res, group, new BoxGeometry(.6, .6, 13), steel, "desk-leg-rail", [x, -12.5, 0]);
  const leather = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#2e2724", roughness: .62, sheen: .4, sheenColor: "#6b5a50" }),
    { kind: "hammered", frequency: 26, strength: .0012, roughnessVariation: .25 }));
  mesh(res, group, new RoundedBoxGeometry(17, .12, 9, 2, .05), leather, "desk-leather-mat", [-1.5, .06, 2.4]);
  // Saddle stitching around the mat edge.
  const thread = res.own(new MeshPhysicalMaterial({ color: "#b9a68a", roughness: .7 }));
  const stitch = res.own(new BoxGeometry(.22, .03, .05));
  const stitches: Matrix4[] = [];
  for (let x = -8.1; x <= 5.1; x += .42) for (const z of [-1.65, 6.45]) stitches.push(new Matrix4().makeTranslation(x, .125, z));
  for (let z = -1.4; z <= 6.2; z += .42) for (const x of [-9.65, 6.65]) stitches.push(new Matrix4().makeRotationY(Math.PI / 2).premultiply(new Matrix4().makeTranslation(x, .125, z)));
  const stitchMesh = new InstancedMesh(stitch, thread, stitches.length);
  stitches.forEach((m, i) => stitchMesh.setMatrixAt(i, m));
  group.add(res.name(stitchMesh, "desk-mat-stitching"));
  return {
    metersPerUnit: .05, floorY: -15.2,
    bounds: { min: [-16, -15.2, -8], max: [16, 6, 8] },
    slots: {
      // Clustered around the mat so a medium shot holds every prop.
      "mat-center": { position: [-1.5, .12, 2.6], yaw: 0, footprint: .2 },
      "mat-left": { position: [-4.2, .12, 3.4], yaw: .2, footprint: .1 },
      "mat-right": { position: [1.4, .12, 3.4], yaw: -.2, footprint: .1 },
      "desk-left": { position: [-4.6, 0, -.6], yaw: .3, footprint: .12 },
      "desk-right": { position: [2.4, 0, -.4], yaw: -.35, footprint: .15 },
      "desk-back": { position: [-1, 0, -3.4], yaw: 0, footprint: .2 },
    },
  };
}

function street(res: AssetResources, group: Group): Omit<HeroStageSet, "group" | "dispose" | "kind"> {
  // 1 unit = 1 m: paved sidewalk, granite curb, asphalt lane, lamp post.
  const paving = paintWithRelief(1024, 1024, pavers, { seed: 9, strength: 2.4, repeat: true, fallback: [150, 148, 142, 255] });
  res.own(paving.map); res.own(paving.normalMap);
  const pavement = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ map: paving.map, normalMap: paving.normalMap, roughness: .88 }),
    { kind: "stone", frequency: 6, strength: .002, albedoVariation: .12 }));
  mesh(res, group, worldUv(new BoxGeometry(30, .15, 7).translate(0, -.075, -.5), .5), pavement, "street-paved-sidewalk");
  const granite = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#8a8884", roughness: .7 }), { kind: "stone", frequency: 10, strength: .002, albedoVariation: .5 }));
  mesh(res, group, new RoundedBoxGeometry(30, .32, .3, 2, .03), granite, "street-granite-curb", [0, -.13, 3.15]);
  const asphalt = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#2a2b2d", roughness: .92 }), { kind: "stone", frequency: 18, strength: .003, albedoVariation: .35 }));
  mesh(res, group, new BoxGeometry(30, .1, 6).translate(0, -.24, 6.3), asphalt, "street-asphalt");
  const paint = res.own(new MeshPhysicalMaterial({ color: "#d8d2bf", roughness: .7 }));
  for (let x = -13; x <= 13; x += 4) mesh(res, group, new BoxGeometry(2, .012, .14), paint, "street-lane-dash", [x, -.185, 7.4]);
  const iron = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#1e2326", metalness: .7, roughness: .45 }), { kind: "cast-metal" }));
  mesh(res, group, new CylinderGeometry(.06, .09, 4.2, 16), iron, "street-lamp-post", [-6.5, 2.1, 2.6]);
  mesh(res, group, new CylinderGeometry(.16, .16, .3, 16), iron, "street-lamp-base", [-6.5, .15, 2.6]);
  const glow = res.own(new MeshPhysicalMaterial({ color: "#fff1d6", emissive: "#ffcf8a", emissiveIntensity: .8 }));
  mesh(res, group, new CylinderGeometry(.22, .14, .45, 16), glow, "street-lamp-globe", [-6.5, 4.4, 2.6]);
  return {
    metersPerUnit: 1, floorY: -.3,
    bounds: { min: [-15, -.3, -4], max: [15, 5, 9] },
    slots: {
      "frontage": { position: [0, 0, -1.2], yaw: 0, footprint: 7 },
      "sidewalk-left": { position: [-4, 0, 1.6], yaw: .3, footprint: 1.5 },
      "sidewalk-right": { position: [4, 0, 1.6], yaw: -.3, footprint: 1.5 },
      "sidewalk-center": { position: [0, 0, 1.8], yaw: 0, footprint: 1.5 },
    },
  };
}

function vault(res: AssetResources, group: Group): Omit<HeroStageSet, "group" | "dispose" | "kind"> {
  // 1 unit = 1 m: polished concrete floor, wall of safe-deposit boxes, steel pilasters.
  const concrete = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#45474a", roughness: .55, clearcoat: .12, clearcoatRoughness: .5, envMapIntensity: .6 }),
    { kind: "stone", frequency: 1.4, strength: .0005, roughnessVariation: .4, albedoVariation: .25 }));
  mesh(res, group, new BoxGeometry(12, .1, 7).translate(0, -.05, .5), concrete, "vault-polished-floor");
  const steel = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#a9adb1", metalness: 1, roughness: .32 }), { kind: "brushed", flow: [1, 0, 0] }));
  const frame = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#5d6166", metalness: 1, roughness: .4 }), { kind: "brushed", flow: [0, 1, 0] }));
  mesh(res, group, new BoxGeometry(12, 3.2, .3).translate(0, 1.6, -3.1), frame, "vault-wall-frame");
  // Box doors (instanced), each with two keyholes and a number plate.
  const cols = 22, rows = 9, bw = .5, bh = .3;
  const door = res.own(new RoundedBoxGeometry(bw - .03, bh - .03, .04, 2, .008));
  const doors = new InstancedMesh(door, steel, cols * rows);
  const keyhole = res.own(new CylinderGeometry(.018, .018, .02, 12).rotateX(Math.PI / 2));
  const brass = res.own(new MeshPhysicalMaterial({ color: "#c9a25a", metalness: 1, roughness: .3 }));
  const holes = new InstancedMesh(keyhole, brass, cols * rows * 2);
  const plate = res.own(new BoxGeometry(.08, .03, .006));
  const plates = new InstancedMesh(plate, brass, cols * rows);
  let k = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = -(cols - 1) * bw / 2 + c * bw, y = .35 + r * bh, i = r * cols + c;
    doors.setMatrixAt(i, new Matrix4().makeTranslation(x, y, -2.93));
    holes.setMatrixAt(k++, new Matrix4().makeTranslation(x - .07, y, -2.905));
    holes.setMatrixAt(k++, new Matrix4().makeTranslation(x + .07, y, -2.905));
    plates.setMatrixAt(i, new Matrix4().makeTranslation(x, y + .09, -2.906));
  }
  for (const m of [doors, holes, plates]) { m.castShadow = true; m.receiveShadow = true; }
  group.add(res.name(doors, "vault-deposit-box-doors"), res.name(holes, "vault-deposit-keyholes"), res.name(plates, "vault-deposit-number-plates"));
  for (const x of [-5.85, 5.85]) mesh(res, group, new BoxGeometry(.3, 3.2, .5), frame, "vault-steel-pilaster", [x, 1.6, -2.9]);
  return {
    metersPerUnit: 1, floorY: -.1,
    bounds: { min: [-6, -.1, -3.3], max: [6, 3.2, 4] },
    slots: {
      "center": { position: [0, 0, .4], yaw: 0, footprint: 1 },
      "left": { position: [-1.35, 0, .1], yaw: .35, footprint: .8 },
      "right": { position: [1.35, 0, .2], yaw: -.35, footprint: .8 },
      "front": { position: [0, 0, 1.6], yaw: 0, footprint: .6 },
    },
  };
}

export function createStageSet(kind: StageSetKind): HeroStageSet {
  const res = createAssetResources();
  const group = new Group();
  group.name = `stage-set-${kind}`;
  const built = kind === "desk" ? desk(res, group) : kind === "street" ? street(res, group) : vault(res, group);
  return { kind, group, ...built, dispose: res.dispose };
}

// ------------------------------------------------------------------ composition

export interface StageItem {
  /** Stable id used for parts ("<id>/<part>") and actions ("<id>/<action>"). */
  id: string;
  asset: HeroAsset;
  slot: string;
  /** "real" (default): true relative scale; a number multiplies the real scale. */
  scale?: "real" | number;
  /** Extra yaw on top of the slot's facing (radians). */
  yaw?: number;
  /** Offset from the slot in meters. */
  offset?: Vec3;
}

export interface HeroComposition extends HeroAsset {
  items: ReadonlyMap<string, HeroAsset>;
  set?: HeroStageSet;
  /** Pose several items at once (keys are item ids). */
  poseItems(states: Readonly<Record<string, HeroActionState>>): void;
}

/** Place assets on a stage set at true scale. Framing covers the items (plus margin), not the whole set. */
export function composeHeroScene(set: HeroStageSet | null, items: readonly StageItem[],
  options: { id?: string; metersPerUnit?: number; frame?: "items" | "set" } = {}): HeroComposition {
  const group = new Group();
  group.name = options.id ?? `composition-${set?.kind ?? "free"}`;
  const unit = set?.metersPerUnit ?? options.metersPerUnit ?? 1;
  if (set) group.add(set.group);
  const parts = new Map<string, Object3D>();
  const map = new Map<string, HeroAsset>();
  const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const item of items) {
    if (map.has(item.id)) throw new Error(`Duplicate stage item id "${item.id}".`);
    const slot = set?.slots[item.slot] ?? (set ? undefined : { position: [0, 0, 0] as Vec3, yaw: 0, footprint: 1 });
    if (!slot) throw new Error(`Stage set "${set?.kind}" has no slot "${item.slot}". Slots: ${Object.keys(set?.slots ?? {}).join(", ")}.`);
    const real = item.asset.metersPerUnit / unit;
    const scale = item.scale === undefined || item.scale === "real" ? real : real * item.scale;
    const holder = new Group();
    holder.name = `item-${item.id}`;
    holder.scale.setScalar(scale);
    holder.rotation.y = slot.yaw + (item.yaw ?? 0);
    const off = item.offset ?? [0, 0, 0];
    holder.position.set(slot.position[0] + off[0] / unit, slot.position[1] + off[1] / unit, slot.position[2] + off[2] / unit);
    holder.add(item.asset.group);
    group.add(holder);
    map.set(item.id, item.asset);
    for (const [name, object] of item.asset.parts) parts.set(`${item.id}/${name}`, object);
    // Transform the item's authored bounds into composition space.
    holder.updateMatrix();
    const { min: a, max: b } = item.asset.bounds;
    for (let c = 0; c < 8; c++) {
      const v = new Vector3(c & 1 ? b[0] : a[0], c & 2 ? b[1] : a[1], c & 4 ? b[2] : a[2]).applyMatrix4(holder.matrix);
      min.min(v); max.max(v);
    }
  }
  if (!items.length || options.frame === "set") {
    if (!set) throw new Error("An empty composition needs a stage set.");
    min.fromArray(set.bounds.min); max.fromArray(set.bounds.max);
  } else {
    // A 12% margin keeps a little surface visible around the items.
    const pad = max.clone().sub(min).multiplyScalar(.12);
    min.sub(new Vector3(pad.x, 0, pad.z)); max.add(new Vector3(pad.x, pad.y * .5, pad.z));
  }
  const actions: HeroActionSpec[] = [];
  for (const [id, asset] of map) for (const a of asset.actions ?? []) actions.push({ ...a, id: `${id}/${a.id}`, label: `${id}: ${a.label}` });
  const poseItems = (states: Readonly<Record<string, HeroActionState>>) => {
    for (const [id, asset] of map) asset.pose?.(states[id] ?? { id: null, frame: 0 });
  };
  const floor = set ? Math.min(set.floorY, min.y) : min.y;
  return {
    id: group.name, group, parts, tier: "hero", items: map, set: set ?? undefined,
    bounds: { min: [min.x, Math.max(floor, min.y - 1e-3), min.z], max: [max.x, max.y, max.z] },
    metersPerUnit: unit,
    studio: { palette: set?.kind === "street" ? "slate" : "graphite", floorY: set?.floorY, extent: set?.bounds },
    exposure: Math.min(...[...map.values()].map(a => a.exposure ?? 1), 1),
    craft: {
      materials: [...new Set([...map.values()].flatMap(a => a.craft.materials))],
      details: [`${set ? set.kind + " set, " : ""}true relative scale (${unit} m per unit)`],
    },
    actions,
    pose(state) {
      if (!state.id) { poseItems({}); return; }
      const [itemId, actionId] = state.id.split("/");
      poseItems({ [itemId]: { ...state, id: actionId } });
    },
    poseItems,
    dispose() { for (const asset of map.values()) asset.dispose(); set?.dispose(); },
  };
}
