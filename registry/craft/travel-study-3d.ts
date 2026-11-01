/** Art-directed travel-study furniture and ephemera, in centimeters (+Y up).
 * All construction and printed imagery is original, except coast/country
 * polygons transformed from Natural Earth public-domain geographic data.
 * No loaders, external image requests, clocks, or renderer ownership.
 */
import {
  CatmullRomCurve3, CircleGeometry, CylinderGeometry, DoubleSide, Group, LatheGeometry,
  Mesh, MeshBasicMaterial, MeshPhysicalMaterial, PlaneGeometry, PointLight,
  SphereGeometry, TorusGeometry, TubeGeometry, Vector2, Vector3,
} from "three";
import type { BufferGeometry, Material } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createAssetResources } from "./hero-asset";
import type { AssetResources, HeroAsset } from "./hero-asset";
import { actionTime, captureRest, smooth } from "./hero-action";
import type { HeroActionSpec } from "./hero-action";
import { paintTexture } from "./canvas-texture";
import { applySurfaceDetail } from "./surface-detail";
import { TRAVEL_LAND_POLYGONS } from "./travel-geography";

export type TravelStudyObjectKind = "chair" | "world-map" | "globe" | "photograph" |
  "book-stack" | "clock" | "desk-lamp";
export type TravelPhotoVariant = "alpine" | "coast" | "old-town";
export interface TravelStudyOptions {
  id?: string;
  color?: string;
  /** Radius in centimeters, for both the full-size and miniature desk globe. */
  globeRadius?: number;
  photoVariant?: TravelPhotoVariant;
  /** Antique cartographic palette or a cooler classroom/globe treatment. */
  atlasPalette?: "sepia" | "sage";
}

type Vec = readonly [number, number, number];
type Build = {
  bounds: { min: Vec; max: Vec };
  materials: string[];
  details: string[];
  moving?: Record<string, Group>;
};
const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const GOLD = "#ba8c4c";

function add(res: AssetResources, group: Group, geo: BufferGeometry, material: Material,
  name: string, at: Vec = [0, 0, 0]) {
  const object = new Mesh(res.own(geo), material);
  object.position.set(...at); object.castShadow = true; object.receiveShadow = true;
  group.add(res.name(object, name));
  return object;
}

function material(res: AssetResources, color: string, metalness: number, roughness: number) {
  return res.own(new MeshPhysicalMaterial({ color, metalness, roughness }));
}

function tube(res: AssetResources, group: Group, points: Vector3[], radius: number,
  mat: Material, name: string, closed = false) {
  const curve = new CatmullRomCurve3(points, closed, "centripetal");
  return add(res, group, new TubeGeometry(curve, Math.max(28, points.length * 10), radius, 9, closed), mat, name);
}

function rod(res: AssetResources, group: Group, a: Vector3, b: Vector3,
  radius: number, mat: Material, name: string) {
  const direction = b.clone().sub(a);
  const object = add(res, group, new CylinderGeometry(radius, radius, direction.length(), 18), mat, name,
    a.clone().add(b).multiplyScalar(.5).toArray() as unknown as Vec);
  object.quaternion.setFromUnitVectors(V(0, 1, 0), direction.normalize());
  return object;
}

function paintAtlas(ctx: CanvasRenderingContext2D, w: number, h: number, random: () => number,
  palette: "sepia" | "sage", globe: boolean) {
  const sea = ctx.createLinearGradient(0, 0, 0, h);
  if (palette === "sepia") {
    sea.addColorStop(0, "#decba6"); sea.addColorStop(.52, "#d9c29a"); sea.addColorStop(1, "#c8a977");
  } else { sea.addColorStop(0, "#aab9a7"); sea.addColorStop(.52, "#95aaa0"); sea.addColorStop(1, "#8ea59c"); }
  ctx.fillStyle = sea; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = palette === "sepia" ? "rgba(110,76,40,.22)" : "rgba(39,74,66,.25)";
  ctx.lineWidth = 1.2;
  for (let lon = -180; lon <= 180; lon += 15) {
    const x = (lon + 180) / 360 * w;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = (90 - lat) / 180 * h;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  // Real country outlines, rather than invented continent silhouettes. Very
  // small islands remain represented in the 110m source.
  for (const ring of TRAVEL_LAND_POLYGONS) {
    ctx.beginPath();
    for (let i = 0; i < ring.length; i++) {
      const [lon, lat] = ring[i];
      const x = (lon + 180) / 360 * w, y = (90 - lat) / 180 * h;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = palette === "sepia" ? "#948052" : "#70836c";
    ctx.fill();
    ctx.strokeStyle = palette === "sepia" ? "rgba(74,54,29,.70)" : "rgba(38,63,48,.68)";
    ctx.lineWidth = globe ? 1.6 : 1.1; ctx.stroke();
  }
  // Restrained paper-ink irregularity and archival foxing. No stochastic
  // redraws after creation; paintTexture gives us a seeded generator.
  for (let i = 0; i < (globe ? 5200 : 9600); i++) {
    const x = random() * w, y = random() * h;
    const r = .25 + random() * 2.3;
    ctx.fillStyle = `rgba(91,55,26,${random() * (globe ? .08 : .13)})`;
    ctx.fillRect(x, y, r, r);
  }
  if (!globe) {
    ctx.fillStyle = "rgba(74,55,33,.68)";
    ctx.textAlign = "center";
    ctx.font = `600 ${Math.round(h * .034)}px Georgia, serif`;
    ctx.fillText("THE WORLD · AN ATLAS OF JOURNEYS", w / 2, h * .083);
    ctx.font = `${Math.round(h * .021)}px Georgia, serif`;
    for (const [label, lon, lat] of [["ATLANTIC OCEAN", -32, 6], ["PACIFIC", -148, 2],
      ["INDIAN OCEAN", 81, -28], ["ARCTIC OCEAN", 12, 69]] as const) {
      ctx.fillText(label, (lon + 180) / 360 * w, (90 - lat) / 180 * h);
    }
    // Survey compass and tiny route pins, all editable in the painter.
    const cx = w * .14, cy = h * .79;
    ctx.strokeStyle = "rgba(78,53,29,.7)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, h * .046, 0, 2 * Math.PI); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const theta = i * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.sin(theta) * h * (i % 2 ? .032 : .054), cy - Math.cos(theta) * h * (i % 2 ? .032 : .054));
      ctx.stroke();
    }
    ctx.font = `${Math.round(h * .023)}px Georgia, serif`; ctx.fillText("N", cx, cy - h * .066);
    for (const [lon, lat] of [[-74, 40], [2, 49], [139, 36], [31, 30], [151, -34], [-58, -35]]) {
      const x = (lon + 180) / 360 * w, y = (90 - lat) / 180 * h;
      ctx.fillStyle = "#883f2d";
      ctx.beginPath(); ctx.arc(x, y, h * .006, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = "#e9d2a4"; ctx.lineWidth = 2; ctx.stroke();
    }
  }
}

function cartographicMaterial(res: AssetResources, palette: "sepia" | "sage", globe: boolean) {
  const texture = res.own(paintTexture(globe ? 2048 : 2560, globe ? 1024 : 1280,
    (ctx, w, h, random) => paintAtlas(ctx, w, h, random, palette, globe),
    { seed: 47, fallback: palette === "sepia" ? [195, 168, 115, 255] : [117, 142, 115, 255], anisotropy: 16 }));
  return res.own(new MeshPhysicalMaterial({ map: texture, roughness: globe ? .64 : .9, metalness: 0,
    sheen: .12, clearcoat: globe ? .14 : .015 }));
}

function worldMap(res: AssetResources, root: Group, options: TravelStudyOptions): Build {
  const w = 146, h = 76;
  const walnut = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: options.color ?? "#654329",
    roughness: .47, clearcoat: .28 }), { kind: "brushed", flow: [0, 1, 0], frequency: 22, strength: .0009 }));
  const paperEdge = material(res, "#a18a63", .03, .9);
  const brass = material(res, GOLD, .93, .28);
  const ink = cartographicMaterial(res, options.atlasPalette ?? "sepia", false);
  add(res, root, new RoundedBoxGeometry(w + 4.4, h + 4.4, 1.4, 3, .65), walnut,
    "map-solid-wood-frame");
  add(res, root, new RoundedBoxGeometry(w + 1.0, h + 1.0, .18, 2, .2), paperEdge,
    "map-recessed-paper-edge", [0, 0, .85]);
  add(res, root, new PlaneGeometry(w, h), ink, "map-cartographic-print", [0, 0, .96]);
  // A fine inset lip and visible corner fasteners avoid the floating texture
  // appearance of a single map plane.
  for (const x of [-w / 2 - 1.45, w / 2 + 1.45])
    add(res, root, new RoundedBoxGeometry(.34, h + 3.0, .25, 2, .08), brass,
      `map-frame-gilt-side-${x}`, [x, 0, .75]);
  for (const y of [-h / 2 - 1.45, h / 2 + 1.45])
    add(res, root, new RoundedBoxGeometry(w + 3.0, .34, .25, 2, .08), brass,
      `map-frame-gilt-edge-${y}`, [0, y, .75]);
  for (const x of [-w / 2 - 1.4, w / 2 + 1.4]) for (const y of [-h / 2 - 1.4, h / 2 + 1.4]) {
    add(res, root, new SphereGeometry(.52, 12, 8), brass, "map-corner-pin", [x, y, 1.05]);
  }
  return { bounds: { min: [-75.5, -40.5, -.8], max: [75.5, 40.5, 1.6] },
    materials: ["archival matte cartographic paper", "relief-grained walnut frame", "satin-brass inlaid trim", "patinated pin heads"],
    details: ["Natural Earth country and coastline paths", "15-degree graticule", "six journey pins", "engraved compass rose", "layered frame reveal", "aged edge ink"] };
}

function globe(res: AssetResources, root: Group, options: TravelStudyOptions): Build {
  const r = options.globeRadius ?? 15;
  const brass = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: GOLD, metalness: .96,
    roughness: .29, clearcoat: .2 }), { kind: "brushed", flow: [0, 1, 0], strength: .00023 }));
  const wood = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: options.color ?? "#68452b",
    roughness: .42, clearcoat: .32 }), { kind: "brushed", strength: .0005 }));
  const dark = material(res, "#3a3024", .45, .55);
  const surface = cartographicMaterial(res, options.atlasPalette ?? "sepia", true);
  const centerY = r + r * .63 + 2.8;
  add(res, root, new CylinderGeometry(r * .8, r * .94, 1.75, 64), wood, "globe-turned-wood-base", [0, .95, 0]);
  add(res, root, new CylinderGeometry(r * .58, r * .64, .58, 64), brass, "globe-base-brass-ring", [0, 1.9, 0]);
  add(res, root, new CylinderGeometry(r * .11, r * .17, centerY - r * .9, 28), dark,
    "globe-load-bearing-stand", [0, (centerY - r * .9) / 2 + 1.8, 0]);
  add(res, root, new CylinderGeometry(r * .13, r * .13, r * .3, 20), brass,
    "globe-axis-socket", [0, centerY - r - 1, 0]);
  const tilt = new Group(); tilt.position.y = centerY; tilt.rotation.z = -.409;
  root.add(res.name(tilt, "globe-inclined-meridian"));
  const spinning = new Group(); tilt.add(res.name(spinning, "globe-spinning-sphere"));
  add(res, spinning, new SphereGeometry(r, 96, 64), surface, "globe-real-country-surface");
  // A proper inclined meridian with graduated notches surrounding the sphere.
  add(res, tilt, new TorusGeometry(r + 1.15, r * .043, 12, 144), brass,
    "globe-graduated-meridian");
  for (let i = 0; i < 36; i++) {
    const a = i * Math.PI / 18;
    const tick = add(res, tilt, new CylinderGeometry(r * .018, r * .018, .65, 8), dark,
      `globe-meridian-degree-${i}`, [(r + 1.15) * Math.cos(a), (r + 1.15) * Math.sin(a), .05]);
    tick.rotation.z = a + Math.PI / 2;
  }
  rod(res, tilt, V(0, -r - 2, 0), V(0, r + 2, 0), r * .06, brass, "globe-polar-axle");
  add(res, tilt, new SphereGeometry(r * .15, 20, 16), brass, "globe-north-axis-finial", [0, r + 2, 0]);
  add(res, tilt, new SphereGeometry(r * .12, 20, 16), brass, "globe-south-axis-finial", [0, -r - 2, 0]);
  return { bounds: { min: [-r - 2.2, 0, -r - 2.2], max: [r + 2.2, centerY + r + 3, r + 2.2] },
    materials: ["printed cartographic lacquer", "brushed turned brass", "satin walnut plinth", "dark oxidized axis metal"],
    details: ["accurate geography on 96-segment sphere", "23.5-degree axial tilt", "36 graduated meridian marks", "independent spindle", "turned stand and foot", "separate pole finials"],
    moving: { spin: spinning } };
}

function chair(res: AssetResources, root: Group, options: TravelStudyOptions): Build {
  const hide = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: options.color ?? "#815039",
    roughness: .69, metalness: 0, sheen: .54, sheenColor: "#be8562", clearcoat: .11 }),
  { kind: "hammered", frequency: 33, strength: .0013, roughnessVariation: .34, albedoVariation: .16 }));
  const piping = material(res, "#5b3527", .02, .72);
  const saddle = material(res, "#d3a77e", 0, .91);
  const walnut = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#4b3225",
    roughness: .39, clearcoat: .29 }), { kind: "brushed", flow: [0, 1, 0] }));
  const iron = material(res, "#262525", .89, .37);
  const brass = material(res, GOLD, .92, .26);
  // Five-spoke swivel base, castors, piston, underside support.
  add(res, root, new CylinderGeometry(3.1, 3.6, 34, 28), iron, "chair-swivel-piston", [0, 22, 0]);
  add(res, root, new CylinderGeometry(8.5, 7.2, 3, 30), iron, "chair-seat-suspension", [0, 42, 0]);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    const p = V(Math.cos(a) * 28, 8, Math.sin(a) * 28);
    rod(res, root, V(0, 11, 0), p, 2.2, iron, `chair-five-spoke-${i}`);
    add(res, root, new SphereGeometry(3.7, 20, 12), iron, `chair-castor-housing-${i}`,
      [p.x, 5, p.z]);
    add(res, root, new CylinderGeometry(3.0, 3.0, 2.5, 20), walnut, `chair-rolling-wheel-${i}`,
      [p.x, 2.8, p.z]).rotation.z = Math.PI / 2;
  }
  add(res, root, new RoundedBoxGeometry(63, 7.8, 58, 5, 6), walnut, "chair-formed-seat-shell", [0, 45, 0]);
  add(res, root, new RoundedBoxGeometry(59, 8.5, 53, 6, 7), hide, "chair-upholstered-seat", [0, 50.3, 2]);
  // Scalloped back is a separate padded shell rather than a rectangle.
  const backGeo = new RoundedBoxGeometry(62, 52, 9, 8, 7);
  const pos = backGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), x = pos.getX(i), z = pos.getZ(i);
    pos.setXYZ(i, x * (1 - Math.max(0, y / 26) * .065), y,
      z + 3.5 * Math.cos(x / 32 * Math.PI / 2) - 2.5 * Math.pow(y / 26, 2));
  }
  backGeo.computeVertexNormals();
  const back = add(res, root, backGeo, hide, "chair-upholstered-back", [0, 81, -25]);
  back.rotation.x = -.10;
  tube(res, root, [V(-28, 59, -18), V(-29, 70, -18), V(-28.2, 87, -19),
    V(-22, 101, -24), V(0, 105, -26), V(22, 101, -24), V(28.2, 87, -19),
    V(29, 70, -18), V(28, 59, -18)], .85, piping, "chair-back-leather-piping");
  // Two naturally bowed armrests, supported by bentwood uprights with caps.
  for (const s of [-1, 1]) {
    tube(res, root, [V(s * 27, 46, 18), V(s * 31, 56, 18), V(s * 32, 62, 5),
      V(s * 32, 61, -13), V(s * 27, 64, -22)], 2.45, walnut, `chair-bentwood-arm-${s}`);
    add(res, root, new RoundedBoxGeometry(9, 2.6, 31, 4, 1.25), hide,
      `chair-padded-armrest-${s}`, [s * 30, 64, 3]);
    add(res, root, new SphereGeometry(1.5, 16, 10), brass,
      `chair-arm-joint-cap-${s}`, [s * 27, 64, -22]);
  }
  // Parallel stitches on the upper back and seat hem. The small seams catch
  // grazing light instead of being merely drawn into a diffuse texture.
  for (const x of [-24.3, 24.3]) {
    tube(res, root, [V(x, 62, -19.3), V(x, 78, -19.6), V(x * .93, 94, -22)], .15,
      saddle, `chair-back-saddle-seam-${x}`);
  }
  for (let i = 0; i < 22; i++) {
    const x = -25 + i * 2.35;
    add(res, root, new RoundedBoxGeometry(1, .12, .18, 1, .05), saddle,
      `chair-seat-front-stitch-${i}`, [x, 53.7, 27.1]);
  }
  return { bounds: { min: [-36, 0, -40], max: [36, 106, 33] },
    materials: ["pebbled chestnut leather", "saddle-stitched leather piping", "varnished curved walnut", "brushed cast-iron swivel mechanism", "satin brass caps"],
    details: ["five-spoke wheeled base", "individually shaped back cushion", "separate seat pad and formed shell", "bowed wooden arms", "welted back outline", "paired saddle seams and 22 hem stitches"] };
}

function photographPainter(ctx: CanvasRenderingContext2D, w: number, h: number,
  random: () => number, variant: TravelPhotoVariant) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  const skyColors = variant === "alpine" ? ["#536d74", "#b8c9bf", "#ddd9bd"]
    : variant === "coast" ? ["#476d82", "#b3d1c5", "#e4c49b"] : ["#826f62", "#d6b191", "#edcc9c"];
  sky.addColorStop(0, skyColors[0]); sky.addColorStop(.65, skyColors[1]); sky.addColorStop(1, skyColors[2]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  if (variant === "old-town") {
    for (let i = 0; i < 17; i++) {
      const x = i * w / 15 - 20, height = h * (.22 + random() * .5);
      ctx.fillStyle = i % 3 ? "#b48965" : "#85654d";
      ctx.fillRect(x, h - height, w / 13, height);
      ctx.fillStyle = "#4d473e";
      for (let floor = 0; floor < 4; floor++) for (let c = 0; c < 2; c++)
        ctx.fillRect(x + 10 + c * w / 35, h - height + 17 + floor * h / 11, 8, 16);
      ctx.fillStyle = "#5e483c";
      ctx.beginPath(); ctx.moveTo(x - 5, h - height); ctx.lineTo(x + w / 26, h - height - 25);
      ctx.lineTo(x + w / 12, h - height); ctx.fill();
    }
  } else {
    const ridges = variant === "alpine"
      ? [[.43, "#a9a8a0"], [.56, "#75877d"], [.69, "#50665a"], [.79, "#374a42"]] as const
      : [[.57, "#a5a393"], [.7, "#5f8d89"], [.80, "#366b70"], [.92, "#244c5f"]] as const;
    for (const [base, color] of ridges) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, h);
      ctx.lineTo(0, h * (base + random() * .03));
      for (let x = 0; x <= w; x += 14)
        ctx.lineTo(x, h * (base - Math.sin(x * .012 + base * 18) * .075 - random() * .055));
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    }
  }
  // Subtle silver-grain/halation, not recognizable real-world photography.
  for (let i = 0; i < 5000; i++) {
    const x = random() * w, y = random() * h;
    ctx.fillStyle = `rgba(255,244,213,${random() * .07})`;
    ctx.fillRect(x, y, 1 + random() * 2, 1 + random() * 2);
  }
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * .1, w / 2, h / 2, w * .78);
  vignette.addColorStop(0, "rgba(24,20,16,0)"); vignette.addColorStop(1, "rgba(24,20,16,.42)");
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
}

function photograph(res: AssetResources, root: Group, options: TravelStudyOptions): Build {
  const variant = options.photoVariant ?? "alpine";
  const print = res.own(paintTexture(900, 1080,
    (ctx, w, h, rand) => photographPainter(ctx, w, h, rand, variant),
    { seed: variant === "alpine" ? 12 : variant === "coast" ? 37 : 90, anisotropy: 16,
      fallback: [150, 167, 155, 255] }));
  const photographicInk = res.own(new MeshPhysicalMaterial({ map: print, roughness: .68, metalness: 0 }));
  const card = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: options.color ?? "#f2ead9",
    roughness: .91 }), { kind: "paper", frequency: 72, strength: .0007 }));
  const photoEdge = material(res, "#d2c6b2", .01, .97);
  const clip = material(res, "#a78b62", .83, .34);
  add(res, root, new RoundedBoxGeometry(16.4, 19, .33, 3, .18), card, "photograph-archival-mount");
  add(res, root, new RoundedBoxGeometry(14.8, 14.8, .04, 2, .07), photoEdge,
    "photograph-print-board", [0, 1.35, .22]);
  add(res, root, new PlaneGeometry(14.5, 14.5), photographicInk,
    "photograph-art-print", [0, 1.35, .26]);
  for (const x of [-7.65, 7.65]) for (const y of [-8.95, 8.95])
    add(res, root, new SphereGeometry(.24, 12, 8), clip,
      `photograph-mount-corner-pin-${x}-${y}`, [x, y, .34]);
  const ink = res.own(paintTexture(720, 120, (ctx, w) => {
    ctx.fillStyle = "#544b3c"; ctx.font = "italic 52px Georgia, serif"; ctx.textAlign = "center";
    ctx.fillText(variant === "alpine" ? "Alpine light · 04" : variant === "coast" ? "Coastal road · 07" : "Old quarter · 12", w / 2, 76);
  }, { fallback: [240, 232, 218, 255] }));
  const caption = res.own(new MeshBasicMaterial({ map: ink, transparent: true, depthWrite: false }));
  add(res, root, new PlaneGeometry(12, 2), caption, "photograph-caption", [0, -7.45, .25]);
  add(res, root, new CylinderGeometry(.42, .42, 2.2, 16), clip,
    "photograph-spring-clip", [0, 10.1, .4]).rotation.x = Math.PI / 2;
  add(res, root, new SphereGeometry(.72, 18, 10), clip, "photograph-hanging-pin", [0, 10.1, 1.55]);
  return { bounds: { min: [-8.5, -9.5, -.3], max: [8.5, 11, 2.2] },
    materials: ["matte pigment travel artwork", "thick archival photo mount", "warm-print caption ink", "aged spring steel clip"],
    details: ["independent printed image", "layered mat and thick board", "descriptive engraved caption", "physical pin and spring clip", "seeded fine-grain halation"],
  };
}

function books(res: AssetResources, root: Group, options: TravelStudyOptions): Build {
  const page = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#e6d8bd", roughness: .94 }),
    { kind: "paper", strength: .0008, frequency: 55 }));
  const gilt = material(res, "#b99752", .7, .37);
  const textile = material(res, "#5b4635", .01, .91);
  const spines = ["#5c3928", "#3e5b52", options.color ?? "#6e473c", "#493b54"];
  let y = 0;
  for (let i = 0; i < 4; i++) {
    const h = [3.6, 3.0, 4.1, 2.6][i], w = [22, 20.5, 23, 18.5][i], d = [28, 27, 29, 25][i];
    const cover = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: spines[i],
      roughness: .69, sheen: .26, sheenColor: "#ae9270" }),
    { kind: "fabric", frequency: 68, strength: .0006 }));
    const yaw = [0, -.10, .07, -.06][i];
    const volume = new Group(); volume.position.set([0, -1.2, .7, -1][i], y, [0, .9, -.3, 1.4][i]);
    volume.rotation.y = yaw; root.add(res.name(volume, `books-volume-${i + 1}`));
    add(res, volume, new RoundedBoxGeometry(w, h, d, 3, .3), cover,
      i === 3 ? "books-top-volume" : `books-cloth-binding-${i + 1}`, [0, h / 2, 0]);
    add(res, volume, new RoundedBoxGeometry(w - .7, h - .7, d - 1.1, 2, .2), page,
      `books-deckled-page-block-${i + 1}`, [.15, h / 2, .2]);
    add(res, volume, new RoundedBoxGeometry(.6, h + .12, d, 2, .23), cover,
      `books-rounded-spine-${i + 1}`, [-w / 2, h / 2, 0]);
    for (const z of [-d * .36, -d * .28, d * .30, d * .38])
      add(res, volume, new RoundedBoxGeometry(.13, h + .23, .23, 1, .06), gilt,
        `books-spine-gilt-band-${i}-${z}`, [-w / 2 - .35, h / 2, z]);
    // Fabric endbands are visible at each head/tail of the binding.
    for (const z of [-d / 2 + .5, d / 2 - .5])
      add(res, volume, new RoundedBoxGeometry(.55, .32, .25, 2, .1), textile,
        `books-headband-${i}-${z}`, [-w / 2 + .18, h - .18, z]);
    y += h + .15;
  }
  const leather = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#805038",
    roughness: .62, sheen: .25 }), { kind: "hammered", frequency: 35, strength: .001 }));
  add(res, root, new RoundedBoxGeometry(21, 1.6, 26, 5, .8), leather,
    "books-leather-travel-journal", [13, 1.2, 7.5]).rotation.y = .23;
  add(res, root, new RoundedBoxGeometry(21.3, .33, 1.1, 3, .15), gilt,
    "books-journal-strap-buckle", [13, 2.2, 7.5]).rotation.y = .23;
  return { bounds: { min: [-14, 0, -16], max: [25, y + .4, 24] },
    materials: ["woven cloth bookcase boards", "cream deckle-edge paper", "embossed gilt bands", "aged leather travel journal", "cloth endbands"],
    details: ["four individually sized bound volumes", "real page-block reveals", "rounded spines with gilt tooling", "individual headbands", "stacked offset and imperfect angles", "separate strapped travel journal"] };
}

function clock(res: AssetResources, root: Group, options: TravelStudyOptions): Build {
  const metal = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: options.color ?? "#a9a39a",
    metalness: .93, roughness: .32, clearcoat: .12 }), { kind: "brushed", flow: [0, 1, 0] }));
  const dark = material(res, "#302d29", .58, .32);
  const brass = material(res, GOLD, .9, .29);
  const face = res.own(paintTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#ece6d9"; ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = "#373632"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(0, 0, w * .44, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 60; i++) {
      const a = i * Math.PI / 30 - Math.PI / 2;
      ctx.lineWidth = i % 5 === 0 ? 8 : 3;
      const r = w * (i % 5 === 0 ? .387 : .416);
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a) * w * .435, Math.sin(a) * w * .435); ctx.stroke();
    }
    ctx.font = "bold 58px Georgia, serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#34312c";
    for (let i = 1; i <= 12; i++) {
      const a = i * Math.PI / 6 - Math.PI / 2;
      ctx.fillText(String(i), Math.cos(a) * w * .31, Math.sin(a) * w * .31);
    }
    ctx.font = "small-caps 32px Georgia, serif"; ctx.fillText("TRAVEL TIME", 0, -w * .15);
  }, { fallback: [235, 225, 207, 255], anisotropy: 16 }));
  const dial = res.own(new MeshPhysicalMaterial({ map: face, roughness: .67 }));
  add(res, root, new CylinderGeometry(8.65, 8.65, 4.2, 72).rotateX(Math.PI / 2), metal,
    "clock-machined-casing", [0, 11, 0]);
  add(res, root, new TorusGeometry(8.1, .48, 16, 96), brass,
    "clock-raised-bezel", [0, 11, 2.28]);
  add(res, root, new CircleGeometry(7.78, 96), dial, "clock-painted-enamel-face", [0, 11, 2.35]);
  for (const x of [-5, 5]) add(res, root, new SphereGeometry(1.4, 24, 14), dark,
    `clock-spherical-foot-${x}`, [x, 1.3, .5]);
  const legs = material(res, "#55473c", .74, .37);
  for (const x of [-4.5, 4.5]) rod(res, root, V(x, 1.5, .5), V(x * .8, 4.1, .3), .85, legs,
    `clock-foot-support-${x}`);
  add(res, root, new CylinderGeometry(.8, .8, 2.8, 24), brass,
    "clock-winding-crown", [0, 20.8, 0]);
  const hour = new Group(); hour.position.set(0, 11, 2.52);
  root.add(res.name(hour, "clock-hour-hand"));
  add(res, hour, new RoundedBoxGeometry(.65, 5.5, .2, 2, .14), dark, "clock-hour-blade", [0, 2.1, 0]);
  const minute = new Group(); minute.position.copy(hour.position);
  root.add(res.name(minute, "clock-minute-hand"));
  add(res, minute, new RoundedBoxGeometry(.38, 7.3, .2, 2, .13), dark, "clock-minute-blade", [0, 2.9, .18]);
  add(res, root, new SphereGeometry(.75, 20, 10), brass, "clock-hand-pivot", [0, 11, 2.8]);
  return { bounds: { min: [-9, 0, -3], max: [9, 23, 3] },
    materials: ["brushed nickel casing", "cream porcelain enamel dial", "inked numerals and 60 markers", "burnished brass bezel", "dark oxidized steel hands"],
    details: ["twelve painted numeral positions", "60 minute graduations", "separate hour and minute hand pivots", "machined winding crown", "raised bezel", "cast-iron easel feet"],
    moving: { hour, minute } };
}

function lamp(res: AssetResources, root: Group, options: TravelStudyOptions): Build {
  const brass = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: options.color ?? "#c6a162",
    metalness: .98, roughness: .24, clearcoat: .21 }),
  { kind: "brushed", frequency: 140, strength: .00022, flow: [0, 1, 0] }));
  const deepBrass = material(res, "#76532c", .9, .4);
  const porcelain = material(res, "#f6e5be", .08, .3);
  const black = material(res, "#211c18", .25, .78);
  const light = res.own(new MeshBasicMaterial({ color: "#ffe7ad", toneMapped: false }));
  add(res, root, new CylinderGeometry(11, 12.8, 2.1, 80), brass, "lamp-weighted-base", [0, 1.1, 0]);
  add(res, root, new TorusGeometry(10.4, .48, 14, 80), deepBrass,
    "lamp-base-concentric-ring", [0, 2.19, 0]).rotation.x = Math.PI / 2;
  add(res, root, new CylinderGeometry(3.6, 4.5, 3.3, 36), deepBrass,
    "lamp-raised-pedestal", [0, 3.7, 0]);
  add(res, root, new CylinderGeometry(1.65, 1.8, 17.4, 26), brass,
    "lamp-vertical-stand", [0, 12.9, 0]);
  const upper = new Group(); upper.position.set(0, 21.5, 0);
  root.add(res.name(upper, "lamp-articulated-upper-arm"));
  const elbow = V(-16, 19, 0), tip = V(-32, 9, 0);
  for (const z of [-1.5, 1.5]) {
    rod(res, upper, V(0, 0, z), V(elbow.x, elbow.y, z), .85, brass, `lamp-lower-parallel-rod-${z}`);
    rod(res, upper, V(elbow.x, elbow.y, z), V(tip.x, tip.y, z), .83, brass, `lamp-upper-parallel-rod-${z}`);
  }
  for (const [name, pos] of [["shoulder", V(0, 0, 0)], ["elbow", elbow], ["shade", tip]] as const) {
    add(res, upper, new CylinderGeometry(3.1, 3.1, 4.2, 38), deepBrass,
      `lamp-${name}-joint-knuckle`, pos.toArray() as unknown as Vec).rotation.x = Math.PI / 2;
    add(res, upper, new CylinderGeometry(1.45, 1.45, 4.5, 38), brass,
      `lamp-${name}-joint-axle`, pos.toArray() as unknown as Vec).rotation.x = Math.PI / 2;
  }
  // Separate tension spring coils and a loose insulated wire trace.
  for (let i = 0; i < 19; i++) {
    const t = i / 18;
    add(res, upper, new TorusGeometry(.65, .115, 6, 16), deepBrass,
      `lamp-tension-spring-turn-${i}`, [-8 - t * 4.7, 9.1 + t * 5, -2.35]);
  }
  tube(res, upper, [V(0, -1, -1), V(-5, 8, -3), V(-13, 19, -3),
    V(-20, 15, -2.4), V(-27, 9.5, -2), V(-32, 9, -1.8)], .33, black, "lamp-visible-insulated-cable");
  const shadeGroup = new Group(); shadeGroup.position.copy(tip);
  upper.add(res.name(shadeGroup, "lamp-shade-pivot"));
  const shadeProfile = [new Vector2(13.1, 0), new Vector2(13.1, .8), new Vector2(11.7, 2.9),
    new Vector2(8.8, 8), new Vector2(5.2, 15), new Vector2(3.8, 15.5)];
  const shade = add(res, shadeGroup, new LatheGeometry(shadeProfile, 96), brass,
    "lamp-spun-brass-shade");
  shade.material.side = DoubleSide;
  const reflector = add(res, shadeGroup, new LatheGeometry([
    new Vector2(12.55, .42), new Vector2(11.3, 2.7),
    new Vector2(8.35, 8.15), new Vector2(4.2, 14.9),
  ], 96), porcelain, "lamp-reflective-enamel-inner-lip");
  reflector.material.side = DoubleSide;
  add(res, shadeGroup, new SphereGeometry(3.15, 32, 20), light,
    "lamp-opal-filament-bulb", [0, 4.1, 0]);
  add(res, shadeGroup, new TorusGeometry(13, .44, 12, 96), deepBrass,
    "lamp-rolled-shade-rim", [0, .1, 0]).rotation.x = Math.PI / 2;
  add(res, shadeGroup, new CylinderGeometry(3.8, 3.8, 2.4, 28), brass,
    "lamp-top-shade-socket", [0, 16.6, 0]);
  const glow = new PointLight("#ffbb70", 9, 105, 2); glow.position.set(0, .3, 0);
  shadeGroup.add(glow);
  return { bounds: { min: [-47, 0, -15], max: [14, 52, 15] },
    materials: ["directional brushed brass", "dark oxidized joint hardware", "ivory enamel reflector", "opal diffused light", "black insulated cable"],
    details: ["lathed conical shade with rolled lip", "three real pivot joints", "dual mechanical parallelogram rods", "19 tension coil turns", "weighted concentric base", "exposed routed cable", "warm local light under the reflector"],
    moving: { adjust: upper, shade: shadeGroup } };
}

const BUILDERS: Record<TravelStudyObjectKind,
  (res: AssetResources, root: Group, options: TravelStudyOptions) => Build> = {
  chair, "world-map": worldMap, globe, photograph, "book-stack": books, clock, "desk-lamp": lamp,
};

/** Pure, inspectable hero asset factory for generic video/storytelling consumers. */
export function createTravelStudyObject(kind: TravelStudyObjectKind, options: TravelStudyOptions = {}): HeroAsset {
  if (!Object.prototype.hasOwnProperty.call(BUILDERS, kind)) throw new Error(`Unknown travel-study object: ${kind}`);
  if (options.globeRadius !== undefined && (!Number.isFinite(options.globeRadius) ||
    options.globeRadius < 5 || options.globeRadius > 28)) throw new Error("globeRadius must be between 5 and 28 cm.");
  if (options.photoVariant !== undefined && !["alpine", "coast", "old-town"].includes(options.photoVariant))
    throw new Error("Unknown photoVariant; expected alpine, coast or old-town.");
  if (options.atlasPalette !== undefined && !["sepia", "sage"].includes(options.atlasPalette))
    throw new Error("atlasPalette must be sepia or sage.");
  const res = createAssetResources();
  const root = new Group(); root.name = options.id ?? kind;
  const built = BUILDERS[kind](res, root, options);
  const rest = captureRest([root, ...Object.values(built.moving ?? {})]);
  const actions: HeroActionSpec[] = kind === "globe" ? [{ id: "spin", label: "Rotate the atlas", durationFrames: 150,
    loop: true, meaning: "Spin the globe around its fixed inclined geographic axis." }]
    : kind === "clock" ? [{ id: "tick", label: "Advance hands", durationFrames: 150, loop: false,
      meaning: "Advance independent minute and hour hands by authored frame." }]
      : kind === "desk-lamp" ? [{ id: "adjust", label: "Adjust lamp", durationFrames: 90,
        loop: false, meaning: "Move the mechanical arm and compensate the lamp shade's vertical orientation." }]
        : [];
  return {
    id: root.name, group: root, parts: res.parts, bounds: built.bounds,
    metersPerUnit: .01, tier: "hero", exposure: .94,
    studio: { palette: "sand", keyAzimuth: -42, rimColor: "#f6d4a4" },
    craft: { materials: built.materials, details: built.details,
      ...(kind === "photograph" ? { stylization: "Original painterly travel art, deliberately not presented as licensed photography." } : {}) },
    actions,
    pose(state) {
      rest.restore();
      if (!state.id) return;
      const action = actions.find(a => a.id === state.id);
      if (!action) throw new Error(`Unsupported ${kind} action: ${state.id}`);
      const t = actionTime(action, state.frame, state.fps);
      if (kind === "globe") built.moving!.spin.rotation.y = t * Math.PI * 2;
      if (kind === "clock") {
        built.moving!.hour.rotation.z = -Math.PI / 3 - t * .24;
        built.moving!.minute.rotation.z = Math.PI / 4 - t * Math.PI * 2;
      }
      if (kind === "desk-lamp") {
        const a = smooth(t) * .17;
        built.moving!.adjust.rotation.z = a;
        built.moving!.shade.rotation.z = -a;
      }
    },
    dispose: res.dispose,
  };
}
