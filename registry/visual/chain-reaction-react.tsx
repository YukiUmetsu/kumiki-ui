/** `ChainReaction`: cause and effect as a line of growing dominoes. Each domino stands 1.35 times taller than the last and carries one
 * link of the chain printed on its face, cause first. The camera reads the line from the smallest domino to the largest, steps back
 * to the side, and the first is tipped: the fall grows as it travels, played back from an offline bake (`npm run physics:bake`) at a
 * little over half speed, then holds on the fallen line. Pure function of `frame`.
 */
import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Box3, Group, Mesh, MeshPhysicalMaterial, PlaneGeometry, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createAssetResources } from "../craft/hero-asset";
import type { HeroAsset } from "../craft/hero-asset";
import { paintTexture } from "../craft/canvas-texture";
import { sampleBakedPhysicalTrack } from "../motion/baked-physical-motion";
import type { BakedPhysicalActionSpec } from "../motion/baked-physical-motion";
import { FiberStage } from "./fiber-stage";
import { FiberHeroStudio, ShotCamera, useHeroAsset } from "./studio-fiber";
import { StudioCaption } from "./studio-recipes-react";
import type { StudioRecipeProps } from "./studio-recipes-react";
import { easeInOut, orbitPose, span01 } from "./studio-shots";
import type { ShotPose, Vec3 } from "./studio-shots";
import type { PhysicsScene } from "./physics-shots";
import { chainReadFrames, chainSettleFrame } from "./story-3d-shots";
import type { ChainReactionSpec } from "./story-3d-shots";

const FACE_FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
/** Words on one face, wrapped and sized to fill it: a step number at the top, the link below in heavy type. */
function paintFace(text: string, index: number, aspect: number, last: boolean) {
  const w = 512, h = Math.round(w / aspect);
  return paintTexture(w, h, ctx => {
    ctx.clearRect(0, 0, w, h);
    const ink = last ? "#fbf3e6" : "#1d2026";
    ctx.fillStyle = last ? "rgba(251,243,230,.75)" : "rgba(29,32,38,.55)"; ctx.font = `600 ${Math.round(w * .085)}px ${FACE_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(String(index + 1).padStart(2, "0"), w / 2, h * .07);
    ctx.fillRect(w * .42, h * .07 + w * .115, w * .16, Math.max(2, w * .008));
    // The largest size at which the words wrap into the face's text box: the upper half, which the shorter domino in front never covers.
    const box = { width: w * .84, height: h * .33 }, words = text.split(/\s+/).filter(Boolean);
    let size = w * .2, lines: string[] = [];
    for (; size > w * .06; size *= .94) {
      ctx.font = `750 ${Math.round(size)}px ${FACE_FONT}`;
      lines = []; let line = "";
      for (const word of words) { const next = line ? line + " " + word : word; if (ctx.measureText(next).width > box.width && line) { lines.push(line); line = word; } else line = next; }
      if (line) lines.push(line);
      if (lines.length * size * 1.08 <= box.height && lines.every(l => ctx.measureText(l).width <= box.width)) break;
    }
    ctx.fillStyle = ink; ctx.textBaseline = "middle";
    const top = h * .17 + (box.height - lines.length * size * 1.08) / 2 + size * .54;
    lines.forEach((l, i) => ctx.fillText(l, w / 2, top + i * size * 1.08));
  }, { seed: index + 1, fallback: [0, 0, 0, 0] });
}

/** The dominoes as a HeroAsset: lacquered ivory, the last in deep red, each with its link on the face toward the camera. */
export function createChainAsset(scene: PhysicsScene, action: BakedPhysicalActionSpec, links: readonly string[]): HeroAsset {
  const res = createAssetResources(), group = new Group();
  group.name = scene.id;
  const ivory = res.own(new MeshPhysicalMaterial({ color: "#efe8db", roughness: .34, clearcoat: .7, clearcoatRoughness: .16, sheen: .2 }));
  const red = res.own(new MeshPhysicalMaterial({ color: "#a8321f", roughness: .32, clearcoat: .75, clearcoatRoughness: .14 }));
  scene.bodies.forEach((body, i) => {
    const [w, h, t] = body.size, last = i === scene.bodies.length - 1;
    const mesh = new Mesh(res.own(new RoundedBoxGeometry(w, h, t, 3, t * .32)), last ? red : ivory);
    mesh.name = body.id; mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.partRole = body.group;
    // Printed on the front face (+Z, toward the start of the line and the reading camera), just proud of the lacquer.
    const face = new Mesh(res.own(new PlaneGeometry(w * .92, h * .94)), res.own(new MeshPhysicalMaterial({ map: res.own(paintFace(links[i] ?? "", i, w / h, last)), transparent: true, roughness: .45, clearcoat: .5, polygonOffset: true, polygonOffsetFactor: -2 })));
    face.position.z = t / 2 + .0004; face.name = `${body.id}-face`;
    mesh.add(face);
    group.add(mesh);
    if (!res.parts.has(body.group)) res.parts.set(body.group, mesh);
  });
  // Bounds over the whole motion, so the studio sweep and shadow hold the fallen line too.
  const box = new Box3();
  for (const track of action.tracks) {
    const body = scene.bodies.find(b => b.id === track.target)!, r = Math.max(...body.size) / 2;
    for (const key of track.keys) { box.expandByPoint(new Vector3(key.position[0] - r, key.position[1] - r, key.position[2] - r)); box.expandByPoint(new Vector3(key.position[0] + r, key.position[1] + r, key.position[2] + r)); }
  }
  box.min.y = 0;
  return { id: scene.id, group, parts: res.parts, tier: "hero", metersPerUnit: 1, exposure: 1, bounds: { min: box.min.toArray(), max: box.max.toArray() },
    // A sweep seven times the line's size, so the wide shot from the side never sees past it.
    studio: { palette: "graphite", keyAzimuth: -40, extent: { min: [box.min.x - span(box) * 3, 0, box.min.z - span(box) * 3], max: [box.max.x + span(box) * 3, box.max.y * 6, box.max.z + span(box) * 3] } }, craft: { materials: ["lacquered ivory", "lacquered red"], details: ["printed faces", "solved rigid-body motion"] }, dispose: res.dispose };
}

const span = (box: Box3) => Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
/** The frame the bake comes to rest: where the last body stops moving. A bake keeps the first key of each body's final, unchanging
 * run and a copy at the end, so the run starts at the second-last key when the two match. */
export function physicsSettleFrame(action: BakedPhysicalActionSpec): number {
  return Math.max(...action.tracks.map(track => {
    const keys = track.keys, a = keys[keys.length - 2], b = keys[keys.length - 1];
    if (!a || !b) return 0;
    const same = a.position.every((v, i) => Math.abs(v - b.position[i]) < 1e-4) && a.rotation.every((v, i) => Math.abs(v - b.rotation[i]) < 1e-4);
    return same ? a.frame : b.frame;
  }));
}

/** The camera at a frame: close on each face in turn while it is read, then back to the side for the fall, then a slow drift. */
export function chainCamera(spec: ChainReactionSpec, scene: PhysicsScene, bounds: HeroAsset["bounds"], frame: number, aspect: number, fps: number): ShotPose {
  const bodies = scene.bodies, read = chainReadFrames(spec.links, fps), move = Math.round(fps * .45);
  const close = (i: number): ShotPose => {
    // Framed on the printed upper half, from a little above, so the camera looks over the shorter domino in front.
    const [w, h] = bodies[i].size, p = bodies[i].position, center: Vec3 = [p[0], h * .7, p[2]];
    return orbitPose(center, Math.hypot(w, h * .6) / 2, { yaw: 20, pitch: 30, fill: .8, offsetX: .26 }, aspect);
  };
  const c: Vec3 = [(bounds.min[0] + bounds.max[0]) / 2, (bounds.max[1] - bounds.min[1]) * .4, (bounds.min[2] + bounds.max[2]) / 2];
  const radius = Math.hypot(bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1], bounds.max[2] - bounds.min[2]) / 2;
  const wide = (drift: number) => orbitPose(c, radius, { yaw: 52 + drift * 6, pitch: 11 + drift * 3, fill: 1.3 + drift * .08, offsetX: .04 }, aspect);
  const mix = (a: ShotPose, b: ShotPose, t: number): ShotPose => {
    // Distance and size change in log space, so a move between a 9 cm and a 50 cm domino keeps a steady sense of speed.
    const lerp = (x: number, y: number) => x + (y - x) * t;
    return { position: [0, 1, 2].map(k => lerp(a.position[k], b.position[k])) as unknown as Vec3, target: [0, 1, 2].map(k => lerp(a.target[k], b.target[k])) as unknown as Vec3, fov: lerp(a.fov, b.fov) };
  };
  let at = 0;
  for (let i = 0; i < bodies.length; i++) {
    const hold = read[i] - move, end = at + read[i];
    if (frame < at + hold) return close(i);
    if (frame < end) return mix(close(i), i + 1 < bodies.length ? close(i + 1) : wide(0), easeInOut((frame - at - hold) / move));
    at = end;
  }
  // From the last face, out to the side by the push, then a slow push in on the fallen line.
  if (frame < spec.pushFrame) return mix(close(bodies.length - 1), wide(0), easeInOut(span01(frame, at - move, spec.pushFrame)));
  return wide(easeInOut(span01(frame, spec.pushFrame, spec.durationFrames)));
}

function ChainScene({ asset, scene, action, spec, frame, fps }: { asset: HeroAsset; scene: PhysicsScene; action: BakedPhysicalActionSpec; spec: ChainReactionSpec; frame: number; fps: number }) {
  const size = useThree(state => state.size);
  const meshes = useMemo(() => new Map(asset.group.children.map(child => [child.name, child as Mesh])), [asset]);
  const physicsFrame = Math.max(0, (frame - spec.pushFrame) * (spec.speed ?? .55));
  useLayoutEffect(() => {
    for (const track of action.tracks) {
      const mesh = meshes.get(track.target); if (!mesh) continue;
      const sample = sampleBakedPhysicalTrack(track, physicsFrame);
      mesh.position.set(...sample.position); mesh.quaternion.set(...sample.rotation);
    }
  });
  return <ShotCamera pose={chainCamera(spec, scene, asset.bounds, frame, size.width / Math.max(1, size.height), fps)} />;
}

/** A chain of causes on growing dominoes: read from cause to effect, then tipped. `bake` is `domino-amplifier-<links>` from `physics:bake`. */
export function ChainReaction({ spec, bake, ...props }: Omit<StudioRecipeProps, "create"> & { spec: ChainReactionSpec; bake: { scene: PhysicsScene; action: BakedPhysicalActionSpec } }) {
  const asset = useHeroAsset(() => createChainAsset(bake.scene, bake.action, spec.links), [bake.scene.id, spec.links.join("\u0000")]);
  const fps = props.fps.num / props.fps.den;
  const settle = chainSettleFrame(spec, physicsSettleFrame(bake.action));
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#0b0e12", ...props.style }}
    data-km-chain-settle={settle}>
    <FiberStage frame={props.frame} fps={props.fps} label={props.label ?? `A line of growing dominoes, each printed with one step: ${spec.links.join(", then ")}. The first is tipped and the fall grows to the last.`} shadows style={{ position: "absolute", inset: 0 }}>
      <FiberHeroStudio asset={asset} studio={props.studio} exposure={props.exposure}>
        <ChainScene asset={asset} scene={bake.scene} action={bake.action} spec={spec} frame={props.frame} fps={fps} />
      </FiberHeroStudio>
    </FiberStage>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{props.children}<StudioCaption beat={spec.title} frame={props.frame} tone={props.tone} /></div>
  </div>;
}
