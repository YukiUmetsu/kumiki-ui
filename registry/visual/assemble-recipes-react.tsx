/** `ManyIntoOne` (recipe 10): particles scattered through the frame gather onto a subject's real surface, and the subject builds in
 * under them from the bottom up as they fade. An identity or reveal moment: many small things become one product. Pure function of
 * `frame`: the surface points are sampled once from a seeded source, and the gathering is the `assemble` particle kind.
 */
import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Mesh, Plane, Vector3 } from "three";
import type { Material } from "three";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import type { HeroAsset } from "../craft/hero-asset";
import { compileEffect } from "./environmental-effects";
import type { Vec3 as EffectVec3 } from "./environmental-effects";
import { EnvironmentalEffectsFiber } from "./environmental-effects-fiber";
import { FiberStage } from "./fiber-stage";
import { FiberHeroStudio, ShotCamera, Turntable, useHeroAsset, useStudio } from "./studio-fiber";
import { StudioCaption } from "./studio-recipes-react";
import type { StudioRecipeProps } from "./studio-recipes-react";
import { boundsCenter, boundsRadius, manyIntoOneState, orbitPose } from "./studio-shots";
import type { ManyIntoOneSpec } from "./studio-shots";

/** Points spread evenly over a subject's visible surfaces, by area, from a seeded source, in world space at rest. */
export function sampleSurfacePoints(asset: HeroAsset, count: number, seed = 7): EffectVec3[] {
  let a = seed >>> 0;
  const random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  asset.group.updateMatrixWorld(true);
  const meshes: Array<{ mesh: Mesh; area: number }> = [];
  asset.group.traverse(object => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || !object.visible || object.userData.kmHighlightHull || !mesh.geometry.getAttribute("position")) return;
    mesh.geometry.computeBoundingBox();
    const size = mesh.geometry.boundingBox!.getSize(new Vector3()).multiply(new Vector3().setFromMatrixScale(mesh.matrixWorld));
    meshes.push({ mesh, area: Math.max(1e-6, size.x * size.y + size.y * size.z + size.x * size.z) });
  });
  const total = meshes.reduce((s, m) => s + m.area, 0), out: EffectVec3[] = [], p = new Vector3();
  for (const { mesh, area } of meshes) {
    const n = Math.round(count * area / total);
    if (!n) continue;
    // The sampler accepts a random source at run time (three r186); the bundled types do not declare it yet.
    const sampler = new MeshSurfaceSampler(mesh);
    (sampler as unknown as { setRandomGenerator(fn: () => number): void }).setRandomGenerator(random);
    sampler.build();
    for (let i = 0; i < n; i++) { sampler.sample(p); p.applyMatrix4(mesh.matrixWorld); out.push([p.x, p.y, p.z]); }
  }
  return out.slice(0, count);
}

function AssembleScene({ asset, spec, frame }: { asset: HeroAsset; spec: ManyIntoOneSpec; frame: number }) {
  const size = useThree(state => state.size), gl = useThree(state => state.gl), studio = useStudio();
  const center = boundsCenter(asset.bounds), radius = boundsRadius(asset.bounds), state = manyIntoOneState(spec, frame), n = spec.revealFrames ?? 12;
  const plans = useMemo(() => {
    studio.turn(0);
    const targets = sampleSurfacePoints(asset, spec.count ?? 3600), span = radius * 1.7;
    return [compileEffect({ id: "many-into-one", kind: "assemble", job: "identity", frames: { fadeIn: 0, end: spec.formFrame + n, fadeOut: n },
      region: { min: [center[0] - span * 1.6, center[1] - span, center[2] - span], max: [center[0] + span * 1.6, center[1] + span, center[2] + span] },
      assemble: { targets, startFrame: spec.startFrame, endFrame: spec.formFrame, stagger: .3 }, intensity: 1, color: spec.color ?? "#fff1dc", seed: 29, scale: radius * 2.1 })];
  }, [asset, spec.count, spec.startFrame, spec.formFrame, n, spec.color, studio]); // eslint-disable-line react-hooks/exhaustive-deps
  // The subject builds in from the bottom: every material clips away what is above a rising plane.
  const plane = useMemo(() => new Plane(new Vector3(0, -1, 0), 0), []);
  useLayoutEffect(() => {
    gl.localClippingEnabled = true;
    const materials = new Set<Material & { clippingPlanes: Plane[] | null }>();
    asset.group.traverse(object => { const mesh = object as Mesh; if (mesh.isMesh) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => materials.add(m as Material & { clippingPlanes: Plane[] | null })); });
    materials.forEach(m => { m.clippingPlanes = [plane]; m.needsUpdate = true; });
    return () => materials.forEach(m => { m.clippingPlanes = null; m.needsUpdate = true; });
  }, [asset, gl, plane]);
  useLayoutEffect(() => {
    const { min, max } = asset.bounds;
    plane.constant = state.reveal <= 0 ? min[1] - 1 : state.reveal >= 1 ? max[1] + 1 : min[1] + (max[1] - min[1]) * state.reveal;
    asset.group.visible = state.reveal > 0;
    // No shadow on the floor before there is anything to cast it.
    const blob = studio.studio.group.getObjectByName("contact-occlusion");
    if (blob) blob.visible = state.reveal > 0;
  });
  const turn = state.reveal >= 1 ? state.turn : spec.view.yaw ?? 0;
  return <>
    <Turntable yaw={turn} />
    <group>
      <EnvironmentalEffectsFiber plans={plans} />
    </group>
    <ShotCamera pose={orbitPose(center, radius, { ...spec.view, yaw: 0 }, size.width / Math.max(1, size.height))} />
  </>;
}

/** Particles gather onto the subject's real surface; the subject builds in under them as they fade, then turns a little and holds. */
export function ManyIntoOne({ spec, ...props }: StudioRecipeProps & { spec: ManyIntoOneSpec }) {
  const asset = useHeroAsset(props.create, [props.assetKey ?? "default"]);
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#0b0e12", ...props.style }}>
    <FiberStage frame={props.frame} fps={props.fps} label={props.label ?? `${asset.id}, gathering out of particles`} shadows style={{ position: "absolute", inset: 0 }}>
      <FiberHeroStudio asset={asset} studio={props.studio} exposure={props.exposure}>
        <AssembleScene asset={asset} spec={spec} frame={props.frame} />
      </FiberHeroStudio>
    </FiberStage>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{props.children}<StudioCaption beat={spec.title} frame={props.frame} tone={props.tone} /></div>
  </div>;
}
