import { Euler, Group, Matrix3, Object3D, Raycaster, Vector3 } from "three";
import type { Camera } from "three";
import type { EvaluationResult, MotionTimeline } from "./types";
import { evaluateExplodedView, orderAssemblyParts } from "./exploded-view";
import type { AssemblyPart3D } from "./exploded-view";

export interface AssemblyPartObject {
  object: Object3D;
  dispose: () => void;
}
export type AssemblyPartFactory = (part: AssemblyPart3D) => AssemblyPartObject;
export interface ExplodedAssembly {
  root: Group;
  parts: readonly AssemblyPart3D[];
  objects: Map<string, Object3D>;
  anchors: Map<string, Object3D>;
  update: (timeline: MotionTimeline, frame: number, separationScale?: number, evaluation?: EvaluationResult) => void;
  dispose: () => void;
}

/** Own transform groups; consumers retain ownership of their geometry/material resources. */
export function createExplodedAssembly(parts: readonly AssemblyPart3D[], createPart: AssemblyPartFactory): ExplodedAssembly {
  const ordered = orderAssemblyParts(parts);
  const root = new Group();
  const groups = new Map<string, Group>();
  const objects = new Map<string, Object3D>();
  const anchors = new Map<string, Object3D>();
  const disposers: Array<() => void> = [];
  try {
    for (const part of ordered) {
      const built = createPart(part);
      disposers.push(built.dispose);
      const group = new Group();
      group.name = part.id;
      group.add(built.object);
      (part.parentId ? groups.get(part.parentId)! : root).add(group);
      const anchor = new Object3D();
      anchor.position.set(...(part.anchor ?? [0, 0, 0]));
      group.add(anchor);
      groups.set(part.id, group); objects.set(part.id, built.object); anchors.set(part.id, anchor);
    }
  } catch (cause) {
    disposers.reverse().forEach((dispose) => dispose());
    throw cause;
  }
  const offset = new Vector3();
  const baseRotation = new Euler();
  const inverseParent = new Matrix3();
  return {
    root, parts: ordered, objects, anchors,
    update(timeline, frame, separationScale = 1, evaluation) {
      if (!Number.isFinite(separationScale) || separationScale < 0 || separationScale > 3) throw new Error("Assembly separationScale must be finite and from 0 to 3.");
      const amounts = evaluateExplodedView(ordered, timeline, frame, evaluation);
      root.updateWorldMatrix(true, true);
      for (const part of ordered) {
        const group = groups.get(part.id)!;
        const amount = amounts.get(part.id)!;
        const rotation = part.rotation ?? [0, 0, 0];
        const spin = part.rotationOffset ?? [0, 0, 0];
        baseRotation.set(...rotation.map((value) => value * Math.PI / 180) as [number, number, number]);
        offset.set(...part.offset).multiplyScalar(amount * separationScale);
        if (part.offsetSpace === "local") {
          const scale = part.scale ?? [1, 1, 1];
          offset.set(offset.x * scale[0], offset.y * scale[1], offset.z * scale[2]).applyEuler(baseRotation);
        }
        if (part.offsetSpace === "world") {
          inverseParent.setFromMatrix4(group.parent!.matrixWorld).invert();
          offset.applyMatrix3(inverseParent);
        }
        group.position.set(...(part.position ?? [0, 0, 0])).add(offset);
        group.rotation.set((rotation[0] + spin[0] * amount) * Math.PI / 180, (rotation[1] + spin[1] * amount) * Math.PI / 180, (rotation[2] + spin[2] * amount) * Math.PI / 180);
        group.scale.set(...(part.scale ?? [1, 1, 1]));
        // Parent matrices are current before a child's world-space offset resolves.
        group.updateWorldMatrix(false, true);
      }
    },
    dispose() { disposers.slice().reverse().forEach((dispose) => dispose()); root.clear(); },
  };
}

export interface AssemblyAnnotation {
  id: string;
  label: string;
  anchor: { x: number; y: number };
  state: "visible" | "occluded" | "outside" | "overflow";
  side: "left" | "right";
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface AssemblyAnnotationOptions {
  occlusion?: "hide" | "show-through";
  inset?: number;
  labelWidth?: number;
  labelHeight?: number;
  gap?: number;
}

/** Project current anchors and pack labels in bounded columns. Ray tests exclude the labeled part. */
export function projectAssemblyAnnotations(assembly: ExplodedAssembly, camera: Camera, viewport: { width: number; height: number }, options: AssemblyAnnotationOptions = {}): AssemblyAnnotation[] {
  const { occlusion = "hide", inset = 32, labelWidth = 180, labelHeight = 42, gap = 10 } = options;
  if (![viewport.width, viewport.height, inset, labelWidth, labelHeight, gap].every(Number.isFinite) ||
      inset < 0 || labelWidth <= 0 || labelHeight <= 0 || gap < 0 || viewport.width < labelWidth * 2 + inset * 2 || viewport.height < labelHeight + inset * 2) {
    throw new Error("Assembly annotations need positive label dimensions, nonnegative inset/gap, and an output large enough for two label columns.");
  }
  const origin = camera.getWorldPosition(new Vector3());
  const ray = new Raycaster();
  const world = new Vector3();
  const projected = new Vector3();
  const cameraSpace = new Vector3();
  const direction = new Vector3();
  const labels = assembly.parts.filter((part) => part.label).map((part): AssemblyAnnotation => {
    assembly.anchors.get(part.id)!.getWorldPosition(world);
    projected.copy(world).project(camera);
    cameraSpace.copy(world).applyMatrix4(camera.matrixWorldInverse);
    const anchor = { x: (projected.x + 1) * viewport.width / 2, y: (1 - projected.y) * viewport.height / 2 };
    const outside = cameraSpace.z >= 0 || projected.z < -1 || projected.z > 1 || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y) || anchor.x < 0 || anchor.x > viewport.width || anchor.y < 0 || anchor.y > viewport.height;
    let hidden = false;
    if (!outside && occlusion === "hide") {
      const distance = origin.distanceTo(world);
      direction.copy(world).sub(origin).normalize();
      ray.set(origin, direction); ray.far = Math.max(0, distance - 0.005);
      // Factories are siblings in this list even when their transform groups nest.
      const occluders = [...assembly.objects.entries()].filter(([id]) => id !== part.id).map(([, object]) => object);
      hidden = ray.intersectObjects(occluders, true).some((hit) => {
        let object: Object3D | null = hit.object;
        while (object) { if (!object.visible) return false; object = object.parent; }
        return true;
      });
    }
    const side = part.labelSide ?? (anchor.x < viewport.width / 2 ? "left" : "right");
    return { id: part.id, label: part.label!, anchor, state: outside ? "outside" : hidden ? "occluded" : "visible", side,
      x: side === "left" ? inset : viewport.width - inset - labelWidth,
      y: Math.max(inset, Math.min(viewport.height - inset - labelHeight, anchor.y - labelHeight / 2)), width: labelWidth, height: labelHeight };
  });
  for (const side of ["left", "right"] as const) {
    const column = labels.filter((label) => label.state === "visible" && label.side === side).sort((a, b) => a.anchor.y - b.anchor.y || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const capacity = Math.floor((viewport.height - inset * 2 + gap) / (labelHeight + gap));
    column.slice(capacity).forEach((label) => { label.state = "overflow"; });
    const fitted = column.slice(0, capacity);
    for (let index = 1; index < fitted.length; index++) fitted[index].y = Math.max(fitted[index].y, fitted[index - 1].y + labelHeight + gap);
    let bottom = viewport.height - inset;
    for (let index = fitted.length - 1; index >= 0; index--) { fitted[index].y = Math.min(fitted[index].y, bottom - labelHeight); bottom = fitted[index].y - gap; }
  }
  return labels;
}
