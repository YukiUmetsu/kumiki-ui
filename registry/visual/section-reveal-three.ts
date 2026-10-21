/** Three.js adapter for SectionReveal: per-mesh fades, clipping planes and approximate caps.
 *
 * - Each mesh belongs to its nearest named part, so fading an assembly never
 *   hides a target nested inside it (group visibility is never toggled).
 * - Clipping uses a world-space plane on material clones; shared materials are
 *   never mutated, and `reset()` restores originals.
 * - Caps use the stencil-parity technique per mesh, colored from each
 *   material's actual albedo (map average × color). This assumes closed
 *   solids: overlapping or open geometry produces gaps, so caps are reported
 *   as approximate by the plan. Requires a renderer created with
 *   `stencil: true` and `localClippingEnabled = true` (HeroAssetViewer and
 *   CameraViewport3D do both).
 */
import {
  AlwaysStencilFunc, BackSide, Color, DecrementWrapStencilOp, DoubleSide, FrontSide, IncrementWrapStencilOp,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, NotEqualStencilFunc, Plane, PlaneGeometry, Quaternion, ReplaceStencilOp, SRGBColorSpace, Vector3,
} from "three";
import type { ColorRepresentation, Material, Object3D, Texture } from "three";
import type { SectionRevealFrame } from "./section-reveal";

export interface SectionRevealThreeOptions {
  /** Cap color overrides by part ID (e.g. a poché color for insulation). */
  capColors?: Readonly<Record<string, ColorRepresentation>>;
}
export interface SectionRevealThree {
  /** Apply one evaluated frame (call after the asset's own pose for that frame). */
  apply(state: SectionRevealFrame): void;
  reset(): void;
  dispose(): void;
  /** Meshes currently capped (for diagnostics/tests). */
  readonly cappedMeshes: number;
}

interface Managed {
  mesh: Mesh;
  part: string;
  original: Material | Material[];
  visible: boolean;
  clones?: Material[];
  base?: Array<{ opacity: number; transparent: boolean; depthWrite: boolean }>;
  cap?: { back: Mesh; front: Mesh; cap: Mesh; material: MeshStandardMaterial };
}

const UNOWNED = "\u0000unowned";
const averageColors = new WeakMap<Texture, Color>();
/** Mean albedo of a painted texture (cached); null when the image cannot be read. */
function averageTexture(texture: Texture): Color | null {
  const cached = averageColors.get(texture);
  if (cached) return cached;
  const image = texture.image as (CanvasImageSource & { width?: number; height?: number }) | undefined;
  if (!image || typeof document === "undefined" || !image.width) return null;
  try {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 8;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, 8, 8);
    const data = ctx.getImageData(0, 0, 8, 8).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
    const n = data.length / 4;
    const color = new Color().setRGB(r / n / 255, g / n / 255, b / n / 255, SRGBColorSpace);
    averageColors.set(texture, color);
    return color;
  } catch { return null; }
}
function albedo(material: Material): Color {
  const m = material as Material & { color?: Color; map?: Texture | null };
  const color = m.color ? m.color.clone() : new Color(.7, .7, .7);
  const avg = m.map ? averageTexture(m.map) : null;
  return avg ? color.multiply(avg) : color;
}

export function createSectionRevealThree(asset: { group: Object3D; parts: ReadonlyMap<string, Object3D> }, options: SectionRevealThreeOptions = {}): SectionRevealThree {
  const owner = new Map<Object3D, string>();
  for (const [id, o] of asset.parts) if (!owner.has(o)) owner.set(o, id);
  const managed: Managed[] = [];
  const byPart = new Map<string, Managed[]>();
  asset.group.traverse(child => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    let o: Object3D | null = mesh, part: string | undefined;
    while (o && !part) { part = owner.get(o); o = o.parent; }
    part ??= UNOWNED;
    const entry: Managed = { mesh, part, original: mesh.material, visible: mesh.visible };
    managed.push(entry);
    byPart.set(part, [...(byPart.get(part) ?? []), entry]);
  });
  const plane = new Plane(), local = new Plane();
  const size = (() => {
    const box = { min: new Vector3(Infinity, Infinity, Infinity), max: new Vector3(-Infinity, -Infinity, -Infinity) };
    asset.group.updateMatrixWorld(true);
    for (const m of managed) { m.mesh.geometry.computeBoundingSphere(); const s = m.mesh.geometry.boundingSphere!; const c = s.center.clone().applyMatrix4(m.mesh.matrixWorld); box.min.min(c.clone().subScalar(s.radius)); box.max.max(c.clone().addScalar(s.radius)); }
    return Math.max(1, box.max.distanceTo(box.min) * 1.5);
  })();
  const capGeometry = new PlaneGeometry(size, size);
  let order = 0, capped = 0;

  const cloneFor = (m: Managed) => {
    if (!m.clones) {
      const list = Array.isArray(m.original) ? m.original : [m.original];
      m.clones = list.map(mat => mat.clone());
      m.base = list.map(mat => ({ opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite }));
    }
    return m.clones;
  };
  const capFor = (m: Managed) => {
    if (m.cap) return m.cap;
    const base = order++ * 3 + 10;
    const stencil = (side: typeof BackSide | typeof FrontSide, op: typeof IncrementWrapStencilOp | typeof DecrementWrapStencilOp) => {
      const mat = new MeshBasicMaterial({ side, colorWrite: false, depthWrite: false, depthTest: false, stencilWrite: true, stencilFunc: AlwaysStencilFunc,
        stencilFail: op, stencilZFail: op, stencilZPass: op, clippingPlanes: [plane] });
      const mesh = new Mesh(m.mesh.geometry, mat);
      mesh.renderOrder = base + (side === BackSide ? 0 : 1);
      mesh.raycast = () => {}; mesh.name = "section-stencil"; mesh.userData.inspectIgnore = true;
      m.mesh.add(mesh);
      return mesh;
    };
    const back = stencil(BackSide, IncrementWrapStencilOp), front = stencil(FrontSide, DecrementWrapStencilOp);
    // Multi-material meshes name the material that represents their interior (e.g. soil, not lawn).
    const source = Array.isArray(m.original) ? m.original[Math.min(m.original.length - 1, Number(m.mesh.userData.sectionCapMaterial ?? 0))] : m.original;
    const color = options.capColors?.[m.part] !== undefined ? new Color(options.capColors[m.part]) : albedo(source);
    const material = new MeshStandardMaterial({ color, roughness: .85, metalness: 0, side: DoubleSide, stencilWrite: true, stencilRef: 0,
      stencilFunc: NotEqualStencilFunc, stencilFail: ReplaceStencilOp, stencilZFail: ReplaceStencilOp, stencilZPass: ReplaceStencilOp });
    const cap = new Mesh(capGeometry, material);
    cap.renderOrder = base + 2; cap.name = "section-cap"; cap.raycast = () => {}; cap.userData.inspectIgnore = true;
    cap.onAfterRender = renderer => renderer.clearStencil();
    asset.group.add(cap);
    m.cap = { back, front, cap, material };
    return m.cap;
  };
  const restore = () => {
    for (const m of managed) {
      m.mesh.material = m.original; m.mesh.visible = m.visible;
      if (m.cap) { m.cap.back.visible = m.cap.front.visible = m.cap.cap.visible = false; }
    }
    capped = 0;
  };
  const rotation = new Quaternion(), zAxis = new Vector3(0, 0, 1), normal = new Vector3();

  return {
    get cappedMeshes() { return capped; },
    reset: restore,
    apply(state) {
      restore();
      asset.group.updateMatrixWorld(true);
      if (state.plane) {
        if (state.plane.normal.length !== 3) throw new Error("The Three.js SectionReveal adapter needs a 3D plane.");
        normal.set(state.plane.normal[0], state.plane.normal[1], state.plane.normal[2]);
        // Keep dot(n, p) <= offset  ⇔  dot(−n, p) + offset >= 0 (three.js keeps the positive side).
        local.set(normal.clone().negate(), state.plane.offset);
        plane.copy(local).applyMatrix4(asset.group.matrixWorld);
      }
      const entries: Array<[string, { opacity: number; clip: boolean; cap: boolean }]> = [...state.parts, [UNOWNED, state.unowned]];
      for (const [id, part] of entries) {
        for (const m of byPart.get(id) ?? []) {
          if (part.opacity <= .001) { m.mesh.visible = false; continue; }
          if (part.opacity >= .999 && !part.clip) continue;
          const clones = cloneFor(m);
          clones.forEach((c, i) => {
            const b = m.base![i], opacity = b.opacity * part.opacity;
            c.opacity = opacity; c.transparent = b.transparent || opacity < .999; c.depthWrite = opacity < .999 ? false : b.depthWrite;
            c.clippingPlanes = part.clip ? [plane] : null; c.clipShadows = part.clip;
          });
          m.mesh.material = Array.isArray(m.original) ? clones : clones[0];
          if (part.cap && part.clip && state.plane && part.opacity >= .999) {
            const cap = capFor(m);
            cap.back.visible = cap.front.visible = cap.cap.visible = true;
            // Cap lies on the plane in asset space, facing the removed half (toward the viewer of the cut).
            cap.cap.position.copy(normal).multiplyScalar(state.plane.offset);
            cap.cap.quaternion.copy(rotation.setFromUnitVectors(zAxis, normal));
            capped++;
          }
        }
      }
    },
    dispose() {
      restore();
      for (const m of managed) {
        m.clones?.forEach(c => c.dispose());
        if (m.cap) {
          m.cap.back.removeFromParent(); m.cap.front.removeFromParent(); m.cap.cap.removeFromParent();
          (m.cap.back.material as Material).dispose(); (m.cap.front.material as Material).dispose(); m.cap.material.dispose();
        }
      }
      capGeometry.dispose();
    },
  };
}
