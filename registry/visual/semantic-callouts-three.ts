/** Three.js helpers for SemanticCalloutLayer: camera projection and depth-aware occlusion.
 * Projection matches the renderer's camera exactly (pass the same camera you render with).
 * Occlusion ray-casts from the camera to the anchor against visible meshes, ignoring the
 * anchor's own part subtree and helpers tagged `userData.inspectIgnore`.
 */
import { PerspectiveCamera, Raycaster, Vector3 } from "three";
import type { Camera, Object3D } from "three";
import { fitHeroCamera } from "../craft/hero-viewer";
import type { HeroView } from "../craft/hero-viewer";
import type { HeroAsset } from "../craft/hero-asset";
import type { CalloutProjection } from "./semantic-callouts";

/** The exact camera `HeroAssetViewer` renders for a view (for overlays drawn outside the canvas). */
export function heroViewCamera(asset: Pick<HeroAsset, "bounds">, view: HeroView, width: number, height: number): PerspectiveCamera {
  const pose = fitHeroCamera(asset, view, width / height);
  const camera = new PerspectiveCamera(pose.fov, width / height, pose.near, pose.far);
  camera.position.set(...pose.position);
  camera.lookAt(...pose.target);
  camera.updateMatrixWorld(true);
  return camera;
}

export function createThreeCalloutProjector(options: { camera: Camera; viewport: { width: number; height: number }; root: Object3D; parts: ReadonlyMap<string, Object3D> }) {
  const { camera, viewport, root, parts } = options;
  const v = new Vector3(), cam = new Vector3(), origin = new Vector3(), dir = new Vector3();
  const ray = new Raycaster();
  return {
    project(point: readonly number[]): CalloutProjection {
      root.updateMatrixWorld(true);
      v.set(point[0], point[1], point[2]).applyMatrix4(root.matrixWorld);
      cam.copy(v).applyMatrix4(camera.matrixWorldInverse);
      v.project(camera);
      return { x: (v.x + 1) / 2 * viewport.width, y: (1 - v.y) / 2 * viewport.height, inView: cam.z < 0 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 && v.z >= -1 && v.z <= 1 };
    },
    occluded(point: readonly number[], partId: string): boolean {
      const own = parts.get(partId);
      const target = new Vector3(point[0], point[1], point[2]).applyMatrix4(root.matrixWorld);
      camera.getWorldPosition(origin);
      const distance = origin.distanceTo(target);
      ray.set(origin, dir.copy(target).sub(origin).normalize());
      ray.far = Math.max(0, distance - .02);
      const hits = ray.intersectObject(root, true);
      return hits.some(hit => {
        let o: Object3D | null = hit.object;
        if (o.userData.inspectIgnore) return false;
        for (; o; o = o.parent) { if (!o.visible) return false; if (own && o === own) return false; }
        const material = (hit.object as { material?: { opacity?: number; transparent?: boolean } }).material;
        return !(material && material.transparent && (material.opacity ?? 1) < .5);
      });
    },
  };
}
