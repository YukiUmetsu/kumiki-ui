/** Small, asset-free architectural details for the Network Journey reference meshes.
 *  Meaningful construction features, not random decoration. All allocations are
 *  created once per scene and are owned by the caller's resource registry.
 */
import { BufferGeometry, CylinderGeometry, Group, Mesh } from "three";
import type { Material } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

type Vec3 = [number, number, number];
export interface JourneyDetailTools {
  round(parent: Group, size: Vec3, position: Vec3, surface: Material, radius?: number): Mesh;
  geometry<T extends BufferGeometry>(value: T): T;
  metal: Material;
  inset: Material;
  dark: Material;
  rubber: Material;
  pale: Material;
  warm: Material;
  teal: Material;
  glass: Material;
}

function plate(parent: Group, tools: JourneyDetailTools, size: Vec3, position: Vec3, surface: Material, radius = .025) {
  return tools.round(parent, size, position, surface, radius);
}

function cylinder(parent: Group, tools: JourneyDetailTools, radius: number, height: number, position: Vec3, surface: Material, segments = 16) {
  const mesh = new Mesh(tools.geometry(new CylinderGeometry(radius, radius, height, segments)), surface);
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Four visually differentiated surfaces: frame, physical buttons, glass, camera optical stack. */
export function addPhoneConstruction(root: Group, tools: JourneyDetailTools) {
  // Screen pixels are owned by journey-phone-screen.ts. No extra coplanar
  // glass slabs over the display: those previously caused depth flicker.
  plate(root, tools, [2.72, .025, .035], [0, -2.48, .045], tools.metal, .011);
  plate(root, tools, [2.72, .025, .035], [0, 2.48, .045], tools.metal, .011);
  // Actual tactile side controls, antenna isolation breaks and connector inset.
  plate(root, tools, [.082, .66, .14], [1.385, .62, 0], tools.metal);
  plate(root, tools, [.082, .48, .13], [-1.385, .85, 0], tools.metal);
  plate(root, tools, [.082, .48, .13], [-1.385, .23, 0], tools.metal);
  for (const side of [-1, 1]) {
    for (const y of [-1.88, 1.88]) plate(root, tools, [.09, .055, .27], [side * 1.36, y, .005], tools.rubber);
  }
  plate(root, tools, [.72, .08, .07], [0, -2.735, 0], tools.dark);
  // Earpiece grille with individual perforations and a front-facing sensor.
  plate(root, tools, [.83, .105, .023], [-.08, 2.35, .26], tools.inset, .045);
  for (let i = 0; i < 12; i++) plate(root, tools, [.028, .044, .009], [-.45 + i * .065, 2.35, .276], tools.dark, .009);
  const sensor = cylinder(root, tools, .055, .026, [.54, 2.35, .272], tools.dark);
  sensor.rotation.x = Math.PI / 2;

  // Real layered rear camera island: raised housing, optical bezel, lens and glint.
  plate(root, tools, [1.06, 1.53, .10], [-.72, 1.75, -.21], tools.metal, .20);
  for (const [x, y] of [[-.93, 2.14], [-.56, 1.75], [-.93, 1.37]]) {
    const bezel = cylinder(root, tools, .205, .075, [x, y, -.29], tools.metal, 32);
    bezel.rotation.x = Math.PI / 2;
    const optic = cylinder(root, tools, .152, .08, [x, y, -.345], tools.dark, 32);
    optic.rotation.x = Math.PI / 2;
    const lens = cylinder(root, tools, .093, .007, [x, y, -.392], tools.glass, 32);
    lens.rotation.x = Math.PI / 2;
    const reflection = cylinder(root, tools, .023, .009, [x - .033, y + .032, -.401], tools.teal, 16);
    reflection.rotation.x = Math.PI / 2;
  }

  // Messaging UI, text, status bar, bubbles and composer render on one mapped
  // display plane. Keep physical optical/speaker components here only.
}

/** Router front panel, ports, ventilation, status and antennas with real parallax. */
export function addRouterConstruction(root: Group, tools: JourneyDetailTools) {
  plate(root, tools, [1.94, .055, 1.31], [0, .395, 0], tools.inset, .028);
  plate(root, tools, [1.85, .03, .12], [0, .439, -.48], tools.metal, .014);
  // The vent banks sit above the enclosure; slots are slender dark recessed bars.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      plate(root, tools, [.035, .018, .77], [side * (.25 + i * .073), .437, -.07], tools.dark, .008);
    }
  }
  // RJ45-shaped sockets, internal contacts and link indicators.
  for (let port = 0; port < 4; port++) {
    const x = -.67 + port * .45;
    plate(root, tools, [.40, .27, .055], [x, -.05, .77], tools.metal, .025);
    plate(root, tools, [.30, .17, .057], [x, -.044, .805], tools.dark, .018);
    for (let pin = 0; pin < 5; pin++) {
      plate(root, tools, [.019, .045, .009], [x - .105 + pin * .052, .001, .839], tools.warm, .005);
    }
    const status = cylinder(root, tools, .035, .025, [x, .22, .775], port % 2 ? tools.teal : tools.warm, 12);
    status.rotation.x = Math.PI / 2;
  }
  // A wired enterprise gateway has no arbitrary Wi-Fi antennas. Model the
  // rear DC input and security lock instead; RJ45 sockets face the front.
  plate(root, tools, [.23, .18, .065], [.63, -.06, -.77], tools.dark, .03);
  plate(root, tools, [.09, .09, .069], [.63, -.06, -.817], tools.metal, .012);
  plate(root, tools, [.21, .06, .06], [-.72, -.08, -.79], tools.rubber, .015);
  // Separate PWR/SYS/status holes rather than decorative illuminated cubes.
  for (let i = 0; i < 3; i++) {
    plate(root, tools, [.065, .05, .016], [-.71 + i * .13, .245, .773], i === 2 ? tools.warm : tools.teal, .018);
  }
  for (const x of [-.89, .89]) for (const z of [-.52, .52]) {
    const head = cylinder(root, tools, .055, .014, [x, .460, z], tools.metal, 12);
    head.rotation.z = Math.PI / 2;
    plate(root, tools, [.071, .004, .012], [x, .472, z], tools.inset, .002);
  }
  // Physically separate rubber feet and a recessed asset/model plate.
  for (const x of [-.75, .75]) for (const z of [-.50, .50]) {
    plate(root, tools, [.24, .10, .22], [x, -.41, z], tools.rubber, .04);
  }
  plate(root, tools, [1.12, .018, .22], [0, .445, .51], tools.metal, .016);
}

/** Three functional service layers, expressed as a detailed but conceptual equipment stack. */
export function addServerLayerConstruction(root: Group, tools: JourneyDetailTools, role: "receive" | "process" | "deliver") {
  plate(root, tools, [3.30, .54, .060], [0, 0, 1.246], tools.inset, .045);
  for (const x of [-1.41, 1.41]) {
    plate(root, tools, [.12, .36, .13], [x, 0, 1.33], tools.metal, .032);
    for (const y of [-.12, .12]) {
      const screw = cylinder(root, tools, .033, .025, [x, y, 1.412], tools.dark, 12);
      screw.rotation.x = Math.PI / 2;
    }
  }
  // Recessed vent rows and solid panel breaks give each module a scale cue.
  for (let row = 0; row < 3; row++) {
    for (let n = 0; n < 12; n++) plate(root, tools, [.087, .039, .028], [-1.11 + n * .12, -.13 + row * .12, 1.293], tools.dark, .012);
  }
  plate(root, tools, [.70, .35, .08], [.80, .015, 1.316], tools.metal, .044);
  for (let led = 0; led < 3; led++) {
    const bead = cylinder(root, tools, .058, .025, [.62 + led * .18, .065, 1.367], led === 2 && role === "deliver" ? tools.warm : tools.teal, 12);
    bead.rotation.x = Math.PI / 2;
  }
  // Distinct rear I/O plane, inspired by rack servers (e.g. Dell R350):
  // service NICs and power in rear, accessible drive/service panel in front.
  plate(root, tools, [3.22, .47, .07], [0, 0, -1.255], tools.dark, .03);
  for (let nic = 0; nic < 2; nic++) {
    const x = -.91 + nic * .40;
    plate(root, tools, [.33, .25, .085], [x, -.025, -1.307], tools.metal, .019);
    plate(root, tools, [.235, .16, .090], [x, -.012, -1.361], tools.inset, .013);
    for (let pin = 0; pin < 6; pin++) {
      plate(root, tools, [.018, .025, .01], [x - .079 + pin * .032, .035, -1.417], tools.warm, .003);
    }
    plate(root, tools, [.038, .027, .013], [x + .12, .120, -1.351], tools.teal, .009);
  }
  for (const x of [.35, .94]) {
    plate(root, tools, [.45, .32, .06], [x, -.010, -1.298], tools.metal, .035);
    plate(root, tools, [.32, .20, .065], [x, -.010, -1.349], tools.inset, .020);
    for (let i = 0; i < 3; i++) {
      plate(root, tools, [.055, .025, .014], [x - .093 + i * .092, .04, -1.391], tools.dark, .004);
    }
  }

  // Logical identity marks: different port and bus geometry for each layer.
  if (role === "receive") {
    for (let i = 0; i < 3; i++) plate(root, tools, [.24, .17, .07], [-.97 + i * .38, -.015, 1.352], tools.inset, .02);
  } else if (role === "process") {
    plate(root, tools, [.75, .22, .10], [-.75, .01, 1.357], tools.dark, .029);
    for (let i = 0; i < 6; i++) plate(root, tools, [.055, .26, .038], [-1.09 + i * .135, .03, 1.418], tools.warm, .009);
  } else {
    for (let i = 0; i < 4; i++) plate(root, tools, [.16, .12, .08], [-.94 + i * .25, .01, 1.351], tools.teal, .022);
  }
}

/** A packet is data, not a flying metal shipping crate. Its hero glyph is a
 * layered data tile: a small routing header and larger encrypted payload.
 * This is an editorial metaphor, not the byte layout of an actual IP packet.
 */
export function addHeroPacketConstruction(root: Group, tools: JourneyDetailTools) {
  plate(root, tools, [.72, .105, .48], [0, 0, 0], tools.metal, .045);
  plate(root, tools, [.17, .126, .43], [-.245, .01, .01], tools.teal, .027);
  plate(root, tools, [.45, .13, .43], [.115, .014, .01], tools.warm, .035);
  // Narrow dividing seam makes the two semantic parts immediately legible.
  plate(root, tools, [.018, .151, .43], [-.137, .016, .01], tools.inset, .006);
  for (let i = 0; i < 3; i++) {
    plate(root, tools, [.045, .012, .11], [-.29 + i * .068, .086, .08], tools.pale, .006);
  }
  for (let i = 0; i < 4; i++) {
    plate(root, tools, [.056, .012, .22], [-.035 + i * .100, .087, .01], tools.pale, .006);
  }
  plate(root, tools, [.62, .018, .028], [0, -.052, .245], tools.rubber, .008);
}

/**
 * Merge adjacent *static* detail meshes by material. Local transforms are baked
 * into geometry once, so the parent device/assembly part can still animate as
 * one semantic object. Fallback leaves a group untouched if attributes differ.
 * All original and merged geometries belong to the world's disposal registry.
 */
export function consolidateDeviceDetails(root: Group, tools: JourneyDetailTools): void {
  const groups = new Map<Material, Mesh[]>();
  for (const child of root.children) {
    if (!(child instanceof Mesh) || Array.isArray(child.material)) continue;
    const material = child.material as Material;
    const list = groups.get(material) ?? [];
    list.push(child);
    groups.set(material, list);
  }
  for (const [material, meshes] of groups) {
    if (meshes.length < 2) continue;
    const baked = meshes.map(mesh => {
      mesh.updateMatrix();
      return mesh.geometry.clone().applyMatrix4(mesh.matrix);
    });
    const merged = mergeGeometries(baked, false);
    baked.forEach(geometry => geometry.dispose());
    if (!merged) continue;
    meshes.forEach(mesh => root.remove(mesh));
    const combined = new Mesh(tools.geometry(merged), material);
    combined.castShadow = true;
    combined.receiveShadow = true;
    root.add(combined);
  }
}
