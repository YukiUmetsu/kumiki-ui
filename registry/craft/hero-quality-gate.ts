/** Cheap CPU-only checks for authored 3D hero assets and human review records.
 * This is NOT an automated aesthetic/photorealism classifier. All findings
 * follow from explicit metadata, geometry identity and numerical invariants.
 */
import { Material, Mesh, Object3D } from "three";
import type { HeroAsset } from "./hero-asset";

export type HeroQualitySeverity = "error" | "warning";
export interface HeroQualityFinding {
  severity: HeroQualitySeverity;
  code: string;
  message: string;
}
export interface HeroStructuralReport {
  id: string;
  meshCount: number;
  namedPartCount: number;
  materialCount: number;
  issues: HeroQualityFinding[];
  ok: boolean;
}
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const nonempty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const issue = (severity: HeroQualitySeverity, code: string, message: string): HeroQualityFinding =>
  ({ severity, code, message });
const childOf = (node: Object3D, root: Object3D): boolean => {
  let cursor: Object3D | null = node;
  while (cursor) {
    if (cursor === root) return true;
    cursor = cursor.parent;
  }
  return false;
};
/** Deliberately O(number of scene nodes), with NO WebGL, screenshot or texture
 * sampling. Only an explicit opt-in authoring run needs to construct the asset.
 * Warnings express review work; they never prove low or high artistic quality.
 */
export function inspectHeroAsset(asset: HeroAsset): HeroStructuralReport {
  const issues: HeroQualityFinding[] = [];
  const fail = (code: string, message: string) => issues.push(issue("error", code, message));
  const warn = (code: string, message: string) => issues.push(issue("warning", code, message));
  if (!nonempty(asset.id)) fail("asset-id", "Hero asset needs a stable nonempty ID.");
  if (!asset.group || !(asset.group instanceof Object3D))
    fail("asset-root", "Hero asset needs a Three.js scene root.");
  if (!finite(asset.metersPerUnit) || asset.metersPerUnit <= 0)
    fail("physical-scale", "metersPerUnit must be finite and positive.");
  if (asset.exposure !== undefined && (!finite(asset.exposure) || asset.exposure <= 0))
    fail("exposure", "Exposure must be finite and positive.");
  if (!["hero", "supporting", "background"].includes(asset.tier))
    fail("fidelity-tier", "Fidelity tier must be explicitly declared.");
  for (const dimension of [0, 1, 2] as const) {
    const lo = asset.bounds?.min[dimension], hi = asset.bounds?.max[dimension];
    if (!finite(lo) || !finite(hi) || lo >= hi)
      fail("bounds", "Authored bounds must be finite and nonzero on every axis.");
  }
  if (!asset.craft || !Array.isArray(asset.craft.materials) ||
      !asset.craft.materials.some(nonempty))
    fail("craft-materials", "Describe at least one material in craft metadata.");
  if (!asset.craft || !Array.isArray(asset.craft.details) ||
      !asset.craft.details.some(nonempty))
    fail("craft-details", "Document at least one functional construction detail.");
  if (asset.tier === "hero" && asset.craft?.stylization)
    warn("art-direction", "Respect explicitly documented stylization in visual review.");

  let meshes = 0;
  const materials = new Set<Material>();
  if (asset.group instanceof Object3D) asset.group.traverse(node => {
    const values = [...node.position.toArray(), ...node.scale.toArray(),
      ...node.quaternion.toArray()];
    if (values.some(n => !finite(n)))
      fail("nonfinite-transform", "Node "+(node.name || node.uuid)+" has an invalid transform.");
    if (!(node instanceof Mesh)) return;
    meshes++;
    if (!node.geometry || !node.geometry.attributes.position ||
        !node.geometry.attributes.position.count)
      fail("mesh-geometry", "Mesh "+(node.name || node.uuid)+" has no drawable positions.");
    if (node.geometry?.boundingSphere && !finite(node.geometry.boundingSphere.radius))
      fail("mesh-bounds", "Mesh "+(node.name || node.uuid)+" has a nonfinite bounding sphere.");
    const assigned = Array.isArray(node.material) ? node.material : [node.material];
    if (!assigned.length || assigned.some(mat => !mat))
      fail("mesh-material", "Mesh "+(node.name || node.uuid)+" has no material.");
    for (const mat of assigned) {
      if (!mat) continue;
      materials.add(mat);
      const surface = mat as Material & { roughness?: number; metalness?: number };
      if (surface.roughness !== undefined &&
          (!finite(surface.roughness) || surface.roughness < 0 || surface.roughness > 1))
        fail("roughness-range", "Material "+mat.name+" has invalid roughness.");
      if (surface.metalness !== undefined &&
          (!finite(surface.metalness) || surface.metalness < 0 || surface.metalness > 1))
        fail("metalness-range", "Material "+mat.name+" has invalid metalness.");
    }
  });
  if (!meshes) fail("empty-asset", "Hero asset has no drawable meshes.");
  const parts = asset.parts;
  if (!parts?.size) warn("unnamed-parts", "No named semantic subparts for focus/actions.");
  if (parts) for (const [name, node] of parts) {
    if (!nonempty(name) || !(node instanceof Object3D) ||
        !(asset.group instanceof Object3D && childOf(node, asset.group)))
      fail("part-attachment", "Named part "+name+" must be attached to its hero group.");
  }
  const actionIds = new Set<string>();
  for (const action of asset.actions ?? []) {
    if (!nonempty(action.id) || actionIds.has(action.id) ||
        !nonempty(action.label) || !nonempty(action.meaning) ||
        !Number.isSafeInteger(action.durationFrames) || action.durationFrames < 1)
      fail("action-contract", "Actions must have unique IDs, meaning and positive integer duration.");
    actionIds.add(action.id);
  }
  if (asset.actions?.length && typeof asset.pose !== "function")
    fail("missing-pose", "An animatable hero must expose frame-addressable pose().");
  return { id: asset.id, meshCount: meshes, namedPartCount: parts?.size ?? 0,
    materialCount: materials.size, issues,
    ok: !issues.some(x => x.severity === "error") };
}

export type HeroReviewView = "front" | "quarter" | "side" | "detail";
export interface HeroApprovalEvidence {
  kind: string;
  reviewer: string;
  reviewedAt: string;
  decision: "approved";
  /** Specific photograph / manufacturing references, not generic home pages. */
  referenceUrls: readonly string[];
  /** Source SHA256 prevents previous approval surviving material/model edits. */
  sourceFiles: readonly { path: string; sha256: string }[];
  /** Exact local captures from the reviewer session. */
  captures: readonly { view: HeroReviewView; path: string; sha256: string;
    width: number; height: number }[];
  notes: string;
}
const hex = (s: string) => /^[a-f0-9]{64}$/i.test(s);
const projectPath = (s: string) =>
  typeof s === "string" && !s.startsWith("/") && !s.includes("\\") &&
  s.split("/").every(segment => segment && segment !== "." && segment !== "..");
/** Metadata-only validation. A separate offline Node script MUST verify all
 * hashes and captured PNG dimensions before claiming these attestations valid.
 */
export function inspectHeroApproval(record: HeroApprovalEvidence): HeroQualityFinding[] {
  const issues: HeroQualityFinding[] = [];
  const fail = (code: string, message: string) => issues.push(issue("error", code, message));
  if (!nonempty(record.kind) || record.decision !== "approved")
    fail("review-identity", "Approval needs a named catalog kind and explicit approval.");
  if (!nonempty(record.reviewer) || !nonempty(record.notes) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(record.reviewedAt) ||
      !Number.isFinite(Date.parse(record.reviewedAt+"T00:00:00Z")))
    fail("review-signoff", "Approval needs a reviewer, UTC date and meaningful notes.");
  if (!record.referenceUrls?.length || record.referenceUrls.some(url => {
    try { const parsed = new URL(url); return parsed.protocol !== "https:" ||
      parsed.pathname.length <= 1; }
    catch { return true; }
  })) fail("review-references", "Approval needs specific HTTPS photographic sources.");
  if (!record.sourceFiles?.length || record.sourceFiles.some(file =>
    !projectPath(file.path) || !file.path.startsWith("registry/") || !hex(file.sha256)))
    fail("review-source-hash", "Pin one or more repository source files with SHA256.");
  const paths = new Set<string>();
  if (record.sourceFiles) for (const file of record.sourceFiles) {
    if (paths.has(file.path)) fail("review-source-duplicate", "Duplicate source path.");
    paths.add(file.path);
  }
  const views: HeroReviewView[] = ["front","quarter","side","detail"];
  const captured = new Set<string>();
  const capturePaths = new Set<string>(), captureHashes = new Set<string>();
  for (const frame of record.captures ?? []) {
    if (!views.includes(frame.view) || captured.has(frame.view))
      fail("review-view-duplicate", "Review views must be distinct.");
    captured.add(frame.view);
    if (capturePaths.has(frame.path) || captureHashes.has(frame.sha256))
      fail("review-reused-image", "Each review angle must contain distinct captured image evidence.");
    capturePaths.add(frame.path); captureHashes.add(frame.sha256);
    if (!projectPath(frame.path) || !frame.path.startsWith("docs/verification/assets/") ||
        !frame.path.endsWith(".png") || !hex(frame.sha256) ||
        !Number.isSafeInteger(frame.width) || frame.width < 1 ||
        !Number.isSafeInteger(frame.height) || frame.height < 1)
      fail("review-capture", "Capture needs an existing repository PNG, SHA256 and dimensions.");
  }
  if (views.some(view => !captured.has(view)))
    fail("review-view-missing", "Approval requires front, quarter, side and detail captures.");
  return issues;
}
