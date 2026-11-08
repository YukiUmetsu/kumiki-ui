/** `ShadowReveal`: a question asked with a shadow. Hundreds of pieces hang on fine threads in a dark room, and the warm spot behind
 * them throws their shadow on a plaster wall, where it reads as one clear shape: a house, a heart, a key. The camera starts square on
 * the wall, so only the shadow is seen. Then it swings back toward the light, past the cloud of pieces, and near the light's own
 * viewpoint the scattered pieces line up into the shape in front of their own shadow. Pure function of `frame`.
 *
 * Construction is shadow art: the shape is rasterised on the wall, and for each cell one piece is hung on the ray from the light to
 * that cell, sized so neighbouring shadows overlap. Seen from the light, the pieces cover exactly the shape; from anywhere else they
 * are a scattered cloud at many depths.
 */
import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { BufferGeometry, CatmullRomCurve3, Color, EquirectangularReflectionMapping, Float32BufferAttribute, Group, HemisphereLight, InstancedMesh, LineBasicMaterial,
  LineSegments, Matrix4, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, Quaternion, RepeatWrapping, SpotLight, Vector2, Vector3 } from "three";
import type { PerspectiveCamera, Texture } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createAssetResources } from "../craft/hero-asset";
import { paintTexture, paintWithRelief } from "../craft/canvas-texture";
import { createStudioEnvironmentTexture } from "../craft/hero-studio";
import { createCoinFactory } from "../domains/finance-currency-3d";
import { FiberStage } from "./fiber-stage";
import { StudioCaption } from "./studio-recipes-react";
import type { StudioRecipeProps } from "./studio-recipes-react";
import { easeInOut, span01 } from "./studio-shots";
import type { ShadowRevealSpec, ShadowSilhouette } from "./story-3d-shots";

/** Each shape in a 100-unit square, y down, filled even-odd so holes (a key's bow) stay open. */
const SHAPES: Record<ShadowSilhouette, (ctx: CanvasRenderingContext2D) => void> = {
  house: ctx => { ctx.fill(new Path2D("M50 8 L95 46 L84 46 L84 95 L60 95 L60 68 L40 68 L40 95 L16 95 L16 46 L5 46 Z M68 15 L78 15 L78 31 L68 23 Z"), "nonzero"); },
  heart: ctx => { ctx.fill(new Path2D("M50 92 C22 70 5 52 6 31 C7 13 30 3 50 23 C70 3 93 13 94 31 C95 52 78 70 50 92 Z")); },
  key: ctx => { ctx.fill(new Path2D("M25 50 m-21 0 a21 21 0 1 0 42 0 a21 21 0 1 0 -42 0 Z M25 50 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 Z M44 44 L96 44 L96 56 L44 56 Z M74 56 L81 56 L81 70 L74 70 Z M87 56 L94 56 L94 66 L87 66 Z"), "evenodd"); },
  "arrow-up": ctx => { ctx.fill(new Path2D("M50 4 L91 47 L66 47 L66 96 L34 96 L34 47 L9 47 Z")); },
  shield: ctx => { ctx.fill(new Path2D("M50 4 L88 17 C89 55 75 80 50 96 C25 80 11 55 12 17 Z")); },
  lightbulb: ctx => { ctx.fill(new Path2D("M50 6 C30 6 18 21 18 38 C18 51 26 58 33 66 L35 76 L65 76 L67 66 C74 58 82 51 82 38 C82 21 70 6 50 6 Z M36 80 L64 80 L64 86 L36 86 Z M39 89 L61 89 C61 94 56 97 50 97 C44 97 39 94 39 89 Z")); },
  question: ctx => { ctx.font = "900 108px system-ui, -apple-system, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", 50, 54); },
};

/** Which cells of an n × n grid the shape covers. Null where there is no 2D canvas (Node), so nothing hangs. */
export function silhouetteCells(shape: ShadowSilhouette, n: number): Array<[number, number]> | null {
  if (typeof document === "undefined") return null;
  const size = 200, canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) return null;
  ctx.scale(size / 100, size / 100); ctx.fillStyle = "#fff"; SHAPES[shape](ctx);
  const data = ctx.getImageData(0, 0, size, size).data, cells: Array<[number, number]> = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = Math.floor((i + .5) / n * size), y = Math.floor((j + .5) / n * size);
    if (data[(y * size + x) * 4 + 3] > 127) cells.push([(i + .5) / n, (j + .5) / n]);
  }
  return cells;
}

/** The room in metres: the shape is drawn 1.5 m tall on the back wall (z = 0), lit from the front left. */
const SHAPE = 1.5, CENTER = new Vector3(.35, 1.5, 0), LIGHT = new Vector3(-3, 1.8, 2.7), CEILING = 3.6;

function seeded(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function plasterMaps(): { map: Texture; normalMap: Texture } {
  // Hand-troweled lime plaster: broad, soft clouds of tone with fine sand in the surface.
  const relief = paintWithRelief(1024, 1024, (ctx, w, h, random) => {
    ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const x = random() * w, y = random() * h, r = 40 + random() * 160, g = ctx.createRadialGradient(x, y, 0, x, y, r), v = 118 + random() * 22;
      g.addColorStop(0, `rgba(${v},${v},${v},.35)`); g.addColorStop(1, "rgba(128,128,128,0)"); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 26000; i++) { const v = 90 + random() * 80; ctx.fillStyle = `rgba(${v},${v},${v},.5)`; ctx.fillRect(random() * w, random() * h, 1.4, 1.4); }
  }, { color: "data", strength: 1.6, seed: 41, repeat: true });
  for (const t of [relief.map, relief.normalMap]) { t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(3, 1.5); }
  return relief;
}

/** The installation: pieces on threads, the wall, the floor and the light. Built once per shape, piece kind, density and seed. */
function buildInstallation(spec: ShadowRevealSpec) {
  const res = createAssetResources(), group = new Group(), random = seeded(spec.seed ?? 11), n = spec.density ?? 44;
  const cells = silhouetteCells(spec.silhouette, n) ?? [];
  const cell = SHAPE / n, matrices: Matrix4[] = [], tops: Vector3[] = [];
  const up = new Vector3(0, 1, 0), q = new Quaternion(), tilt = new Quaternion(), spin = new Quaternion(), toLight = new Vector3(), axis = new Vector3();
  for (const [u, v] of cells) {
    const wall = new Vector3(CENTER.x + (u - .5) * SHAPE + (random() - .5) * cell * .5, CENTER.y + (.5 - v) * SHAPE + (random() - .5) * cell * .5, 0);
    // Between 30% and 55% of the way from the light: close enough to stay out of the opening shot, far enough to cast a crisp shadow.
    const t = .3 + random() * .25, at = LIGHT.clone().lerp(wall, t);
    // A shadow is the piece scaled by 1 / t. 1.9 cells covers a cell's diagonal even at the steepest tilt (cos 40° x 1.9 > 1.42).
    const across = cell * t * 1.9 * (.92 + random() * .22);
    toLight.copy(LIGHT).sub(at).normalize();
    q.setFromUnitVectors(up, toLight);
    axis.set(random() - .5, random() - .5, random() - .5).normalize();
    // Tilted up to 40° off the light, as hung coins turn: faces square to the light would all mirror it back at the camera at once.
    tilt.setFromAxisAngle(axis, (random() - .5) * 1.4);
    spin.setFromAxisAngle(up, random() * Math.PI * 2);
    const rotation = tilt.multiply(q).multiply(spin);
    matrices.push(new Matrix4().compose(at, rotation, spec.pieces === "blocks" ? new Vector3(across * .8, across * .8, across * .8) : new Vector3(across / 2, across / 2, across / 2)));
    tops.push(at.clone().add(new Vector3(0, across * .45, 0)));
  }
  const meshes: InstancedMesh[] = [];
  if (spec.pieces === "blocks") {
    const wood = paintTexture(256, 256, (ctx, w, h, random_) => {
      ctx.fillStyle = "#9b6a43"; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { ctx.strokeStyle = `rgba(52,28,12,${.06 + random_() * .14})`; ctx.lineWidth = .6 + random_() * 2; ctx.beginPath(); const y = random_() * h; for (let x = 0; x <= w; x += 8) ctx.lineTo(x, y + Math.sin(x * .02 + i) * 6); ctx.stroke(); }
    }, { seed: 5, repeat: true });
    const block = res.own(new RoundedBoxGeometry(1, 1, 1, 2, .12));
    meshes.push(new InstancedMesh(block, res.own(new MeshPhysicalMaterial({ map: res.own(wood), roughness: .5, clearcoat: .4, clearcoatRoughness: .3 })), matrices.length));
  } else {
    // Proof coins from the finance kit: the same relief, reeded edge and satin fields, one draw per face.
    const holder = new Group(), coins = createCoinFactory(res, holder, { metal: "gold" });
    meshes.push(new InstancedMesh(coins.parts.top, coins.parts.front, matrices.length), new InstancedMesh(coins.parts.bottom, coins.parts.back, matrices.length));
  }
  for (const mesh of meshes) {
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.name = "shadow-pieces";
    group.add(mesh);
  }
  // Fine threads to the ceiling, as an installation hangs: they explain the float and cast no shadow.
  const lines = new BufferGeometry(), points: number[] = [];
  for (const top of tops) points.push(top.x, top.y, top.z, top.x, CEILING, top.z);
  lines.setAttribute("position", new Float32BufferAttribute(points, 3));
  group.add(new LineSegments(res.own(lines), res.own(new LineBasicMaterial({ color: "#a39680", transparent: true, opacity: .1 }))));
  // The room: troweled plaster on the back wall, dark polished concrete underfoot.
  const plaster = plasterMaps(); res.own(plaster.map); res.own(plaster.normalMap);
  const wall = new Mesh(res.own(new PlaneGeometry(10, 4.6)), res.own(new MeshStandardMaterial({ color: "#d8cdbd", roughness: .93, roughnessMap: plaster.map, normalMap: plaster.normalMap, normalScale: new Vector2(.6, .6) })));
  wall.position.set(.3, 2.3, 0); wall.receiveShadow = true; group.add(wall);
  const floorRelief = paintWithRelief(512, 512, (ctx, w, h, random_) => { ctx.fillStyle = "#7a7a7a"; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const g = 100 + random_() * 60; ctx.fillStyle = `rgba(${g},${g},${g},.35)`; ctx.fillRect(random_() * w, random_() * h, 2, 2); } }, { color: "data", strength: .8, seed: 43, repeat: true });
  for (const t of [floorRelief.map, floorRelief.normalMap]) { res.own(t); t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(5, 4); }
  const floor = new Mesh(res.own(new PlaneGeometry(10, 8)), res.own(new MeshStandardMaterial({ color: "#2a2826", roughness: .42, roughnessMap: floorRelief.map, normalMap: floorRelief.normalMap, normalScale: new Vector2(.25, .25) })));
  floor.rotation.x = -Math.PI / 2; floor.position.set(.3, 0, 3.6); floor.receiveShadow = true; group.add(floor);
  // One warm, small spot: a hard-edged shadow with a soft pool of light around it.
  const spot = new SpotLight("#ffd2a1", 34, 0, .36, .42, 2);
  spot.position.copy(LIGHT); spot.target.position.copy(CENTER).add(new Vector3(.05, -.05, 0));
  spot.castShadow = true; spot.shadow.mapSize.set(4096, 4096); spot.shadow.bias = -.00015; spot.shadow.normalBias = .004;
  spot.shadow.camera.near = .4; spot.shadow.camera.far = 7;
  group.add(spot, spot.target, new HemisphereLight("#8fa4ba", "#1c1612", .07));
  const environment = createStudioEnvironmentTexture(512, "rim"); environment.mapping = EquirectangularReflectionMapping; res.own(environment);
  return { group, environment, count: matrices.length, dispose: res.dispose };
}

/** The camera at a frame: square on the wall, then back along a curve toward the light, landing just beside its viewpoint. */
export function shadowRevealCamera(spec: ShadowRevealSpec, frame: number) {
  const start = new Vector3(CENTER.x + .1, CENTER.y, 3.25), side = new Vector3(-1.15, 1.85, 4.75);
  const toLight = LIGHT.clone().sub(CENTER).normalize(), beside = new Vector3(.24, .16, 0);
  const end = LIGHT.clone().add(toLight.clone().multiplyScalar(.45)).add(beside);
  const path = new CatmullRomCurve3([start, side, end], false, "centripetal");
  const move = easeInOut(span01(frame, spec.revealStart, spec.revealEnd));
  // Moving from the first frame: a slow push toward the shadow while it is read, and after landing a drift onto the light's axis, so
  // the last of the parallax closes and the pieces lock into the shape.
  const settle = easeInOut(span01(frame, spec.revealEnd, spec.durationFrames));
  const position = move > 0 ? path.getPoint(move) : start.clone().add(new Vector3(0, 0, -.25 * easeInOut(span01(frame, 0, spec.revealStart))));
  position.sub(beside.clone().multiplyScalar(.7 * settle));
  const cloud = LIGHT.clone().lerp(CENTER, .42);
  // The landing aims a little left of the shape, so the pieces sit right of centre and the answer has the lower-left to itself.
  const landing = CENTER.clone().add(new Vector3(-.5, -.08, 0));
  const target = move < .5 ? CENTER.clone().lerp(cloud, easeInOut(move * 2) * .55) : cloud.lerp(CENTER, .45).lerp(landing, easeInOut((move - .5) * 2));
  const fov = 32 + 10 * Math.sin(move * Math.PI) - 5 * move;
  return { position, target, fov };
}

function ShadowRevealScene({ spec, frame }: { spec: ShadowRevealSpec; frame: number }) {
  const scene = useThree(state => state.scene), camera = useThree(state => state.camera) as PerspectiveCamera, size = useThree(state => state.size);
  const build = useMemo(() => buildInstallation(spec), [spec.silhouette, spec.pieces, spec.density, spec.seed]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const prior = { background: scene.background, environment: scene.environment, intensity: scene.environmentIntensity };
    scene.add(build.group); scene.background = new Color("#0c0b0a"); scene.environment = build.environment; scene.environmentIntensity = .32;
    return () => { scene.remove(build.group); Object.assign(scene, { background: prior.background, environment: prior.environment, environmentIntensity: prior.intensity }); build.dispose(); };
  }, [scene, build]);
  useLayoutEffect(() => {
    const pose = shadowRevealCamera(spec, frame);
    camera.position.copy(pose.position); camera.lookAt(pose.target);
    camera.fov = pose.fov; camera.aspect = size.width / Math.max(1, size.height); camera.near = .05; camera.far = 40; camera.updateProjectionMatrix();
  });
  return null;
}

/** A shadow that reads as one thing; the camera swings toward the light and the pieces that cast it line up into it. */
export function ShadowReveal({ spec, frame, fps, label, tone, style, children }: Pick<StudioRecipeProps, "frame" | "fps" | "label" | "tone" | "style" | "children"> & { spec: ShadowRevealSpec }) {
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#0c0b0a", ...style }}>
    <FiberStage frame={frame} fps={fps} label={label ?? `A shadow shaped like a ${spec.silhouette}, cast by ${spec.pieces === "blocks" ? "wooden blocks" : "coins"} hanging in the dark`} shadows style={{ position: "absolute", inset: 0 }}>
      <ShadowRevealScene spec={spec} frame={frame} />
    </FiberStage>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {children}
      <StudioCaption beat={spec.question && { ...spec.question, exit: spec.question.exit ?? spec.revealStart + 20 }} frame={frame} tone={tone} />
      <StudioCaption beat={spec.answer} frame={frame} tone={tone} />
    </div>
  </div>;
}
