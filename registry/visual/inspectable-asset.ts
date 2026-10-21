/** InspectableAsset (V01): one small interface for inspecting any 2D or 3D asset.
 *
 * An adapter, not another asset model: it exposes what camera, callout,
 * section and flow components need — semantic part IDs and parents, frame-
 * addressed bounds and anchors, available states and declared capabilities —
 * over whatever really owns the geometry (a `HeroAsset`, an SVG illustration,
 * a renderer-neutral layout). Renderer-neutral; Three.js lives in
 * `inspectable-asset-three.ts`. 2D assets use [x, y] and never invent Z.
 *
 * Construction validates the definition and throws on structural errors
 * (duplicate IDs, missing parents/anchor parts, invalid bounds, capability
 * claims without data); `validateInspectableDefinition` returns the same
 * findings as diagnostics without throwing.
 */

export type InspectableDimension = 2 | 3;
export type InspectableVector = readonly number[];
export interface InspectableBounds { min: InspectableVector; max: InspectableVector }
export type SectionCapability = "none" | "isolate-ghost" | "clip" | "preauthored-caps";

export interface InspectablePart {
  id: string;
  parentId?: string;
  label?: string;
  role?: string;
  /** Hiding it never exposes missing geometry. */
  hideable?: boolean;
  /** Can be drawn translucent. */
  ghostable?: boolean;
  /** Has real thickness/interior, so a clipping plane reveals construction. */
  clippable?: boolean;
  /** States this part changes in (e.g. "aged", "open"). */
  stateIds?: readonly string[];
}
export type InspectableAnchorKind = "label" | "focus" | "port";
export interface InspectableAnchor {
  id: string;
  partId: string;
  kind: InspectableAnchorKind;
  /** Flow medium for ports (air, water, refrigerant, power, money…). */
  medium?: string;
}
export interface AnchorSample { position: InspectableVector; normal?: InspectableVector }

export interface InspectableCapabilities {
  sectioning: SectionCapability;
  explodable: boolean;
  canGhost: boolean;
  flowPorts: boolean;
  stateful: boolean;
}

export interface InspectableDefinition {
  id: string;
  dimension: InspectableDimension;
  /** Real-world meters per unit (3D physically scaled assets). */
  metersPerUnit?: number;
  parts: readonly InspectablePart[];
  anchors?: readonly InspectableAnchor[];
  states?: readonly string[];
  capabilities: InspectableCapabilities;
  /** Change when geometry or frame definitions change (camera caches key on it). */
  revision: string;
}
export interface InspectableSamplers {
  /** World bounds of a part at an absolute integer frame. */
  bounds(partId: string, frame: number): InspectableBounds;
  /** World position/normal of an anchor at an absolute integer frame. */
  anchor(anchorId: string, frame: number): AnchorSample;
}

export interface InspectableDiagnostic {
  code: "duplicate-id" | "missing-parent" | "parent-cycle" | "missing-part" | "invalid-bounds" | "capability-without-data" | "invalid-definition";
  path: string;
  message: string;
}

export interface InspectableAsset extends Readonly<Omit<InspectableDefinition, "parts" | "anchors" | "states">> {
  readonly parts: readonly InspectablePart[];
  readonly anchors: readonly InspectableAnchor[];
  getPart(id: string): InspectablePart;
  /** Direct children in authored order. */
  children(id: string): readonly InspectablePart[];
  /** The part and every descendant (depth-first). */
  subtree(id: string): readonly InspectablePart[];
  getBounds(partId: string, frame: number): InspectableBounds;
  getAnchor(anchorId: string, frame: number): AnchorSample;
  listStates(): readonly string[];
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

/** Structural check of a definition (does not sample geometry). */
export function validateInspectableDefinition(def: InspectableDefinition): InspectableDiagnostic[] {
  const out: InspectableDiagnostic[] = [];
  const report = (code: InspectableDiagnostic["code"], path: string, message: string) => out.push({ code, path, message });
  if (!def || !ID.test(def.id ?? "")) report("invalid-definition", "id", "Asset needs a stable ASCII ID.");
  if (def.dimension !== 2 && def.dimension !== 3) report("invalid-definition", "dimension", "Dimension must be 2 or 3.");
  if (def.metersPerUnit !== undefined && !(Number.isFinite(def.metersPerUnit) && def.metersPerUnit > 0)) report("invalid-definition", "metersPerUnit", "metersPerUnit must be positive.");
  if (!def.revision?.trim()) report("invalid-definition", "revision", "Give the asset a revision; change it when geometry changes.");
  const parts = new Map<string, InspectablePart>();
  def.parts.forEach((p, i) => {
    if (!ID.test(p.id ?? "")) report("invalid-definition", `parts[${i}]`, `Part ID "${p.id}" must be 1–128 ASCII characters.`);
    else if (parts.has(p.id)) report("duplicate-id", `parts[${i}]`, `Duplicate part "${p.id}".`);
    parts.set(p.id, p);
  });
  for (const [i, p] of def.parts.entries()) if (p.parentId && !parts.has(p.parentId)) report("missing-parent", `parts[${i}]`, `Part "${p.id}" references missing parent "${p.parentId}".`);
  for (const p of def.parts) {
    const seen = new Set<string>();
    let cur: InspectablePart | undefined = p;
    while (cur?.parentId) {
      if (seen.has(cur.id)) { report("parent-cycle", `parts.${p.id}`, `Part "${p.id}" has a cyclic parent chain.`); break; }
      seen.add(cur.id); cur = parts.get(cur.parentId);
    }
  }
  const anchorIds = new Set<string>();
  for (const [i, a] of (def.anchors ?? []).entries()) {
    if (!ID.test(a.id ?? "")) report("invalid-definition", `anchors[${i}]`, `Anchor ID "${a.id}" is invalid.`);
    else if (anchorIds.has(a.id)) report("duplicate-id", `anchors[${i}]`, `Duplicate anchor "${a.id}".`);
    anchorIds.add(a.id);
    if (!parts.has(a.partId)) report("missing-part", `anchors[${i}]`, `Anchor "${a.id}" references missing part "${a.partId}".`);
  }
  const states = new Set(def.states ?? []);
  for (const p of def.parts) for (const s of p.stateIds ?? []) if (!states.has(s)) report("missing-part", `parts.${p.id}.stateIds`, `Part "${p.id}" lists state "${s}" that the asset does not declare.`);
  const caps = def.capabilities;
  if (caps.flowPorts && !(def.anchors ?? []).some(a => a.kind === "port")) report("capability-without-data", "capabilities.flowPorts", "flowPorts is declared but no anchor has kind \"port\".");
  if (caps.stateful && !(def.states ?? []).length) report("capability-without-data", "capabilities.stateful", "stateful is declared but no states are listed.");
  if ((caps.sectioning === "clip" || caps.sectioning === "preauthored-caps") && !def.parts.some(p => p.clippable)) report("capability-without-data", "capabilities.sectioning", `sectioning "${caps.sectioning}" needs at least one clippable part.`);
  if (caps.canGhost && !def.parts.some(p => p.ghostable ?? p.hideable)) report("capability-without-data", "capabilities.canGhost", "canGhost is declared but no part is ghostable.");
  if (caps.sectioning === "clip" && def.dimension === 2) report("capability-without-data", "capabilities.sectioning", "2D assets cannot clip in depth; use \"isolate-ghost\" or masks.");
  return out;
}

export function validInspectableBounds(b: InspectableBounds, dimension: InspectableDimension): boolean {
  return !!b && b.min?.length === dimension && b.max?.length === dimension &&
    [...b.min, ...b.max].every(Number.isFinite) && b.min.every((v, i) => v <= b.max[i]);
}

/** Validate and wrap a definition with frame samplers. Throws on any structural diagnostic. */
export function createInspectableAsset(def: InspectableDefinition, samplers: InspectableSamplers): InspectableAsset {
  const issues = validateInspectableDefinition(def);
  if (issues.length) throw new Error(`InspectableAsset "${def.id}" is invalid: ${issues.map(i => i.message).join(" ")}`);
  const parts = new Map(def.parts.map(p => [p.id, p]));
  const anchors = new Map((def.anchors ?? []).map(a => [a.id, a]));
  const frameOk = (frame: number) => { if (!Number.isSafeInteger(frame) || frame < 0) throw new Error("Inspection needs a nonnegative integer frame."); };
  const getPart = (id: string) => {
    const p = parts.get(id);
    if (!p) throw new Error(`Unknown part "${id}" on "${def.id}". Known parts include: ${[...parts.keys()].slice(0, 10).join(", ")}…`);
    return p;
  };
  const children = (id: string) => def.parts.filter(p => p.parentId === id);
  return {
    id: def.id, dimension: def.dimension, metersPerUnit: def.metersPerUnit, capabilities: def.capabilities, revision: def.revision,
    parts: def.parts, anchors: def.anchors ?? [],
    getPart, children,
    subtree(id) {
      const out: InspectablePart[] = [getPart(id)];
      const visit = (pid: string) => { for (const c of children(pid)) { out.push(c); visit(c.id); } };
      visit(id);
      return out;
    },
    getBounds(partId, frame) {
      frameOk(frame); getPart(partId);
      const b = samplers.bounds(partId, frame);
      if (!validInspectableBounds(b, def.dimension)) throw new Error(`Part "${partId}" produced invalid ${def.dimension}D bounds at frame ${frame}.`);
      return b;
    },
    getAnchor(anchorId, frame) {
      frameOk(frame);
      if (!anchors.has(anchorId)) throw new Error(`Unknown anchor "${anchorId}" on "${def.id}". Register it in the asset's anchors.`);
      const a = samplers.anchor(anchorId, frame);
      if (a.position.length !== def.dimension || !a.position.every(Number.isFinite)) throw new Error(`Anchor "${anchorId}" produced an invalid position at frame ${frame}.`);
      return a;
    },
    listStates: () => def.states ?? [],
  };
}

/** Union of several bounds (same dimension). */
export function unionInspectableBounds(list: readonly InspectableBounds[]): InspectableBounds {
  if (!list.length) throw new Error("Cannot union an empty bounds list.");
  const n = list[0].min.length;
  const min = Array.from({ length: n }, (_, i) => Math.min(...list.map(b => b.min[i])));
  const max = Array.from({ length: n }, (_, i) => Math.max(...list.map(b => b.max[i])));
  return { min, max };
}

/** Bridge to the cinematic camera registry: dense world-bound samples for chosen parts. */
export function inspectableCameraTargets(asset: InspectableAsset, partIds: readonly string[], frames: readonly number[], options: { importance?: Record<string, number> } = {}) {
  if (asset.dimension !== 3) throw new Error("Camera targets need a 3D inspectable asset.");
  const sorted = [...new Set([0, ...frames])].sort((a, b) => a - b);
  return partIds.map(id => ({
    id, importance: options.importance?.[id],
    frames: sorted.map(frame => {
      const b = asset.getBounds(id, frame);
      return { frame, bounds: { min: b.min as [number, number, number], max: b.max as [number, number, number] } };
    }),
  }));
}
