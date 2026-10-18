/** Semantic 3D assets and typed physical attachments.
 * Optional, renderer-agnostic scene metadata. The world transforms may be
 * updated for any absolute MG1 frame; there is no mutable animation clock.
 * Geometry shaders and realistic asset modeling remain separate concerns.
 */
import { Matrix3, Matrix4, Vector3 } from "three";

export type AssetFidelity = "hero" | "supporting" | "background" | "abstract";
export type ConnectionMedium = "ethernet" | "power" | "optical" | "usb" | "radio" | "visual";
export type AttachmentDirection = "input" | "output" | "bidirectional";
export type Vec3 = readonly [number, number, number];

export interface SemanticAttachment {
  id: string;
  medium: ConnectionMedium;
  direction: AttachmentDirection;
  /** Position and outward direction relative to this asset's origin. */
  localPosition: Vec3;
  localNormal: Vec3;
}
export interface SemanticAsset {
  id: string;
  fidelity: AssetFidelity;
  /** Actual authored details, not decorative polygon-count proxies. */
  components?: readonly { id: string; purpose: string; materialId?: string }[];
  materialIds?: readonly string[];
  /** The author provides a world pose or absolute-frame pose sampler. */
  worldMatrix?: readonly number[];
  worldMatrixAt?: (frame: number) => readonly number[];
  attachments: readonly SemanticAttachment[];
  /** Simplified assets must explicitly declare why. */
  deliberateAbstraction?: string;
}
export interface AttachmentEndpoint {
  assetId: string;
  portId: string;
  medium: ConnectionMedium;
  direction: AttachmentDirection;
  position: Vec3;
  normal: Vec3;
}
export interface PhysicalConnection {
  id: string;
  medium: Exclude<ConnectionMedium, "radio" | "visual">;
  from: AttachmentEndpoint;
  to: AttachmentEndpoint;
  length: number;
}
export interface SemanticSceneDiagnostic {
  code: "asset-craft-incomplete";
  assetId: string;
  severity: "warning";
  message: string;
}

const physical = new Set<ConnectionMedium>(["ethernet", "power", "optical", "usb"]);
const finiteVector = (v: Vec3) => v.length === 3 && v.every(Number.isFinite);
const validId = (s: string) => !!s && !!s.trim() && !s.includes(".");
const identity = new Matrix4();
const tuple = (v: Vector3): Vec3 => [v.x, v.y, v.z];

export function createSemanticScene(assets: readonly SemanticAsset[]) {
  const byId = new Map<string, SemanticAsset>();
  for (const asset of assets) {
    if (!validId(asset.id) || byId.has(asset.id)) throw new Error(`Semantic asset "${asset.id}" needs a unique ID without ".".`);
    if (asset.worldMatrix && asset.worldMatrixAt) throw new Error(`"${asset.id}" must use one pose source.`);
    const names = new Set<string>();
    for (const port of asset.attachments) {
      if (!validId(port.id) || names.has(port.id)) throw new Error(`Duplicate/invalid attachment on "${asset.id}": "${port.id}".`);
      if (!finiteVector(port.localPosition) || !finiteVector(port.localNormal) ||
          Math.hypot(...port.localNormal) < 1e-8) throw new Error(`"${asset.id}.${port.id}" needs finite coordinates and nonzero normal.`);
      names.add(port.id);
    }
    byId.set(asset.id, asset);
  }
  function endpoint(ref: string, frame = 0): AttachmentEndpoint {
    if (!Number.isSafeInteger(frame) || frame < 0) throw new Error("Semantic attachment needs a nonnegative integer MG1 frame.");
    const separator = ref.lastIndexOf(".");
    const asset = byId.get(ref.slice(0, separator)), name = ref.slice(separator + 1);
    const port = asset?.attachments.find(item => item.id === name);
    if (!asset || !port) throw new Error(`Unknown semantic attachment "${ref}". Register a real named port first.`);
    const elements = asset.worldMatrixAt?.(frame) ?? asset.worldMatrix;
    if (elements && (elements.length !== 16 || !Array.from(elements).every(Number.isFinite))) throw new Error(`Invalid world matrix on "${asset.id}".`);
    const matrix = elements ? new Matrix4().fromArray(Array.from(elements)) : identity;
    if (Math.abs(matrix.determinant()) < 1e-10) throw new Error(`Singular asset matrix on "${asset.id}".`);
    const position = new Vector3(...port.localPosition).applyMatrix4(matrix);
    const normalMatrix = new Matrix3().getNormalMatrix(matrix);
    const normal = new Vector3(...port.localNormal).applyMatrix3(normalMatrix).normalize();
    return { assetId: asset.id, portId: port.id, medium: port.medium, direction: port.direction,
      position: tuple(position), normal: tuple(normal) };
  }
  function connect(options: { id: string; from: string; to: string; frame?: number }): PhysicalConnection {
    const { id, from, to, frame = 0 } = options;
    if (!id.trim() || from === to) throw new Error("Physical connection needs distinct named attachment endpoints and an ID.");
    const a = endpoint(from, frame), b = endpoint(to, frame);
    if (a.medium !== b.medium || !physical.has(a.medium)) throw new Error(`Cannot join "${from}" and "${to}": incompatible or nonphysical medium (${a.medium}/${b.medium}).`);
    if (a.direction === "input" && b.direction === "input" || a.direction === "output" && b.direction === "output")
      throw new Error(`Cannot join "${from}" and "${to}": incompatible port directions.`);
    return { id, medium: a.medium as PhysicalConnection["medium"], from: a, to: b,
      length: new Vector3(...a.position).distanceTo(new Vector3(...b.position)) };
  }
  function inspectCraft(): SemanticSceneDiagnostic[] {
    return [...byId.values()].flatMap(asset => {
      if (asset.fidelity !== "hero" || asset.deliberateAbstraction) return [];
      const reasons: string[] = [];
      if (!asset.components?.length) reasons.push("document functional construction details");
      if (!asset.materialIds?.length) reasons.push("declare differentiated material references");
      return reasons.length ? [{ code: "asset-craft-incomplete" as const, assetId: asset.id,
        severity: "warning" as const, message: `Hero asset "${asset.id}": ${reasons.join(" and ")}.` }] : [];
    });
  }
  return { ids: [...byId.keys()], endpoint, connect, inspectCraft };
}
