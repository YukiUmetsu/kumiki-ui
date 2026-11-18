/** A riding landscape for chase scenes: a closed trail loop over rolling ground, with GEO1 landforms on the horizon.
 *
 * - The trail is a smooth closed curve (default ≈ 1.9 km round) so a rider can run forever. Its height follows
 *   the land, smoothed over ±40 m, and the ground is graded to it across a corridor, so a gallop never meets a
 *   step. `trailFrame(s)` gives position, heading, curvature and slope at any distance along it.
 * - Near ground: a fine mesh (default 1.6 km at ≈ 4 m) with a procedural surface shader (packed dirt on the trail
 *   with two worn ruts, dry grass and bare patches off it) that adds sub-metre detail the mesh cannot carry.
 * - Horizon: a GEO1 landform (default mesas with cap rock, cliff and talus, eroded) on a 9 km coarse mesh, faded
 *   by the scene fog; the land near the trail stays open plain.
 * - `groundHeight(x, z)` reads the same heights the near mesh was built from (bilinear on its grid), so hooves,
 *   dust and the camera agree with what is drawn.
 * - Scatter: instanced sage clumps, grass tufts (swaying in the wind) and rocks, kept off the trail.
 */
import {
  BufferAttribute, CatmullRomCurve3, Color, DynamicDrawUsage, Group, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial,
  PlaneGeometry, Quaternion, Vector3, BufferGeometry,
} from "three";
import { fbm } from "../anatomy/foundation-raster";
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
import { terrainHeightAt, terrainHeightfield } from "../nature/geo-terrain";
import type { TerrainKind } from "../nature/geo-data";

export interface TrailTerrainOptions {
  seed?: number;
  /** Side of the fine near mesh (m) and its cells per side. */
  size?: number;
  segments?: number;
  /** Mean trail radius (m); the loop wanders ±25% around it. */
  radius?: number;
  /** Half-width of the graded corridor (m). */
  corridor?: number;
  /** Relief of the rolling ground near the trail (m). */
  relief?: number;
  /** Landform on the horizon (GEO1), or null for plain to the horizon. */
  horizon?: TerrainKind | null;
  palette?: Partial<TrailPalette>;
  /** Scatter counts. */
  sage?: number; grass?: number; rocks?: number;
}

export interface TrailPalette { dirt: string; dirtDark: string; grass: string; grassDry: string; sage: string; rock: string; far: string }

export const PRAIRIE_PALETTE: TrailPalette = {
  dirt: "#9a7d5e", dirtDark: "#6e543c", grass: "#7a7444", grassDry: "#a08754", sage: "#5c6650", rock: "#7e6e5e", far: "#a8714f",
};

export interface TrailFrame {
  position: Vector3;
  /** Unit heading in the ground plane (y = 0). */
  forward: Vector3;
  /** Signed curvature (1/m), + turning left. */
  curvature: number;
  /** Slope along the trail (rise over run). */
  slope: number;
}

export interface TrailTerrain {
  object: Group;
  length: number;
  groundHeight(x: number, z: number): number;
  /** Frame at distance `s` along the trail (wraps). `out` is reused to avoid allocation. */
  trailFrame(s: number, out?: TrailFrame): TrailFrame;
  /** Advance wind sway (seconds). */
  update(time: number): void;
  dispose(): void;
}

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function createTrailTerrain(options: TrailTerrainOptions = {}): TrailTerrain {
  const seed = options.seed ?? 11, size = options.size ?? 1600, seg = options.segments ?? 400, radius = options.radius ?? 300;
  const corridor = options.corridor ?? 9, relief = options.relief ?? 7, pal = { ...PRAIRIE_PALETTE, ...options.palette };
  const group = new Group(); group.name = "trail-terrain";
  const disposables: Array<{ dispose(): void }> = [];

  // ---- trail: a wandering closed loop
  const loopPoints: Vector3[] = [];
  const K = 24;
  for (let i = 0; i < K; i++) {
    const a = i / K * Math.PI * 2;
    const r = radius * (1 + .25 * fbm(seed + 3, Math.cos(a) * 1.3 + 5, Math.sin(a) * 1.3 + 5, 3));
    loopPoints.push(new Vector3(Math.cos(a) * r * 1.25, 0, Math.sin(a) * r));
  }
  const curve = new CatmullRomCurve3(loopPoints, true, "centripetal");
  // Arc length to ~0.3 m pieces: with the default 200 divisions a rider's true speed wobbles by a few percent,
  // which makes planted hooves skid against a clip timed to a constant ground speed.
  curve.arcLengthDivisions = 6000;
  curve.updateArcLengths();
  const length = curve.getLength();
  const N = Math.ceil(length / 2);
  const samples = curve.getSpacedPoints(N).slice(0, N);

  // ---- heights: rolling plain, the GEO1 horizon beyond, graded to the trail
  // 512 points over 9 km (18 m): fine enough for the mesas' cliff bands to read as cliffs, not dunes.
  const field = options.horizon === null ? null : terrainHeightfield({ kind: options.horizon ?? "mesa", seed, n: 512, span: 9000, relief: 240, rain: .12 });
  const fieldBase = field ? field.min : 0;
  const rolling = (x: number, z: number) => relief * fbm(seed, x / 420, z / 420, 4) + relief * .25 * fbm(seed + 9, x / 90, z / 90, 3);
  const horizon = (x: number, z: number) => field ? terrainHeightAt(field, x + 4500, z + 4500) - fieldBase : 0;
  // Open plain round the trail; the landforms rise only from ~2.5 km out, where haze makes them read as distant buttes.
  const open = (x: number, z: number) => smooth(radius * 8, radius * 14, Math.hypot(x, z));
  const natural = (x: number, z: number) => rolling(x, z) * (1 - open(x, z)) + Math.max(rolling(x, z), horizon(x, z)) * open(x, z);
  // Trail height: the land smoothed along the loop (±40 m), so slopes stay gentle.
  const raw = samples.map(p => natural(p.x, p.z));
  const win = 20, trailH = raw.map((_, i) => { let s = 0; for (let k = -win; k <= win; k++) s += raw[(i + k + N) % N]; return s / (2 * win + 1); });
  // Spatial hash of trail samples for nearest-point queries (only distances within ~2 cells matter).
  const cell = 24, buckets = new Map<number, number[]>(), key = (cx: number, cz: number) => (cx + 4096) * 8192 + (cz + 4096);
  samples.forEach((p, i) => { const k = key(Math.floor(p.x / cell), Math.floor(p.z / cell)); (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(i); });
  const nearest = (x: number, z: number, reach = 2) => {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
    let best = Infinity, index = -1;
    for (let dz = -reach; dz <= reach; dz++) for (let dx = -reach; dx <= reach; dx++) {
      const list = buckets.get(key(cx + dx, cz + dz));
      if (list) for (const i of list) { const d = (samples[i].x - x) ** 2 + (samples[i].z - z) ** 2; if (d < best) { best = d; index = i; } }
    }
    return { index, distance: Math.sqrt(best) };
  };
  const graded = (x: number, z: number) => {
    const h = natural(x, z), n = nearest(x, z);
    if (n.index < 0) return { h, d: Infinity };
    const w = 1 - smooth(corridor * .55, corridor * 3.2, n.distance);
    return { h: h * (1 - w) + trailH[n.index] * w, d: n.distance };
  };

  // ---- near mesh
  const near = new PlaneGeometry(size, size, seg, seg);
  near.rotateX(-Math.PI / 2);
  const pos = near.getAttribute("position") as BufferAttribute;
  const trailDist = new Float32Array(pos.count), heights = new Float32Array(pos.count);
  for (let v = 0; v < pos.count; v++) {
    const g = graded(pos.getX(v), pos.getZ(v));
    pos.setY(v, g.h); heights[v] = g.h; trailDist[v] = Math.min(g.d, 99);
  }
  near.setAttribute("trail", new BufferAttribute(trailDist, 1));
  near.computeVertexNormals();
  disposables.push(near);
  const groundHeight = (x: number, z: number) => {
    const gx = (x + size / 2) / size * seg, gz = (z + size / 2) / size * seg;
    if (gx < 0 || gz < 0 || gx >= seg || gz >= seg) return natural(x, z);
    const i = Math.floor(gx), j = Math.floor(gz), u = gx - i, w = gz - j, row = seg + 1, k = j * row + i;
    // PlaneGeometry triangulates each cell (a, b, d) and (b, c, d); interpolate on the same triangle as the mesh.
    const h00 = heights[k], h10 = heights[k + 1], h01 = heights[k + row], h11 = heights[k + row + 1];
    return u + w < 1 ? h00 + (h10 - h00) * u + (h01 - h00) * w : h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - w);
  };

  const groundMaterial = new MeshStandardMaterial({ color: "#ffffff", roughness: .96, metalness: 0 });
  groundMaterial.name = "trail-ground";
  const colors = { dirt: new Color(pal.dirt), dirtDark: new Color(pal.dirtDark), grass: new Color(pal.grass), grassDry: new Color(pal.grassDry) };
  groundMaterial.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { uDirt: { value: colors.dirt }, uDirtDark: { value: colors.dirtDark }, uGrass: { value: colors.grass }, uGrassDry: { value: colors.grassDry }, uCorridor: { value: corridor } });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float trail; varying float vTrail; varying vec3 vWorld;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvTrail = trail; vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
uniform vec3 uDirt; uniform vec3 uDirtDark; uniform vec3 uGrass; uniform vec3 uGrassDry; uniform float uCorridor;
varying float vTrail; varying vec3 vWorld;
float kmHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float kmNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(kmHash(i), kmHash(i + vec2(1, 0)), f.x), mix(kmHash(i + vec2(0, 1)), kmHash(i + vec2(1, 1)), f.x), f.y); }
float kmFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * kmNoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }`)
      .replace("#include <color_fragment>", `#include <color_fragment>
{
  vec2 w = vWorld.xz;
  float broad = kmFbm(w * 0.035), mid = kmFbm(w * 0.4), fine = kmFbm(w * 3.1), grain = kmNoise(w * 22.0);
  // Off the trail: dry grass with green swales and bare patches; on it: packed dirt with two worn ruts.
  vec3 grass = mix(uGrassDry, uGrass, smoothstep(0.35, 0.75, broad) * 0.75);
  grass *= 0.78 + 0.32 * mid + 0.18 * (fine - 0.5);
  float bare = smoothstep(0.55, 0.72, kmFbm(w * 0.12 + 7.0));
  vec3 soil = mix(uDirt, uDirtDark, 0.35 + 0.4 * (mid - 0.5)) * (0.9 + 0.2 * grain);
  float edge = uCorridor * (0.55 + 0.25 * (kmNoise(w * 0.2) - 0.5));
  float onTrail = 1.0 - smoothstep(edge, edge + 2.2 + 1.5 * fine, vTrail);
  float ruts = exp(-pow((vTrail - 1.1) / 0.35, 2.0)) * 0.22;
  vec3 col = mix(grass, soil, max(onTrail, bare * 0.6));
  col *= 1.0 - ruts * onTrail;
  diffuseColor.rgb *= col;
}`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
{
  // Sub-metre relief the mesh cannot carry: clods and tufts as a bump from the world-space noise.
  vec2 w = vWorld.xz; float e = 0.04;
  float h0 = kmFbm(w * 2.6), hx = kmFbm((w + vec2(e, 0.0)) * 2.6), hz = kmFbm((w + vec2(0.0, e)) * 2.6);
  vec3 bump = vec3(-(hx - h0) / e, 0.0, -(hz - h0) / e) * 0.035;
  normal = normalize(normal + (viewMatrix * vec4(bump, 0.0)).xyz);
}`);
  };
  disposables.push(groundMaterial);
  const nearMesh = new Mesh(near, groundMaterial);
  nearMesh.receiveShadow = true; nearMesh.name = "trail-ground";
  group.add(nearMesh);

  // ---- horizon mesh (coarse, below the near mesh where they overlap)
  if (field) {
    const farSize = 9000, farSeg = 420;
    const far = new PlaneGeometry(farSize, farSize, farSeg, farSeg);
    far.rotateX(-Math.PI / 2);
    const fp = far.getAttribute("position") as BufferAttribute;
    const fcol = new Float32Array(fp.count * 3), rock = new Color(pal.far), scrub = new Color(pal.grassDry).multiplyScalar(.85), tmp = new Color();
    for (let v = 0; v < fp.count; v++) {
      const x = fp.getX(v), z = fp.getZ(v), inNear = Math.abs(x) < size / 2 - 8 && Math.abs(z) < size / 2 - 8;
      const h = natural(x, z);
      fp.setY(v, inNear ? h - 2 : h);
      // Exposed rock in sandstone strata: bands every few metres of height, paler toward the cap rock.
      const rockiness = smooth(8, 40, h - rolling(x, z)), strata = .86 + .14 * Math.sin(h * .42) + .06 * Math.sin(h * 1.7);
      tmp.copy(scrub).lerp(rock, rockiness).multiplyScalar(mix(1, strata, rockiness));
      fcol.set([tmp.r, tmp.g, tmp.b], v * 3);
    }
    far.setAttribute("color", new BufferAttribute(fcol, 3));
    far.computeVertexNormals();
    const farMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    farMaterial.name = "trail-horizon";
    disposables.push(far, farMaterial);
    const farMesh = new Mesh(far, farMaterial);
    farMesh.name = "trail-horizon";
    group.add(farMesh);
  }

  // ---- scatter
  let s0 = seed * 7919 + 1;
  const rand = () => { s0 = (s0 * 16807) % 2147483647; return s0 / 2147483647; };
  const m = new Matrix4(), q = new Quaternion(), sc = new Vector3(), p = new Vector3(), up = new Vector3(0, 1, 0);
  const place = (mesh: InstancedMesh, count: number, minTrail: number, maxDist: number, scale: (r: () => number) => [number, number, number], sink = 0) => {
    let placed = 0, tries = 0;
    while (placed < count && tries < count * 20) {
      tries++;
      // Bias placement toward the trail where the camera sees detail.
      const anchor = samples[Math.floor(rand() * N)], d = minTrail + Math.pow(rand(), 1.6) * maxDist, a = rand() * Math.PI * 2;
      const x = anchor.x + Math.cos(a) * d, z = anchor.z + Math.sin(a) * d;
      if (Math.abs(x) > size / 2 - 2 || Math.abs(z) > size / 2 - 2) continue;
      if (nearest(x, z).distance < minTrail) continue;
      const [sx, sy, sz] = scale(rand);
      q.setFromAxisAngle(up, rand() * Math.PI * 2);
      m.compose(p.set(x, groundHeight(x, z) - sink * sy, z), q, sc.set(sx, sy, sz));
      mesh.setMatrixAt(placed++, m);
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  };
  // Sage: lumpy rounded shrubs, grey-green, darker inside.
  const sageGeo = lumpyClump(seed + 1, 6, .5, [.55, .45, .55], 2);
  const sageMat = new MeshStandardMaterial({ color: pal.sage, roughness: .92, vertexColors: true, flatShading: false });
  const sage = new InstancedMesh(sageGeo, sageMat, options.sage ?? 1100);
  place(sage, options.sage ?? 1100, corridor * .9, 140, r => { const k = .6 + r() * .9; return [k, k * (.7 + r() * .3), k]; }, .15);
  sage.receiveShadow = true; sage.name = "trail-sage";
  // Rocks.
  const rockGeo = lumpyClump(seed + 2, 1, .5, [1, .55, .8], 2);
  const rockMat = new MeshStandardMaterial({ color: pal.rock, roughness: .9, vertexColors: true, flatShading: true });
  const rocks = new InstancedMesh(rockGeo, rockMat, options.rocks ?? 900);
  place(rocks, options.rocks ?? 900, corridor * .7, 160, r => { const k = .15 + Math.pow(r(), 3) * 1.4; return [k, k, k]; }, .3);
  rocks.receiveShadow = true; rocks.name = "trail-rocks";
  // Grass tufts: crossed blades that sway.
  const tuftGeo = grassTuft(seed + 3);
  const tuftMat = new MeshStandardMaterial({ color: pal.grassDry, roughness: .85, vertexColors: true, side: 2 });
  const sway = { value: 0 };
  tuftMat.onBeforeCompile = shader => {
    shader.uniforms.uSway = sway;
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nuniform float uSway;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
float kmPhase = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;
transformed.x += position.y * position.y * 0.6 * (sin(uSway * 1.7 + kmPhase) * 0.10 + sin(uSway * 4.3 + kmPhase * 2.0) * 0.035);
transformed.z += position.y * position.y * 0.6 * sin(uSway * 1.3 + kmPhase * 1.4) * 0.06;`);
  };
  const tufts = new InstancedMesh(tuftGeo, tuftMat, options.grass ?? 7000);
  place(tufts, options.grass ?? 7000, corridor * .45, 50, r => { const k = .6 + r() * .7; return [k, k * (.6 + r() * .5), k]; });
  tufts.receiveShadow = true; tufts.name = "trail-grass";
  for (const mesh of [sage, rocks, tufts]) { mesh.instanceMatrix.setUsage(DynamicDrawUsage); group.add(mesh); }
  disposables.push(sageGeo, sageMat, rockGeo, rockMat, tuftGeo, tuftMat);

  const tangent = new Vector3();
  return {
    object: group, length, groundHeight,
    trailFrame(s, out) {
      const f = out ?? { position: new Vector3(), forward: new Vector3(), curvature: 0, slope: 0 };
      const u = ((s % length) + length) % length / length;
      curve.getPointAt(u, f.position);
      curve.getTangentAt(u, tangent);
      f.forward.set(tangent.x, 0, tangent.z).normalize();
      const ahead = curve.getTangentAt((u + 4 / length) % 1, p);
      const turn = Math.atan2(f.forward.x * ahead.z - f.forward.z * ahead.x, f.forward.x * ahead.x + f.forward.z * ahead.z);
      f.curvature = -turn / 4;
      const y = groundHeight(f.position.x, f.position.z);
      const yAhead = groundHeight(f.position.x + f.forward.x * 3, f.position.z + f.forward.z * 3);
      f.position.y = y; f.slope = (yAhead - y) / 3;
      return f;
    },
    update(time) { sway.value = time; },
    dispose() { for (const d of disposables) d.dispose(); },
  };
}

/** A clump of noise-displaced spheres merged into one geometry, darker toward its core (vertex colours). */
function lumpyClump(seed: number, lumps: number, radius: number, stretch: readonly [number, number, number], detail = 2): BufferGeometry {
  let s = seed * 48271 + 3;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const parts: Array<{ pos: Float32Array; idx: ArrayLike<number> }> = [];
  for (let k = 0; k < lumps; k++) {
    const g = new IcosahedronGeometry(radius * (lumps > 1 ? .45 + rand() * .35 : 1), detail);
    const c = lumps > 1 ? [(rand() - .5) * radius * 1.1, radius * (.25 + rand() * .45), (rand() - .5) * radius * 1.1] : [0, radius * .4, 0];
    const a = g.getAttribute("position") as BufferAttribute;
    for (let v = 0; v < a.count; v++) {
      const x = a.getX(v), y = a.getY(v), z = a.getZ(v), n = 1 + .28 * fbm(seed + k, x * 3 + k, y * 3 + z * 2, 3);
      a.setXYZ(v, (x * n * stretch[0] + c[0]), Math.max(-radius * .1, y * n * stretch[1] + c[1]), (z * n * stretch[2] + c[2]));
    }
    // Polyhedron geometries are non-indexed: three vertices per face.
    parts.push({ pos: a.array as Float32Array, idx: g.index ? g.index.array : Array.from({ length: a.count }, (_, i) => i) });
    g.dispose();
  }
  const total = parts.reduce((t, p) => t + p.pos.length / 3, 0);
  const pos = new Float32Array(total * 3), col = new Float32Array(total * 3), idx: number[] = [];
  let off = 0;
  for (const part of parts) {
    pos.set(part.pos, off * 3);
    for (let i = 0; i < part.idx.length; i++) idx.push(part.idx[i] + off);
    off += part.pos.length / 3;
  }
  let maxR = 0;
  for (let v = 0; v < total; v++) maxR = Math.max(maxR, Math.hypot(pos[v * 3], pos[v * 3 + 1] - radius * .4, pos[v * 3 + 2]));
  for (let v = 0; v < total; v++) {
    const r = Math.hypot(pos[v * 3], pos[v * 3 + 1] - radius * .4, pos[v * 3 + 2]) / maxR, k = .55 + .5 * r;
    col.set([k, k, k * .97], v * 3);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("color", new BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** A tuft of thin curved blades (one draw for thousands via instancing); colour darkens to the base. */
function grassTuft(seed: number): BufferGeometry {
  let s = seed * 69621 + 7;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const blades = 14, rows = 3, pos: number[] = [], col: number[] = [], idx: number[] = [];
  for (let b = 0; b < blades; b++) {
    // A fan of thin blades leaning out from the crown, like bunchgrass.
    const a = rand() * Math.PI * 2, lean = .35 + rand() * .6, h = .16 + rand() * .22, w = .0045 + rand() * .004;
    const dx = Math.cos(a), dz = Math.sin(a), ox = (rand() - .5) * .08, oz = (rand() - .5) * .08, base = pos.length / 3;
    for (let r = 0; r <= rows; r++) {
      const t = r / rows, y = h * t, out = lean * t * t * h, width = w * (1 - t * .9);
      for (const side of [-1, 1]) {
        pos.push(ox + dx * out - dz * width * side, y, oz + dz * out + dx * width * side);
        const k = .4 + .6 * t; col.push(k, k * .97, k * .86);
      }
      if (r < rows) { const v = base + r * 2; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
