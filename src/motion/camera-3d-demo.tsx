import {
  BoxGeometry, Color, CylinderGeometry, DirectionalLight, Group, HemisphereLight,
  Mesh, MeshStandardMaterial, PlaneGeometry, Scene, TorusGeometry,
} from "three";
import { useState } from "react";
import { CameraViewport3D } from "../../registry/motion/camera-viewport-3d";
import type { CameraScene3D } from "../../registry/motion/camera-viewport-3d";
import { createCameraRig3D } from "../../registry/motion/camera-rig-3d";
import type { Storyboard } from "../../registry/motion/storyboard";
import { StoryboardShots } from "../../registry/motion/storyboard-shots";
import { MotionScrubber, usePrefersReducedMotion } from "./react";
import { Button } from "../ui/button";

const TARGET = [0, 1, 0] as const;
const POSE = { target: TARGET, distance: 10, azimuth: 35, elevation: 20, fov: 40, roll: 0 };
const CAMERA_FILM = createCameraRig3D({
  id: "spatial-camera-study", fps: { num: 30, den: 1 }, durationFrames: 540,
  keyframes: [
    { frame: 0, ...POSE, distance: 12 }, { frame: 35, ...POSE, distance: 12 },
    { frame: 89, ...POSE },
    { frame: 179, ...POSE, azimuth: 135 },
    { frame: 269, ...POSE, distance: 6, azimuth: 150, elevation: 12, target: [0, 1.4, 0] },
    { frame: 359, ...POSE, distance: 8, azimuth: 205, elevation: 58 },
    { frame: 449, ...POSE, distance: 7.5, azimuth: 260, roll: -8, target: [1.1, 1, 0] },
    { frame: 539, ...POSE, distance: 12, azimuth: 395, elevation: 24 },
  ],
});

const CAMERA_BOARD: Storyboard = {
  schemaVersion: 1, id: "camera-direction", title: "Spatial camera study", fps: CAMERA_FILM.fps,
  durationFrames: 540,
  shots: [
    ["Establish", "Let the silhouette and ground plane establish the space."],
    ["Orbit", "Move around the subject while keeping a constant inspection distance."],
    ["Dolly", "Approach the central form and shift the look-at target upward."],
    ["Crane", "Rise above the assembly to reveal its depth and separation."],
    ["Truck + roll", "Translate the focus and introduce a restrained camera roll."],
    ["Resolve", "Return to an open composition with a continuing orbit."],
  ].map(([label, objective], index) => ({
    id: `camera-shot-${index}`, sceneRef: "spatial-study", startFrame: index * 90, durationFrames: 90,
    claim: label, visualObjective: objective, focusTarget: "assembly", onScreenLabels: [label],
    staticFallback: `Camera study: ${label}`,
  })),
};

/** Example scene factory. No downloaded model, textures, environment map or asset rights. */
export function createSculptureScene(): CameraScene3D {
  const scene = new Scene();
  scene.background = new Color("#e6e9ed");
  const pale = new MeshStandardMaterial({ color: "#dde4eb", metalness: 0.35, roughness: 0.26 });
  const blue = new MeshStandardMaterial({ color: "#365d91", metalness: 0.6, roughness: 0.23 });
  const dark = new MeshStandardMaterial({ color: "#263445", metalness: 0.55, roughness: 0.3 });
  const floorMaterial = new MeshStandardMaterial({ color: "#d0d6df", roughness: 0.9 });
  const cylinder = new CylinderGeometry(1.55, 1.7, 0.35, 72);
  const ringGeometry = new TorusGeometry(1.15, 0.16, 24, 96);
  const boxGeometry = new BoxGeometry(0.85, 1.55, 0.85);
  const floorGeometry = new PlaneGeometry(200, 200);
  const base = new Mesh(cylinder, dark);
  base.position.y = 0.175;
  scene.add(base);
  const assembly = new Group();
  assembly.name = "assembly";
  const core = new Mesh(boxGeometry, blue);
  core.position.y = 1.45;
  core.rotation.y = Math.PI / 4;
  const ring = new Mesh(ringGeometry, pale);
  ring.position.y = 1.45;
  ring.rotation.x = Math.PI / 2.7;
  const secondRing = new Mesh(ringGeometry, dark);
  secondRing.position.y = 1.45;
  secondRing.rotation.y = Math.PI / 2;
  secondRing.scale.setScalar(0.82);
  assembly.add(core, ring, secondRing);
  scene.add(assembly);
  const floor = new Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  scene.traverse((object) => { if (object instanceof Mesh && object !== floor) { object.castShadow = true; object.receiveShadow = true; } });
  scene.add(new HemisphereLight("#ffffff", "#64748b", 2.2));
  const key = new DirectionalLight("#fff3e4", 4.5);
  key.position.set(5, 8, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -5; key.shadow.camera.right = 5;
  key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
  key.shadow.normalBias = 0.025;
  scene.add(key);
  const rim = new DirectionalLight("#c5d9ff", 3);
  rim.position.set(-4, 3, -4);
  scene.add(rim);
  return {
    scene,
    updateFrame(frame) { core.rotation.y = Math.PI / 4 + frame / 540 * Math.PI / 6; },
    dispose() {
      for (const geometry of [cylinder, ringGeometry, boxGeometry, floorGeometry]) geometry.dispose();
      for (const material of [pale, blue, dark, floorMaterial]) material.dispose();
      key.shadow.map?.dispose();
    },
  };
}

const OUTPUTS = {
  landscape: { width: 1920, height: 1080 }, portrait: { width: 1080, height: 1920 }, square: { width: 1080, height: 1080 },
};

export default function Camera3DDemo() {
  const [frame, setFrame] = useState(0);
  const [aspect, setAspect] = useState<keyof typeof OUTPUTS>("landscape");
  const reducedMotion = usePrefersReducedMotion();
  const resolvedFrame = reducedMotion ? CAMERA_FILM.durationFrames - 1 : frame;
  return <div className="flex min-w-0 flex-col gap-5">
    <div className="flex flex-wrap gap-2" role="group" aria-label="3D output aspect">
      {(Object.keys(OUTPUTS) as Array<keyof typeof OUTPUTS>).map((output) => <Button key={output} size="sm" variant={aspect === output ? "primary" : "outline"} aria-pressed={aspect === output} onClick={() => setAspect(output)}>
        {output === "landscape" ? "16:9" : output === "portrait" ? "9:16" : "1:1"}
      </Button>)}
    </div>
    <div className="mx-auto w-full overflow-hidden rounded-surface border border-border" style={{ maxWidth: aspect === "portrait" ? 380 : aspect === "square" ? 680 : undefined }}>
      <CameraViewport3D createScene={createSculptureScene} timeline={CAMERA_FILM} frame={frame} {...OUTPUTS[aspect]} ariaLabel="Lit geometric assembly viewed with orbit, dolly, crane and tracking camera moves" />
    </div>
    <MotionScrubber timeline={CAMERA_FILM} frame={frame} onFrame={setFrame} label="3D camera frame" />
    <StoryboardShots storyboard={CAMERA_BOARD} frame={resolvedFrame} onFrameChange={setFrame} label="3D camera storyboard shots" />
  </div>;
}
