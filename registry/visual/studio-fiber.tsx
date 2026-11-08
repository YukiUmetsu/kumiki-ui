/** Studio pieces for React Three Fiber: put a crafted hero asset in Kumiki's product studio inside a `FiberStage`, aim the camera from a
 * pure pose, point at a part, and show several views on one canvas.
 *
 * Everything applies the host frame in a layout effect, before `FiberStage` draws, and nothing animates on its own: no `useFrame`
 * timing, no random values. See docs/31-react-three-fiber-content-plan.md for why.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { DependencyList, ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Color, PerspectiveCamera, Vector3 } from "three";
import type { Object3D } from "three";
import type { HeroAsset } from "../craft/hero-asset";
import { createHeroStudio } from "../craft/hero-studio";
import type { HeroStudio, HeroStudioOptions } from "../craft/hero-studio";
import type { HeroActionState } from "../craft/hero-action";
import { createPartHighlight } from "./part-highlight-three";
import type { PartHighlightOptions } from "./part-highlight-three";
import { boundsCenter } from "./studio-shots";
import type { ShotPose, Vec3 } from "./studio-shots";

/** Builds a hero asset once per `deps` and disposes it when they change or the component unmounts. */
export function useHeroAsset(create: () => HeroAsset, deps: DependencyList): HeroAsset {
  const asset = useMemo(create, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => asset.dispose(), [asset]);
  return asset;
}

export interface FiberHeroStudioProps {
  /** The subject the studio is sized and lit for. */
  asset: HeroAsset;
  /** More subjects to place in the same studio (a finish comparison's second version). They are not used for sizing. */
  extra?: readonly HeroAsset[];
  /** Overrides on the asset's own studio hints: look, palette, key angle. */
  studio?: Partial<Omit<HeroStudioOptions, "bounds">>;
  /** Tone-mapping exposure. @default the asset's own exposure, else 1 */
  exposure?: number;
  children?: ReactNode;
}
export interface StudioHandle {
  studio: HeroStudio;
  asset: HeroAsset;
  /** Turns subjects on the turntable by `yawDeg` (positive shows their right side), about each one's own centre, with the contact
   * shadow under them. @default the studio's own subjects */
  turn(yawDeg: number, subjects?: readonly HeroAsset[]): void;
}
const StudioContext = createContext<StudioHandle | null>(null);
/** The surrounding `FiberHeroStudio`. */
export function useStudio(): StudioHandle {
  const handle = useContext(StudioContext);
  if (!handle) throw new Error("useStudio must be used inside a FiberHeroStudio.");
  return handle;
}
/** Turns a subject about the vertical axis through its centre. Pure: it sets the rotation outright, so any frame in any order agrees. */
function turnAbout(object: Object3D, center: Vec3, yawDeg: number) {
  const a = -yawDeg * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  object.rotation.y = a;
  object.position.set(center[0] - (center[0] * cos + center[2] * sin), object.position.y, center[2] - (-center[0] * sin + center[2] * cos));
}
/** Kumiki's product studio (HDR softbox reflections, cyclorama, fitted key shadow, fill and rim) around a hero asset. Children reach the
 * studio with `useStudio`, for the turntable. */
export function FiberHeroStudio({ asset, extra, studio, exposure, children }: FiberHeroStudioProps) {
  const scene = useThree(state => state.scene), gl = useThree(state => state.gl);
  const key = JSON.stringify(studio ?? {});
  const built = useMemo(() => createHeroStudio({ bounds: asset.bounds, ...asset.studio, ...studio }), [asset, key]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const restore = built.apply(scene);
    scene.add(asset.group);
    for (const other of extra ?? []) scene.add(other.group);
    return () => { restore(); scene.remove(asset.group); for (const other of extra ?? []) scene.remove(other.group); built.dispose(); };
  }, [built, asset, extra, scene]);
  useLayoutEffect(() => { gl.toneMappingExposure = exposure ?? asset.exposure ?? 1; }, [gl, exposure, asset]);
  const handle = useMemo<StudioHandle>(() => {
    const blob = built.group.getObjectByName("contact-occlusion");
    return {
      studio: built, asset,
      turn(yawDeg, subjects = [asset, ...(extra ?? [])]) {
        for (const subject of subjects) turnAbout(subject.group, boundsCenter(subject.bounds), yawDeg);
        // The contact shadow is flat on the floor (rotated -90° about X), so turning about the world vertical is its local Z.
        if (blob) blob.rotation.z = -yawDeg * Math.PI / 180;
      },
    };
  }, [built, asset, extra]);
  return <StudioContext.Provider value={handle}>{children}</StudioContext.Provider>;
}

/** Sets the turntable angle for this frame. Place it before the camera. */
export function Turntable({ yaw, subjects }: { yaw: number; subjects?: readonly HeroAsset[] }) {
  const studio = useStudio();
  useLayoutEffect(() => { studio.turn(yaw, subjects); });
  return null;
}

/** Poses an asset for one of its signature actions at a local frame. A null id is the rest pose. */
export function AssetPose({ asset, state }: { asset: HeroAsset; state: HeroActionState }) {
  useLayoutEffect(() => { asset.pose?.(state); }, [asset, state.id, state.frame, state.fps]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Near and far clip planes fitted to a pose. A tight range keeps depth precision, so layers a fraction of a millimetre apart (a display
 * under its cover glass) do not flicker or dot through each other. */
export function clipPlanes(pose: ShotPose): { near: number; far: number } {
  const d = Math.hypot(pose.position[0] - pose.target[0], pose.position[1] - pose.target[1], pose.position[2] - pose.target[2]);
  return { near: Math.max(.01, d / 40), far: d * 80 };
}

/** Points the stage camera from a pose. Place it before anything that projects points to the screen. */
export function ShotCamera({ pose }: { pose: ShotPose }) {
  const camera = useThree(state => state.camera) as PerspectiveCamera, size = useThree(state => state.size);
  useLayoutEffect(() => {
    camera.fov = pose.fov; camera.aspect = size.width / Math.max(1, size.height);
    camera.position.set(...pose.position); camera.lookAt(...pose.target);
    const clip = clipPlanes(pose); camera.near = clip.near; camera.far = clip.far; camera.updateProjectionMatrix();
  });
  return null;
}

/** World bounds of every mesh in a named part, at the asset's current pose. */
export function partBounds(root: Object3D, part: string | readonly string[]): { center: Vec3; radius: number } {
  const names = new Set(typeof part === "string" ? [part] : part), box = new Box3();
  root.updateMatrixWorld(true);
  root.traverse(object => { if ((object as { isMesh?: boolean }).isMesh && !object.userData.kmHighlightHull) {
    for (let node: Object3D | null = object; node; node = node.parent) { if (names.has(node.userData.partRole)) { box.expandByObject(object); break; } if (node === root) break; }
  } });
  if (box.isEmpty()) throw new Error(`No meshes belong to the part "${[...names].join(", ")}".`);
  const c = box.getCenter(new Vector3()), s = box.getSize(new Vector3());
  return { center: [c.x, c.y, c.z], radius: Math.max(s.length() / 2, 1e-3) };
}

/** An outline on a named part, with the rest of the subject dimmed. Amounts come from the recipe's frame state. */
export function PartHighlightFiber({ asset, part, highlight, dim, ...options }: { asset: HeroAsset; part: string | readonly string[]; highlight: number; dim: number } & PartHighlightOptions) {
  const size = useThree(state => state.size);
  const key = typeof part === "string" ? part : part.join("|");
  const handle = useMemo(() => createPartHighlight(asset.group, part, options), [asset, key, options.color, options.width, options.glow]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => handle.dispose(), [handle]);
  useLayoutEffect(() => { handle.set({ highlight, dim, width: size.width, height: size.height }); });
  return null;
}

/** Projects a world point to the canvas each frame and hands it to `onAnchor` as fractions of the canvas, after the camera is set.
 * The caller moves DOM elements directly, so a label follows its part without a React render per frame. */
export function ScreenAnchor({ point, onAnchor }: { point: Vec3; onAnchor: (x: number, y: number, inFront: boolean) => void }) {
  const camera = useThree(state => state.camera);
  useLayoutEffect(() => {
    camera.updateMatrixWorld();
    const v = new Vector3(...point).project(camera);
    onAnchor((v.x + 1) / 2, (1 - v.y) / 2, v.z < 1);
  });
  return null;
}

export interface ViewPane {
  /** Position and size in 0..1 of the canvas, from the top left. */
  rect: { x: number; y: number; w: number; h: number };
  pose: ShotPose;
  /** Runs just before this pane draws, to show its version of the subject; `after` undoes it. */
  before?: () => void;
  after?: () => void;
}
/** Several views of one scene on one canvas: one renderer, shared models and materials, each pane drawn through its own camera into
 * its own rectangle. Takes over drawing for the stage, so place it once. The gutter between panes is the given colour. */
export function CompareViews({ panes, gutter = "#05070a" }: { panes: readonly ViewPane[]; gutter?: string }) {
  const cameras = useMemo(() => panes.map(() => new PerspectiveCamera()), [panes.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const latest = useRef(panes);
  latest.current = panes;
  useFrame(({ gl, scene, size }) => {
    const priorColor = gl.getClearColor(new Color()), priorAlpha = gl.getClearAlpha();
    gl.setScissorTest(false);
    gl.setClearColor(gutter, 1);
    gl.clear();
    latest.current.forEach((pane, i) => {
      const camera = cameras[i], w = pane.rect.w * size.width, h = pane.rect.h * size.height, x = pane.rect.x * size.width, y = (1 - pane.rect.y - pane.rect.h) * size.height;
      const clip = clipPlanes(pane.pose);
      camera.fov = pane.pose.fov; camera.aspect = w / Math.max(1, h); camera.near = clip.near; camera.far = clip.far;
      camera.position.set(...pane.pose.position); camera.lookAt(...pane.pose.target); camera.updateProjectionMatrix();
      gl.setViewport(x, y, w, h); gl.setScissor(x, y, w, h); gl.setScissorTest(true);
      pane.before?.();
      gl.render(scene, camera);
      pane.after?.();
    });
    gl.setScissorTest(false);
    gl.setViewport(0, 0, size.width, size.height);
    gl.setClearColor(priorColor, priorAlpha);
  }, 1);
  return null;
}
