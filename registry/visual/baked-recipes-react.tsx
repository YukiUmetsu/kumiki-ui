/** `RealLightFlythrough` (recipe 11): fly forward through a set whose light was path-traced offline and baked into its textures.
 *
 * Real-time lights cannot afford bounced light, and bounced light is most of what makes a place look real: the glow a sunlit wall
 * throws onto the shadowed one beside it. So professional real-time work bakes it: the set is lit once in a path tracer
 * (`scripts/light-bake.py`, Blender Cycles), every surface's final lit colour is stored in a texture, and the render shows those
 * textures unlit. This recipe loads such a set and moves the camera forward along the path baked with it, a pure function of `frame`.
 * While the set loads the stage suspends, so an export waits for it instead of capturing an empty frame.
 */
import { useLayoutEffect, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import { CatmullRomCurve3, Color, DoubleSide, MeshBasicMaterial, NoColorSpace, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector2, Vector3 } from "three";
import type { Mesh, MeshStandardMaterial, PerspectiveCamera, Texture } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { RationalFps } from "../motion/types";
import { FiberStage } from "./fiber-stage";
import { StudioCaption } from "./studio-recipes-react";
import type { StudioTone } from "./studio-recipes-react";
import { easeInOut, span01 } from "./studio-shots";
import type { FlythroughDetails, FlythroughSpec } from "./place-shots";

export { inspectFlythrough } from "./place-shots";
export type { FlythroughDetails, FlythroughProblem, FlythroughSpec } from "./place-shots";

/** Multiplies a material's colour by a tiling detail map, after its baked map. */
function applyDetail(material: MeshBasicMaterial, detail: Texture, repeat: readonly [number, number], strength: number) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uDetail = { value: detail }; shader.uniforms.uDetailRepeat = { value: new Vector2(...repeat) }; shader.uniforms.uDetailStrength = { value: strength };
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D uDetail;\nuniform vec2 uDetailRepeat;\nuniform float uDetailStrength;")
      .replace("#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.rgb *= mix(vec3(1.0), texture2D(uDetail, vMapUv * uDetailRepeat).rgb * 2.0, uDetailStrength);");
  };
  material.customProgramCacheKey = () => `km-detail-${repeat.join("x")}-${strength}`;
}

function BakedSet({ src, path, spec, frame, details }: { src: string; path: readonly (readonly [number, number, number])[]; spec: FlythroughSpec; frame: number; details?: FlythroughDetails }) {
  const gltf = useLoader(GLTFLoader, src), scene = useThree(state => state.scene), camera = useThree(state => state.camera) as PerspectiveCamera, size = useThree(state => state.size);
  const detailKeys = Object.keys(details ?? {}), detailMaps = useLoader(TextureLoader, detailKeys.map(key => details![key].src)) as Texture[];
  // The baked textures are the final lit picture: draw them unlit and without a second tone mapping.
  const set = useMemo(() => {
    const root = gltf.scene.clone(true), owned: MeshBasicMaterial[] = [];
    root.traverse(object => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const map = (mesh.material as MeshStandardMaterial).map;
      if (map) map.colorSpace = SRGBColorSpace;
      const material = new MeshBasicMaterial({ map, side: DoubleSide, toneMapped: false, color: new Color(1, 1, 1).multiplyScalar(spec.exposure ?? 1) });
      const key = detailKeys.find(prefix => mesh.name.startsWith(prefix));
      if (key && map) {
        const detail = detailMaps[detailKeys.indexOf(key)];
        detail.wrapS = detail.wrapT = RepeatWrapping; detail.colorSpace = NoColorSpace; detail.anisotropy = 8;
        applyDetail(material, detail, details![key].repeat, details![key].strength ?? .55);
      }
      owned.push(material); mesh.material = material;
    });
    return { root, dispose: () => owned.forEach(m => m.dispose()) };
  }, [gltf, spec.exposure, detailMaps]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const prior = scene.background;
    // Openings in the set read as the bright, warm glow of a canyon exit, not a flat sky colour.
    scene.add(set.root); scene.background = new Color("#f3cf9e");
    return () => { scene.remove(set.root); scene.background = prior; set.dispose(); };
  }, [scene, set]);
  const curve = useMemo(() => new CatmullRomCurve3(path.map(p => new Vector3(...p)), false, "centripetal"), [path]);
  useLayoutEffect(() => {
    const [a, b] = spec.travel ?? [.02, .62], [u0, u1] = spec.lookUp ?? [2, 14];
    // Moving from the first frame, at a steady pace that eases only into the end, so the shot never starts on a still.
    const t = span01(frame, 0, spec.durationFrames), u = a + (b - a) * (t < .85 ? t / .85 * .9 : .9 + .1 * easeInOut((t - .85) / .15));
    const position = curve.getPointAt(Math.min(1, u)), ahead = curve.getPointAt(Math.min(1, u + .04));
    const up = (u0 + (u1 - u0) * easeInOut(t)) * Math.PI / 180, flat = ahead.clone().sub(position).setY(0).normalize();
    camera.position.copy(position);
    camera.lookAt(position.x + flat.x * 4, position.y + Math.tan(up) * 4, position.z + flat.z * 4);
    camera.fov = spec.fov ?? 52; camera.aspect = size.width / Math.max(1, size.height); camera.near = .05; camera.far = 200; camera.updateProjectionMatrix();
  });
  return null;
}

export interface RealLightFlythroughProps {
  frame: number;
  fps: RationalFps;
  /** The baked set, a glTF from `scripts/light-bake.py`. */
  src: string;
  /** The camera path baked with it, in glTF coordinates. */
  path: readonly (readonly [number, number, number])[];
  spec: FlythroughSpec;
  /** Close-up grain per mesh-name prefix (see `FlythroughDetails`). */
  details?: FlythroughDetails;
  tone?: StudioTone;
  label?: string;
  style?: CSSProperties;
  children?: ReactNode;
}
/** Forward through a set lit by path-traced, baked light. */
export function RealLightFlythrough({ frame, fps, src, path, spec, details, tone, label, style, children }: RealLightFlythroughProps) {
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#0b0e12", ...style }}>
    <FiberStage frame={frame} fps={fps} label={label ?? "Moving forward through a place lit by baked, path-traced light"} style={{ position: "absolute", inset: 0 }}>
      <BakedSet src={src} path={path} spec={spec} frame={frame} details={details} />
    </FiberStage>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{children}<StudioCaption beat={spec.title} frame={frame} tone={tone} /></div>
  </div>;
}
