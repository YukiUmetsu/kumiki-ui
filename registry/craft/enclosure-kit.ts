/** A production-oriented procedural enclosure: real layered construction,
 * physical port wells/contacts, fasteners, vents, controls, and rubber feet.
 * Geometry is reusable, materials are externalized, details are functional.
 */
import { BufferGeometry, CylinderGeometry, ExtrudeGeometry, Group, Mesh, Object3D, Path, Shape } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { MeshPhysicalMaterial } from "three";
import type { SemanticAsset, SemanticAttachment } from "../visual/semantic-scene";
import { createCraftMaterialKit } from "./material-kit";
import type { CraftMaterialKit, CraftSurface } from "./material-kit";

export interface CraftedEnclosureOptions {
  id?: string;
  width?: number;
  height?: number;
  depth?: number;
  ports?: number;
  quality?: "hero" | "supporting";
  /** Keep this kit alive while the object is mounted; caller owns disposal. */
  materials?: CraftMaterialKit;
  /** Optional palette when the kit is internally created. */
  housingColor?: string;
  accentColor?: string;
}

export function createCraftedEnclosure(options: CraftedEnclosureOptions = {}) {
  const id = options.id ?? "control-unit";
  const width = options.width ?? 3.4, height = options.height ?? .72, depth = options.depth ?? 2.3;
  const portCount = options.ports ?? 4, quality = options.quality ?? "hero";
  if (!id.trim() || id.includes(".") || ![width, height, depth].every(value => Number.isFinite(value) && value > 0) ||
    width < 2 || height < .5 || depth < 1.5 || !Number.isSafeInteger(portCount) || portCount < 0 || portCount > 6)
    throw new Error("Crafted enclosure needs an ID without dots, dimensions >= 2×0.5×1.5 and 0–6 ports.");
  const ownKit = !options.materials;
  const kit = options.materials ?? createCraftMaterialKit({ overrides: {
    "molded-polymer": options.housingColor ? { color: options.housingColor } : {},
    "indicator": options.accentColor ? { color: options.accentColor, emissive: options.accentColor } : {},
  } });
  const group = new Group();
  group.name = id;
  const parts = new Map<string, Object3D>();
  const geometries = new Map<string, BufferGeometry>();
  const materials: Record<CraftSurface, MeshPhysicalMaterial> = kit.materials;
  const attachments: SemanticAttachment[] = [];
  const getGeometry = (key: string, make: () => BufferGeometry) => {
    if (!geometries.has(key)) geometries.set(key, make());
    return geometries.get(key)!;
  };
  const box = (name: string, dimensions: [number, number, number], position: [number, number, number],
    surface: CraftSurface, radius = .025, parent: Group = group) => {
    const [w, h, d] = dimensions;
    const bevel = Math.max(.001, Math.min(radius, w * .48, h * .48, d * .48));
    const key = "round:" + [w, h, d, bevel].map(n => n.toFixed(5)).join("/");
    const geometry = getGeometry(key, () => new RoundedBoxGeometry(w, h, d, quality === "hero" ? 4 : 2, bevel));
    const mesh = new Mesh(geometry, materials[surface]);
    mesh.name = name; mesh.position.set(...position);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); parts.set(name, mesh);
    return mesh;
  };
  const cylinder = (name: string, radius: number, depthSize: number, position: [number, number, number],
    surface: CraftSurface, axis: "y" | "z" = "z") => {
    const key = "cylinder:" + [radius, depthSize, quality === "hero" ? 28 : 12].join("/");
    const geometry = getGeometry(key, () => new CylinderGeometry(radius, radius, depthSize, quality === "hero" ? 28 : 12));
    const mesh = new Mesh(geometry, materials[surface]);
    mesh.name = name;
    mesh.position.set(...position);
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh); parts.set(name, mesh);
    return mesh;
  };

  // Hollow-face chassis: the body stops behind the faceplates, leaving
  // actual negative depth for socket cavities rather than front-stacked cubes.
  box("chassis", [width, height * .87, depth * .84], [0, -.035, 0], "molded-polymer", .13);
  box("lid-gasket", [width * .978, .038, depth * .98], [0, height * .405, 0], "elastomer", .017);
  box("lid", [width * .987, .065, depth * .985], [0, height * .45, 0], "anodized-metal", .045);
  box("top-inset", [width * .78, .019, depth * .62], [0, height * .504, -.11], "painted-metal", .018);

  // Machined ventilation bank: shallow dark grooves in an inset top panel,
  // followed by cross fins of exposed metal. Functional, not random ornament.
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
    const x = side * (width * .20 + i * width * .033);
    box("vent-" + side + "-" + i, [width * .015, .008, depth * .38],
      [x, height * .516, -.10], "soft-touch", .003);
    if (quality === "hero")
      box("vent-lip-" + side + "-" + i, [width * .003, .012, depth * .38],
        [x + width * .01, height * .523, -.10], "brushed-metal", .002);
  }

  // Real top fasteners including screw slots and recessed collars.
  for (const [index, x, z] of [
    [0, -width * .445, -depth * .42], [1, width * .445, -depth * .42],
    [2, -width * .445, depth * .42], [3, width * .445, depth * .42],
  ] as const) {
    cylinder("screw-" + index, .049, .012, [x, height * .498, z], "brushed-metal", "y");
    if (quality === "hero")
      box("screw-slot-" + index, [.055, .005, .008], [x, height * .505, z], "soft-touch", .002);
  }

  // Cut true apertures through an extruded metal faceplate. The cavity
  // backing lies behind the aperture, and the contacts stay *inside* it.
  // Four-part rails cannot visually fake this at grazing camera angles.
  const interval = width * .13;
  const first = -(portCount - 1) * interval / 2 - (portCount <= 4 ? width * .12 : 0);
  const controlX = width * .44;
  type Opening = { x: number; y: number; width: number; height: number };
  const rectangle = (path: Shape | Path, cx: number, cy: number, w: number, h: number, clockwise = false) => {
    const left = cx - w / 2, right = cx + w / 2, bottom = cy - h / 2, top = cy + h / 2;
    if (clockwise) {
      path.moveTo(left, bottom); path.lineTo(left, top); path.lineTo(right, top);
      path.lineTo(right, bottom); path.lineTo(left, bottom);
    } else {
      path.moveTo(left, bottom); path.lineTo(right, bottom); path.lineTo(right, top);
      path.lineTo(left, top); path.lineTo(left, bottom);
    }
  };
  const fascia = (name: string, openings: readonly Opening[], rear = false) => {
    const shape = new Shape();
    rectangle(shape, 0, 0, width * .97, height * .68);
    for (const opening of openings) {
      const hole = new Path();
      rectangle(hole, opening.x, opening.y, opening.width, opening.height, true);
      shape.holes.push(hole);
    }
    const geometry = getGeometry("facade:" + name, () => new ExtrudeGeometry(shape, {
      depth: depth * .03, bevelEnabled: false, curveSegments: 4,
    }));
    const mesh = new Mesh(geometry, materials["painted-metal"]);
    mesh.name = name; mesh.position.z = rear ? -depth * .47 : depth * .47;
    if (rear) mesh.rotation.y = Math.PI;
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh); parts.set(name, mesh);
  };
  fascia("front-fascia", Array.from({ length: portCount }, (_, i) => ({
    x: first + i * interval, y: -.08, width: interval * .69, height: height * .225,
  })));
  // Rear-facing panel uses local -X because its +Z extrusion rotates toward -Z.
  fascia("rear-fascia", [{ x: -width * .34, y: -.08, width: .235, height: .178 }], true);

  for (let i = 0; i < portCount; i++) {
    const x = first + i * interval;
    const cavityZ = depth * .435, tongueZ = depth * .458;
    // Only the perimeter exists at the face, leaving an actual open well.
    const innerW = interval * .69, innerH = height * .225, lip = Math.min(.023, height * .035);
    box("port-" + i + "-frame-top", [innerW + lip, lip, depth * .014],
      [x, -.08 + innerH / 2, depth * .505], "brushed-metal", .005);
    box("port-" + i + "-frame-bottom", [innerW + lip, lip, depth * .014],
      [x, -.08 - innerH / 2, depth * .505], "brushed-metal", .005);
    for (const sign of [-1, 1]) box("port-" + i + "-frame-side-" + sign,
      [lip, innerH, depth * .014], [x + sign * innerW / 2, -.08, depth * .505],
      "brushed-metal", .005);
    box("port-" + i + "-well", [innerW * .96, innerH * .96, depth * .013],
      [x, -.08, cavityZ], "soft-touch", .008);
    box("port-" + i + "-tongue", [innerW * .78, height * .045, depth * .018],
      [x, -.12, tongueZ], "molded-polymer", .005);
    if (quality === "hero") for (let contact = 0; contact < 8; contact++) {
      box("port-" + i + "-contact-" + contact, [interval * .035, .012, .008],
        [x + (contact - 3.5) * interval * .067, -.100, tongueZ + depth * .009],
        "brushed-metal", .002);
    }
    cylinder("port-" + i + "-activity", .018, .012,
      [x + interval * .26, height * .185, depth * .515], "indicator");
    attachments.push({ id: "lan-" + (i + 1), medium: "ethernet",
      direction: "bidirectional", localPosition: [x, -.08, depth * .50], localNormal: [0, 0, 1] });
  }

  // Front controls are mounted on the unperforated part of the fascia.
  cylinder("power-bezel", .092, .027, [controlX, -.07, depth * .52], "brushed-metal");
  cylinder("power-button", .065, .035, [controlX, -.07, depth * .535], "painted-metal");
  cylinder("power-status", .020, .014, [controlX, height * .17, depth * .522], "indicator");
  box("mode-switch", [.21, .075, .055], [-width * .44, height * .14, depth * .522], "anodized-metal", .016);

  // Rear power cavity is cut out of the rear faceplate, with a dark back wall
  // and an internal pin. Nothing protrudes beyond the outer opening plane.
  const powerX = width * .34;
  box("dc-socket-well", [.216, .158, depth * .013], [powerX, -.08, -depth * .435], "soft-touch", .016);
  cylinder("dc-socket-pin", .024, depth * .020, [powerX, -.08, -depth * .453],
    "brushed-metal");
  attachments.push({ id: "power", medium: "power", direction: "input",
    localPosition: [powerX, -.08, -depth * .50], localNormal: [0, 0, -1] });

  // Four rubber feet ground the product and convey its actual thickness.
  for (const x of [-width * .39, width * .39])
    for (const z of [-depth * .37, depth * .37])
      box("foot-" + (x > 0 ? "r" : "l") + (z > 0 ? "f" : "b"),
        [width * .14, height * .12, depth * .15],
        [x, -height * .50, z], "elastomer", .035);

  const asset: SemanticAsset = {
    id,
    worldMatrixAt: () => { group.updateWorldMatrix(true, false); return group.matrixWorld.toArray(); },
    fidelity: quality === "hero" ? "hero" : "supporting",
    materialIds: ["molded-polymer", "anodized-metal", "painted-metal", "brushed-metal", "soft-touch", "elastomer", "indicator"],
    components: [...parts.keys()].map(name => ({ id: name, purpose: name.startsWith("port-") ? "physical connection" :
      name.startsWith("vent-") ? "airflow" : name.startsWith("screw-") ? "assembly fastener" :
        name.startsWith("foot-") ? "mechanical support" : "enclosure construction" })),
    attachments,
  };

  return {
    group, parts, attachments, asset, materials: kit,
    getPart(name: string) { return parts.get(name); },
    dispose() {
      for (const geometry of geometries.values()) geometry.dispose();
      geometries.clear(); group.clear();
      if (ownKit) kit.dispose();
    },
  };
}
export type CraftedEnclosure = ReturnType<typeof createCraftedEnclosure>;
