/** `PhysicsPoint`: a point made with physics, played back from an offline bake (recipe 9). Dominoes for cause and effect; two stacks of
 * blocks for a comparison you can weigh. The motion is solved once by `npm run physics:bake` and sampled here at any frame, so there
 * is no solver, clock or randomness in the render. The pieces sit in Kumiki's product studio, on the turntable.
 */
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import { Box3, Group, Mesh, MeshPhysicalMaterial, NoColorSpace, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector2, Vector3 } from "three";
import type { Texture } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createAssetResources } from "../craft/hero-asset";
import type { HeroAsset } from "../craft/hero-asset";
import { paintTexture } from "../craft/canvas-texture";
import { sampleBakedPhysicalTrack } from "../motion/baked-physical-motion";
import type { BakedPhysicalActionSpec } from "../motion/baked-physical-motion";
import { FiberStage } from "./fiber-stage";
import { FiberHeroStudio, ShotCamera, Turntable, useHeroAsset } from "./studio-fiber";
import { StudioCaption } from "./studio-recipes-react";
import type { StudioRecipeProps } from "./studio-recipes-react";
import { easeInOut, orbitPose, span01, textBeatState, turntablePoint } from "./studio-shots";
import type { Vec3 } from "./studio-shots";
import type { PhysicsPointSpec, PhysicsScene } from "./physics-shots";

/** Lacquered wood: long grain lines with a little figure, under a clear coat. */
function woodTexture(base: [number, number, number], seed: number): Texture {
  const texture = paintTexture(512, 512, (ctx, w, h, random) => {
    ctx.fillStyle = `rgb(${base.join(",")})`; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const y = random() * h, amp = 4 + random() * 10, dark = .05 + random() * .14;
      ctx.strokeStyle = `rgba(40,22,10,${dark})`; ctx.lineWidth = .6 + random() * 2.2; ctx.beginPath();
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, y + Math.sin(x * .012 + i) * amp + Math.sin(x * .05 + i * 3) * 1.5);
      ctx.stroke();
    }
  }, { seed, repeat: true });
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

/** The scene's bodies as a HeroAsset: rounded, lacquered pieces named by group, with bounds that hold their whole motion. */
export function createPhysicsAsset(scene: PhysicsScene, action: BakedPhysicalActionSpec): HeroAsset {
  const res = createAssetResources(), group = new Group();
  group.name = scene.id;
  const ivory = res.own(new MeshPhysicalMaterial({ color: "#f1ebe0", roughness: .32, clearcoat: .8, clearcoatRoughness: .12 }));
  const accent = res.own(new MeshPhysicalMaterial({ color: "#c2452d", roughness: .3, clearcoat: .8, clearcoatRoughness: .12 }));
  const walnut = res.own(new MeshPhysicalMaterial({ map: res.own(woodTexture([112, 74, 48], 21)), roughness: .45, clearcoat: .6, clearcoatRoughness: .2 }));
  const maple = res.own(new MeshPhysicalMaterial({ map: res.own(woodTexture([214, 182, 136], 22)), roughness: .45, clearcoat: .6, clearcoatRoughness: .2 }));
  const material = (g: string) => g === "last" ? accent : g === "left" ? walnut : g === "right" ? maple : ivory;
  const geometries = new Map<string, RoundedBoxGeometry>();
  for (const body of scene.bodies) {
    const key = body.size.join("x");
    if (!geometries.has(key)) geometries.set(key, res.own(new RoundedBoxGeometry(body.size[0], body.size[1], body.size[2], 3, Math.min(...body.size) * .12)));
    const mesh = new Mesh(geometries.get(key)!, material(body.group));
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = body.id; mesh.userData.partRole = body.group;
    group.add(mesh);
    if (!res.parts.has(body.group)) res.parts.set(body.group, mesh);
  }
  // Bounds over every position each body takes after release, so the studio and framing hold the whole motion.
  const box = new Box3();
  for (const track of action.tracks) {
    const body = scene.bodies.find(b => b.id === track.target)!, after = track.keys.filter(k => k.frame >= (body.release ?? 0));
    for (const key of after.length ? after : track.keys) { const r = Math.max(...body.size) / 2; box.expandByPoint(new Vector3(key.position[0] - r, key.position[1] - r, key.position[2] - r)); box.expandByPoint(new Vector3(key.position[0] + r, key.position[1] + r, key.position[2] + r)); }
  }
  box.min.y = 0;
  return { id: scene.id, group, parts: res.parts, tier: "hero", metersPerUnit: 1, exposure: 1,
    bounds: { min: box.min.toArray(), max: box.max.toArray() }, studio: { palette: "graphite", keyAzimuth: -35 },
    craft: { materials: ["lacquered ivory", "lacquered walnut and maple"], details: ["rounded edges", "solved rigid-body motion"] }, dispose: res.dispose };
}

/** Photographed wood for the blocks: per group, a colour and a normal map (for example Poly Haven's CC0 veneers), and the size of
 * one texture tile in metres. Each block gets its own grain offset, so no two blocks show the same figure. */
export type PhysicsWoods = Readonly<Record<string, { map: string; normal: string; tileMetres?: number; /** The finish's tint over the raw veneer: a clear lacquer deepens and warms wood. @default "#ffffff" */ finish?: string }>>;
function WoodFinish({ asset, scene, woods }: { asset: HeroAsset; scene: PhysicsScene; woods: PhysicsWoods }) {
  const groups = Object.keys(woods), urls = groups.flatMap(g => [woods[g].map, woods[g].normal]);
  const textures = useLoader(TextureLoader, urls);
  useLayoutEffect(() => {
    const owned: MeshPhysicalMaterial[] = [], prior = new Map<Mesh, MeshPhysicalMaterial>();
    scene.bodies.forEach((body, i) => {
      const at = groups.indexOf(body.group); if (at < 0) return;
      const mesh = asset.group.getObjectByName(body.id) as Mesh | undefined; if (!mesh) return;
      const base = mesh.material as MeshPhysicalMaterial, tile = woods[body.group].tileMetres ?? 1, k = Math.max(...body.size) / tile;
      // Clones share the image, so the GPU holds one copy; only the offset differs per block.
      const map = textures[at * 2].clone(), normal = textures[at * 2 + 1].clone();
      for (const [t, colour] of [[map, true], [normal, false]] as const) {
        t.wrapS = t.wrapT = RepeatWrapping; t.colorSpace = colour ? SRGBColorSpace : NoColorSpace; t.anisotropy = 8;
        t.repeat.set(k, k); t.offset.set((i * .618) % 1, (i * .382) % 1); t.needsUpdate = true;
      }
      const material = base.clone(); material.map = map; material.normalMap = normal; material.normalScale = new Vector2(.8, .8); material.color.set(woods[body.group].finish ?? "#ffffff");
      // A satin finish: a full gloss coat mirrors a whole softbox across a block face and flashes it white.
      material.clearcoat = .28; material.clearcoatRoughness = .42; material.roughness = .55;
      prior.set(mesh, base); mesh.material = material; owned.push(material);
    });
    return () => { prior.forEach((m, mesh) => { mesh.material = m; }); owned.forEach(m => { m.map?.dispose(); m.normalMap?.dispose(); m.dispose(); }); };
  }, [asset, scene, textures]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function PhysicsScene_({ asset, action, scene, spec, frame, onLabels }: { asset: HeroAsset; action: BakedPhysicalActionSpec; scene: PhysicsScene; spec: PhysicsPointSpec; frame: number; onLabels: (points: Array<{ x: number; y: number }>) => void }) {
  const size = useThree(state => state.size), camera = useThree(state => state.camera);
  const meshes = useMemo(() => new Map(asset.group.children.map(child => [child.name, child as Mesh])), [asset]);
  const center: Vec3 = [(asset.bounds.min[0] + asset.bounds.max[0]) / 2, (asset.bounds.min[1] + asset.bounds.max[1]) / 2, (asset.bounds.min[2] + asset.bounds.max[2]) / 2];
  const radius = new Vector3(...asset.bounds.max).sub(new Vector3(...asset.bounds.min)).length() / 2;
  const turn = (spec.view.yaw ?? 0) + easeInOut(span01(frame, 0, spec.durationFrames)) * (spec.orbit ?? 10);
  useLayoutEffect(() => {
    for (const track of action.tracks) {
      const mesh = meshes.get(track.target); if (!mesh) continue;
      const sample = sampleBakedPhysicalTrack(track, frame);
      mesh.position.set(...sample.position); mesh.quaternion.set(...sample.rotation); mesh.scale.set(...sample.scale);
      mesh.visible = sample.scale[0] > 1e-3;
    }
    // Labels sit above the highest piece of their group, carried by the turntable, projected after the camera is set.
    if (spec.labels?.length) {
      camera.updateMatrixWorld();
      onLabels(spec.labels.map(label => {
        let top: Vec3 = center;
        for (const body of scene.bodies) if (body.group === label.group) { const m = meshes.get(body.id)!; if (m.position.y > top[1] || top === center) top = [m.position.x, m.position.y + body.size[1] * 1.6, m.position.z]; }
        const p = new Vector3(...turntablePoint(top, center, turn)).project(camera);
        return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
      }));
    }
  });
  return <><Turntable yaw={turn} /><ShotCamera pose={orbitPose(center, radius, { ...spec.view, yaw: 0 }, size.width / Math.max(1, size.height))} /></>;
}

/** A point made with physics: a baked scene played back in the studio, with an optional title and labels over each group. */
export function PhysicsPoint({ scene, action, spec, woods, ...props }: Omit<StudioRecipeProps, "create"> & { scene: PhysicsScene; action: BakedPhysicalActionSpec; spec: PhysicsPointSpec; woods?: PhysicsWoods }) {
  const asset = useHeroAsset(() => createPhysicsAsset(scene, action), [scene.id, props.assetKey ?? "default"]);
  const labels = useRef<Array<HTMLDivElement | null>>([]);
  const onLabels = useCallback((points: Array<{ x: number; y: number }>) => points.forEach((p, i) => { const el = labels.current[i]; if (el) { el.style.left = `${p.x * 100}%`; el.style.top = `${p.y * 100}%`; } }), []);
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#0b0e12", ...props.style }}>
    <FiberStage frame={props.frame} fps={props.fps} label={props.label ?? `${scene.title}, solved physics played back`} shadows style={{ position: "absolute", inset: 0 }}>
      <FiberHeroStudio asset={asset} studio={props.studio} exposure={props.exposure}>
        {woods && <WoodFinish asset={asset} scene={scene} woods={woods} />}
        <PhysicsScene_ asset={asset} action={action} scene={scene} spec={spec} frame={props.frame} onLabels={onLabels} />
      </FiberHeroStudio>
    </FiberStage>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {props.children}
      {spec.labels?.map((label, i) => { const { opacity, rise } = textBeatState({ text: label.text, enter: label.enter }, props.frame);
        return <div key={label.group} ref={node => { labels.current[i] = node; }} style={{ position: "absolute", transform: `translate(-50%, calc(-100% + ${rise}px))`, opacity, whiteSpace: "nowrap",
          font: "650 4cqh/1.1 var(--km-font-display, var(--km-font-body, system-ui, sans-serif))", color: "#f4f6f9", textShadow: "0 1px 2px rgba(0,0,0,.55), 0 0 18px rgba(0,0,0,.35)" }}>{label.text}</div>; })}
      <StudioCaption beat={spec.title} frame={props.frame} tone={props.tone} />
    </div>
  </div>;
}
