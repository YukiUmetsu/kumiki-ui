/** Small, asset-free architectural details for the Network Journey reference meshes.
 *  Meaningful construction features, not random decoration. All allocations are
 *  created once per scene and are owned by the caller's resource registry.
 */
import { BufferGeometry, CylinderGeometry, Group, Mesh, SphereGeometry, TorusGeometry } from "three";
import type { Material } from "three";

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
  // An inset display and multiple machined edge layers communicate thickness.
  plate(root, tools, [2.69, 5.42, .046], [0, 0, .167], tools.inset, .20);
  plate(root, tools, [2.48, 5.16, .025], [0, 0, .227], tools.glass, .17);
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

  // Screen chrome and purposeful app details, separate from animated message bubble.
  plate(root, tools, [2.26, .012, .012], [0, 1.67, .283], tools.metal, .005);
  plate(root, tools, [1.25, .09, .012], [-.37, 1.94, .285], tools.pale, .035);
  plate(root, tools, [.55, .09, .012], [-.72, 1.72, .285], tools.teal, .035);
  for (let i = 0; i < 3; i++) plate(root, tools, [1.78 - i * .23, .062, .014], [-.12, -.98 - i * .29, .291], tools.metal, .019);
  plate(root, tools, [1.9, .28, .015], [-.20, -2.04, .292], tools.inset, .10);
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
  // Antenna collars and articulated whip sections on the rear corners.
  for (const sign of [-1, 1]) {
    cylinder(root, tools, .14, .16, [sign * .79, .40, -.52], tools.metal);
    const antenna = cylinder(root, tools, .055, 1.55, [sign * .95, 1.15, -.53], tools.dark, 12);
    antenna.rotation.z = sign * -.18;
    cylinder(root, tools, .078, .10, [sign * 1.12, 1.87, -.53], tools.rubber, 12);
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

/** Hero packet detail: crisp metal rim, inset luminous envelope, and readable glow core. */
export function addHeroPacketConstruction(root: Group, tools: JourneyDetailTools) {
  plate(root, tools, [.33, .25, .42], [0, 0, 0], tools.metal, .055);
  plate(root, tools, [.29, .21, .43], [0, .012, .012], tools.warm, .039);
  for (const x of [-.12, .12]) {
    plate(root, tools, [.024, .12, .028], [x, .03, .24], tools.inset, .008);
  }
  const core = new Mesh(tools.geometry(new SphereGeometry(.068, 12, 8)), tools.pale);
  core.position.set(0, 0, .26);
  root.add(core);
  const ring = new Mesh(tools.geometry(new TorusGeometry(.145, .015, 6, 24)), tools.teal);
  ring.position.z = .245;
  root.add(ring);
}
