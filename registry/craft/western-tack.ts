/** Western tack fitted to the stock horse (`horse-3d`): saddle, pad, cinch, breast collar, lariat, bridle and bit;
 * and the rider's cattleman hat (`createCowboyHat`).
 *
 * Every strap and panel that lies on the horse is a thin shell of the horse's own signed-distance body,
 * offset outward and cut by a band or an outline, so leather follows the barrel, chest and face exactly
 * instead of floating or clipping. Construction after western saddle anatomy (tree, swell/fork, horn,
 * seat, cantle, skirts, fenders, stirrups, rigging dees, latigo, cinch, breast collar) and a headstall
 * with browband, cheekpieces, throatlatch and a curb bit.
 *
 * Output groups are named for the bone they ride (`tack@trunk`, `tack@head`), and empty sockets mark where
 * a rider and reins attach: `socket-seat`, `socket-stirrup-near|far` (the tread top, +X toes forward),
 * `socket-bit-near|far` (the bit rings) and `socket-horn`. `attachTack` re-parents the groups onto a
 * loaded horse's bones, so the same tack works on the code asset and on its baked GLB.
 *
 * Coordinates: the horse's rest frame (metres, +X forward, +Y up, −Z the near/left side, +Z the off/right side).
 */
import { Group, MeshPhysicalMaterial, MeshStandardMaterial, Mesh, Object3D } from "three";
import type { BufferGeometry, Material } from "three";
import { createAssetResources } from "./hero-asset";
import {
  chain, clamp01, ellipsoid, fbm3, intersect, linearRgb, loftY, meshSdf, mirrorX, mirrorZ, mix, roundBox, roundCone, sculptGeometry, smoothstep,
  smoothSubtract, smoothUnion, union,
} from "./sdf-sculpt";
import type { Sdf, SculptShading, Vec3 } from "./sdf-sculpt";
import { applySurfaceDetail } from "./surface-detail";
import { HORSE_SADDLE_AREA, horseSdf } from "./horse-3d";

export interface WesternTackOptions {
  /** Leather colour (sRGB): saddle tan by default. */
  leather?: string;
  /** Pad stripes (sRGB), front to back. */
  padStripes?: readonly string[];
  /** Mesh cell size (m). */
  cellSize?: number;
  /** Stirrup tread height above the ground (m); set from the rider's leg length. Default 0.95: a 1.8 m rider (thigh and
   * calf 0.4 m each) needs this much knee bend for the leg to lie outside a stock horse's barrel, skirts and fender. */
  stirrupHeight?: number;
  lariat?: boolean;
}

export interface WesternTack {
  group: Group;
  /** Socket name → object (rest pose, horse frame). */
  sockets: ReadonlyMap<string, Object3D>;
  dispose(): void;
}

/** Shell of a surface: the band between offsets `inner` and `outer` (m) outside it. */
const shell = (body: Sdf, inner: number, outer: number): Sdf => {
  const c = (inner + outer) / 2, h = (outer - inner) / 2;
  return (x, y, z) => Math.abs(body(x, y, z) - c) - h;
};
/** A slab of half-width `w` about the plane through `p` with normal `n`. */
const slab = (p: Vec3, n: Vec3, w: number): Sdf => {
  const l = Math.hypot(...n), nx = n[0] / l, ny = n[1] / l, nz = n[2] / l;
  return (x, y, z) => Math.abs((x - p[0]) * nx + (y - p[1]) * ny + (z - p[2]) * nz) - w;
};
const halfSpace = (p: Vec3, n: Vec3): Sdf => {
  const l = Math.hypot(...n), nx = n[0] / l, ny = n[1] / l, nz = n[2] / l;
  return (x, y, z) => (x - p[0]) * nx + (y - p[1]) * ny + (z - p[2]) * nz;
};

/**
 * Saddle leather: oil darkens creases and edges, handling burnishes raised edges, and with `stitch` (an outline
 * SDF) a row of linen-thread stitches runs 12 mm inside the edge, 4 mm apart.
 */
function leatherShading(base: string, seed: number, stitch?: Sdf): SculptShading {
  const tan = linearRgb(base), dark = tan.map(v => v * .42), light = tan.map(v => Math.min(1, v * 1.35)), thread = linearRgb("#cdb893");
  const mottle = fbm3(seed, 3);
  return ({ x, y, z, occlusion, curvature }) => {
    const m = mottle(x * 9, y * 9, z * 9);
    const crease = clamp01((1 - occlusion) * 1.4), wear = smoothstep(.2, .6, curvature);
    let c = tan.map((v, i) => mix(mix(v, dark[i], crease * .7 + (m - .5) * .25), light[i], wear * .5));
    let rough = mix(1, .7, wear) * (.92 + m * .16);
    if (stitch) {
      const d = Math.abs(stitch(x, y, z) + .012), dash = .5 + .5 * Math.sin((x + y * .7 + z * .4) * 1570);
      const s = (1 - smoothstep(.0012, .0022, d)) * smoothstep(.1, .5, dash);
      // A pressed groove either side of the thread line, then the thread itself.
      c = c.map((v, i) => mix(v * (1 - .35 * (1 - smoothstep(.002, .004, d))), thread[i], s));
      rough = mix(rough, 1.2, s);
    }
    return [c[0], c[1], c[2], rough, 0];
  };
}

function solidShading(hex: string, rough = 1, metal = 0, ao = .6): SculptShading {
  const c = linearRgb(hex);
  return ({ occlusion }) => { const k = mix(ao, 1, occlusion); return [c[0] * k, c[1] * k, c[2] * k, rough, metal]; };
}

/** Build the tack as meshes in the horse's rest frame. */
export function createWesternTack(options: WesternTackOptions = {}): WesternTack {
  const res = createAssetResources();
  const sculpt = horseSdf(), B = sculpt.base, hf = sculpt.head;
  const cell = options.cellSize ?? .006;
  const group = new Group(); group.name = "western-tack";
  const trunk = new Group(); trunk.name = "tack@trunk"; group.add(trunk);
  const head = new Group(); head.name = "tack@head"; group.add(head);
  const sockets = new Map<string, Object3D>();
  const socket = (name: string, parent: Group, at: Vec3) => { const o = new Object3D(); o.name = name; o.position.set(...at); parent.add(o); sockets.set(name, o); return o; };

  const leatherColor = options.leather ?? "#6e4024";
  const leather = res.own(new MeshPhysicalMaterial({ vertexColors: true, roughness: .62, clearcoat: .18, clearcoatRoughness: .55, sheen: .2, sheenColor: "#b08058" }));
  leather.name = "tack-leather";
  applySurfaceDetail(leather, { kind: "stone", frequency: 420, strength: .00012, roughnessVariation: .25, vertexSurface: true });
  // Skirts, fenders, swell and cantle carry basketweave stamping; the seat and straps stay smooth.
  const tooled = res.own(leather.clone());
  tooled.name = "tack-leather-tooled";
  // Basketweave stamps about 12 mm across, pressed shallow.
  applySurfaceDetail(tooled, { kind: "tooled-leather", frequency: 82, strength: .00022, roughnessVariation: .25, vertexSurface: true });
  const darkLeather = res.own(new MeshPhysicalMaterial({ vertexColors: true, roughness: .55, clearcoat: .25, clearcoatRoughness: .5 }));
  darkLeather.name = "tack-leather-dark";
  applySurfaceDetail(darkLeather, { kind: "stone", frequency: 420, strength: .0001, roughnessVariation: .25, vertexSurface: true });
  const wool = res.own(new MeshStandardMaterial({ vertexColors: true, roughness: .97 }));
  wool.name = "tack-wool";
  applySurfaceDetail(wool, { kind: "fabric", frequency: 160, strength: .0007, roughnessVariation: .1 });
  const steel = res.own(new MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: .32 }));
  steel.name = "tack-steel";
  const rope = res.own(new MeshStandardMaterial({ vertexColors: true, roughness: .9 }));
  rope.name = "tack-rope";
  applySurfaceDetail(rope, { kind: "fabric", frequency: 220, strength: .0006, roughnessVariation: .15 });

  const build = (name: string, parent: Group, surface: Sdf, min: Vec3, max: Vec3, shading: SculptShading, material: Material, size = cell, shadow = true) => {
    const mesh = meshSdf(surface, { min, max, cellSize: size, occlusionDistance: .03 });
    if (!mesh.vertexCount) throw new Error(`Tack part "${name}" has no surface inside its bounds.`);
    const m = new Mesh(res.own(sculptGeometry(mesh, shading) as BufferGeometry), material);
    m.castShadow = shadow; m.receiveShadow = true;
    parent.add(res.name(m, name));
    return m;
  };

  // ---------------------------------------------------------------- saddle pad (wool, Navajo stripes)
  // A 30-inch pad: each side reaches about 33 cm down from the spine (the coat's sweat marks use the same outline).
  const padOutline = roundBox(HORSE_SADDLE_AREA.center, HORSE_SADDLE_AREA.half, HORSE_SADDLE_AREA.radius);
  const pad = intersect(shell(B, .001, .022), padOutline);
  const stripes = (options.padStripes ?? ["#7a1f1a", "#1d1a18", "#d8cbb0", "#7a1f1a", "#6b6a66", "#d8cbb0", "#1d1a18", "#7a1f1a"]).map(linearRgb);
  const weave = fbm3(31, 3);
  build("saddle-pad", trunk, pad, [-.42, 1.06, -.42], [.36, 1.62, .42], ({ x, y, z, occlusion }) => {
    const band = Math.floor(clamp01((x + .39) / .74) * stripes.length * .999), c = stripes[band];
    const k = mix(.55, 1, occlusion) * (.88 + .2 * weave(x * 60, y * 60, z * 60));
    return [c[0] * k, c[1] * k, c[2] * k, 1, 0];
  }, wool, .012);

  // ---------------------------------------------------------------- skirts and seat
  const skirtOutline = intersect(roundBox([-.05, 1.45, 0], [.29, .2, .6], .08), halfSpace([0, 1.25, 0], [0, -1, 0]));
  const skirts = intersect(shell(B, .022, .034), skirtOutline);
  // Seat: between 3.4 and 12 cm above the back within the tree's footprint; the seat is dished between swell and cantle.
  const footprint = roundBox([.01, 1.62, 0], [.24, .3, .165], .06);
  let seat = intersect(intersect(shell(B, .034, .118), footprint), halfSpace([0, 1.47, 0], [0, -1, 0]));
  seat = smoothSubtract(.03, seat, ellipsoid([-.02, 1.82, 0], [.25, .195, .32]));
  // Swell (fork): wide and undercut, sloping forward; the horn rises from its crest with a dally wrap round the neck.
  const swell = smoothUnion(.03, ellipsoid([.195, 1.645, 0], [.075, .088, .17], [0, 0, -.22]), mirrorZ(ellipsoid([.17, 1.6, .13], [.06, .06, .05], [0, 0, -.2])));
  const hornNeck = roundCone([.232, 1.68, 0], [.258, 1.765, 0], .027, .022);
  const horn = smoothUnion(.012, hornNeck, ellipsoid([.262, 1.778, 0], [.05, .014, .044], [0, 0, -.25]));
  const hornWrap = intersect(roundCone([.232, 1.68, 0], [.258, 1.765, 0], .033, .028), (_x, y) => Math.max(1.705 - y, y - 1.752));
  // Cantle: a backrest behind the seat, C-shaped from above and leaning back, rising ~10 cm above the seat's lowest
  // point; the seat leather flows up into it, and a rolled binding (cheyenne roll) caps its top edge.
  const back = halfSpace([-.13, 0, 0], [-1, 0, 0]);
  const cRadius = (x: number, z: number) => Math.hypot((x + .13) / 1.15, z) - .165;
  const cantleWall: Sdf = (x, y, z) => {
    const lean = (y - 1.6) * .55;                        // reclines as it rises
    return Math.max(Math.abs(cRadius(x + lean, z)) - .012, Math.abs(y - 1.652) - .055);
  };
  const cantle = intersect(smoothUnion(.01, cantleWall,
    (x, y, z) => Math.hypot(cRadius(x + .058, z), y - 1.708) - .013), back);
  const jockeys = mirrorZ(intersect(shell(B, .034, .046), roundBox([-.1, 1.5, .2], [.13, .07, .2], .03)));
  build("saddle-skirts", trunk, skirts, [-.38, 1.18, -.42], [.28, 1.62, .42], leatherShading(leatherColor, 3, skirtOutline), tooled, .011);
  build("saddle-seat", trunk, smoothUnion(.025, seat, jockeys), [-.3, 1.42, -.24], [.3, 1.72, .24], leatherShading(leatherColor, 5), leather, .0075);
  build("saddle-swell-cantle", trunk, union(swell, cantle), [-.36, 1.5, -.22], [.3, 1.8, .22], leatherShading(leatherColor, 6), tooled, .006);
  build("saddle-horn", trunk, horn, [.19, 1.66, -.06], [.32, 1.8, .06], leatherShading("#4a2a16", 7), darkLeather, .004);
  build("horn-wrap", trunk, hornWrap, [.19, 1.69, -.05], [.3, 1.77, .05], ({ x, y, z, occlusion }) => {
    const turns = .5 + .5 * Math.sin((y - 1.7) * 820 + Math.atan2(z, x - .245) * 2), k = mix(.5, 1, occlusion) * (.7 + .3 * turns);
    return [.035 * k, .03 * k, .028 * k, .9, 0];
  }, darkLeather, .0028);
  // Conchos: domed silver rosettes on the skirts, each tying a pair of saddle strings.
  const conchoAt: Vec3[] = [[.16, 1.47, .3], [-.32, 1.47, .29], [-.3, 1.3, .3]];
  const conchoSdf = (x: number, y: number, z: number) => Math.min(...conchoAt.map(c => {
    const pz = Math.abs(z) - c[2], r = Math.hypot(x - c[0], y - c[1]);
    const scallop = .0015 * Math.cos(Math.atan2(y - c[1], x - c[0]) * 16);
    return Math.max(r - .019 - scallop, Math.abs(pz - .004 * (1 - (r / .02) ** 2)) - .0035);
  }));
  build("conchos", trunk, conchoSdf, [-.36, 1.26, -.34], [.2, 1.5, .34], solidShading("#d6d2cc", .22, 1, .7), steel, .0022);
  const strings = mirrorZ(union(...conchoAt.flatMap(c => [0, 1].map(k => chain(
    [[c[0] + .004 * (k - .5), c[1] - .01, c[2] + .012], [c[0] + .01 * (k - .5) - .01, c[1] - .12, c[2] + .022], [c[0] + .02 * (k - .5) - .02, c[1] - .24 - .02 * k, c[2] + .028]],
    [.0035, .003, .0025], .002)))));
  build("saddle-strings", trunk, strings, [-.4, 1.0, -.36], [.22, 1.5, .36], leatherShading("#5a341c", 8), darkLeather, .0025);

  // ---------------------------------------------------------------- fenders and stirrups
  const tread = options.stirrupHeight ?? .95;
  // The stirrups hang from the fender's outer face, so the rider's calf lies outside the fender with the boot in the
  // stirrup; the leathers slant out from the fender's foot to the stirrups' top bars.
  const fenderZ = .35, stirrupZ = fenderZ + .05, stirrupX = .0, stirrupTop = tread + .17;
  // Upper fender follows the barrel under the skirt; the lower fender hangs straight, flaring toward the stirrup.
  const fenderUpper = intersect(shell(B, .046, .056), roundBox([-.01, 1.34, .25], [.1, .15, .2], .03));
  const lowerTop = 1.27, lowerBottom = stirrupTop + .045;
  const fenderLower = roundBox([stirrupX - .005, (lowerTop + lowerBottom) / 2, fenderZ], [.125, (lowerTop - lowerBottom) / 2, .0055], .005, { rotation: [-.05, 0, 0], taper: .28 });
  const fender = mirrorZ(smoothUnion(.035, fenderUpper, fenderLower));
  build("saddle-fenders", trunk, fender, [-.19, lowerBottom - .03, -.42], [.16, 1.52, .42], leatherShading(leatherColor, 9), tooled, .007);
  // Stirrup leather strap from the fender's foot to the stirrup's top bar.
  const strapTop = lowerBottom + .04, strapLean = Math.atan2(stirrupZ - fenderZ, strapTop - stirrupTop);
  const strap = mirrorZ(roundBox([stirrupX, (stirrupTop + strapTop) / 2, (fenderZ + stirrupZ) / 2 + .004], [.022, Math.hypot(strapTop - stirrupTop, stirrupZ - fenderZ) / 2 + .012, .006], .004,
    { rotation: [-strapLean, 0, 0] }));
  build("stirrup-leathers", trunk, strap, [-.05, stirrupTop - .03, -.44], [.05, lowerBottom + .08, .44], leatherShading("#4e2c16", 11), darkLeather, .004);
  // Wooden stirrups, leather-bound: a bell-shaped ring in the y–z plane with a broad tread.
  const stirrup = (zc: number) => {
    const c: Vec3 = [stirrupX, tread + .085, zc];
    const outer = roundBox(c, [.05, .088, .068], .025, { taper: .35 });
    const inner = roundBox([c[0], c[1] + .012, c[2]], [.2, .068, .046], .02, { taper: .4 });
    return smoothUnion(.01, smoothSubtract(.006, outer, inner), roundBox([c[0], tread + .006, c[2]], [.058, .008, .07], .006));
  };
  build("stirrups", trunk, union(stirrup(stirrupZ), stirrup(-stirrupZ)), [-.08, tread - .02, -.5], [.08, tread + .2, .5], leatherShading("#6e4526", 13), darkLeather, .0055);
  socket("socket-stirrup-near", trunk, [stirrupX + .01, tread + .018, -stirrupZ]);
  socket("socket-stirrup-far", trunk, [stirrupX + .01, tread + .018, stirrupZ]);
  socket("socket-seat", trunk, [-.04, 1.585, 0]);
  socket("socket-horn", trunk, [.258, 1.79, 0]);

  // ---------------------------------------------------------------- rigging, cinch, breast collar
  // Dee rings stand in the x–y plane on each skirt.
  const ringXY = (c: Vec3, r: number, t: number): Sdf => (x, y, z) => Math.hypot(Math.hypot(x - c[0], y - c[1]) - r, z - c[2]) - t;
  const dees = union(ringXY([.25, 1.34, .312], .032, .0055), ringXY([.25, 1.34, -.312], .032, .0055));
  build("rigging-dees", trunk, dees, [.2, 1.29, -.33], [.3, 1.39, .33], solidShading("#9a9590", .4, 1), steel, .003);
  const latigo = mirrorZ(intersect(shell(B, .024, .031), slab([.25, 1.2, 0], [1, .12, 0], .02)));
  const latigoCut = intersect(latigo, intersect(halfSpace([0, 1.33, 0], [0, 1, 0]), halfSpace([0, 1.08, 0], [0, -1, 0])));
  build("latigos", trunk, latigoCut, [.17, 1.04, -.36], [.33, 1.36, .36], leatherShading("#5a341c", 15), darkLeather, .005);
  // Mohair cinch: a corded band under the girth from buckle to buckle.
  const cinch = intersect(intersect(shell(B, .002, .014), slab([.255, 1.0, 0], [1, .1, 0], .048)), halfSpace([0, 1.1, 0], [0, 1, 0]));
  const cord = linearRgb("#c9b28a"), cordDark = linearRgb("#5b4630");
  build("cinch", trunk, cinch, [.15, .76, -.34], [.36, 1.12, .34], ({ z, occlusion }) => {
    const k = .5 + .5 * Math.cos(z * 260), c = cord.map((v, i) => mix(cordDark[i], v, .55 + .45 * k)), a = mix(.6, 1, occlusion);
    return [c[0] * a, c[1] * a, c[2] * a, 1, 0];
  }, rope, .008);
  const buckles = union(roundBox([.255, 1.09, .31], [.03, .028, .006], .005), roundBox([.255, 1.09, -.31], [.03, .028, .006], .005));
  build("cinch-buckles", trunk, buckles, [.2, 1.04, -.33], [.31, 1.14, .33], solidShading("#b0aaa2", .35, 1), steel, .003);
  // Breast collar: a band round the chest from the front dees, with a centre ring.
  const collarBand = intersect(intersect(shell(B, .002, .012), slab([.58, 1.1, 0], [.65, .76, 0], .024)), halfSpace([.22, 0, 0], [-1, 0, 0]));
  build("breast-collar", trunk, collarBand, [.2, .98, -.34], [.66, 1.42, .34], leatherShading("#4e2c16", 17), darkLeather, .006);
  build("breast-collar-ring", trunk, (x, y, z) => Math.hypot(Math.hypot(z, y - 1.1) - .03, x - .62) - .006,
    [.6, 1.06, -.04], [.64, 1.14, .04], solidShading("#b0aaa2", .35, 1), steel, .003);

  // ---------------------------------------------------------------- lariat coiled on the off-side (right, +Z) swell
  // Strapped to the fork and hanging over the shoulder in front of the rider's right knee.
  if (options.lariat ?? true) {
    const loops: Sdf[] = [];
    for (let i = 0; i < 4; i++) {
      const c: Vec3 = [.23 - i * .006, 1.5 - i * .004, .3 + i * .012];
      loops.push((x, y, z) => Math.hypot(Math.hypot(x - c[0], y - c[1]) - (.14 - i * .006), z - c[2]) - .0055);
    }
    const tie = roundBox([.22, 1.62, .27], [.012, .05, .01], .004, { rotation: [0, 0, -.3] });
    const lariat = smoothUnion(.004, union(...loops), tie);
    const fibre = linearRgb("#c7b48a"), shade = linearRgb("#7d6a48");
    build("lariat", trunk, lariat, [.06, 1.34, .24], [.4, 1.68, .36], ({ x, y, z, occlusion }) => {
      const twist = .5 + .5 * Math.sin(Math.atan2(y - 1.5, x - .23) * 90 + z * 400), c = fibre.map((v, i) => mix(shade[i], v, .5 + .5 * twist));
      const a = mix(.5, 1, occlusion);
      return [c[0] * a, c[1] * a, c[2] * a, 1, 0];
    }, rope, .0048);
  }

  // ---------------------------------------------------------------- headstall and bit (head bone)
  const at = hf.at, U = hf.U;
  // Crownpiece behind the ears, browband across the forehead, cheekpieces down to the bit, throatlatch under the jaw.
  const headShell = shell(B, .001, .008);
  const sides = (minZ: number): Sdf => (_x, _y, z) => minZ - Math.abs(z);
  const pa = (u: number, v: number) => at(u, v, 0);
  // Crownpiece behind the ears (clear of the ear bases).
  const crown = intersect(intersect(headShell, slab(pa(.045, 0), [U[0], U[1], 0], .011)), (x, y, z) => .008 - sculpt.ear(x, y, z));
  const brow = intersect(intersect(headShell, slab(pa(.075, .07), [U[0] * .9 - .3 * U[1], U[1] * .9 + .3 * U[0], 0], .009)), halfSpace(pa(.075, .02), [-U[1], U[0], 0]));
  const c0 = at(.05, .04), c1 = at(.44, -.075), cdx = c1[0] - c0[0], cdy = c1[1] - c0[1], clen = Math.hypot(cdx, cdy);
  const cheekSpan: Sdf = (x, y) => { const t = ((x - c0[0]) * cdx + (y - c0[1]) * cdy) / (clen * clen); return Math.max(-t, t - 1) * clen; };
  const cheek = intersect(intersect(intersect(headShell, slab(c0, [-cdy, cdx, 0], .011)), sides(.05)), cheekSpan);
  // A one-piece western headstall: no throatlatch (a strap cut across the throat at a grazing angle reads as a block).
  const headstall = union(crown, brow, cheek);
  const hmin: Vec3 = [.8, 1.18, -.16], hmax: Vec3 = [1.42, 1.85, .16];
  build("headstall", head, headstall, hmin, hmax, leatherShading("#3e2414", 19), darkLeather, .006);
  // Curb bit: mouthpiece through the mouth corners, rings for the reins and shanks below.
  const corner = at(.445, -.078);
  const bitBar = roundCone([corner[0], corner[1], -.07], [corner[0], corner[1], .07], .006, .006);
  const shanks = mirrorZ(chain([[corner[0] + .005, corner[1] + .02, .07], [corner[0], corner[1], .072], [corner[0] - .012, corner[1] - .07, .07]], [.005, .006, .005], .004));
  const rings = mirrorZ(ringXY([corner[0] - .014, corner[1] - .075, .072], .016, .0035));
  build("curb-bit", head, union(bitBar, shanks, rings), [corner[0] - .05, corner[1] - .11, -.09], [corner[0] + .04, corner[1] + .05, .09], solidShading("#c8c2ba", .25, 1, .8), steel, .0028);
  socket("socket-bit-near", head, [corner[0] - .014, corner[1] - .09, -.072]);
  socket("socket-bit-far", head, [corner[0] - .014, corner[1] - .09, .072]);

  return { group, sockets, dispose: res.dispose };
}

/**
 * Re-parent tack groups (`tack@<bone>`) onto a loaded horse's bones, keeping their rest-frame placement.
 * Call with the horse in its bind pose (bones at rest), before animating.
 */
export function attachTack(horseRoot: Object3D, tack: Object3D): Map<string, Object3D> {
  horseRoot.updateMatrixWorld(true);
  const sockets = new Map<string, Object3D>();
  // Groups may sit under a wrapper node (a glTF scene holds the exported root), so search all descendants.
  const groups: Object3D[] = [];
  tack.traverse(o => { if (o.name.startsWith("tack@")) groups.push(o); });
  for (const child of groups) {
    const bone = horseRoot.getObjectByName(child.name.slice(5));
    if (!bone) continue;
    // Tack is authored in the horse's rest frame, the same frame as the horse root.
    child.position.set(0, 0, 0); child.quaternion.identity(); child.scale.set(1, 1, 1);
    child.updateMatrix();
    child.matrix.premultiply(horseRoot.matrixWorld);
    child.matrix.decompose(child.position, child.quaternion, child.scale);
    bone.attach(child);
  }
  tack.traverse(o => { if (o.name.startsWith("socket-")) sockets.set(o.name, o); });
  horseRoot.traverse(o => { if (o.name.startsWith("socket-")) sockets.set(o.name, o); });
  return sockets;
}


export interface CowboyHatOptions {
  /** Felt colour (sRGB). */
  felt?: string;
  band?: string;
  cellSize?: number;
}

/**
 * A cattleman hat in its own frame: origin at the centre of the sweatband (where the crown of the head
 * sits), +Y up, +Z the front. Felt crown with a centre crease and front pinches, a brim curled up at the
 * sides, a leather band. Sized for a 58 cm head: crown 11.5 cm, brim 9 cm.
 */
export function createCowboyHat(options: CowboyHatOptions = {}): { group: Group; dispose(): void } {
  const res = createAssetResources();
  const group = new Group(); group.name = "cowboy-hat";
  const cell = options.cellSize ?? .0045;
  let crown: Sdf = loftY([
    { y: -.002, w: .084, front: .099, back: .099, n: 2.5 },
    { y: .06, w: .083, front: .097, back: .098, n: 2.5 },
    { y: .1, w: .077, front: .088, back: .093, n: 2.6 },
    { y: .118, w: .066, front: .07, back: .083, n: 2.8 },
  ], .012);
  crown = smoothSubtract(.012, crown, ellipsoid([0, .135, -.005], [.013, .032, .075]));         // centre crease
  crown = smoothSubtract(.012, crown, mirrorX(ellipsoid([.055, .1, .07], [.02, .045, .03])));   // front pinches
  const brimHeight = (x: number, z: number) => .036 * Math.pow(Math.abs(x) / .19, 2.2) - .01 * Math.pow(Math.abs(z) / .19, 2);
  const brimOuter = (x: number, z: number) => Math.hypot(x / .19, z / .2) - 1;
  const brim = intersect((x, y, z) => Math.abs(y - brimHeight(x, z)) - .0028, (x, _y, z) => brimOuter(x, z) * .19);
  const band = intersect(shell(crown, 0, .003), (_x, y) => Math.abs(y - .014) - .011);
  const felt = res.own(new MeshStandardMaterial({ vertexColors: true, roughness: .94 }));
  felt.name = "hat-felt";
  applySurfaceDetail(felt, { kind: "fabric", frequency: 300, strength: .00025, roughnessVariation: .1 });
  const leatherBand = res.own(new MeshPhysicalMaterial({ vertexColors: true, roughness: .5, clearcoat: .2 }));
  leatherBand.name = "hat-band";
  const feltShade = (hex: string) => {
    const c = linearRgb(hex), dust = fbm3(41, 3);
    return (({ x, y, z, occlusion }) => {
      const k = mix(.6, 1, occlusion) * (.9 + .2 * dust(x * 30, y * 30, z * 30)), d = smoothstep(.04, .12, y) * .12;
      return [c[0] * k + d * .05, c[1] * k + d * .04, c[2] * k + d * .03, 1, 0];
    }) as SculptShading;
  };
  const make = (name: string, sdf: Sdf, min: Vec3, max: Vec3, shading: SculptShading, material: Material) => {
    const mesh = meshSdf(sdf, { min, max, cellSize: cell, occlusionDistance: .02 });
    const m = new Mesh(res.own(sculptGeometry(mesh, shading) as BufferGeometry), material);
    m.castShadow = true; m.receiveShadow = true;
    group.add(res.name(m, name));
  };
  const feltColor = options.felt ?? "#3b2a1e";
  make("hat-crown", crown, [-.1, -.01, -.11], [.1, .14, .11], feltShade(feltColor), felt);
  make("hat-brim", brim, [-.2, -.02, -.21], [.2, .05, .21], feltShade(feltColor), felt);
  make("hat-band", band, [-.1, -.002, -.11], [.1, .03, .11], leatherShading(options.band ?? "#1e1410", 23), leatherBand);
  return { group, dispose: res.dispose };
}
