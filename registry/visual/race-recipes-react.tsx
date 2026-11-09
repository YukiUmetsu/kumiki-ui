/** Race recipes in React Three Fiber. `TrackPass`: a car at speed passes a low trackside camera on a long lens, which pans with it.
 *
 * The world is built from photographed CC0 surfaces and a real sky: asphalt with red-and-white kerbs and painted edge lines, grass
 * verges, steel guardrails on posts whose spacing streams past to show speed, and a daylight sky that lights the scene, reflects in
 * the paint and places the sun, whose direction is read from the sky itself so shadows agree with the reflections.
 *
 * The car is any glTF with four wheel groups named `WheelFrontL`, `WheelFrontR`, `WheelRearL` and `WheelRearR` (brake pads, named
 * `…BrakePad`, stay still while the rest of each wheel turns). Everything is a pure function of `frame`.
 */
import { useLayoutEffect, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { AdditiveBlending, Raycaster, Box3, BoxGeometry, CanvasTexture, HalfFloatType, MeshBasicMaterial, OrthographicCamera, Scene, Vector2, WebGLRenderTarget, CircleGeometry, Color, DataUtils, DirectionalLight, EquirectangularReflectionMapping, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry,
  Quaternion, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector3, BufferAttribute, BufferGeometry, FogExp2 } from "three";
import type { DataTexture, Material, PerspectiveCamera, Texture } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import type { RationalFps } from "../motion/types";
import { FiberStage } from "./fiber-stage";
import { StudioCaption } from "./studio-recipes-react";
import type { StudioTone } from "./studio-recipes-react";
import { shutterAngle, shutterOffsets, trackPassState } from "./race-shots";
import type { FilmClock } from "./race-shots";
import type { RaceLivery, TrackPassSpec } from "./race-shots";
import { generatedMountain, MOUNTAIN_RING, mountainCentre, SCENERY_HAZE } from "./race-scenery";

export interface RaceTrackAssets {
  asphalt: { map: string; normal: string; roughness: string };
  grass?: { map: string; normal?: string };
  /** An equirectangular HDR sky; its brightest point is taken as the sun. */
  sky: string;
}
export interface TrackPassProps {
  frame: number;
  fps: RationalFps;
  spec: TrackPassSpec;
  /** The car's glTF. */
  car: string;
  track: RaceTrackAssets;
  /** Content frames per film frame at this frame: 1 at natural speed, less inside a speed ramp's hold. The wheels' motion blur
   * follows it, so they smear at speed and sharpen as the ramp slows. @default 1 */
  rate?: number;
  /** The scene's speed ramp as a clock. A `chase` camera drives in film time, so the ramp moves the car and not the camera. */
  clock?: FilmClock;
  /** The distant mountains: a glTF terrain tile (any footprint; it is fitted to each placement), `false` for none, or by default a
   * generated range. They stand kilometres away in haze, so pans and chases have a far horizon to measure speed against. */
  mountains?: string | false;
  label?: string;
  tone?: StudioTone;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Track layout, metres: the car drives along +x on the centre line. */
const TRACK = { from: -520, to: 420, half: 5.5, kerb: 1, rail: 11 } as const;
/** The plain runs out to where the haze has swallowed it, under the mountains. */
const GRASS_EXTENT = [40000, 40000] as const;
/** Finds the car's four wheels by name: `WheelFrontL`, `Wheel_FL`, `wheel_front_left`, `FL_wheel` and the like. */
export function findWheels(root: Object3D): Object3D[] {
  const all: Object3D[] = [];
  root.traverse(o => { if (o !== root) all.push(o); });
  const pick = (front: boolean, left: boolean) => all.find(o => {
    const n = o.name.toLowerCase().replace(/[^a-z]/g, " "), words = ` ${n} `;
    if (!/wheel|tire|tyre|rim/.test(n) || /brake|pad|disc|caliper/.test(n) && !/wheel/.test(n.split(" ")[0])) return false;
    const isFront = /front|\bf[lr]\b/.test(words) || /wheelfront/.test(o.name.toLowerCase()), isRear = /rear|back|\b[br][lr]\b/.test(words) || /wheelrear/.test(o.name.toLowerCase());
    const isLeft = /left|\b[fbr]l\b/.test(words) || /(front|rear)l$/i.test(o.name), isRight = /right|\b[fbr]r\b/.test(words) || /(front|rear)r$/i.test(o.name);
    return (front ? isFront && !isRear : isRear && !isFront) && (left ? isLeft && !isRight : isRight && !isLeft);
  });
  const wheels = [pick(true, true), pick(true, false), pick(false, true), pick(false, false)];
  if (wheels.some(w => !w)) throw new Error("The car's four wheels were not found by name (front/rear, left/right).");
  return wheels as Object3D[];
}
const FILL: CSSProperties = { position: "absolute", inset: 0 };

/** The sky's brightest direction, in world space: the sun. Read once from the HDR's pixels. */
function sunDirection(texture: DataTexture): Vector3 {
  const { data, width, height } = texture.image as { data: Uint16Array | Float32Array; width: number; height: number };
  const value = (i: number) => data instanceof Uint16Array ? DataUtils.fromHalfFloat(data[i]) : data[i];
  let best = -1, at = 0;
  for (let i = 0; i < width * height; i += 1) { const l = value(i * 4) * .2126 + value(i * 4 + 1) * .7152 + value(i * 4 + 2) * .0722; if (l > best) { best = l; at = i; } }
  const u = ((at % width) + .5) / width, v = 1 - (Math.floor(at / width) + .5) / height;
  // three.js equirect: u = atan(z, x) / 2π + .5, v = asin(y) / π + .5.
  const phi = (u - .5) * 2 * Math.PI, lat = (v - .5) * Math.PI;
  return new Vector3(Math.cos(phi) * Math.cos(lat), Math.sin(lat), Math.sin(phi) * Math.cos(lat)).normalize();
}

/** The sky's average colour just above the horizon, in linear light: distant mountains fade into it. */
function horizonColor(texture: DataTexture): Color {
  const { data, width, height } = texture.image as { data: Uint16Array | Float32Array; width: number; height: number };
  const value = (i: number) => data instanceof Uint16Array ? DataUtils.fromHalfFloat(data[i]) : data[i];
  const sum = [0, 0, 0];
  let count = 0;
  // Rows from the horizon to 4° above it (row 0 is the zenith in the HDR's layout).
  for (let row = Math.floor(height * (.5 - 4 / 180)); row < Math.floor(height / 2); row += 1) for (let x = 0; x < width; x += 1, count += 1) for (let c = 0; c < 3; c += 1) sum[c] += value((row * width + x) * 4 + c);
  return new Color(sum[0] / count, sum[1] / count, sum[2] / count);
}

/** A mountain tile fitted to a unit footprint, 1 high, its lowest point at 0. */
function fitTile(geometry: BufferGeometry): BufferGeometry {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!, size = box.getSize(new Vector3());
  geometry.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  geometry.scale(1 / Math.max(size.x, size.z), 1 / Math.max(1e-6, size.y), 1 / Math.max(size.x, size.z));
  return geometry;
}

/** The ring of mountains, all sharing one tile. Each sinks a little below the plain, so no edge shows where it meets the ground. */
function MountainRing({ geometry, material }: { geometry: BufferGeometry; material: Material }) {
  const group = useMemo(() => {
    const g = new Group();
    for (const place of MOUNTAIN_RING) {
      const [x, z] = mountainCentre(place), mesh = new Mesh(geometry, material);
      mesh.position.set(x, -Math.max(20, place.height * .05), z);
      mesh.scale.set(place.width * (place.mirror ? -1 : 1), place.height, place.width);
      mesh.rotation.y = place.turn * Math.PI / 180;
      g.add(mesh);
    }
    return g;
  }, [geometry, material]);
  useLayoutEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <primitive object={group} />;
}

function GeneratedMountains() {
  const built = useMemo(() => {
    const tile = generatedMountain(), geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(tile.positions, 3));
    geometry.setAttribute("color", new BufferAttribute(tile.colors, 3));
    geometry.setIndex(new BufferAttribute(tile.indices, 1));
    geometry.computeVertexNormals();
    return { geometry, material: new MeshStandardMaterial({ vertexColors: true, roughness: .95, envMapIntensity: .6 }) };
  }, []);
  return <MountainRing geometry={built.geometry} material={built.material} />;
}

function ModelMountains({ src }: { src: string }) {
  const gltf = useLoader(GLTFLoader, src);
  const built = useMemo(() => {
    let found: Mesh | undefined;
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(o => { if (!found && (o as Mesh).isMesh) found = o as Mesh; });
    if (!found) throw new Error(`The mountain model ${src} has no mesh.`);
    const geometry = fitTile(found.geometry.clone().applyMatrix4(found.matrixWorld));
    const material = (Array.isArray(found.material) ? found.material[0] : found.material).clone() as MeshStandardMaterial;
    material.envMapIntensity = .6;
    return { geometry, material };
  }, [gltf, src]);
  return <MountainRing geometry={built.geometry} material={built.material} />;
}

function useTiled(url: string, metres: number, extent: readonly [number, number], color = false): Texture {
  const loaded = useLoader(TextureLoader, url);
  return useMemo(() => {
    const t = loaded.clone();
    t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(extent[0] / metres, extent[1] / metres); t.anisotropy = 8;
    if (color) t.colorSpace = SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [loaded, metres, extent, color]);
}

/** The track: asphalt, kerbs, edge lines, grass and guardrails. Built once. */
function Track({ assets }: { assets: RaceTrackAssets }) {
  const length = TRACK.to - TRACK.from, mid = (TRACK.to + TRACK.from) / 2, extent = [length, TRACK.half * 2] as const;
  const map = useTiled(assets.asphalt.map, 6, extent, true), normal = useTiled(assets.asphalt.normal, 6, extent), roughness = useTiled(assets.asphalt.roughness, 6, extent);
  const grassMap = useTiled(assets.grass?.map ?? assets.asphalt.map, 5, GRASS_EXTENT, true), grassNormal = useTiled(assets.grass?.normal ?? assets.asphalt.normal, 5, GRASS_EXTENT);
  const built = useMemo(() => {
    const group = new Group(), disposables: Array<{ dispose(): void }> = [];
    const own = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };
    const asphalt = new Mesh(own(new PlaneGeometry(length, TRACK.half * 2)), own(new MeshStandardMaterial({ map, normalMap: normal, roughnessMap: roughness, roughness: 1, color: "#d8d8d8",
      // Asphalt is rough and dark: at the grazing angles of a camera looking down the track, full sky reflection would wash it pale.
      envMapIntensity: .5 })));
    asphalt.rotation.x = -Math.PI / 2; asphalt.position.set(mid, 0, 0); asphalt.receiveShadow = true; group.add(asphalt);
    const grass = new Mesh(own(new PlaneGeometry(GRASS_EXTENT[0], GRASS_EXTENT[1])), own(new MeshStandardMaterial(assets.grass ? { map: grassMap, normalMap: grassNormal, roughness: .95, color: "#b9c7a0" } : { color: "#4b6b3a", roughness: .95 })));
    grass.rotation.x = -Math.PI / 2; grass.position.set(mid, -.03, 0); grass.receiveShadow = true; group.add(grass);
    // Painted edge lines, just inside the kerbs.
    const paint = own(new MeshStandardMaterial({ color: "#f1f1ee", roughness: .7 }));
    for (const z of [-TRACK.half + .25, TRACK.half - .25]) {
      const line = new Mesh(own(new PlaneGeometry(length, .16)), paint); line.rotation.x = -Math.PI / 2; line.position.set(mid, .004, z); line.receiveShadow = true; group.add(line);
    }
    // Kerbs: 2 m red and white blocks, both sides.
    const kerbStep = 2, kerbCount = Math.floor(length / kerbStep), kerbs = new InstancedMesh(own(new BoxGeometry(kerbStep, .06, TRACK.kerb)), own(new MeshStandardMaterial({ roughness: .55 })), kerbCount * 2);
    const m = new Matrix4(), red = new Color("#c4222b"), white = new Color("#f0efeb");
    for (let side = 0; side < 2; side += 1) for (let i = 0; i < kerbCount; i += 1) {
      const z = (side ? 1 : -1) * (TRACK.half + TRACK.kerb / 2);
      m.makeTranslation(TRACK.from + (i + .5) * kerbStep, .03, z); kerbs.setMatrixAt(side * kerbCount + i, m); kerbs.setColorAt(side * kerbCount + i, i % 2 ? red : white);
    }
    kerbs.receiveShadow = true; kerbs.castShadow = true; group.add(kerbs);
    // Guardrails: a galvanised beam on posts every 2.5 m, both sides.
    const steel = own(new MeshStandardMaterial({ color: "#b9bec4", metalness: .85, roughness: .38 })), postStep = 2.5, postCount = Math.floor(length / postStep);
    const posts = new InstancedMesh(own(new BoxGeometry(.12, .78, .12)), own(new MeshStandardMaterial({ color: "#8d9298", metalness: .6, roughness: .5 })), postCount * 2);
    for (let side = 0; side < 2; side += 1) for (let i = 0; i < postCount; i += 1) { m.makeTranslation(TRACK.from + i * postStep, .39, (side ? 1 : -1) * (TRACK.rail + .12)); posts.setMatrixAt(side * postCount + i, m); }
    posts.castShadow = true; group.add(posts);
    for (const side of [-1, 1]) for (const y of [.52, .72]) {
      const beam = new Mesh(own(new BoxGeometry(length, .14, .05)), steel); beam.position.set(mid, y, side * TRACK.rail); beam.castShadow = true; beam.receiveShadow = true; group.add(beam);
    }
    return { group, dispose: () => disposables.forEach(d => d.dispose()) };
  }, [map, normal, roughness, grassMap, grassNormal, assets.grass, length, mid]);
  useLayoutEffect(() => () => built.dispose(), [built]);
  return <primitive object={built.group} />;
}

interface RaceCar { root: Group; spinners: Array<{ pivot: Object3D; axle: Vector3; sign: number }>; radius: number; base: number; blur: MeshStandardMaterial }
/** A spinning wheel seen through a film shutter: the spokes smear into a disc of their average tone, with a darker hub and the rim's
 * bright lip. Drawn once on a canvas. */
function blurDiscTexture(): CanvasTexture {
  const size = 256, canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!, c = size / 2, gradient = g.createRadialGradient(c, c, 0, c, c, c);
  // Dark: spokes and the gaps between them average to a deep grey, under a brighter lip.
  gradient.addColorStop(0, "rgba(22,23,26,1)"); gradient.addColorStop(.18, "rgba(40,42,46,1)"); gradient.addColorStop(.24, "rgba(58,60,66,.94)");
  gradient.addColorStop(.84, "rgba(48,50,55,.9)"); gradient.addColorStop(.92, "rgba(120,123,130,.9)"); gradient.addColorStop(.97, "rgba(34,35,38,.6)"); gradient.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gradient; g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  return texture;
}
/** Loads the car, faces it along +x, puts its tyres on the road, and sets each wheel turning about its own axle. */
/** A race number in a white roundel with a black ring, drawn upright. */
function roundelTexture(number: string): CanvasTexture {
  const size = 256, canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!, c = size / 2;
  g.fillStyle = "#111215"; g.beginPath(); g.arc(c, c, c - 2, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#f6f6f2"; g.beginPath(); g.arc(c, c, c - 16, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#111215"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `900 ${number.length > 2 ? 104 : 138}px system-ui, -apple-system, "Segoe UI", sans-serif`; g.fillText(number, c, c + 6);
  const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace; return t;
}
/** Twin stripes along the texture's length, with a gap between them. */
function stripeTexture(color: string): CanvasTexture {
  // 384 px across, so the stripes' edges and the gap between them stay crisp on a stripe most of a metre wide.
  const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 384;
  const g = canvas.getContext("2d")!; g.fillStyle = color;
  g.fillRect(0, 0, 64, 136); g.fillRect(0, 248, 64, 136);
  const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace; t.anisotropy = 8; return t;
}
const isGlass = (o: Object3D) => { const m = (o as Mesh).material as MeshStandardMaterial & { transmission?: number }; return !!m && (m.transparent && m.opacity < .95 || (m.transmission ?? 0) > 0 || /glass|window|windshield/i.test(`${o.name} ${m.name}`)); };
/** Paints the car and projects its livery: roundels on both doors and the bonnet, twin stripes over the top. The car must be at the origin,
 * facing +x. Decals become children of the panels they land on, so they move with the car. */
function applyLivery(inner: Object3D, livery: RaceLivery) {
  const shared = new Map<MeshStandardMaterial, MeshStandardMaterial>();
  inner.traverse(o => {
    const mesh = o as Mesh, material = mesh.material as MeshStandardMaterial;
    if (!mesh.isMesh || !material?.name) return;
    const colour = /paint\s*1/i.test(material.name) ? livery.body : /paint\s*2/i.test(material.name) ? livery.accent ?? livery.body : undefined;
    if (!colour) return;
    // A clone per car: copies of a loaded model share materials, and one car's paint must not change another's.
    if (!shared.has(material)) {
      const own = material.clone(); own.color.set(colour);
      // A metallic flake normal map tiled finely glitters as grain over a pale body at any distance; a whisper of it reads as flake.
      own.normalScale.multiplyScalar(.12);
      shared.set(material, own);
    }
    mesh.material = shared.get(material)!;
  });
  inner.updateMatrixWorld(true);
  const box = new Box3().setFromObject(inner, true), size = box.getSize(new Vector3()), centre = box.getCenter(new Vector3()), ray = new Raycaster();
  /** Projects a decal from `from` along `toward`; the texture's up points along `up` (the sky for the doors, along the car for the bonnet,
   * across it for stripes, so their length runs nose to tail). */
  const decal = (from: Vector3, toward: Vector3, scale: Vector3, material: MeshStandardMaterial, up = new Vector3(0, 1, 0), order = 2) => {
    ray.set(from, toward.clone().normalize());
    const hit = ray.intersectObject(inner, true).find(h => (h.object as Mesh).isMesh && h.object.visible);
    if (!hit || isGlass(hit.object)) return;
    const mesh = hit.object as Mesh, normal = hit.face!.normal.clone().transformDirection(mesh.matrixWorld);
    const orient = new Object3D(); orient.position.copy(hit.point); orient.up.copy(up);
    orient.lookAt(hit.point.clone().add(normal));
    const geometry = new DecalGeometry(mesh, hit.point, orient.rotation, scale);
    geometry.applyMatrix4(new Matrix4().copy(mesh.matrixWorld).invert());
    const piece = new Mesh(geometry, material); piece.renderOrder = order; mesh.add(piece);
  };
  const film = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: .32, metalness: 0 };
  if (livery.number) {
    // Roundels draw over the stripes, as on a racing car's bonnet.
    const roundel = new MeshStandardMaterial({ map: roundelTexture(livery.number), ...film, polygonOffsetFactor: -6 }), d = size.y * .62;
    for (const side of [1, -1]) decal(new Vector3(centre.x - size.x * .02, box.min.y + size.y * .5, centre.z + side * size.z * 2), new Vector3(0, 0, -side), new Vector3(d, d, size.z * .5), roundel, undefined, 3);
    // Off the centre line, clear of a bonnet's vents and grilles, as racing cars carry it, reading from the front.
    decal(new Vector3(box.min.x + size.x * .87, box.max.y + 2, centre.z + size.z * .2), new Vector3(0, -1, 0), new Vector3(d * .7, d * .7, size.y), roundel, new Vector3(-1, 0, 0), 3);
  }
  if (livery.stripes) {
    const stripe = new MeshStandardMaterial({ map: stripeTexture(typeof livery.stripes === "string" ? livery.stripes : "#f6f6f2"), ...film }), step = size.x / 28;
    for (let x = box.min.x + step / 2; x < box.max.x; x += step) decal(new Vector3(x, box.max.y + 2, centre.z), new Vector3(0, -1, 0), new Vector3(step * 2, size.z * .34, size.y * .6), stripe, new Vector3(0, 0, 1));
  }
}

function useRaceCar(src: string, livery?: RaceLivery): RaceCar {
  const gltf = useLoader(GLTFLoader, src), key = JSON.stringify(livery ?? null);
  return useMemo(() => {
    const inner = gltf.scene.clone(true), root = new Group();
    root.add(inner);
    inner.traverse(o => { if ((o as Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    root.updateMatrixWorld(true);
    const wheelNodes = findWheels(inner), centre = (o: Object3D) => new Box3().setFromObject(o).getCenter(new Vector3());
    const front = centre(wheelNodes[0]).add(centre(wheelNodes[1])).multiplyScalar(.5), rear = centre(wheelNodes[2]).add(centre(wheelNodes[3])).multiplyScalar(.5);
    const forward = front.sub(rear);
    inner.rotation.y = Math.atan2(forward.z, forward.x);
    root.updateMatrixWorld(true);
    const box = new Box3().setFromObject(inner), center = box.getCenter(new Vector3());
    inner.position.x -= center.x; inner.position.z -= center.z;
    root.updateMatrixWorld(true);
    // Measured precisely on the vertices: loose boxes of rotated meshes sit lower than the tyres and would float the car.
    const tyres = wheelNodes.map(node => new Box3().setFromObject(node, true));
    const radius = (tyres[2].max.y - tyres[2].min.y) / 2, base = -Math.min(...tyres.map(t => t.min.y));
    const blur = new MeshStandardMaterial({ map: blurDiscTexture(), transparent: true, opacity: 0, depthWrite: false, metalness: .55, roughness: .42, polygonOffset: true, polygonOffsetFactor: -2 });
    const carCentre = new Box3().setFromObject(inner).getCenter(new Vector3());
    const spinners = wheelNodes.map(node => {
      // A wheel that is a single mesh goes inside a group that takes its place, so every wheel turns the same way: its parts inside a pivot.
      let wheel = node;
      if ((node as Mesh).isMesh) {
        const host = new Group(); node.parent!.add(host);
        host.position.copy(node.position); host.quaternion.copy(node.quaternion); host.scale.copy(node.scale);
        node.position.set(0, 0, 0); node.quaternion.identity(); node.scale.set(1, 1, 1); host.add(node); wheel = host;
      }
      const local = new Box3();
      // The wheel's box in its own frame: its thinnest side is the axle.
      wheel.updateMatrixWorld(true);
      const inverse = new Matrix4().copy(wheel.matrixWorld).invert();
      wheel.traverse(o => { if ((o as Mesh).isMesh) { const g = (o as Mesh).geometry; g.computeBoundingBox(); local.union(g.boundingBox!.clone().applyMatrix4(new Matrix4().multiplyMatrices(inverse, o.matrixWorld))); } });
      const c = local.getCenter(new Vector3()), size = local.getSize(new Vector3());
      const axle = size.x <= size.y && size.x <= size.z ? new Vector3(1, 0, 0) : size.y <= size.z ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
      const pivot = new Group(); pivot.position.copy(c); wheel.add(pivot);
      // The blur disc covers the rim's outer face: the face of the wheel's box farther from the car's centre line.
      const rimBox = new Box3();
      wheel.traverse(o => { if ((o as Mesh).isMesh && /Rim/.test(o.name)) { const g = (o as Mesh).geometry; g.computeBoundingBox(); rimBox.union(g.boundingBox!.clone().applyMatrix4(new Matrix4().multiplyMatrices(inverse, o.matrixWorld))); } });
      const rimSize = rimBox.isEmpty() ? size : rimBox.getSize(new Vector3()), across = Math.max(...[rimSize.x, rimSize.y, rimSize.z].filter((_, i) => axle.getComponent(i) === 0));
      const half = size.dot(axle) / 2, outward = new Vector3().copy(c).add(axle.clone().multiplyScalar(half)).applyMatrix4(wheel.matrixWorld).distanceTo(carCentre)
        > new Vector3().copy(c).add(axle.clone().multiplyScalar(-half)).applyMatrix4(wheel.matrixWorld).distanceTo(carCentre) ? 1 : -1;
      const disc = new Mesh(new CircleGeometry(across / 2 * .98, 64), blur);
      disc.position.copy(c).add(axle.clone().multiplyScalar(outward * (half * .96)));
      disc.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), axle.clone().multiplyScalar(outward));
      for (const child of [...wheel.children]) if (child !== pivot && !/BrakePad|Caliper/i.test(child.name)) { child.position.sub(c); pivot.add(child); }
      wheel.add(disc);
      // Roll forward: the axle's world direction decides the sign, so the top of each tyre moves with the car.
      pivot.updateMatrixWorld(true);
      const world = axle.clone().transformDirection(pivot.matrixWorld);
      return { pivot, axle, sign: world.z > 0 ? -1 : 1 };
    });
    if (livery) applyLivery(inner, livery);
    return { root, spinners, radius, base, blur };
  }, [gltf, key]); // eslint-disable-line react-hooks/exhaustive-deps
}

function RaceWorld({ spec, frame, fps, car: src, track, rate, clock, mountains }: { spec: TrackPassSpec; frame: number; fps: number; car: string; track: RaceTrackAssets; rate: number; clock?: FilmClock; mountains?: string | false }) {
  const scene = useThree(state => state.scene), camera = useThree(state => state.camera) as PerspectiveCamera, size = useThree(state => state.size), gl = useThree(state => state.gl);
  const sky = useLoader(HDRLoader, track.sky) as DataTexture;
  const car = useRaceCar(src, spec.livery);
  // The sky lights the scene and is its backdrop; the sun is placed where the sky is brightest.
  const sun = useMemo(() => {
    sky.mapping = EquirectangularReflectionMapping;
    const light = new DirectionalLight("#fff4e6", 2.6), shadow = light.shadow;
    light.castShadow = true; shadow.mapSize.set(2048, 2048); shadow.bias = -.0002; shadow.normalBias = .02;
    Object.assign(shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 140 }); shadow.camera.updateProjectionMatrix();
    return { light, direction: sunDirection(sky), haze: horizonColor(sky) };
  }, [sky]);
  useLayoutEffect(() => {
    const previous = { background: scene.background, environment: scene.environment, fog: scene.fog };
    // Haze: distant things fade towards the sky's colour at the horizon, which is what makes mountains read as far away.
    scene.background = sky; scene.environment = sky; scene.fog = new FogExp2(sun.haze, SCENERY_HAZE); scene.add(sun.light, sun.light.target, car.root);
    gl.toneMappingExposure = .95;
    return () => { scene.background = previous.background; scene.environment = previous.environment; scene.fog = previous.fog; scene.remove(sun.light, sun.light.target, car.root); };
  }, [scene, sky, sun, car, gl]);
  /** Poses the car, its wheels, the sun and the camera for a content time. Every value is set outright. */
  const applyAt = (t: number) => {
    const state = trackPassState(spec, t, fps, car.radius, clock);
    car.root.position.set(state.carX, car.base + state.ride.lift, 0);
    car.root.rotation.z = state.ride.pitch * Math.PI / 180;
    const q = new Quaternion();
    for (const wheel of car.spinners) wheel.pivot.quaternion.copy(q.setFromAxisAngle(wheel.axle, wheel.sign * state.wheelTurn));
    // The sun's shadow follows the car, so it stays crisp wherever the car is.
    sun.light.target.position.set(state.carX, 0, 0);
    sun.light.position.copy(sun.direction).multiplyScalar(60).add(sun.light.target.position);
    const { pose } = state;
    camera.fov = pose.fov; camera.aspect = size.width / Math.max(1, size.height); camera.near = .1; camera.far = 30000;
    camera.position.set(...pose.position); camera.lookAt(...pose.target); camera.updateProjectionMatrix();
  };
  useLayoutEffect(() => {
    applyAt(frame);
    // A 180° shutter is open for half a frame: past about 25° of turn in that time the spokes smear, and by 90° they are a disc. The
    // averaged moments below smear everything else; the disc covers spokes that would otherwise show as a few sharp copies.
    const shutterTurn = (spec.speed ?? 58) / fps / car.radius * rate * shutterAngle(spec) / 360 * 180 / Math.PI;
    const smear = Math.min(1, Math.max(0, (shutterTurn - 25) / 65));
    car.blur.opacity = .94 * smear * smear * (3 - 2 * smear);
  });
  // Motion blur: the moments inside the shutter are rendered into a float buffer and averaged in linear light, then tone-mapped once.
  const blur = useMemo(() => {
    const quad = new Mesh(new PlaneGeometry(2, 2)), view = new OrthographicCamera(-1, 1, 1, -1, 0, 1), still = new Scene();
    still.add(quad);
    const add = new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false });
    const show = new MeshBasicMaterial({ depthTest: false, depthWrite: false });
    const targets: { sample?: WebGLRenderTarget; sum?: WebGLRenderTarget } = {};
    const sized = (target: WebGLRenderTarget | undefined, w: number, h: number, msaa: number) => {
      if (target && target.width === w && target.height === h) return target;
      target?.dispose();
      return new WebGLRenderTarget(w, h, { type: HalfFloatType, samples: msaa, depthBuffer: msaa > 0 });
    };
    return { quad, view, still, add, show, targets, sized, dispose: () => { targets.sample?.dispose(); targets.sum?.dispose(); add.dispose(); show.dispose(); quad.geometry.dispose(); } };
  }, []);
  useLayoutEffect(() => () => blur.dispose(), [blur]);
  useFrame(({ gl: renderer }) => {
    const offsets = shutterOffsets(spec, rate);
    if (offsets.length === 1) { applyAt(frame); renderer.render(scene, camera); return; }
    const buffer = renderer.getDrawingBufferSize(new Vector2());
    const sample = blur.targets.sample = blur.sized(blur.targets.sample, buffer.x, buffer.y, 4), sum = blur.targets.sum = blur.sized(blur.targets.sum, buffer.x, buffer.y, 0);
    const autoClear = renderer.autoClear;
    renderer.setRenderTarget(sum); renderer.setClearColor(0x000000, 0); renderer.clear();
    blur.add.opacity = 1 / offsets.length; blur.add.map = sample.texture; blur.quad.material = blur.add;
    for (const offset of offsets) {
      applyAt(frame + offset);
      renderer.autoClear = true; renderer.setRenderTarget(sample); renderer.render(scene, camera);
      renderer.autoClear = false; renderer.setRenderTarget(sum); renderer.render(blur.still, blur.view);
    }
    renderer.autoClear = autoClear;
    blur.show.map = sum.texture; blur.quad.material = blur.show;
    renderer.setRenderTarget(null); renderer.render(blur.still, blur.view);
    applyAt(frame);
  }, 1);
  return <>
    <Track assets={track} />
    {mountains === false ? null : mountains ? <ModelMountains src={mountains} /> : <GeneratedMountains />}
  </>;
}

/** A car at speed passes a low trackside camera, which pans with it on a long lens. */
export function TrackPass({ frame, fps, spec, car, track, rate = 1, clock, mountains, label, tone, style, children }: TrackPassProps) {
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#8fb3d6", ...style }}>
    <FiberStage frame={frame} fps={fps} label={label ?? "A car at speed passes a trackside camera."} shadows style={FILL}>
      {/* No Suspense here: while the car, sky and textures load, the whole stage waits, so no frame is marked drawn without them. */}
      <RaceWorld spec={spec} frame={frame} fps={fps.num / fps.den} car={car} track={track} rate={rate} clock={clock} mountains={mountains} />
    </FiberStage>
    <div style={{ ...FILL, pointerEvents: "none" }}>{children}<StudioCaption beat={spec.title} frame={frame} tone={tone} scrim /></div>
  </div>;
}
