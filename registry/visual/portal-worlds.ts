/** Worlds to step into through a portal. Each is a self-contained Three.js scene in metres, built once and deterministically from a seed.
 *
 * `createDuskMeadow`: a meadow at golden hour. A low sun ahead backlights trees either side of a worn path, rolling hills and distant
 * ridges fade into warm haze, and the sky runs from deep blue overhead to a glowing horizon around the sun. Backlight is the choice
 * here because it draws every silhouette with a rim and gives the air depth, which is how landscape cinematography makes a place feel
 * inviting. The path runs away from the camera along -Z, so a camera that comes through the portal keeps moving forward into it.
 */
import { BackSide, BufferAttribute, Color, DirectionalLight, FogExp2, Group, HemisphereLight, Matrix4, Mesh, MeshStandardMaterial, PlaneGeometry, Quaternion, Scene, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { createCraftTree } from "../craft/environment-generator";
import { createCraftGroundVegetation } from "../craft/ground-vegetation";
import type { CraftPlacement } from "../craft/scatter-placement";

export interface PortalWorld {
  scene: Scene;
  /** A good place to arrive: just above the path, looking along it. */
  arrival: { position: readonly [number, number, number]; yaw: number };
  dispose(): void;
}

/** A small, fast, seeded random source (mulberry32). */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Smooth rolling hills, flattened into a shallow trough along the path at x = 0. */
function hills(x: number, z: number) {
  const roll = Math.sin(x * .045 + 1.3) * 1.6 + Math.sin(z * .038 - .4) * 1.4 + Math.sin((x + z) * .09) * .45 + Math.sin(x * .19 - z * .13) * .18;
  const path = Math.exp(-((x / 3.2) ** 2));
  return roll * (1 - path * .85) - path * .15 + Math.max(0, -z - 60) * .05;
}

const SKY_VERTEX = /* glsl */`varying vec3 vDir; void main() { vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }`;
const SKY_FRAGMENT = /* glsl */`
uniform vec3 uSun; uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uGlow;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 sky = mix(uHorizon, uZenith, pow(max(h, 0.0), 0.55));
  float s = max(dot(d, uSun), 0.0);
  sky += uGlow * (pow(s, 8.0) * 0.4 + pow(s, 80.0) * 1.1);
  sky += vec3(1.0, 0.92, 0.75) * smoothstep(0.9992, 0.9996, s) * 6.0;
  if (h < 0.0) sky = mix(uHorizon, uHorizon * 0.55, clamp(-h * 5.0, 0.0, 1.0));
  gl_FragColor = vec4(sky, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createDuskMeadow(seed = 7): PortalWorld {
  const scene = new Scene(), owned: Array<{ dispose(): void }> = [], random = seeded(seed);
  const sun = new Vector3(-.28, .1, -1).normalize(), horizon = new Color("#e8a77a");
  scene.fog = new FogExp2(new Color("#d39a76").getHex(), .0075);
  const sky = new Mesh(new SphereGeometry(500, 48, 24), new ShaderMaterial({ vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, side: BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: sun }, uZenith: { value: new Color("#27406e") }, uHorizon: { value: horizon }, uGlow: { value: new Color("#ffb070") } } }));
  sky.renderOrder = -1; scene.add(sky); owned.push(sky.geometry, sky.material);

  const ground = new PlaneGeometry(420, 420, 220, 220);
  ground.rotateX(-Math.PI / 2);
  const pos = ground.getAttribute("position"), colors = new Float32Array(pos.count * 3);
  const grass = [new Color("#3f5a2a"), new Color("#62763a"), new Color("#8a8a48")], dirt = new Color("#a48a62"), c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = hills(x, z);
    pos.setY(i, y);
    const n = (Math.sin(x * .7 + z * .3) + Math.sin(x * .23 - z * .61) + Math.sin(x * 1.9 + z * 1.3) * .4) / 2.4 * .5 + .5;
    c.copy(grass[0]).lerp(grass[1], n).lerp(grass[2], Math.max(0, n - .6) * 1.2);
    const path = Math.exp(-((x / (1.1 + .25 * Math.sin(z * .2))) ** 2));
    c.lerp(dirt, path * .85);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  ground.setAttribute("color", new BufferAttribute(colors, 3));
  ground.computeVertexNormals();
  const groundMat = new MeshStandardMaterial({ vertexColors: true, roughness: .96 });
  scene.add(new Mesh(ground, groundMat)); owned.push(ground, groundMat);

  // Distant ridges: two rings of dark hills that the haze turns blue-violet.
  for (const [radius, height, tint] of [[150, 22, "#5a5470"], [220, 40, "#6d6380"]] as const) {
    const ridge = new PlaneGeometry(radius * 2 * Math.PI, height, 256, 1), rp = ridge.getAttribute("position");
    for (let i = 0; i < rp.count; i++) {
      const u = rp.getX(i) / radius, top = rp.getY(i) > 0, a = u;
      const h = top ? height * (.45 + .35 * Math.sin(a * 5 + radius) * Math.sin(a * 2.3) + .2 * Math.sin(a * 13 + 2)) : -4;
      rp.setXYZ(i, Math.sin(a) * radius, h, -Math.cos(a) * radius);
    }
    ridge.computeVertexNormals();
    const m = new MeshStandardMaterial({ color: tint, roughness: 1, side: BackSide });
    scene.add(new Mesh(ridge, m)); owned.push(ridge, m);
  }

  // Trees either side of the path, nearer ones larger, mixed species, all from seeds.
  const trees = new Group(); scene.add(trees);
  const species = ["oak", "birch", "pine", "generic"] as const;
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1, z = 4 - i * 4.2 - random() * 2, x = side * (4.5 + random() * 9 + i * .35);
    const kind = species[Math.floor(random() * species.length)];
    const tree = createCraftTree({ schemaVersion: 1, id: `meadow-tree-${i}`, seed: seed * 100 + i, trunkLength: 3.2 + random() * 2.2, trunkRadius: .2 + random() * .1, species: kind, leafCount: 520, crown: random() > .5 ? "broad" : "slender" });
    tree.group.position.set(x, hills(x, z) - .1, z);
    tree.group.rotation.y = random() * Math.PI * 2;
    trees.add(tree.group); owned.push(tree);
  }

  // Grass and wildflowers along the path, densest where the camera travels, thinning into the distance. One instanced draw each.
  const place = (n: number, near: number, far: number, prefix: string, minX: number, maxX: number, scale: [number, number]): CraftPlacement[] => Array.from({ length: n }, (_, i) => {
    const side = random() < .5 ? -1 : 1, x = side * (minX + (maxX - minX) * random() ** 1.6), z = near - (near - far) * random() ** 1.3;
    const position = new Vector3(x, hills(x, z) - .02, z), rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), random() * Math.PI * 2);
    const k = scale[0] + (scale[1] - scale[0]) * random(), matrix = new Matrix4().compose(position, rotation, new Vector3(k, k, k));
    return { id: `${prefix}-${i}`, position, normal: new Vector3(0, 1, 0), rotation, scale: k, matrix };
  });
  for (const [spec, placements] of [
    [{ schemaVersion: 1 as const, id: "meadow-grass", seed: seed + 3, kind: "meadow-grass" as const, detail: "supporting" as const, heightScale: .55, colors: { foliage: 0x93a052 } }, place(1100, 12, -26, "grass", .55, 8, [.75, 1.3])],
    [{ schemaVersion: 1 as const, id: "far-grass", seed: seed + 4, kind: "meadow-grass" as const, detail: "background" as const, heightScale: .75, colors: { foliage: 0x9aa456 } }, place(2000, -8, -70, "far", .8, 26, [.9, 1.6])],
    [{ schemaVersion: 1 as const, id: "wildflowers", seed: seed + 5, kind: "wildflower" as const, detail: "supporting" as const, heightScale: .6, colors: { foliage: 0x7d8e48, bloom: 0xf6d98e } }, place(380, 11, -22, "flower", .8, 7, [.7, 1.1])],
  ] as const) {
    const veg = createCraftGroundVegetation(spec, placements);
    scene.add(veg.mesh); owned.push(veg);
  }

  const light = new DirectionalLight("#ffcf98", 3.1);
  light.position.copy(sun).multiplyScalar(100);
  scene.add(light, new HemisphereLight("#b4c3de", "#5e5531", .85));
  return { scene, arrival: { position: [0, hills(0, 10) + 1.6, 10], yaw: 0 }, dispose: () => owned.forEach(o => o.dispose()) };
}
