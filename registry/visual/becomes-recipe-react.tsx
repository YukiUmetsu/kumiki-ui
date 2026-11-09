/** `Becomes`: object A dissolves from the top down into glowing particles that fly to object B's surface and build B where they land.
 * See `becomes-shot.ts` for the timing, the checks and the research. Pure function of `frame`: both surfaces are sampled once from a
 * seeded source in the pose the change happens in, and each particle's flight is computed in its vertex shader from the frame. */
import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { AdditiveBlending, Box3, BufferAttribute, BufferGeometry, Color, Group, Plane, Points, ShaderMaterial, Vector3 } from "three";
import type { Material, Mesh, PerspectiveCamera } from "three";
import type { HeroAsset } from "../craft/hero-asset";
import { sampleSurfacePoints } from "./assemble-recipes-react";
import { becomesState } from "./becomes-shot";
import type { BecomesSpec } from "./becomes-shot";
import { FiberStage } from "./fiber-stage";
import { FiberHeroStudio, ShotCamera, Turntable, useHeroAsset, useStudio } from "./studio-fiber";
import { StudioCaption } from "./studio-recipes-react";
import type { StudioRecipeProps } from "./studio-recipes-react";
import { boundsCenter, boundsRadius, orbitPose } from "./studio-shots";

/** The top of an asset's base (a part named as a plinth or pedestal that stands on the floor), if it has one. */
function baseTop(asset: HeroAsset): number | undefined {
  const floor = asset.bounds.min[1], height = asset.bounds.max[1] - floor, box = new Box3();
  let found = false;
  asset.parts.forEach((part, name) => {
    if (!/plinth|pedestal/i.test(name)) return;
    const own = new Box3().setFromObject(part);
    if (own.isEmpty() || own.min.y > floor + height * .03) return;
    box.union(own); found = true;
  });
  return found ? box.max.y : undefined;
}

/** A wrapped so it stands where B stands: scaled to B's size and seated on B's footprint. The outer group is what the studio turns. */
function alignTo(a: HeroAsset, b: HeroAsset): HeroAsset {
  const outer = new Group(), inner = new Group(), s = boundsRadius(b.bounds) / Math.max(1e-6, boundsRadius(a.bounds));
  const ca = boundsCenter(a.bounds), cb = boundsCenter(b.bounds);
  inner.scale.setScalar(s);
  inner.position.set(cb[0] - ca[0] * s, b.bounds.min[1] - a.bounds.min[1] * s, cb[2] - ca[2] * s);
  inner.add(a.group); outer.add(inner); outer.name = `becomes-from-${a.id}`;
  const box = new Box3().setFromObject(inner);
  return { ...a, group: outer, bounds: { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] } };
}

const VERT = `
attribute vec3 aStart; attribute vec3 aEnd; attribute float aRelease; attribute float aSeed;
uniform float uFrame, uTravel, uSize, uRadius;
varying float vAlpha;
void main(){
  float u = clamp((uFrame - aRelease) / uTravel, 0., 1.), e = u * u * (3. - 2. * u), arc = sin(3.14159265 * e);
  vec3 side = vec3(cos(aSeed * 6.2831853), 0., sin(aSeed * 6.2831853));
  // Each flies on an arc: up over the gap, and a little to one side, so the stream reads as matter pouring, not a crossfade.
  vec3 p = mix(aStart, aEnd, e) + arc * (vec3(0., uRadius * (.12 + .2 * fract(aSeed * 7.31)), 0.) + side * uRadius * .3 * (fract(aSeed * 13.7) - .5));
  float born = step(aRelease, uFrame), landed = 1. - smoothstep(uTravel * .92, uTravel * 1.3, uFrame - aRelease);
  vAlpha = born * landed * (.5 + .5 * arc);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_PointSize = uSize / -mv.z * (1. + .7 * arc);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform vec3 uColor; varying float vAlpha;
void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .08, d) * vAlpha; if (a < .003) discard; gl_FragColor = vec4(uColor * a * 1.35, a); }`;

/** Every material of an asset clips to one plane: what lies on the plane's negative side is cut away. */
function useClip(asset: HeroAsset, plane: Plane) {
  const gl = useThree(state => state.gl);
  useLayoutEffect(() => {
    gl.localClippingEnabled = true;
    const materials = new Set<Material & { clippingPlanes: Plane[] | null }>();
    asset.group.traverse(object => { const mesh = object as Mesh; if (mesh.isMesh) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => materials.add(m as Material & { clippingPlanes: Plane[] | null })); });
    materials.forEach(m => { m.clippingPlanes = [plane]; m.needsUpdate = true; });
    return () => materials.forEach(m => { m.clippingPlanes = null; m.needsUpdate = true; });
  }, [asset, gl, plane]);
}

function BecomesScene({ from, to, spec, frame }: { from: HeroAsset; to: HeroAsset; spec: BecomesSpec; frame: number }) {
  const size = useThree(state => state.size), camera = useThree(state => state.camera) as PerspectiveCamera, dpr = useThree(state => state.viewport.dpr), studio = useStudio();
  const center = boundsCenter(to.bounds), radius = boundsRadius(to.bounds), state = becomesState(spec, frame), formYaw = spec.view.yaw ?? 0;
  // Where the change stops at the bottom: each one's base top if both have a base, otherwise the floor.
  const bases = useMemo(() => { const fa = baseTop(from), fb = baseTop(to); return fa !== undefined && fb !== undefined ? { from: fa, to: fb, held: true } : { from: from.bounds.min[1], to: to.bounds.min[1], held: false }; }, [from, to]);
  const points = useMemo(() => {
    // Both surfaces are sampled in the pose the change happens in, then paired by height: A's top flows to B's top.
    studio.turn(formYaw, [to, from]);
    const n = Math.min(16000, spec.count ?? 9000);
    // Above the bases, when both stand on one: the plinth stays and only what stands on it changes.
    const a = sampleSurfacePoints(from, n, 11).filter(p => p[1] > bases.from + 1e-4), b = sampleSurfacePoints(to, n, 23).filter(p => p[1] > bases.to + 1e-4), m = Math.min(a.length, b.length);
    const byHeight = (list: typeof a) => [...list].sort((p, q) => q[1] - p[1]).slice(0, m);
    const sa = byHeight(a), sb = byHeight(b), top = from.bounds.max[1], bottom = bases.from;
    const start = new Float32Array(m * 3), end = new Float32Array(m * 3), release = new Float32Array(m), seed = new Float32Array(m);
    for (let i = 0; i < m; i++) {
      start.set(sa[i], i * 3); end.set(sb[i], i * 3);
      // A particle leaves when the dissolve, sweeping down A, reaches it.
      release[i] = spec.dissolveFrame + (1 - (sa[i][1] - bottom) / Math.max(1e-6, top - bottom)) * state.sweep;
      seed[i] = ((i * 2654435761) >>> 0) / 4294967296;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(start.slice(), 3));
    geometry.setAttribute("aStart", new BufferAttribute(start, 3)); geometry.setAttribute("aEnd", new BufferAttribute(end, 3));
    geometry.setAttribute("aRelease", new BufferAttribute(release, 1)); geometry.setAttribute("aSeed", new BufferAttribute(seed, 1));
    const material = new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uFrame: { value: 0 }, uTravel: { value: state.travel }, uSize: { value: 1 }, uRadius: { value: radius }, uColor: { value: new Color(spec.color ?? "#ffe9c8") } } });
    const cloud = new Points(geometry, material);
    cloud.frustumCulled = false;
    return cloud;
  }, [from, to, bases, spec.count, spec.dissolveFrame, spec.formFrame, spec.color, studio, formYaw]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => () => { points.geometry.dispose(); (points.material as ShaderMaterial).dispose(); }, [points]);
  // A is cut away above a falling plane; B appears above a second plane that follows the particles down.
  const planeA = useMemo(() => new Plane(new Vector3(0, -1, 0), 0), []), planeB = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  useClip(from, planeA); useClip(to, planeB);
  useLayoutEffect(() => {
    const level = (asset: HeroAsset, bottom: number, k: number) => asset.bounds.max[1] - (asset.bounds.max[1] - bottom) * k;
    // A's base stays until B is whole; then the bases swap, which is invisible when they match.
    const whole = state.build >= 1;
    planeA.constant = state.dissolve <= 0 ? from.bounds.max[1] + 1 : whole || !bases.held && state.dissolve >= 1 ? from.bounds.min[1] - 1 : level(from, bases.from, state.dissolve);
    planeB.constant = state.build <= 0 ? -(to.bounds.max[1] + 1) : whole ? -(to.bounds.min[1] - 1) : -level(to, bases.to, state.build);
    from.group.visible = !whole && (bases.held || state.dissolve < 1); to.group.visible = state.build > 0;
    const material = points.material as ShaderMaterial;
    // Point size in pixels for a world size of a hundredth of the subject's radius, at this lens and output size.
    material.uniforms.uFrame.value = frame;
    material.uniforms.uSize.value = radius * .012 * size.height * dpr / (2 * Math.tan((camera.fov ?? 30) * Math.PI / 360));
    points.visible = frame >= spec.dissolveFrame && frame <= spec.formFrame + state.travel * .4;
  });
  return <>
    <Turntable yaw={frame < spec.formFrame ? formYaw : state.turn} subjects={[to, from]} />
    <primitive object={points} />
    <ShotCamera pose={orbitPose(center, radius, { ...spec.view, yaw: 0 }, size.width / Math.max(1, size.height))} />
  </>;
}

/** Object A turns into object B: A dissolves from the top into particles that fly to B's surface and build B where they land. */
export function Becomes({ spec, createFrom, fromKey, ...props }: StudioRecipeProps & { spec: BecomesSpec; createFrom: () => HeroAsset; fromKey?: string }) {
  const to = useHeroAsset(props.create, [props.assetKey ?? "default"]), raw = useHeroAsset(createFrom, [fromKey ?? "from"]);
  const from = useMemo(() => alignTo(raw, to), [raw, to]);
  const extra = useMemo(() => [from], [from]);
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#0b0e12", ...props.style }}>
    <FiberStage frame={props.frame} fps={props.fps} label={props.label ?? `${raw.id} becomes ${to.id}`} shadows style={{ position: "absolute", inset: 0 }}>
      <FiberHeroStudio asset={to} extra={extra} studio={props.studio} exposure={props.exposure}>
        <BecomesScene from={from} to={to} spec={spec} frame={props.frame} />
      </FiberHeroStudio>
    </FiberStage>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{props.children}<StudioCaption beat={spec.title} frame={props.frame} tone={props.tone} /></div>
  </div>;
}
