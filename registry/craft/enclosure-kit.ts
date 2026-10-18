/** A production-oriented procedural enclosure: real layered construction,
 * physical port wells/contacts, fasteners, vents, controls, and rubber feet.
 * Geometry is reusable, materials are externalized, details are functional.
 */
import { BufferGeometry, CylinderGeometry, Group, Mesh, Object3D } from "three";
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
  if (!id.trim() || ![width, height, depth].every(value => Number.isFinite(value) && value > 0) ||
    width < 2 || height < .5 || depth < 1.5 || !Number.isSafeInteger(portCount) || portCount < 0 || portCount > 6)
    throw new Error("Crafted enclosure needs an ID, dimensions >= 2×0.5×1.5 and 0–6 ports.");
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

  // Chassis and machined lid are two physical shells with a deliberate gasket
  // gap. Avoid coplanar slabs and the z-fighting they introduce.
  box("chassis", [width, height * .87, depth], [0, -.035, 0], "molded-polymer", .13);
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

  // Front machining: bezel, port cavities, internal contact fingers and
  // actual link LEDs. Inset depths keep contact pins behind the shell face.
  box("front-rail", [width * .97, height * .53, .038], [0, -.07, depth * .497],
    "painted-metal", .035);
  const interval = width * .13, first = -(portCount - 1) * interval / 2 - width * .13;
  for (let i = 0; i < portCount; i++) {
    const x = first + i * interval, z = depth * .51;
    box("port-" + i + "-frame", [interval * .83, height * .30, .042],
      [x, -.08, z], "brushed-metal", .028);
    box("port-" + i + "-recess", [interval * .64, height * .21, .044],
      [x, -.08, z + .029], "soft-touch", .012);
    box("port-" + i + "-tongue", [interval * .53, height * .045, .018],
      [x, -.12, z + .058], "molded-polymer", .005);
    if (quality === "hero") for (let contact = 0; contact < 8; contact++) {
      box("port-" + i + "-contact-" + contact, [interval * .035, .012, .008],
        [x + (contact - 3.5) * interval * .067, -.100, z + .055], "brushed-metal", .002);
    }
    cylinder("port-" + i + "-activity", .018, .012,
      [x + interval * .26, height * .185, z + .025], "indicator");
    attachments.push({ id: "lan-" + (i + 1), medium: "ethernet",
      direction: "bidirectional", localPosition: [x, -.08, depth * .50], localNormal: [0, 0, 1] });
  }

  // Purposeful front status controls, separate from networking connectors.
  const controlX = width * .38;
  cylinder("power-bezel", .092, .027, [controlX, -.07, depth * .531], "brushed-metal");
  cylinder("power-button", .065, .035, [controlX, -.07, depth * .553], "painted-metal");
  cylinder("power-status", .020, .014, [controlX, height * .17, depth * .53], "indicator");
  box("mode-switch", [.21, .075, .055], [-width * .40, height * .14, depth * .529], "anodized-metal", .016);
  attachments.push({ id: "power", medium: "power", direction: "input",
    localPosition: [width * .34, -.08, -depth * .50], localNormal: [0, 0, -1] });
  box("dc-socket-rim", [.32, .25, .045], [width * .34, -.08, -depth * .508], "anodized-metal", .030);
  box("dc-socket-well", [.22, .16, .050], [width * .34, -.08, -depth * .536], "soft-touch", .022);

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
