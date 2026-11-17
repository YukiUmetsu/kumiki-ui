/**
 * GEO1 rendering: a terrain heightfield seen from a camera on (or above) the land, under SKY1's physical atmosphere.
 *
 * - Rays march over the heightfield (`terrainHeightAt` plus fine detail below the grid, so near ridges stay crisp).
 * - Ground covers follow the height, the slope and the aspect, as on real mountains:
 *   - snow above the snowline for the latitude (`snowlineAt`), lower on shaded slopes, holding only on slopes under
 *     about 50°;
 *   - bare rock on faces steeper than about 38°, and scree at the angle of repose below cliffs;
 *   - meadow between the treeline (`treelineAt`) and the snow, forest below it on slopes the trees can hold;
 *   - sand and sandstone for dunes and mesas, dark basalt and ash for volcanoes, water below sea level.
 * - Light is SKY1's: sunlight reddened by the air it crossed (`atmosphere().sunlight`), the sky's irradiance on each
 *   slope, terrain shadows marched toward the sun, a little bounce, and aerial perspective
 *   (`atmosphere().aerial`) that fades and blues distant ranges by the real air between.
 */
import { createRaster, downsample, encodeSrgb, fbm, linearOf, ridged, worley } from "../anatomy/foundation-raster";
import type { RGB3 } from "../anatomy/foundation-raster";
import { atmosphere } from "./sky-atmosphere";
import { findGroundCover, snowlineAt, treelineAt } from "./geo-data";
import type { TerrainKind } from "./geo-data";
import { terrainHeightAt, terrainHeightfield } from "./geo-terrain";
import type { Heightfield, TerrainOptions } from "./geo-terrain";

export interface TerrainRenderOptions extends TerrainOptions {
  width?: number; height?: number; supersample?: number;
  /** Sun height and direction (degrees; azimuth 0 = behind the camera's view to the north, i.e. lighting faces toward the camera… see `sunAzimuth` notes). */
  sunElevation?: number;
  /** Sun azimuth relative to the view, degrees: 0 the sun behind the camera, 90 from the right, 180 against the light. */
  sunAzimuth?: number;
  /** Latitude, degrees: sets the snowline and the treeline. Default 46 (the Alps). */
  latitude?: number;
  /** Season: snow cover lowered in winter (0 summer … 1 winter). Default 0.25. */
  winter?: number;
  /** Visibility, km (SKY1 haze). Default 60. */
  visibilityKm?: number;
  /** Camera: where along the near edge (0 … 1 across), height above the ground (m), heading and pitch (degrees), field of view. */
  camera?: { across?: number; back?: number; above?: number; heading?: number; pitch?: number; fov?: number };
  /** A heightfield already built (else one is built from the options). */
  field?: Heightfield;
  /** Exposure (default: metered like SKY1's camera). */
  exposure?: number;
}
export interface TerrainRender { width: number; height: number; rgba: Uint8ClampedArray; ms: number; snowline: number; treeline: number; field: { min: number; max: number; kind: TerrainKind } }

type V = [number, number, number];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const nrm = (a: V): V => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mix = (a: RGB3, b: RGB3, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Render a landform (or a given heightfield) as a photograph-like view. */
export function renderTerrain(o: TerrainRenderOptions = {}): TerrainRender {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const f = o.field ?? terrainHeightfield(o), kind = f.kind;
  const W = o.width ?? 480, H = o.height ?? 270, SS = Math.max(1, Math.round(o.supersample ?? 2)), w = W * SS, h = H * SS;
  const lat = o.latitude ?? 46, winter = o.winter ?? 0.25;
  const snowline = snowlineAt(lat) - 900 * winter, treeline = treelineAt(lat);
  const cell = f.span / (f.n - 1), seed = f.seed;
  // fine relief below the grid: a few metres of ridged detail, scaled to the cell, so close slopes are not smooth
  const detailAmp = Math.min(40, cell * 0.45) * (kind === "dunes" ? 0.05 : kind === "hills" ? 0.25 : kind === "mesa" ? 0.35 : 1);
  // (ridged noise crumples rock; on farmland it made every field a crumpled leaf, so hills get soft swells instead)
  const groundAt = kind === "hills"
    ? (x: number, z: number) => terrainHeightAt(f, x, z) + detailAmp * fbm(seed + 31, x / (cell * 2.2), z / (cell * 2.2), 3)
    : kind === "coast"
      ? (x: number, z: number) => { const b = terrainHeightAt(f, x, z); return b + detailAmp * (ridged(seed + 31, x / (cell * 2.2), z / (cell * 2.2), 3, 2.1, 0.5) - 0.45) * smooth(3, 12, b); }
      : (x: number, z: number) => terrainHeightAt(f, x, z) + detailAmp * (ridged(seed + 31, x / (cell * 2.2), z / (cell * 2.2), 3, 2.1, 0.5) - 0.45);
  // Forest canopy: where trees grow (below the treeline, on slopes under about 35°, not on dunes, mesas or the coast)
  // the surface the eye meets is the crowns, about 15–25 m above the ground: a canopy layer of crowns about 8 m across.
  const forestKinds = kind === "alpine" || kind === "u-valley" || kind === "v-valley" || kind === "hills" || kind === "volcano";
  const canopy = new Float32Array(f.n * f.n), conifers = kind !== "hills", crownA = conifers ? 4.5 : 7, crownB = conifers ? 7 : 12;
  if (forestKinds) for (let j = 1; j < f.n - 1; j++) for (let i = 1; i < f.n - 1; i++) {
    const k = j * f.n + i, hgt = f.h[k], sx2 = (f.h[k + 1] - f.h[k - 1]) / (2 * cell), sz2 = (f.h[k + f.n] - f.h[k - f.n]) / (2 * cell), slope2 = (Math.atan(Math.hypot(sx2, sz2)) * 180) / Math.PI;
    const ash = kind === "volcano" ? smooth(f.min + (f.max - f.min) * 0.1, f.min + (f.max - f.min) * 0.22, hgt) : 0;
    canopy[k] = 20 * (1 - smooth(treeline - 150, treeline + 40, hgt)) * (1 - smooth(30, 38, slope2)) * (1 - ash) * (kind === "hills" ? (fbm(seed + 23, (i * cell) / 260, (j * cell) / 260, 3) > 0.32 ? 1 : 0) : fbm(seed + 23, (i * cell) / 60, (j * cell) / 60, 3) > -0.25 ? 1 : 0);
  }
  const canopyAt = (x: number, z: number) => {
    if (!forestKinds) return 0;
    const gx = (x / f.span) * (f.n - 1), gz = (z / f.span) * (f.n - 1);
    if (gx < 0 || gz < 0 || gx >= f.n - 1 || gz >= f.n - 1) return 0;
    const i = Math.floor(gx), j = Math.floor(gz), u = gx - i, v = gz - j, k = j * f.n + i;
    let c0 = canopy[k] * (1 - u) * (1 - v) + canopy[k + 1] * u * (1 - v) + canopy[k + f.n] * (1 - u) * v + canopy[k + f.n + 1] * u * v;
    if (c0 < 0.5) return 0;
    // a wood's edge is a wall of full-grown trees, not a slope (the grid's ramp made every copse a cone); only toward the
    // treeline do trees grow shorter
    if (kind === "hills") { const w0 = 3 * fbm(seed + 27, x / 35, z / 35, 2); c0 = 20 * smooth(5 + w0, 9 + w0, c0); }
    // crowns of mixed sizes, the taller ones standing out: conifers on mountains are narrow cones about 4.5 and 7 m
    // across; broadleaf crowns on lowland hills are rounded, about 7 and 12 m
    const a = worley(seed + 41, x / crownA, z / crownA), b = worley(seed + 43, x / crownB, z / crownB);
    const prof = (d: number, r: number) => conifers ? Math.max(0, 1 - d / r) : Math.sqrt(Math.max(0, 1 - (d / r) ** 2));
    const da = prof(a.f1, 0.66) * (0.8 + 0.3 * a.id), db = prof(b.f1, 0.6) * (0.9 + 0.4 * b.id);
    return c0 * ((conifers ? 0.6 : 0.42) + (conifers ? 0.4 : 0.58) * Math.max(da * 0.85, db));
  };
  const heightAt = (x: number, z: number) => groundAt(x, z) + canopyAt(x, z);
  // the canopy's height without its crowns, for shadows
  const canopyBase = (x: number, z: number) => {
    const gx = (x / f.span) * (f.n - 1), gz = (z / f.span) * (f.n - 1);
    if (gx < 0 || gz < 0 || gx >= f.n - 1 || gz >= f.n - 1) return 0;
    const i = Math.floor(gx), j = Math.floor(gz), u = gx - i, v = gz - j, k = j * f.n + i;
    const c0 = canopy[k] * (1 - u) * (1 - v) + canopy[k + 1] * u * (1 - v) + canopy[k + f.n] * (1 - u) * v + canopy[k + f.n + 1] * u * v;
    return kind === "hills" ? 17 * smooth(5, 9, c0) : c0 * 0.85;
  };
  // camera: from the near (south, z = 0) side, looking north across the field
  const cam = o.camera ?? {};
  // default viewpoints: inside a range or a valley; back from a volcano, a mesa or a cliff so it stands in its land
  const BACK: Record<TerrainKind, number> = { alpine: -0.04, volcano: 0.45, shield: 0.25, cinder: 0.6, mesa: 0.02, dunes: -0.05, hills: -0.05, "u-valley": -0.05, "v-valley": -0.05, coast: -0.12 };
  const ABOVE: Record<TerrainKind, number> = { alpine: 380, volcano: 120, shield: 80, cinder: 30, mesa: 60, dunes: 30, hills: 170, "u-valley": 60, "v-valley": 120, coast: 40 };
  let cx = (cam.across ?? 0.5) * f.span, cz = -(cam.back ?? BACK[kind]) * f.span, headingDeg = cam.heading ?? 0;
  if (kind === "coast" && cam.across === undefined && cam.back === undefined) {
    // stand on the shore a little out from the cliff foot and look along the cliffs (as the photographs of chalk
    // coasts are taken): the cliffs recede on the left, the sea opens on the right
    cx = f.span * 0.08;
    let zc = f.span * 0.3;
    for (let z = f.span * 0.2; z < f.span * 0.8; z += cell * 0.5) if (terrainHeightAt(f, cx, z) > 15) { zc = z; break; }
    cz = zc - 240; headingDeg = cam.heading ?? 66;
  }
  const ground = Math.max(heightAt(cx, Math.max(0, cz)), f.sea === -Infinity ? -1e9 : f.sea);
  const cy = ground + (cam.above ?? (kind === "coast" ? 22 : ABOVE[kind]));
  const heading = (headingDeg * Math.PI) / 180, pitch = ((cam.pitch ?? (kind === "dunes" ? -9 : kind === "coast" ? -1 : kind === "hills" ? -6 : 2)) * Math.PI) / 180, fov = ((cam.fov ?? 50) * Math.PI) / 180;
  const fwd: V = nrm([Math.sin(heading) * Math.cos(pitch), Math.sin(pitch), Math.cos(heading) * Math.cos(pitch)]);
  // right-handed, y up: right = forward × up, up = right × forward
  const right = nrm([-fwd[2], 0, fwd[0]]), up = nrm([right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]]);
  // the sun relative to the view: azimuth 0 behind the camera (front light), 90 from the right, 180 into the light
  const sAz = ((o.sunAzimuth ?? 110) * Math.PI) / 180, sEl = ((o.sunElevation ?? 32) * Math.PI) / 180;
  const sunW: V = nrm([-fwd[0] * Math.cos(sAz) * Math.cos(sEl) + right[0] * Math.sin(sAz) * Math.cos(sEl), Math.sin(sEl), -fwd[2] * Math.cos(sAz) * Math.cos(sEl) + right[2] * Math.sin(sAz) * Math.cos(sEl)]);
  // SKY1's atmosphere wants the sun's azimuth about the vertical (degrees from +z toward +x)
  const atm = atmosphere({ sunElevation: o.sunElevation ?? 32, sunAzimuth: (Math.atan2(sunW[0], sunW[2]) * 180) / Math.PI, visibilityKm: o.visibilityKm ?? 60, eyeHeight: Math.max(2, cy), tableSize: 48 });
  const covers = {
    snow: linearOf(findGroundCover("fresh-snow").colour), oldSnow: linearOf(findGroundCover("old-snow").colour), granite: linearOf(findGroundCover("granite").colour),
    limestone: linearOf(findGroundCover("limestone").colour), basalt: linearOf(findGroundCover("basalt").colour), sandstone: linearOf(findGroundCover("sandstone").colour),
    sand: linearOf(findGroundCover("desert-sand").colour), grass: linearOf(findGroundCover("grass").colour), conifer: linearOf(findGroundCover("conifer-forest").colour),
    broadleaf: linearOf(findGroundCover("broadleaf-forest").colour), soil: linearOf(findGroundCover("bare-soil").colour),
  };
  // rock: dark grey-brown gneiss on a fold range (the Matterhorn's faces), white chalk on the coast, granite in valleys
  const chalk: RGB3 = [0.6, 0.59, 0.55], gneiss = mix(covers.granite, [0.06, 0.055, 0.05], 0.5) as RGB3;
  const rockOf: RGB3 = kind === "volcano" || kind === "cinder" || kind === "shield" ? covers.basalt : kind === "mesa" ? covers.sandstone : kind === "coast" ? chalk : kind === "alpine" ? gneiss : covers.granite;
  // farmland on rolling hills (after photographs of the Palouse): fields a few hundred metres across, each one crop —
  // green wheat, ripening gold, ploughed brown, pale stubble — worked along the contours, so fine stripes follow the
  // hills; a darker line where two fields meet
  const CROPS: V[] = [[0.055, 0.115, 0.035], [0.085, 0.15, 0.045], [0.3, 0.235, 0.11], [0.38, 0.315, 0.185], [0.15, 0.1, 0.06], [0.19, 0.19, 0.085]];
  const farmland = (x: number, y: number, z: number, dist: number, fine: number): V => {
    const c = worley(seed + 71, x / 260 + 0.35 * fbm(seed + 75, x / 600, z / 600, 2), z / 260);
    const crop = CROPS[Math.min(CROPS.length - 1, Math.floor(c.id * CROPS.length))];
    const rows = Math.sin((y + 2.5 * fbm(seed + 73, x / 120, z / 120, 2)) * Math.PI), k = 0.16 * (1 - smooth(600, 2400, dist));
    const edge = smooth(0.06, 0, c.f2 - c.f1);
    return crop.map(v => v * (1 + k * rows) * (0.9 + 0.2 * fine) * (1 - 0.35 * edge)) as V;
  };
  const out = createRaster(w, h);
  const tanH = Math.tan(fov / 2), aspect = w / h, maxDist = f.span * 2.6;
  const normalAt = (x: number, z: number, e: number): V => nrm([heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)]);
  const groundNormalAt = (x: number, z: number, e: number): V => nrm([groundAt(x - e, z) - groundAt(x + e, z), 2 * e, groundAt(x, z - e) - groundAt(x, z + e)]);
  // terrain shadow toward the sun: march up the sun's ray (coarse steps, growing)
  const inShadow = (x: number, y: number, z: number) => {
    // the sun is half a degree across: a soft edge a little wider than a cell, the darkest blocker along the ray kept
    let t = cell * 0.5, dark = 0;
    for (let k = 0; k < 120 && t < f.span * 1.2; k++) {
      const px = x + sunW[0] * t, py = y + sunW[1] * t, pz = z + sunW[2] * t;
      const g = terrainHeightAt(f, px, pz) + (forestKinds && t < 400 ? canopyBase(px, pz) : 0), soft = cell * 1.2 + t * 0.009;
      dark = Math.max(dark, Math.min(1, (g - py + soft * 0.5) / soft));
      if (dark >= 1) return 1;
      t += Math.max(cell * 0.4, (py - g) * 0.35);
    }
    return dark;
  };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const sx = ((i + 0.5) / w * 2 - 1) * tanH * aspect, sy = (1 - (j + 0.5) / h * 2) * tanH;
    const d = nrm([fwd[0] + right[0] * sx + up[0] * sy, fwd[1] + right[1] * sx + up[1] * sy, fwd[2] + right[2] * sx + up[2] * sy]);
    // march
    let t = 2, hit = false, prevT = t, prevGap = 0;
    for (let k = 0; k < 600 && t < maxDist; k++) {
      const px = cx + d[0] * t, py = cy + d[1] * t, pz = cz + d[2] * t, g = Math.max(heightAt(px, pz), f.sea);
      const gap = py - g;
      if (gap < 0) { hit = true; break; }
      prevT = t; prevGap = gap;
      t += Math.max(0.5 + t * 0.0015, gap * 0.45);
    }
    let col: V;
    if (hit) {
      // refine between the last point above and the first below
      let a = prevT, b = t;
      for (let k = 0; k < 8; k++) { const m = (a + b) / 2, py = cy + d[1] * m, g = Math.max(heightAt(cx + d[0] * m, cz + d[2] * m), f.sea); if (py - g > 0) a = m; else b = m; }
      t = (a + b) / 2; void prevGap;
      const px = cx + d[0] * t, pz = cz + d[2] * t, gTerr = heightAt(px, pz), water = gTerr < f.sea, py = water ? f.sea : gTerr;
      const e = Math.max(cell * 0.35, t * 0.0012);
      // water: small wind waves tilt the surface (the reflection breaks up), finer farther off
      const ws = Math.max(1.5, t * 0.004);
      const canH = water ? 0 : canopyAt(px, pz), onCanopy = canH > 0.5;
      let n: V = water ? nrm([fbm(seed + 61, px / ws, pz / (ws * 2.2), 3) * 0.08, 1, fbm(seed + 67, px / ws + 3.1, pz / (ws * 2.2), 3) * 0.08]) : onCanopy ? normalAt(px, pz, e) : groundNormalAt(px, pz, e);
      const slope = (Math.acos(Math.min(1, n[1])) * 180) / Math.PI;
      // aspect: slopes facing away from the sun keep their snow lower
      const shade = 1 - Math.max(0, dot(nrm([n[0], 0, n[2]]), nrm([sunW[0], 0, sunW[2]])));
      const nz = fbm(seed + 17, px / 180, pz / 180, 4), fine = fbm(seed + 19, px / 18, pz / 18, 3);
      // concavity: how far the ground round about stands above this point (m) — positive in gullies and couloirs,
      // negative on ridges and spurs
      const e2 = cell * 1.5, g0 = terrainHeightAt(f, px, pz);
      const conc = (terrainHeightAt(f, px + e2, pz) + terrainHeightAt(f, px - e2, pz) + terrainHeightAt(f, px, pz + e2) + terrainHeightAt(f, px, pz - e2)) / 4 - g0;
      const gully = smooth(e2 * 0.015, e2 * 0.08, conc), spur = smooth(e2 * 0.015, e2 * 0.08, -conc);
      let alb: V, canopyShade = 1, foam = 0;
      if (water) {
        // over shallows the water turns green-blue (chalk and sand under it); breaking waves whiten it near the shore in
        // lines along it
        const depth = f.sea - gTerr;
        alb = depth < 7 ? mix([0.05, 0.1, 0.095], [0.02, 0.035, 0.045], smooth(0.5, 7, depth)) : [0.02, 0.035, 0.045];
        const swash = (1 - smooth(0.05, 0.5, depth)) * smooth(-0.3, 0.3, fbm(seed + 63, px / 25, pz / 25, 2));
        const breaker = Math.exp(-(((depth - 2.2) / 0.14) ** 2)) * smooth(0.05, 0.45, fbm(seed + 65, px / 90, pz / 10, 3));
        foam = Math.min(1, swash + breaker * 0.8) * (1 - smooth(800, 3000, t) * 0.5);
        alb = mix(alb, [0.55, 0.57, 0.57], foam * 0.85);
      }
      else {
        // snow lies lower in gullies (fingers of snow down a volcano's ravines) and is blown off spurs
        const hi = py + nz * 140 + shade * 180 + gully * (kind === "volcano" ? 480 : 260) - spur * (kind === "volcano" ? 180 : 110);
        const rockK = smooth(33, 42, slope + fine * 6);
        let base: V;
        if (kind === "dunes") base = mix(covers.sand, mix(covers.sand, [0.32, 0.22, 0.13], 0.4), 0.15 + 0.15 * fine);
        else if (kind === "mesa") {
          // after Monument Valley: sandstone walls streaked by desert varnish hanging down them; red talus below with
          // ledges; a floor of red sand dotted with dark shrubs
          const varnish = smooth(0.05, 0.45, fbm(seed + 81, (px + pz) / 7, py / 160, 3)) * rockK, talus = smooth(22, 30, slope) * (1 - rockK);
          const floor = mix(mix(covers.sand, covers.sandstone, 0.7), covers.soil, 0.15 + 0.25 * nz);
          base = mix(mix(floor, [0.3, 0.13, 0.07], talus * 0.75), rockOf.map(c => c * (0.92 + 0.08 * Math.sin(py / 2.5))) as unknown as RGB3, rockK);
          base = base.map(c => c * (1 - 0.5 * varnish)) as V;
          const shrub = worley(seed + 87, px / 6, pz / 6);
          if (slope < 14 && t < 1500 && shrub.f1 < 0.16 + 0.06 * shrub.id) base = mix(base, [0.05, 0.06, 0.035], 0.75);
        }
        else {
          // vegetation by height: forest below the treeline (on slopes trees hold), meadow above, bare ground near the snow
          // (no forest on chalk downs or farmland: grass, and fields)
          const forest = kind === "coast" || kind === "hills" ? 0 : (1 - smooth(treeline - 120, treeline + 60, hi)) * (1 - smooth(32, 40, slope)) * (0.75 + 0.25 * (fbm(seed + 23, px / 40, pz / 40, 3) > -0.2 ? 1 : 0.4));
          const meadow = mix(covers.grass, covers.soil, smooth(snowline - 600, snowline - 100, hi) * 0.7);
          const green = kind === "hills" ? farmland(px, py, pz, t, fine) : mix(meadow, mix(covers.conifer, covers.broadleaf, smooth(treeline - 900, treeline - 1500, hi)), forest);
          // a volcano's cone is ash and lava; the land round its foot is green
          const ash = kind === "volcano" || kind === "cinder" || kind === "shield" ? smooth(f.min + (f.max - f.min) * 0.12, f.min + (f.max - f.min) * 0.3, py + nz * 60) : 0;
          // (a stratovolcano's scoria reads dark grey-brown, a little purple in haze, not red)
          const veg = mix(green, mix(covers.basalt, [0.1, 0.09, 0.09], 0.3 + 0.3 * nz), ash);
          // scree at the foot of rock: paler, at the angle of repose
          const scree = smooth(26, 33, slope) * (1 - rockK) * (hi > treeline - 200 ? 1 : 0.3);
          // rock with its grain: strata on a fold range (bands tilted across the face), vertical water streaks on granite
          // walls, flint bands and runnels in chalk
          const grain = kind === "alpine" ? 0.88 + 0.12 * Math.sin((py + 0.15 * px + 40 * nz + 10 * fine) / 4.5)
            : kind === "coast" ? (1 - 0.1 * smooth(0.85, 0.98, Math.sin(py * 1.7 + 4 * nz + 2 * fine))) * (0.86 + 0.14 * fbm(seed + 85, (px + pz) / 4, py / 40, 2))
              : 0.68 + 0.32 * smooth(-0.35, 0.35, fbm(seed + 83, (px + pz) / 9, py / 240, 3));
          const rockCol = rockOf.map(c => c * grain * (0.85 + 0.15 * fine)) as unknown as RGB3;
          base = mix(mix(veg, mix(rockOf, [0.42, 0.4, 0.37], 0.4), scree), rockCol, rockK);
          // a shingle beach at the foot of sea cliffs
          if (kind === "coast") base = mix(base, [0.17, 0.155, 0.14], smooth(4, 1.5, py) * (1 - rockK));
          // rock faces near by are fractured, not smooth: a little relief in the face's own plane tilts the light
          const nearR = rockK * (1 - smooth(800, 3000, t));
          if (nearR > 0.01) n = nrm([n[0] + 0.35 * nearR * fbm(seed + 95, px / 6, py / 6, 3), n[1], n[2] + 0.35 * nearR * fbm(seed + 97, pz / 6, py / 6 + 4, 3)]);
        }
        // snow: above the snowline (ragged, lower on shaded faces), holding only where the slope allows
        // (wind scours ridges and the snow thins to patches with rock showing through near the snowline)
        const scour = smooth(-0.35, 0.15, fbm(seed + 29, px / 60, pz / 60, 4) + (hi - snowline) / 900);
        let snowK = kind === "dunes" || kind === "mesa" || kind === "coast" || kind === "hills" ? 0 : smooth(snowline - 40, snowline + 60, hi + fine * 70) * (1 - smooth(44, 54, slope + fine * 10)) * scour;
        // faces too steep for a cover (45–75°) still hold snow on ledges along the strata and down the couloirs, as on a
        // north face: bands and streaks of white over dark rock
        if (snowK < 1 && kind !== "dunes" && kind !== "mesa" && kind !== "coast" && kind !== "hills") {
          const ledge = smooth(0.3, 0.8, Math.sin((py + 0.15 * px + 40 * nz + 14 * fine) / 3.2)) * smooth(-0.1, 0.3, fbm(seed + 91, (px + pz) / 80, py / 10, 3));
          const steep = smooth(42, 50, slope) * (1 - smooth(72, 82, slope));
          snowK = Math.max(snowK, steep * smooth(snowline - 250, snowline + 120, hi) * Math.min(1, ledge + gully * 1.3) * 0.95);
        }
        alb = mix(base, mix(covers.snow, covers.oldSnow, 0.35 + 0.25 * nz), snowK);
        // the crowns: dark conifer and broadleaf greens, each crown a little different
        if (onCanopy) {
          // dark foliage (albedo about 0.08–0.15), each crown its own shade; deep shade in the gaps between crowns
          const a = worley(seed + 41, px / crownA, pz / crownA), b = worley(seed + 43, px / crownB, pz / crownB), id = (a.id + b.id) / 2;
          alb = mix(mix(covers.conifer, covers.broadleaf, conifers ? smooth(treeline - 900, treeline - 1500, hi) * 0.5 : 0.85), [0.03, 0.045, 0.03], 0.25 + 0.35 * id);
          { const g = (alb[0] + alb[1] + alb[2]) / 3; alb = mix(alb, [g, g, g], 0.15); }
          // foliage: clumps of needles or leaves about a metre across, lit or in shade (near; far off they average out)
          const near = 1 - smooth(120, 700, t), leaf = fbm(seed + 47, px / 1.1, pz / 1.1, 3);
          alb = alb.map(c => c * (1 + 0.6 * leaf * near)) as V;
          n = nrm([n[0] + 0.45 * near * fbm(seed + 49, px / 1.4, pz / 1.4, 2), n[1], n[2] + 0.45 * near * fbm(seed + 53, px / 1.4 + 7, pz / 1.4, 2)]);
          alb = mix(alb, mix(covers.snow, covers.oldSnow, 0.4), snowK * 0.6);
          canopyShade = 0.5 + 0.5 * smooth(0.95, 0.35, Math.min(a.f1 / 0.66, b.f1 / 0.6));
        }
      }
      // light
      const sun = atm.sunlight(py, sunW[1]), sh = water ? 0 : inShadow(px, py + 1.5, pz), nl = Math.max(0, dot(n, sunW)) * (1 - sh);
      const skyAmb = atm.skyIrradiance, ambK = (0.55 + 0.45 * n[1]) / Math.PI;
      const bounce = 0.08 * (1 - n[1]);
      col = [0, 0, 0];
      // light bounced off the sunlit ground round about: strong over bright sand and snow (albedo 0.4–0.8), so their
      // shaded faces are warm and fairly light, not near-black
      const groundAlb = water ? 0.05 : (alb[0] + alb[1] + alb[2]) / 3, bounceK = groundAlb * Math.max(0, sunW[1]) * 0.5 * (1 - n[1]);
      for (let c = 0; c < 3; c++) col[c] = alb[c] * (sun[c] * nl * (0.5 + 0.5 * canopyShade) + skyAmb[c] * ambK * canopyShade + sun[c] * (bounce * 0.15 + bounceK));
      if (water) {
        // the sea or a lake: sky reflection by Fresnel
        const v: V = [-d[0], -d[1], -d[2]], cosI = Math.max(0, dot(v, n)), F = (0.02 + 0.98 * Math.pow(1 - cosI, 5)) * (1 - foam), dn = 2 * dot(d, n), rd: V = nrm([d[0] - dn * n[0], Math.abs(d[1] - dn * n[1]), d[2] - dn * n[2]]), sk = atm.sky(rd);
        for (let c = 0; c < 3; c++) col[c] = col[c] * (1 - F) + sk[c] * F;
      }
      const ap = atm.aerial(d, t);
      for (let c = 0; c < 3; c++) col[c] = col[c] * ap.t[c] + ap.add[c];
    } else {
      const sk = atm.sky(d);
      col = [sk[0], sk[1], sk[2]];
      // the sun's disc
      const cs = dot(d, sunW);
      if (cs > 0.99996) { const sl = atm.sunlight(cy, sunW[1]); for (let c = 0; c < 3; c++) col[c] += sl[c] * 40; }
    }
    const k = j * w + i;
    out.rgb[k * 3] = col[0]; out.rgb[k * 3 + 1] = col[1]; out.rgb[k * 3 + 2] = col[2]; out.alpha[k] = 1;
  }
  // metering as SKY1's camera: the light on level ground (sun and sky) to a fixed level, blended with the scene's average
  const sunEye = atm.sunlight(cy, sunW[1]), gl = sunEye[1] * Math.max(0, sunW[1]) + atm.skyIrradiance[1];
  let logSum = 0;
  for (let k = 0; k < w * h; k++) logSum += Math.log(1e-5 + 0.2126 * out.rgb[k * 3] + 0.7152 * out.rgb[k * 3 + 1] + 0.0722 * out.rgb[k * 3 + 2]);
  const meanL = Math.exp(logSum / (w * h)), fixed = 1.9 / Math.max(0.01, gl * 1.15);
  // (mostly the fixed sunny-day exposure: a frame full of dark forest stays dark, as it does to the eye)
  const exposure = o.exposure ?? Math.exp(0.3 * Math.log(0.18 / meanL) + 0.7 * Math.log(fixed));
  const fin = downsample(out, SS), rgba = encodeSrgb(fin, { toneMap: "aces", exposure });
  return { width: W, height: H, rgba, ms: (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0, snowline, treeline, field: { min: f.min, max: f.max, kind } };
}
