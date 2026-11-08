/** `StepInside`: a device's screen is a live window into another world; the camera lands square on it, keeps going, and comes out
 * inside that world, still moving forward. A chapter bridge: from the product to what it opens onto. Pure function of `frame`.
 *
 * The view through the screen is the world drawn through the stage camera carried through the window (`portal-three.ts`), so it has
 * true parallax during the approach. When the screen fills the frame the two pictures are the same, and the recipe switches to
 * drawing the world full frame, so the crossing has no seam.
 */
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Quaternion, Vector3 } from "three";
import type { Material, Mesh, Object3D, PerspectiveCamera } from "three";
import type { HeroAsset } from "../craft/hero-asset";
import { createPortal } from "./portal-three";
import { createDuskMeadow } from "./portal-worlds";
import type { PortalWorld } from "./portal-worlds";
import { FiberHeroStudio, ShotCamera, Turntable, partBounds, useHeroAsset, useStudio } from "./studio-fiber";
import { StudioCaption } from "./studio-recipes-react";
import type { StudioRecipeProps } from "./studio-recipes-react";
import { boundsCenter, boundsRadius, stepInsideState, turntablePoint } from "./studio-shots";
import type { StepInsideSpec } from "./studio-shots";
import { FiberStage } from "./fiber-stage";

function StepInsideScene({ asset, spec, frame, world }: { asset: HeroAsset; spec: StepInsideSpec; frame: number; world: PortalWorld }) {
  const size = useThree(state => state.size), studio = useStudio();
  const aspect = size.width / Math.max(1, size.height);
  const display = useMemo(() => { studio.turn(0); return partBounds(asset.group, spec.part); }, [asset, spec.part, studio]);
  const center = boundsCenter(asset.bounds);
  const state = stepInsideState(spec, frame, { center, radius: boundsRadius(asset.bounds) }, display, aspect, world.arrival);
  const portal = useMemo(() => createPortal({ position: world.arrival.position, yaw: world.arrival.yaw, scale: state.scale }, { near: .05, far: 700 }), [world, state.scale]);
  useLayoutEffect(() => () => portal.dispose(), [portal]);
  // The screen shows the portal; anything that sits over it (a lock-screen notification) is hidden. Both restored on unmount.
  useLayoutEffect(() => {
    const swapped: Array<[Mesh, Material | Material[]]> = [], hidden: Object3D[] = [];
    asset.group.traverse(object => {
      const role = object.userData.partRole, mesh = object as Mesh;
      if (role === spec.part && mesh.isMesh) { swapped.push([mesh, mesh.material]); mesh.material = portal.material; }
      if ((spec.hide ?? []).includes(role) && object.visible) { object.visible = false; hidden.push(object); }
    });
    return () => { swapped.forEach(([mesh, material]) => { mesh.material = material; }); hidden.forEach(object => { object.visible = true; }); };
  }, [asset, portal, spec.part, spec.hide]);
  const latest = useRef(state);
  latest.current = state;
  const turn = state.phase === "device" ? state.turn : 0;
  const windowFrame = useMemo(() => ({ position: new Vector3(), quaternion: new Quaternion() }), []);
  useFrame(({ gl, scene, camera }) => {
    const current = latest.current;
    if (current.phase === "device") {
      const c = turntablePoint(display.center, center, turn);
      windowFrame.position.set(c[0], c[1], c[2]);
      windowFrame.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), -turn * Math.PI / 180);
      portal.update(gl, camera as PerspectiveCamera, windowFrame, world.scene, { width: size.width, height: size.height, dpr: gl.getPixelRatio() });
      gl.render(scene, camera);
    } else {
      portal.setCamera(current.position, current.target, current.fov, aspect);
      portal.presentFullFrame(gl, world.scene, { width: size.width, height: size.height, dpr: gl.getPixelRatio() });
    }
  }, 1);
  return state.phase === "device" ? <><Turntable yaw={state.turn} /><ShotCamera pose={state.pose} /></> : null;
}

/** The camera lands on a device's screen, which is a live window into another world, passes through it, and arrives in that world. */
export function StepInside({ spec, world: makeWorld, worldKey = "meadow", ...props }: StudioRecipeProps & { spec: StepInsideSpec; world?: () => PortalWorld; worldKey?: string }) {
  const asset = useHeroAsset(props.create, [props.assetKey ?? "default"]);
  const world = useMemo(() => (makeWorld ?? createDuskMeadow)(), [worldKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => () => world.dispose(), [world]);
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#0b0e12", ...props.style }}>
    <FiberStage frame={props.frame} fps={props.fps} label={props.label ?? `${asset.id}: its screen opens onto a landscape, and the camera goes through`} shadows style={{ position: "absolute", inset: 0 }}>
      <FiberHeroStudio asset={asset} studio={props.studio} exposure={props.exposure}>
        <StepInsideScene asset={asset} spec={spec} frame={props.frame} world={world} />
      </FiberHeroStudio>
    </FiberStage>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{props.children}<StudioCaption beat={spec.title} frame={props.frame} tone={props.tone} /></div>
  </div>;
}
