/** SectionReveal (V02): look into an intact assembly without moving its parts.
 *
 * Renderer-neutral plan over any `InspectableAsset` (2D or 3D):
 * - `isolate`: targets stay, everything else fades out.
 * - `ghost`: targets stay, everything else becomes translucent.
 * - `section`: an authored plane sweeps in from outside the asset and removes
 *   the half its normal points to; targets stay intact by default.
 * - `capped-section`: as `section`, with cut faces filled. Needs real or
 *   approximable solids; adapters report how caps were produced.
 *
 * `ExplodedView3D` moves parts apart; SectionReveal never moves geometry.
 * Evaluation is a pure function of (plan, absolute integer frame). Bounds are
 * sampled through the asset, so moving parts are classified at that frame.
 * Unsupported requests degrade explicitly with a diagnostic; never silently.
 */
import type { InspectableAsset, InspectableBounds } from "./inspectable-asset";

export type SectionRevealMode = "isolate" | "ghost" | "section" | "capped-section";
/** Points with dot(normal, p) > offset are removed. `normal` points toward the removed half. */
export interface SectionPlane { normal: readonly number[]; offset: number }
export interface FrameWindow { startFrame: number; endFrame: number }

export interface SectionRevealSpec {
  id: string;
  mode: SectionRevealMode;
  /** Parts kept fully visible and unclipped (whole subtrees). */
  targets: readonly string[];
  /** Parts kept as-is in isolate/ghost (e.g. the ground the object stands on). */
  context?: readonly string[];
  plane?: SectionPlane;
  /** Section modes: only these subtrees are cut (default: every non-target part). */
  cut?: readonly string[];
  /** Ghost opacity at full reveal (default .14). */
  ghostOpacity?: number;
  /** Reveal ramps 0 → 1 over this window. */
  reveal: FrameWindow;
  /** Optional ramp back to 0. */
  conceal?: FrameWindow;
  easing?: "smooth" | "linear";
  /** Keep targets unclipped in section modes (default true). */
  protectTargets?: boolean;
}

export type SectionDiagnosticCode = "unknown-part" | "unsupported-mode" | "approximate-caps" | "uncapped-part" | "plane-misses-asset" | "empty-target" | "invalid-plan";
export interface SectionDiagnostic { code: SectionDiagnosticCode; severity: "error" | "warning" | "info"; message: string; partId?: string }

export type SectionPartRole = "target" | "context" | "other";
export interface SectionPartState {
  id: string;
  role: SectionPartRole;
  /** Multiplier for the part's own geometry (0 = not drawn). */
  opacity: number;
  /** Cut by the plane at this frame. */
  clip: boolean;
  /** Cut faces should be capped (clippable part in capped-section). */
  cap: boolean;
}
export interface SectionRevealFrame {
  id: string;
  frame: number;
  amount: number;
  /** Mode actually applied (after any fallback). */
  mode: SectionRevealMode;
  plane?: { normal: readonly number[]; offset: number };
  parts: ReadonlyMap<string, SectionPartState>;
  /** State for geometry no semantic part owns (renderers apply it to unattributed meshes). */
  unowned: Omit<SectionPartState, "id" | "role">;
  diagnostics: readonly SectionDiagnostic[];
}
export interface SectionRevealPlan {
  spec: Readonly<SectionRevealSpec>;
  asset: InspectableAsset;
  mode: SectionRevealMode;
  diagnostics: readonly SectionDiagnostic[];
  /** Plane offset where nothing is cut yet (sweep start). */
  startOffset?: number;
  roles: ReadonlyMap<string, SectionPartRole>;
  cutSet: ReadonlySet<string>;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const dot = (a: readonly number[], b: readonly number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
function corners(b: InspectableBounds): number[][] {
  const n = b.min.length, out: number[][] = [];
  for (let mask = 0; mask < 1 << n; mask++) out.push(b.min.map((v, i) => (mask >> i) & 1 ? b.max[i] : v));
  return out;
}
/** Signed side of a bounds box: -1 fully kept, 1 fully removed, 0 straddling. */
export function boundsSide(b: InspectableBounds, plane: SectionPlane): -1 | 0 | 1 {
  const d = corners(b).map(c => dot(plane.normal, c) - plane.offset);
  if (d.every(v => v <= 1e-9)) return -1;
  if (d.every(v => v > 1e-9)) return 1;
  return 0;
}

/** Validate a spec against an asset and resolve roles, fallbacks and the sweep start. */
export function compileSectionReveal(spec: SectionRevealSpec, asset: InspectableAsset): SectionRevealPlan {
  const diagnostics: SectionDiagnostic[] = [];
  const err = (code: SectionDiagnosticCode, message: string, partId?: string) => diagnostics.push({ code, severity: "error", message, partId });
  const warn = (code: SectionDiagnosticCode, message: string, partId?: string, severity: "warning" | "info" = "warning") => diagnostics.push({ code, severity, message, partId });
  const { reveal, conceal } = spec;
  const okWindow = (w?: FrameWindow) => !w || Number.isSafeInteger(w.startFrame) && Number.isSafeInteger(w.endFrame) && w.startFrame >= 0 && w.endFrame > w.startFrame;
  if (!spec.id?.trim() || !okWindow(reveal) || !okWindow(conceal) || conceal && conceal.startFrame < reveal.endFrame)
    throw new Error(`SectionReveal "${spec.id}" needs an ID and integer frame windows (conceal must start after the reveal ends).`);
  if (spec.ghostOpacity !== undefined && !(spec.ghostOpacity >= 0 && spec.ghostOpacity <= 1)) throw new Error("ghostOpacity must be 0–1.");
  const known = new Set(asset.parts.map(p => p.id));
  for (const id of [...spec.targets, ...spec.context ?? [], ...spec.cut ?? []])
    if (!known.has(id)) err("unknown-part", `Part "${id}" does not exist on "${asset.id}".`, id);
  if (diagnostics.some(d => d.severity === "error"))
    throw new Error(`SectionReveal "${spec.id}": ${diagnostics.map(d => d.message).join(" ")}`);
  if (!spec.targets.length && spec.mode !== "section" && spec.mode !== "capped-section")
    throw new Error(`SectionReveal "${spec.id}" in ${spec.mode} mode needs at least one target part.`);

  let mode = spec.mode;
  const caps = asset.capabilities.sectioning;
  if ((mode === "section" || mode === "capped-section") && caps !== "clip" && caps !== "preauthored-caps") {
    warn("unsupported-mode", `"${asset.id}" declares sectioning "${caps}", so a clipping section is unsupported; showing a ghost reveal instead.`);
    mode = "ghost";
  }
  if (mode === "capped-section" && caps !== "preauthored-caps")
    warn("approximate-caps", `"${asset.id}" has no pre-authored cut surfaces; caps are filled from clipped closed solids and use flat material colors.`, undefined, "info");

  const roles = new Map<string, SectionPartRole>();
  const mark = (ids: readonly string[], role: SectionPartRole) => { for (const id of ids) for (const p of asset.subtree(id)) if (!roles.has(p.id) || role === "target") roles.set(p.id, role); };
  mark(spec.targets, "target");
  mark(spec.context ?? [], "context");
  for (const p of asset.parts) if (!roles.has(p.id)) roles.set(p.id, "other");
  for (const id of spec.targets) {
    const b = asset.getBounds(id, reveal.startFrame);
    if (b.min.every((v, i) => Math.abs(b.max[i] - v) < 1e-9)) warn("empty-target", `Target "${id}" has no visible geometry at frame ${reveal.startFrame}; there is nothing inside to reveal.`, id);
  }
  const cutSet = new Set<string>();
  for (const id of spec.cut ?? asset.parts.filter(p => !p.parentId).map(p => p.id)) for (const p of asset.subtree(id)) cutSet.add(p.id);

  let startOffset: number | undefined;
  if (mode === "section" || mode === "capped-section") {
    const plane = spec.plane;
    if (!plane || plane.normal.length !== asset.dimension || !plane.normal.every(Number.isFinite) || !Number.isFinite(plane.offset) || Math.hypot(...plane.normal) < 1e-9)
      throw new Error(`SectionReveal "${spec.id}" needs a ${asset.dimension}D plane with a nonzero finite normal and offset.`);
    const unit = plane.normal.map(v => v / Math.hypot(...plane.normal));
    const roots = asset.parts.filter(p => !p.parentId).map(p => asset.getBounds(p.id, reveal.startFrame));
    const all = roots.flatMap(corners).map(c => dot(unit, c));
    startOffset = Math.max(...all) + 1e-3;
    const finalOffset = plane.offset / Math.hypot(...plane.normal);
    if (finalOffset >= startOffset || finalOffset <= Math.min(...all))
      warn("plane-misses-asset", `The section plane never crosses "${asset.id}" (offset ${finalOffset.toFixed(3)} outside ${Math.min(...all).toFixed(3)}…${startOffset.toFixed(3)}).`);
  }
  return { spec, asset, mode, diagnostics, startOffset, roles, cutSet };
}

/** Reveal amount 0–1 at an absolute frame. */
export function sectionRevealAmount(spec: Pick<SectionRevealSpec, "reveal" | "conceal" | "easing">, frame: number): number {
  const ease = spec.easing === "linear" ? (t: number) => t : smooth;
  const up = ease(clamp01((frame - spec.reveal.startFrame) / (spec.reveal.endFrame - spec.reveal.startFrame)));
  const down = spec.conceal ? ease(clamp01((frame - spec.conceal.startFrame) / (spec.conceal.endFrame - spec.conceal.startFrame))) : 0;
  return up * (1 - down);
}

/** Per-part state at an absolute frame (pure; any seek order). */
export function evaluateSectionReveal(plan: SectionRevealPlan, frame: number): SectionRevealFrame {
  if (!Number.isSafeInteger(frame) || frame < 0) throw new Error("SectionReveal evaluates nonnegative integer frames.");
  const { spec, asset, mode, roles } = plan;
  const amount = sectionRevealAmount(spec, frame);
  const diagnostics: SectionDiagnostic[] = [...plan.diagnostics];
  const parts = new Map<string, SectionPartState>();
  const ghost = spec.ghostOpacity ?? .14;
  const sectioning = mode === "section" || mode === "capped-section";
  let plane: SectionRevealFrame["plane"];
  if (sectioning) {
    const n = spec.plane!.normal, len = Math.hypot(...n), unit = n.map(v => v / len);
    plane = { normal: unit, offset: plan.startOffset! + (spec.plane!.offset / len - plan.startOffset!) * amount };
  }
  const protect = spec.protectTargets ?? true;
  for (const p of asset.parts) {
    const role = roles.get(p.id)!;
    let opacity = 1, clip = false, cap = false;
    if (role === "other" && mode === "isolate") opacity = 1 - amount;
    if (role === "other" && mode === "ghost") opacity = 1 - (1 - ghost) * amount;
    if (sectioning && plan.cutSet.has(p.id) && !(protect && role === "target") && amount > 0) {
      const side = boundsSide(asset.getBounds(p.id, frame), plane!);
      if (side === 1) opacity = 0;
      else if (side === 0) {
        clip = true;
        cap = mode === "capped-section" && !!p.clippable;
        if (mode === "capped-section" && !p.clippable && !asset.children(p.id).length)
          diagnostics.push({ code: "uncapped-part", severity: "info", partId: p.id, message: `"${p.id}" is cut but not declared clippable; it is clipped without a cap.` });
      }
    }
    parts.set(p.id, { id: p.id, role, opacity, clip, cap });
  }
  // Unattributed geometry has no bounds of its own: fade it like "other", and clip (never cap) in sections.
  const unowned = { opacity: mode === "isolate" ? 1 - amount : mode === "ghost" ? 1 - (1 - ghost) * amount : 1, clip: sectioning && amount > 0, cap: false };
  return { id: spec.id, frame, amount, mode, plane, parts, unowned, diagnostics };
}
