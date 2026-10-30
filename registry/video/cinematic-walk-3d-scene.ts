/** Frame-addressable miniature globe for cinematic walking sequences.
 * Geometry and biome props live under one rotating world Group; the walker does not.
 */
import {
  BufferAttribute, Color, CylinderGeometry, Group, Mesh, MeshStandardMaterial,
  Quaternion, SphereGeometry, Vector3,
} from "three";
import type { Object3D, Texture } from "three";

export const WALK_FRAMES = 360;
export const WALK_RADIUS = 3.65;
export const WALK_WORLD_CENTER_Y = -4.55;
const WALK_SPIN = Math.PI * 1.47;
// Feet sit near the 3D globe's true highest point. World props can pass behind
// the actor in the compositing pass without changing its stationary transform.
const fixedWalkerPosition = [0, WALK_RADIUS + WALK_WORLD_CENTER_Y - .03, .42] as const;

export function walkingWorldPoseAtFrame(frame: number) {
  const f = Number.isFinite(frame) ? Math.max(0, Math.min(WALK_FRAMES - 1, Math.round(frame))) : 0;
  return {
    planetRotation: f === 0 ? 0 : -WALK_SPIN * f / (WALK_FRAMES - 1),
    walkerPosition: [...fixedWalkerPosition] as [number, number, number],
    gaitTime: f / 30,
  };
}

const modAngle = (a: number) => (a % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
function biomeColor(angle: number): Color {
  const a = modAngle(angle);
  const sand = new Color("#b69358");
  const green = new Color("#487b36");
  const stone = new Color("#626e65");
  // Traverse desert -> lush forest -> urban ground as the planet spins clockwise.
  if (a < 2.45) return sand;
  if (a < 2.77) return sand.lerp(green, (a - 2.45) / .32);
  if (a < 3.8) return green;
  if (a < 4.2) return green.lerp(stone, (a - 3.8) / .4);
  if (a < 5.72) return stone;
  return stone.lerp(sand, (a - 5.72) / (Math.PI * 2 - 5.72));
}

export function createMiniatureWorld(groundTexture?: Texture): Group {
  const world = new Group();
  world.name = "rotating-miniature-world";
  world.position.set(0, WALK_WORLD_CENTER_Y, 0);
  const geometry = new SphereGeometry(WALK_RADIUS, 112, 72);
  const positions = geometry.getAttribute("position");
  const colorArray = new Float32Array(positions.count * 3);
  const p = new Vector3();
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i);
    const angle = Math.atan2(p.y, p.x);
    const grain = Math.sin(p.x * 8.3 + Math.cos(p.z * 9.1)) * Math.cos(p.y * 12.4 + p.z * 7.3);
    const elevation = 1 + .007 * grain + .003 * Math.sin(p.x * 23 + p.y * 14);
    p.multiplyScalar(elevation);
    positions.setXYZ(i, p.x, p.y, p.z);
    const tint = biomeColor(angle);
    tint.multiplyScalar(.91 + .1 * grain + .05 * Math.sin(p.z * 23));
    colorArray[i * 3] = tint.r;
    colorArray[i * 3 + 1] = tint.g;
    colorArray[i * 3 + 2] = tint.b;
  }
  geometry.setAttribute("color", new BufferAttribute(colorArray, 3));
  geometry.computeVertexNormals();
  const material = new MeshStandardMaterial({
    map: groundTexture ?? null, vertexColors: true, roughness: .94, metalness: 0,
  });
  const planet = new Mesh(geometry, material);
  planet.name = "planet-sphere";
  planet.receiveShadow = true;
  planet.castShadow = true;
  world.add(planet);

  // Art-directed mountain ridges add foreground silhouette and actual parallax.
  const hillMaterial = new MeshStandardMaterial({ color: "#97856c", roughness: 1, flatShading: true });
  for (const [angle, size] of [[1.05, .64], [1.19, .42], [1.34, .52], [2.47, .36], [2.67, .25]] as const) {
    const ridge = new Mesh(new CylinderGeometry(.03, size, size * 1.45, 5), hillMaterial);
    ridge.castShadow = true;
    const anchor = placeOnWorld(world, ridge, angle, WALK_RADIUS - .045, -.38);
    anchor.rotation.y = -.3;
  }
  return world;
}

/** +Y of an imported 3D prop points away from the planet's center. */
export function placeOnWorld(world: Group, object: Object3D, angle: number,
  radius = WALK_RADIUS, depth = .02): Group {
  const anchor = new Group();
  anchor.name = "planet-attached-prop";
  const n = new Vector3(Math.cos(angle), Math.sin(angle), depth / radius).normalize();
  anchor.position.copy(n).multiplyScalar(radius);
  anchor.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), n));
  anchor.add(object);
  world.add(anchor);
  return anchor;
}
