/** Reference content only. Camera positions are exclusively public shot recipes. */
import { BoxGeometry, Color, CylinderGeometry, DirectionalLight, Group, HemisphereLight, Mesh, MeshStandardMaterial, Scene, SphereGeometry } from "three";
import type { BufferGeometry, Material } from "three";
import { createExplodedAssembly } from "../../registry/motion/exploded-view-three";
import { createExplodedTimeline } from "../../registry/motion/exploded-view";
import type { AssemblyPart3D } from "../../registry/motion/exploded-view";
import { evaluateTimeline, outputKey } from "../../registry/motion/timeline";
import type { EvaluationResult, MotionTimeline } from "../../registry/motion/types";
import { createThreeCameraTargets } from "../../registry/motion/camera-targets-three";
import { CameraSequence, CameraShotRecipe } from "../../registry/motion/camera-shot-recipes";
import { cameraSequenceGroup, compileCinematicCamera } from "../../registry/motion/cinematic-camera-director";
import { motionTimelineGroup } from "../../registry/motion/director-authoring";
import { compileMotionDirector } from "../../registry/motion/motion-director";
import type { CameraSequenceSpec } from "../../registry/motion/cinematic-camera-types";

export const CAMERA_OUTPUTS = { landscape: { width: 1600, height: 900 }, portrait: { width: 900, height: 1600 }, square: { width: 1080, height: 1080 } };
export type CameraAspect = keyof typeof CAMERA_OUTPUTS;
export const CAMERA_CHAPTERS = [
  { name: "Establish", title: "An idea enters the system.", caption: "Input becomes a signal. Connections give it a route.", detail: "An automatically framed overview establishes the processor, memory, input and output." },
  { name: "Inspect", title: "Instructions meet a processor.", caption: "The processor coordinates many small operations.", detail: "A continuous quaternion handoff approaches the CPU, then a restrained orbit holds its silhouette." },
  { name: "Follow", title: "Information moves between parts.", caption: "Memory and processor exchange data along shared pathways.", detail: "An intentional cut starts a tracking shot. The moving signal carries the strongest focal weight." },
  { name: "Explode", title: "Look inside the mechanism.", caption: "Separate the layers. Keep their relationships visible.", detail: "Existing exploded-view tracks separate the CPU while the camera follows its changing world bounds." },
  { name: "Resolve", title: "Many operations. One result.", caption: "The pieces reassemble. The whole system comes back into view.", detail: "A detail-to-overview recipe returns to the architecture, with a final reading hold." },
] as const;
const parts: AssemblyPart3D[] = [
  { id: "socket", label: "Socket", labelSide: "left", position: [0, .25, 0], offset: [0, 0, 0] },
  { id: "substrate", label: "Substrate", labelSide: "right", position: [0, .42, 0], offset: [0, .6, 0] },
  { id: "core", label: "Silicon die", labelSide: "left", position: [0, .6, 0], offset: [0, 1.35, 0] },
  { id: "lid", label: "Heat spreader", labelSide: "right", position: [0, .79, 0], offset: [0, 2.1, 0] },
];
export const CPU_EXPLOSION = createExplodedTimeline({ id: "reference-cpu", fps: { num: 30, den: 1 }, durationFrames: 900, parts,
  separate: { startFrame: 552, endFrame: 651 }, reassemble: { startFrame: 756, endFrame: 846 }, staggerFrames: 8 });

/** Independently phased movement is compiled once into ordinary MG1 channels. */
export const SIGNAL_MOTION: MotionTimeline = { schemaVersion: 1, id: "reference-signals", fps: { num: 30, den: 1 }, durationFrames: 900,
  nodes: Array.from({ length: 18 }, (_, i) => ["x", "y", "z"].map((axis, n) => ({ kind: "track" as const, id: `signal-${i}-${axis}`, track: {
    id: `signal-${i}-${axis}`, targetId: `signal-${i}`, property: axis, valueType: "number" as const,
    keyframes: Array.from({ length: 91 }, (_, f) => {
      const frame = Math.min(899, f * 10), phase = ((frame + i * 17) % 240) / 240;
      const x = i === 0 ? -3.2 + Math.max(0, Math.min(1, (frame - 330) / 240)) * 6.2 : -4.2 + phase * 8.4;
      return { frame, value: n === 0 ? x : n === 1 ? .35 + (i % 3) * .12 : (i % 6 - 2.5) * .47, easing: "linear" as const };
    }),
  } }))).flat() };

export function createComputerScene(lighting: "studio" | "warm" = "studio") {
  const scene = new Scene(); scene.background = new Color("#101d26");
  const architecture = new Group(); scene.add(architecture);
  const geometries: BufferGeometry[] = [], materials: Material[] = [];
  const material = (color: string, metalness = .15, roughness = .45, emissive = "#000000") => {
    const value = new MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity: .9 }); materials.push(value); return value;
  };
  const boardMaterial = material("#204a49", .25, .65), edgeMaterial = material("#112a30", .25), copper = material("#d9ac6d", .65, .35);
  const silver = material("#c6d4d4", .75, .26), ink = material("#182e36", .4), teal = material("#57b6ae", .45), signalMaterial = material("#ffc976", .2, .25, "#e99232");
  const box = (parent: Group, size: [number, number, number], position: [number, number, number], surface: Material) => {
    const geometry = new BoxGeometry(...size); geometries.push(geometry); const mesh = new Mesh(geometry, surface); mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  box(architecture, [10.4, .18, 6.5], [0, -.18, 0], edgeMaterial);
  box(architecture, [10, .1, 6.2], [0, -.04, 0], boardMaterial);
  for (let row = 0; row < 12; row++) {
    box(architecture, [8.8, .012, .022], [0, .025, (row - 5.5) * .41], copper);
    if (row % 2 === 0) box(architecture, [.022, .014, 4.6], [(row - 5) * .7, .028, 0], copper);
  }
  const cpu = createExplodedAssembly(parts, part => {
    const group = new Group(); const dimensions: Record<string, [number, number, number]> = { socket: [2.3, .18, 2.3], substrate: [1.95, .13, 1.95], core: [1.16, .17, 1.16], lid: [1.85, .18, 1.85] };
    box(group, dimensions[part.id], [0, 0, 0], part.id === "lid" ? silver : part.id === "core" ? teal : ink);
    if (part.id === "core") for (let i = 0; i < 16; i++) box(group, [.19, .018, .19], [(i % 4 - 1.5) * .25, .095, (Math.floor(i / 4) - 1.5) * .25], silver);
    if (part.id === "substrate") for (let i = 0; i < 14; i++) box(group, [.05, .035, .08], [(i % 7 - 3) * .25, .08, i < 7 ? -.86 : .86], copper);
    return { object: group, dispose() {} }; // shared resources are owned once below
  });
  architecture.add(cpu.root);
  const memory = new Group(); memory.position.set(3.1, 0, .2); architecture.add(memory);
  for (let row = 0; row < 2; row++) {
    box(memory, [.7, .48, 4], [(row - .5) * 1, .3, 0], ink);
    for (let i = 0; i < 6; i++) box(memory, [.76, .12, .38], [(row - .5) * 1, .58, (i - 2.5) * .57], silver);
  }
  for (const z of [-1.9, 1.8]) { box(architecture, [1.7, .56, 1.1], [-3.4, .26, z], silver); box(architecture, [1.76, .19, .8], [-3.4, .59, z], ink); }
  const cylinder = new CylinderGeometry(.16, .16, .4, 20); geometries.push(cylinder);
  for (let i = 0; i < 10; i++) { const mesh = new Mesh(cylinder, copper); mesh.position.set(-1.8 + (i % 5) * .9, .2, i < 5 ? -2.6 : 2.6); architecture.add(mesh); }
  const sphere = new SphereGeometry(.105, 12, 8); geometries.push(sphere);
  const signals = Array.from({ length: 18 }, () => { const mesh = new Mesh(sphere, signalMaterial); architecture.add(mesh); return mesh; });
  scene.add(new HemisphereLight("#d9eef3", "#102523", 2.3));
  const key = new DirectionalLight(lighting === "warm" ? "#ffdbb5" : "#fff3e3", 4.5); key.position.set(-3, 9, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 }); key.shadow.normalBias = .03; scene.add(key);
  const rim = new DirectionalLight("#8abbd3", 3.4); rim.position.set(4, 5, -6); scene.add(rim);
  const fill = new DirectionalLight("#a5dfce", 1.2); fill.position.set(-6, 3, -2); scene.add(fill);
  function updateFrame(frame: number, shared?: EvaluationResult) {
    const evaluation = shared ?? evaluateTimeline(SIGNAL_MOTION, frame);
    for (let i = 0; i < signals.length; i++) signals[i].position.set(...["x", "y", "z"].map(axis => evaluation.samples[outputKey(`signal-${i}`, axis)]?.value as number) as [number, number, number]);
    cpu.update(CPU_EXPLOSION, frame);
  }
  const targets = createThreeCameraTargets({ revision: "computer-architecture-v1", root: architecture, updateFrame,
    targets: [{ id: "architecture", object: architecture }, { id: "cpu", object: cpu.root }, { id: "core", object: cpu.objects.get("core")! }, { id: "memory", object: memory }, { id: "signal", object: signals[0], importance: 6 }],
    collisionObjects: [{ id: "board-solid", object: architecture.children[0] }], occluders: [memory, ...cpu.objects.values()] });
  return { scene, architecture, cpu, targets, updateFrame, dispose() { cpu.dispose(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); key.shadow.map?.dispose(); scene.clear(); } };
}

export function cameraReferenceSpec(aspect: CameraAspect, profile: CameraSequenceSpec["profile"] = "technical", projection: "perspective" | "orthographic" = "perspective"): CameraSequenceSpec {
  const composition = { safeRegion: { x: .08, y: .22, width: .84, height: .60 }, subjectPosition: [.5, .51] as const };
  const handoff = { kind: "continuous" as const, durationFrames: 48, allowPartialFraming: true };
  return CameraSequence({ id: "computer-camera", title: "How a computer processes information", fps: { num: 30, den: 1 }, durationFrames: 900, output: CAMERA_OUTPUTS[aspect], profile, maxCandidates: 8,
    shots: [
      CameraShotRecipe("establish", { id: "establish", target: "architecture", durationFrames: 180, framing: "close", elevation: 48, azimuth: 22, projection, composition, objective: CAMERA_CHAPTERS[0].detail }),
      CameraShotRecipe("inspect", { id: "inspect", target: "cpu", durationFrames: 180, framing: "medium", orbitDegrees: 32, elevation: 36, azimuth: 22, projection, composition, transition: handoff, objective: CAMERA_CHAPTERS[1].detail }),
      CameraShotRecipe("follow", { id: "follow", target: ["signal", "cpu", "memory"], durationFrames: 180, framing: "close", elevation: 42, azimuth: 20, leadFrames: 6, projection, composition, transition: { kind: "cut" }, objective: CAMERA_CHAPTERS[2].detail }),
      CameraShotRecipe("exploded", { id: "explode", target: "cpu", durationFrames: 180, framing: "close", elevation: 24, endElevation: 32, azimuth: 25, orbitDegrees: 25, projection, composition: { ...composition, safeRegion: { x: .24, y: .23, width: .52, height: .54 } }, transition: handoff, objective: CAMERA_CHAPTERS[3].detail }),
      CameraShotRecipe("detail-to-overview", { id: "resolve", target: "cpu", endTarget: "architecture", durationFrames: 180, framing: "medium", movement: "hold", elevation: 42, azimuth: 44, holdFrames: 42, projection, composition, transition: handoff, objective: CAMERA_CHAPTERS[4].detail }),
    ].map((shot, index) => ({ ...shot, title: CAMERA_CHAPTERS[index].name })) });
}
export function createCameraReference(aspect: CameraAspect, profile: CameraSequenceSpec["profile"] = "technical", projection: "perspective" | "orthographic" = "perspective") {
  const source = createComputerScene(), start = performance.now();
  try {
    const compiled = compileCinematicCamera(cameraReferenceSpec(aspect, profile, projection), source.targets);
    if (!compiled.ok) return { ...compiled, compilationMs: performance.now() - start };
    const directed = compileMotionDirector({ schemaVersion: 1, id: "computer-direction", title: compiled.plan.spec.title, fps: compiled.plan.spec.fps, durationFrames: 900,
      targets: ["camera3d", ...Array.from({ length: 18 }, (_, i) => `signal-${i}`)], children: [cameraSequenceGroup(compiled.plan), motionTimelineGroup(SIGNAL_MOTION, { id: "signals" })] });
    if (!directed.ok) return { ok: false as const, diagnostics: directed.diagnostics, compilationMs: performance.now() - start };
    return { ...compiled, director: directed.director, compilationMs: performance.now() - start };
  } finally { source.dispose(); }
}
