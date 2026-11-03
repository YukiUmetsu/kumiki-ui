import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BufferAttribute, Mesh } from "three";
import { loadBlenderRevision } from "../registry/craft/blender-asset-bridge";
import manifest from "../src/craft/fixtures/blender-cloth-deformation/manifest.json";

const ROOT = resolve("src/craft/fixtures/blender-cloth-deformation");

function sampleMorphedY(mesh: Mesh): number {
  const base = mesh.geometry.getAttribute("position") as BufferAttribute;
  const changes = mesh.geometry.morphAttributes.position as BufferAttribute[];
  const weights = mesh.morphTargetInfluences ?? [];
  let low = Infinity;
  for (let index = 0; index < base.count; index++) {
    let y = base.getY(index);
    for (let shape = 0; shape < weights.length; shape++) {
      const delta = changes[shape].getY(index);
      y += weights[shape] * (mesh.geometry.morphTargetsRelative ? delta : delta - base.getY(index));
    }
    low = Math.min(low, y);
  }
  return low;
}

describe("real Blender cloth → native glTF morph playback", () => {
  it("loads one semantic cloth, 12 morph targets and a native exported Blender action", async () => {
    const model = new Uint8Array(readFileSync(`${ROOT}/model.glb`)).buffer;
    const factory = await loadBlenderRevision({ manifest, model }, {
      actions: { "cloth-sag": { loop: false, label: "Real Blender Cloth sag" } },
    });
    const first = factory(), second = factory();
    try {
      expect(factory.manifest.glb_audit.semantic_nodes).toBe(1);
      expect(first.semanticParts.get("cloth-panel")).toHaveLength(1);
      expect(factory.actions.map(action => action.id)).toContain("cloth-sag");
      expect(factory.actions.find(action => action.id === "cloth-sag")).toMatchObject({ durationFrames: 24, loop: false });
      const mesh = first.parts.get("kumiki:cloth-panel:1") as Mesh;
      const unrelated = second.parts.get("kumiki:cloth-panel:1") as Mesh;
      expect(mesh.isMesh).toBe(true);
      expect(mesh.morphTargetInfluences).toHaveLength(12);
      expect(mesh.geometry.morphAttributes.position).toHaveLength(12);
      expect(mesh.geometry.getAttribute("position").count).toBeGreaterThan(80);
      // Compare *actual exported* displacement vectors with Blender's
      // pre-export evaluated-vertex measurement. This catches glTF scale,
      // axis and coordinate corruptions independent of the viewer camera.
      const exportedMaxDisplacement = Math.max(...mesh.geometry.morphAttributes.position.flatMap(attribute => {
        const sample = attribute as BufferAttribute;
        return Array.from({ length: sample.count }, (_, index) =>
          Math.hypot(sample.getX(index), sample.getY(index), sample.getZ(index)));
      }));
      expect(exportedMaxDisplacement).toBeCloseTo(manifest.deformation.max_displacement_m, 4);

      first.pose?.({ id: "cloth-sag", frame: 0, fps: 30 });
      const restY = sampleMorphedY(mesh);
      expect(mesh.morphTargetInfluences!.every(weight => Math.abs(weight) < 1e-5)).toBe(true);
      first.pose?.({ id: "cloth-sag", frame: 12, fps: 30 });
      const middleY = sampleMorphedY(mesh);
      expect(middleY).toBeLessThan(restY - .25);
      first.pose?.({ id: "cloth-sag", frame: 24, fps: 30 });
      const finalY = sampleMorphedY(mesh);
      expect(finalY).toBeLessThan(restY - .7);
      expect(mesh.morphTargetInfluences![11]).toBeCloseTo(1, 4);
      // Out-of-order scrubbing is deterministic and a sibling GLB remains idle.
      first.pose?.({ id: "cloth-sag", frame: 8, fps: 30 });
      first.pose?.({ id: "cloth-sag", frame: 24, fps: 30 });
      expect(sampleMorphedY(mesh)).toBeCloseTo(finalY, 4);
      expect(unrelated.morphTargetInfluences!.every(weight => weight === 0)).toBe(true);
      first.pose?.({ id: null, frame: 0 });
      expect(sampleMorphedY(mesh)).toBeCloseTo(restY, 4);
    } finally { first.dispose(); second.dispose(); factory.release(); }
  }, 20_000);
});
