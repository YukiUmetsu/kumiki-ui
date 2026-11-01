/** Art-directed travel-study furniture and ephemera, in centimeters (+Y up).
 * All construction and printed imagery is original, except coast/country
 * polygons transformed from Natural Earth public-domain geographic data.
 * No loaders, external image requests, clocks, or renderer ownership.
 */
import {
  BoxGeometry, CatmullRomCurve3, CircleGeometry, CylinderGeometry, DoubleSide, Group,
  InstancedMesh, LatheGeometry, Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, PlaneGeometry, PointLight,
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

export type TravelStudyObjectKind = "chair" | "world-map" | "globe" | "photograph" | "travel-poster" |
  "book-stack" | "clock" | "desk-lamp";
export type TravelPhotoVariant = "alpine" | "coast" | "old-town";
export type TravelPosterVariant = "summit" | "coastal-route";
export interface TravelStudyOptions {
  id?: string;
  color?: string;
  /** Radius in centimeters, for both the full-size and miniature desk globe. */
  globeRadius?: number;
  photoVariant?: TravelPhotoVariant;
  posterVariant?: TravelPosterVariant;
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
    sheen: .12, clearcoat: globe ? .14 : .015,
    // The map print is only 0.2 mm in front of its paper edge. Push its
    // rasterized depth forward so long-lens film frames never swap surfaces.
    polygonOffset: !globe, polygonOffsetFactor: globe ? 0 : -1,
    polygonOffsetUnits: globe ? 0 : -3 }));
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
  const hide = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: options.color ?? "#4b2b20",
    roughness: .78, metalness: 0, sheen: .34, sheenColor: "#946449", clearcoat: .06 }),
  { kind: "hammered", frequency: 33, strength: .0013, roughnessVariation: .34, albedoVariation: .16 }));
  const piping = material(res, "#3b251e", .02, .79);
  const saddle = material(res, "#a88264", 0, .93);
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
  const photographicInk = res.own(new MeshPhysicalMaterial({ map: print, roughness: .68, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3 }));
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

function posterPainter(ctx: CanvasRenderingContext2D, w: number, h: number,
  random: () => number, variant: TravelPosterVariant) {
  const summit = variant === "summit";
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  for (const [stop, color] of (summit
    ? [[0, "#223e44"], [.48, "#b58d62"], [1, "#dcaa6d"]]
    : [[0, "#2d4b4c"], [.48, "#ac9176"], [1, "#d6a274"]]) as [number, string][])
    sky.addColorStop(stop, color);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#eccd8b";
  ctx.beginPath(); ctx.arc(w * (summit ? .71 : .32), h * .39, w * .12, 0, Math.PI * 2); ctx.fill();
  // Hand-printed screen-print layers: sharply cut silhouettes, warm transparent
  // inks and imperfect overprinting rather than a stretched stock photograph.
  const ridges = summit
    ? [[.55, "#aa8c78", .16], [.69, "#6d7671", .21], [.83, "#344b48", .14]] as const
    : [[.59, "#72847f", .12], [.76, "#426a70", .13], [.87, "#264f54", .08]] as const;
  for (const [base, color, height] of ridges) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, h);
    ctx.lineTo(0, h * (base - height * .15));
    for (let x = 0; x <= w; x += 12) {
      const u = x / w;
      const ridge = Math.sin(u * 11 + base * 5) * .36 + Math.sin(u * 27 + 2) * .16;
      ctx.lineTo(x, h * (base + ridge * height));
    }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  }
  if (summit) {
    ctx.fillStyle = "#203b3b";
    for (let i = 0; i < 17; i++) {
      const x = i * w / 15 - w * .05, y = h * (.77 + random() * .09);
      ctx.beginPath(); ctx.moveTo(x, y - 95 - random() * 85);
      ctx.lineTo(x - 25 - random() * 14, y + 35);
      ctx.lineTo(x + 25 + random() * 14, y + 35); ctx.fill();
    }
  } else {
    // A winding golden coast road descends into the evening sea.
    ctx.strokeStyle = "#eac68c"; ctx.lineWidth = 52; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(w * .85, h * 1.1);
    ctx.bezierCurveTo(w * -.2, h * .87, w * 1.17, h * .82, w * .5, h * .7);
    ctx.stroke();
    ctx.strokeStyle = "#c6a474"; ctx.lineWidth = 5; ctx.stroke();
  }
  ctx.fillStyle = "rgba(240,220,171,.94)"; ctx.textAlign = "center";
  ctx.font = `bold ${summit ? 122 : 87}px Georgia, serif`;
  ctx.fillText(summit ? "WANDER" : "THE LONG WAY", w / 2, h * .145);
  ctx.font = "500 37px Georgia, serif";
  ctx.fillText(summit ? "FIND YOUR NORTHERN LIGHT" : "COASTS · CITIES · OPEN ROADS", w / 2, h * .188);
  ctx.font = "bold 31px Georgia, serif";
  ctx.fillText(summit ? "EST. 1936   /   ALPINE ROUTES" : "TRAVEL NOTES   /   VOL. 07", w / 2, h * .946);
  ctx.strokeStyle = "rgba(240,220,171,.85)"; ctx.lineWidth = 4;
  ctx.strokeRect(26, 27, w - 52, h - 54);
  for (let i = 0; i < 12000; i++) {
    const x = random() * w, y = random() * h;
    ctx.fillStyle = `rgba(48,34,24,${random() * .14})`;
    ctx.fillRect(x, y, 1 + random() * 4, 1 + random() * 4);
  }
}

function poster(res: AssetResources, root: Group, options: TravelStudyOptions): Build {
  const variant = options.posterVariant ?? "summit";
  const texture = res.own(paintTexture(900, 1300,
    (ctx, w, h, random) => posterPainter(ctx, w, h, random, variant),
    { seed: variant === "summit" ? 41 : 73, anisotropy: 16, fallback: [90, 111, 99, 255] }));
  const ink = res.own(new MeshPhysicalMaterial({ map: texture, roughness: .83,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3 }));
  const board = material(res, "#d7c49e", .02, .92);
  const wood = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#523625",
    roughness: .53, clearcoat: .18 }), { kind: "brushed", strength: .0005 }));
  const brass = material(res, "#b38e5f", .9, .35);
  add(res, root, new RoundedBoxGeometry(36, 54, 1, 3, .16), wood, "poster-wooden-poster-frame");
  add(res, root, new RoundedBoxGeometry(34.5, 52.5, .15, 2, .05), board,
    "poster-aged-mat-inset", [0, 0, .59]);
  add(res, root, new PlaneGeometry(33.5, 51.5), ink, "poster-original-letterpress-art", [0, 0, .72]);
  for (const x of [-17.4, 17.4]) for (const y of [-26.4, 26.4])
    add(res, root, new SphereGeometry(.36, 12, 10), brass, `poster-brass-corner-tack-${x}-${y}`, [x, y, .63]);
  add(res, root, new CylinderGeometry(.66, .66, .2, 24), brass,
    "poster-upper-center-hanging-stud", [0, 27.1, .44]).rotation.x = Math.PI / 2;
  return { bounds: { min: [-18.1, -27.1, -.6], max: [18.1, 27.1, .85] },
    materials: ["original three-ink screen print", "aged heavyweight paper", "walnut picture frame", "antique brass tacks"],
    details: ["distinct illustrated travel destination", "hand-set period typography", "layered topographic silhouettes", "ink grain and slight screen-print texture", "mat reveal and four physical fastening tacks"] };
}

function books(res: AssetResources, root: Group, options: TravelStudyOptions): Build {
  const paperPatina = res.own(paintTexture(1024, 1024, (ctx, w, h, random) => {
    const parchment = ctx.createLinearGradient(0, 0, w, h);
    parchment.addColorStop(0, "#d9ccae"); parchment.addColorStop(.56, "#bfae8d");
    parchment.addColorStop(1, "#d4c5a6");
    ctx.fillStyle = parchment; ctx.fillRect(0, 0, w, h);
    // Bookpaper darkens irregularly at the deckled fore-edge; small foxing
    // marks and visible cotton fibres survive close macro shots.
    for (let i = 0; i < 9500; i++) {
      const x = random() * w, y = random() * h;
      ctx.fillStyle = `rgba(91,67,39,${random() * .105})`;
      ctx.fillRect(x, y, 1 + random() * 6, .35 + random() * 2.5);
    }
    for (let i = 0; i < 78; i++) {
      const x = random() * w, y = random() * h;
      const radius = 1.5 + random() * 5;
      ctx.fillStyle = `rgba(119,71,34,${.055 + random() * .11})`;
      ctx.beginPath(); ctx.ellipse(x, y, radius * 1.7, radius, random(), 0, Math.PI * 2); ctx.fill();
    }
  }, { seed: 703, anisotropy: 16, fallback: [214, 194, 158, 255] }));
  const page = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ map: paperPatina,
    roughness: .96 }), { kind: "paper", strength: .001, frequency: 58, albedoVariation: .18 }));
  const strata = material(res, "#a99373", .01, .98);
  const gilt = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#b49351",
    metalness: .68, roughness: .39 }), { kind: "brushed", strength: .00018 }));
  const darkFoil = material(res, "#594328", .28, .66);
  const endband = material(res, "#b19a77", 0, .88);
  const colors = ["#42281d", "#34463b", options.color ?? "#532b25", "#373038"];
  const titles = [
    ["THE WORLD", "ATLAS"], ["WANDERING", "ROUTES"],
    ["FIELD", "JOURNAL"], ["THE GRAND", "TOUR"],
  ];
  const roman = ["I", "II", "III", "IV"];
  // Four tall, differently sized folios stand on their tail edges, as in the
  // reference. Their bookboards are *separate* rigid shells around a recessed
  // textblock; the spines face +Z toward the seated reader.
  for (let i = 0; i < 4; i++) {
    const n = i + 1;
    const h = [34.6, 38.8, 32.2, 36.9][i];
    const t = [5.3, 5.7, 4.8, 5.6][i];
    const d = [23.4, 25.2, 22.8, 24.1][i];
    const cloth = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: colors[i],
      roughness: .82, sheen: .16, sheenColor: "#97734f", clearcoat: .025 }),
    { kind: i % 2 ? "fabric" : "hammered", frequency: 30, strength: .0014,
      roughnessVariation: .42, albedoVariation: .27 }));
    const volume = new Group();
    volume.position.set([-9.2, -3.0, 2.9, 8.2][i], 0, [.4, -.7, 1.1, -.4][i]);
    volume.rotation.set(0, [.045, -.065, .07, -.045][i], [.012, -.036, .025, -.022][i]);
    root.add(res.name(volume, `books-folio-${n}-binding`));
    add(res, volume, new RoundedBoxGeometry(t - .92, h - 1.35, d - 1.35, 4, .12), page,
      `books-folio-${n}-sewn-textblock`, [0, h / 2, -.3]);
    for (const side of [-1, 1]) {
      const outerX = side * (t / 2 - .17);
      add(res, volume, new RoundedBoxGeometry(.43, h + .3, d + .6, 4, .14), cloth,
        `books-folio-${n}-${side < 0 ? "front" : "back"}-board`, [outerX, h / 2, -.08]);
      // A double blind-tooled border follows the board, rather than a decal
      // that would disappear under glancing product lighting.
      for (const z of [-d / 2 + 1.7, d / 2 - 2.1])
        add(res, volume, new RoundedBoxGeometry(.075, h - 2.2, .085, 2, .035),
          darkFoil, `books-folio-${n}-board-vertical-fillet-${side}-${z}`,
          [outerX + side * .24, h / 2, z]);
      for (const y of [1.2, h - 1.2])
        add(res, volume, new RoundedBoxGeometry(.075, .085, d - 3.9, 2, .035),
          gilt, `books-folio-${n}-board-horizontal-fillet-${side}-${y}`,
          [outerX + side * .24, y, -.2]);
    }
    // Original decorative calf-board tooling with translucent worn foil.
    // The bookboard remains a real solid under its foil stamp; the image is
    // only the ink/leaf impression, not a photograph of a whole book.
    const foilTexture = res.own(paintTexture(650, 1040, (ctx, w, hh, random) => {
      ctx.clearRect(0, 0, w, hh);
      ctx.strokeStyle = "rgba(209,174,98,.85)"; ctx.lineWidth = 7;
      ctx.strokeRect(37, 37, w - 74, hh - 74);
      ctx.strokeRect(53, 56, w - 106, hh - 112);
      const cx = w / 2, cy = hh * .48;
      ctx.beginPath(); ctx.arc(cx, cy, 99, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 73, 0, Math.PI * 2); ctx.stroke();
      for (let spoke = 0; spoke < 16; spoke++) {
        const a = spoke * Math.PI / 8;
        const len = spoke % 2 ? 54 : 90;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len); ctx.stroke();
      }
      ctx.fillStyle = "rgba(218,186,116,.89)"; ctx.textAlign = "center";
      ctx.font = "bold 45px Georgia, serif";
      ctx.fillText("THE TRAVEL ARCHIVE", cx, hh * .22, w - 130);
      ctx.font = "italic 34px Georgia, serif";
      ctx.fillText(`VOLUME ${roman[i]}  ·  1908`, cx, hh * .79);
      for (let scratch = 0; scratch < 650; scratch++) {
        const x = random() * w, y = random() * hh;
        ctx.clearRect(x, y, .5 + random() * 3, 1 + random() * 6);
      }
    }, { seed: 241 + i * 71, anisotropy: 16, fallback: [0, 0, 0, 0] }));
    const foil = res.own(new MeshPhysicalMaterial({ map: foilTexture, transparent: true,
      depthWrite: false, metalness: .49, roughness: .51,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
    const outerX = t / 2 + .12;
    add(res, volume, new PlaneGeometry(d - 2.8, h - 3.5), foil,
      `books-folio-${n}-cover-foil-stamp`, [outerX, h / 2, -.17]).rotation.y = Math.PI / 2;
    add(res, volume, new PlaneGeometry(d - 2.8, h - 3.5), foil,
      `books-folio-${n}-back-cover-foil-stamp`, [-outerX, h / 2, -.17]).rotation.y = -Math.PI / 2;
    add(res, volume, new RoundedBoxGeometry(t + .3, h + .32, 1.4, 5, .42), cloth,
      `books-folio-${n}-rounded-leather-spine`, [0, h / 2, d / 2 - .27]);
    // Cover joints/hinges are visibly recessed beside the rounded backbone.
    for (const x of [-t / 2 + .12, t / 2 - .12])
      tube(res, volume, [V(x, .9, d / 2 - 1.09), V(x, h * .52, d / 2 - 1.09),
        V(x, h - .9, d / 2 - 1.09)], .10, darkFoil,
      `books-folio-${n}-joint-groove-${x}`);
    // Historic raised sewing supports: the shoulder bulges in the leather,
    // with a fine gold line on either side of each broad rib.
    for (let j = 0; j < 5; j++) {
      const y = h * [.085, .18, .45, .83, .925][j];
      add(res, volume, new RoundedBoxGeometry(t + .53, .69, 1.62, 3, .26), cloth,
        `books-folio-${n}-raised-band-${j}`, [0, y, d / 2 - .13]);
      for (const dy of [-.40, .40])
        add(res, volume, new RoundedBoxGeometry(t + .48, .12, 1.7, 2, .055), gilt,
          `books-folio-${n}-gilt-band-fillet-${j}-${dy}`, [0, y + dy, d / 2 - .12]);
    }
    // Spine label is a real inked pigment surface with hand-set serif type,
    // compass stamp, volume number and uneven calf-grain flecks.
    const titleMap = res.own(paintTexture(540, 1200, (ctx, w, hh, random) => {
      ctx.fillStyle = "#3e2a23"; ctx.fillRect(0, 0, w, hh);
      const glow = ctx.createLinearGradient(0, 0, w, 0);
      glow.addColorStop(0, "#5a3c2c"); glow.addColorStop(.5, "#7b4e36"); glow.addColorStop(1, "#412921");
      ctx.globalAlpha = .65; ctx.fillStyle = glow; ctx.fillRect(0, 0, w, hh); ctx.globalAlpha = 1;
      ctx.strokeStyle = "#bc9955"; ctx.lineWidth = 10;
      ctx.strokeRect(24, 25, w - 48, hh - 50);
      ctx.strokeRect(36, 39, w - 72, hh - 78);
      ctx.fillStyle = "#d8bc76"; ctx.textAlign = "center";
      ctx.font = "bold 64px Georgia, serif";
      ctx.fillText(titles[i][0], w / 2, hh * .43, w - 90);
      ctx.font = "bold 79px Georgia, serif";
      ctx.fillText(titles[i][1], w / 2, hh * .58, w - 80);
      ctx.font = "italic 57px Georgia, serif";
      ctx.fillText(`VOL. ${roman[i]}`, w / 2, hh * .83);
      ctx.beginPath(); ctx.arc(w / 2, hh * .19, 72, 0, Math.PI * 2); ctx.stroke();
      for (let a = 0; a < 8; a++) {
        const angle = a * Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(w / 2, hh * .19);
        ctx.lineTo(w / 2 + Math.sin(angle) * (a % 2 ? 41 : 70),
          hh * .19 - Math.cos(angle) * (a % 2 ? 41 : 70)); ctx.stroke();
      }
      for (let j = 0; j < 3500; j++) {
        ctx.fillStyle = `rgba(19,10,7,${random() * .13})`;
        ctx.fillRect(random() * w, random() * hh, 1 + random() * 3, 1 + random() * 3);
      }
    }, { seed: n * 37, anisotropy: 16, fallback: [74, 42, 35, 255] }));
    const label = res.own(new MeshPhysicalMaterial({ map: titleMap, roughness: .72,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3 }));
    add(res, volume, new PlaneGeometry(t - .56, h * .345), label,
      `books-folio-${n}-spine-title`, [0, h * .642, d / 2 + .47]);
    // Silk-wrapped head and tail bands, with alternating thread picks.
    for (const [name, y] of [["headband", h - .51], ["tailband", .51]] as const) {
      add(res, volume, new RoundedBoxGeometry(t - .83, .42, .61, 2, .17), endband,
        `books-folio-${n}-${name}`, [0, y, d / 2 - .98]);
      for (let pick = 0; pick < 14; pick++)
        add(res, volume, new RoundedBoxGeometry(.16, .36, .06, 2, .03),
          pick % 2 ? gilt : cloth, `books-folio-${n}-${name}-sewn-pick-${pick}`,
          [-t / 2 + .63 + pick * (t - 1.26) / 13, y, d / 2 - .65]);
    }
    // Deckle-edge relief: 72 individually visible signatures across the
    // thickness, at both the upper head and the outer fore edge. Instancing
    // keeps the many real page edges inexpensive to render.
    const leaves = res.own(new BoxGeometry(.022, .023, d - 1.95));
    const fore = res.own(new BoxGeometry(.022, h - 1.6, .022));
    const topEdges = new InstancedMesh(leaves, strata, 72);
    const foreEdges = new InstancedMesh(fore, strata, 72);
    for (let leaf = 0; leaf < 72; leaf++) {
      const x = -t / 2 + .52 + leaf * (t - 1.04) / 71;
      topEdges.setMatrixAt(leaf, new Matrix4().makeTranslation(x,
        h - .62 + .018 * Math.sin(leaf * 2.5 + i), -.34));
      foreEdges.setMatrixAt(leaf, new Matrix4().makeTranslation(x,
        h / 2, -d / 2 + .45 + .017 * Math.sin(leaf * 1.9 + i)));
    }
    topEdges.instanceMatrix.needsUpdate = true; foreEdges.instanceMatrix.needsUpdate = true;
    volume.add(res.name(topEdges, `books-folio-${n}-individual-page-edges`));
    volume.add(res.name(foreEdges, `books-folio-${n}-fore-edge-signatures`));
    // Slightly frayed ribbon markers protrude from different volumes.
    if (i % 2 === 0) {
      const ribbon = material(res, i ? "#a38464" : "#874a3e", .01, .8);
      add(res, volume, new RoundedBoxGeometry(.72, 2.8, .07, 2, .025), ribbon,
        `books-folio-${n}-bookmark-ribbon`, [0, h + .5, -d * .16]).rotation.z = -.09;
    }
  }
  const leather = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#4b3024",
    roughness: .73, sheen: .28, sheenColor: "#9c6b4d" }),
  { kind: "hammered", frequency: 36, strength: .0012, albedoVariation: .16 }));
  const journal = new Group(); journal.position.set(18.5, .1, 9.5);
  journal.rotation.y = -.16; root.add(res.name(journal, "books-strapped-travel-journal"));
  add(res, journal, new RoundedBoxGeometry(22.7, .42, 29.2, 4, .15), leather,
    "books-journal-lower-board", [0, .28, 0]);
  add(res, journal, new RoundedBoxGeometry(21.8, 1.43, 28.2, 4, .12), page,
    "books-journal-visible-page-block", [0, 1.16, -.16]);
  add(res, journal, new RoundedBoxGeometry(22.7, .58, 29.2, 4, .20), leather,
    "books-top-volume", [0, 2.07, 0]);
  add(res, journal, new RoundedBoxGeometry(1.8, 2.5, 29.4, 4, .40), leather,
    "books-journal-rounded-spine", [-10.8, 1.25, 0]);
  // Continuous blind-tooled inner panel and an independently rendered label.
  for (const x of [-8.8, 8.8])
    add(res, journal, new RoundedBoxGeometry(.10, .07, 23.5, 2, .04), gilt,
      `books-journal-gilt-long-border-${x}`, [x, 2.41, 0]);
  for (const z of [-11.8, 11.8])
    add(res, journal, new RoundedBoxGeometry(17.6, .07, .10, 2, .04), gilt,
      `books-journal-gilt-short-border-${z}`, [0, 2.41, z]);
  const journalMap = res.own(paintTexture(640, 850, (ctx, w, h) => {
    ctx.fillStyle = "#513426"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#b99b63"; ctx.lineWidth = 7; ctx.strokeRect(28, 29, w - 56, h - 58);
    ctx.fillStyle = "#d8bb79"; ctx.textAlign = "center";
    ctx.font = "bold 65px Georgia, serif"; ctx.fillText("FIELD NOTES", w / 2, h * .40);
    ctx.font = "italic 40px Georgia, serif"; ctx.fillText("Journeys & Observations", w / 2, h * .51);
    ctx.font = "bold 34px Georgia, serif"; ctx.fillText("ARCHIVE · 1908", w / 2, h * .78);
    ctx.beginPath(); ctx.arc(w / 2, h * .23, 55, 0, 2 * Math.PI); ctx.stroke();
  }, { seed: 92, fallback: [70, 47, 33, 255], anisotropy: 16 }));
  const labelMat = res.own(new MeshPhysicalMaterial({ map: journalMap, roughness: .78,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
  add(res, journal, new PlaneGeometry(16.1, 20.5), labelMat,
    "books-journal-stamped-title", [0, 2.43, 0]).rotation.x = -Math.PI / 2;
  const strap = material(res, "#71462f", .02, .78);
  add(res, journal, new RoundedBoxGeometry(23.2, .28, 1.75, 3, .17), strap,
    "books-journal-leather-closure-strap", [0, 2.57, 9.4]);
  add(res, journal, new TorusGeometry(1.13, .21, 12, 40), gilt,
    "books-journal-cast-brass-buckle", [6.6, 2.73, 9.4]).rotation.x = Math.PI / 2;
  add(res, journal, new RoundedBoxGeometry(.42, .19, 1.8, 2, .09), gilt,
    "books-journal-buckle-tongue", [6.6, 2.79, 9.4]);
  add(res, journal, new RoundedBoxGeometry(.55, .12, 5.5, 2, .04), strap,
    "books-journal-hanging-bookmark", [3.2, 1.25, 15.1]);
  return { bounds: { min: [-16, -.4, -15.2], max: [32, 41, 25.8] },
    materials: ["pebbled calf and woven buckram boards", "linen and marbled paper signatures",
      "aged cream rag-paper textblocks", "raised sewing-support leather ribs", "gilt tooling and printed spine labels",
      "silk-wrapped endbands", "strap-bound dark leather field journal"],
    details: ["four asymmetrically leaning upright folios", "distinct front and back case boards and rounded spines",
      "twenty physical raised bands plus forty gilt fillets", "original labeled spine typography and compass seals",
      "288 instanced deckled head edges and 288 fore-edge signatures", "hand-sewn alternating silk head and tail bands",
      "double-fillet tooling on case boards and hinges", "bookmark ribbons and weathered leather grain",
      "separate journal textblock, gilt borders, closure strap, buckle and title stamp"] };
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
  chair, "world-map": worldMap, globe, photograph, "travel-poster": poster,
  "book-stack": books, clock, "desk-lamp": lamp,
};

/** Pure, inspectable hero asset factory for generic video/storytelling consumers. */
export function createTravelStudyObject(kind: TravelStudyObjectKind, options: TravelStudyOptions = {}): HeroAsset {
  if (!Object.prototype.hasOwnProperty.call(BUILDERS, kind)) throw new Error(`Unknown travel-study object: ${kind}`);
  if (options.globeRadius !== undefined && (!Number.isFinite(options.globeRadius) ||
    options.globeRadius < 5 || options.globeRadius > 28)) throw new Error("globeRadius must be between 5 and 28 cm.");
  if (options.photoVariant !== undefined && !["alpine", "coast", "old-town"].includes(options.photoVariant))
    throw new Error("Unknown photoVariant; expected alpine, coast or old-town.");
  if (options.posterVariant !== undefined && !["summit", "coastal-route"].includes(options.posterVariant))
    throw new Error("Unknown posterVariant; expected summit or coastal-route.");
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
