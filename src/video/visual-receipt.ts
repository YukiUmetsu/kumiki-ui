/** K5 visual dependency receipt: a small, non-secret record of what each visual part depends on. Each node's fingerprint
 * covers its own inputs and its dependencies' fingerprints, so a change propagates downstream without a stored job graph,
 * a database or a cache manager. Pure: the caller supplies the digest function (e.g. SHA-256). No I/O.
 */

export type ReceiptKind = "asset" | "profile" | "shot" | "boundary" | "proof" | "audio";

export interface ReceiptNodeInput {
  id: string;
  kind: ReceiptKind;
  /** Visual nodes change what the viewer sees; audio nodes never invalidate a visual proof. */
  visual: boolean;
  /** Non-secret, JSON-serialisable inputs: hashes, ids, timings, specs. No paths, keys or personal data. */
  inputs: unknown;
  dependsOn: readonly string[];
}

export interface ReceiptNode extends ReceiptNodeInput {
  fingerprint: string;
}

export interface VisualReceipt {
  schemaVersion: 1;
  id: string;
  /** Recorded human review, kept apart from the structural receipt. Not part of any fingerprint. */
  review: { status: "accepted" | "needs-revision" | "not-reviewed"; reviewer?: string; date?: string };
  /** Structural results recorded by the caller (for example frame counts from ffprobe). Not part of any fingerprint. */
  structural?: Record<string, unknown>;
  nodes: Record<string, ReceiptNode>;
}

export type Digest = (text: string) => string;

/** Stable JSON: object keys sorted at every level, so equal inputs always produce equal text. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  const entries = Object.keys(value as Record<string, unknown>).sort()
    .filter(key => (value as Record<string, unknown>)[key] !== undefined)
    .map(key => JSON.stringify(key) + ":" + canonicalJson((value as Record<string, unknown>)[key]));
  return "{" + entries.join(",") + "}";
}

function fingerprintOf(node: ReceiptNodeInput, dependencyFingerprints: string[], digest: Digest): string {
  return digest(canonicalJson({ kind: node.kind, visual: node.visual, inputs: node.inputs, dependsOn: dependencyFingerprints }));
}

/** Compute fingerprints in dependency order. Throws on a missing dependency or a cycle. */
export function buildVisualReceipt(id: string, inputs: readonly ReceiptNodeInput[], digest: Digest,
  review: VisualReceipt["review"] = { status: "not-reviewed" }, structural?: Record<string, unknown>): VisualReceipt {
  const byId = new Map<string, ReceiptNodeInput>();
  for (const node of inputs) {
    if (!node.id.trim() || byId.has(node.id)) throw new Error("Receipt node ids must be unique and non-empty: " + node.id);
    byId.set(node.id, node);
  }
  for (const node of inputs) for (const dep of node.dependsOn) {
    if (!byId.has(dep)) throw new Error("Receipt node " + node.id + " depends on unknown node " + dep + ".");
  }
  const nodes: Record<string, ReceiptNode> = {};
  const visiting = new Set<string>();
  const compute = (node: ReceiptNodeInput): string => {
    if (nodes[node.id]) return nodes[node.id].fingerprint;
    if (visiting.has(node.id)) throw new Error("Receipt dependencies form a cycle through " + node.id + ".");
    visiting.add(node.id);
    const deps = node.dependsOn.map(dep => compute(byId.get(dep)!));
    visiting.delete(node.id);
    const fingerprint = fingerprintOf(node, deps, digest);
    nodes[node.id] = { ...node, dependsOn: [...node.dependsOn], fingerprint };
    return fingerprint;
  };
  for (const node of inputs) compute(node);
  return { schemaVersion: 1, id, review, ...(structural ? { structural } : {}), nodes };
}

export interface ReceiptDiff {
  /** Visual nodes whose fingerprint changed, including everything downstream of a change. Re-prove these. */
  affectedVisual: string[];
  /** Non-visual nodes that changed (for example background music). No visual proof is invalidated by them. */
  changedNonVisual: string[];
  /** Visual nodes that are identical in both receipts. Their proofs remain valid. */
  unchangedVisual: string[];
  added: string[];
  removed: string[];
}

export function diffVisualReceipts(previous: VisualReceipt, next: VisualReceipt): ReceiptDiff {
  const diff: ReceiptDiff = { affectedVisual: [], changedNonVisual: [], unchangedVisual: [], added: [], removed: [] };
  const ids = new Set([...Object.keys(previous.nodes), ...Object.keys(next.nodes)]);
  for (const id of [...ids].sort()) {
    const before = previous.nodes[id], after = next.nodes[id];
    if (!before) { diff.added.push(id); continue; }
    if (!after) { diff.removed.push(id); continue; }
    const same = before.fingerprint === after.fingerprint;
    if (after.visual) (same ? diff.unchangedVisual : diff.affectedVisual).push(id);
    else if (!same) diff.changedNonVisual.push(id);
  }
  return diff;
}

/** Recompute every fingerprint from the stored inputs. A node is stale when its stored fingerprint no longer matches,
 * which means the receipt was edited or damaged. Stale nodes must be re-proven; a path is never a valid cache hit.
 */
export function verifyVisualReceipt(receipt: VisualReceipt, digest: Digest): { stale: string[]; missingDependencies: string[] } {
  const recomputed: Record<string, string> = {};
  const missing = new Set<string>();
  const compute = (id: string, guard: Set<string>): string | undefined => {
    if (recomputed[id] !== undefined) return recomputed[id];
    const node = receipt.nodes[id];
    if (!node || guard.has(id)) { missing.add(id); return undefined; }
    guard.add(id);
    const deps = node.dependsOn.map(dep => compute(dep, guard));
    guard.delete(id);
    if (deps.some(d => d === undefined)) return undefined;
    recomputed[id] = fingerprintOf(node, deps as string[], digest);
    return recomputed[id];
  };
  const stale: string[] = [];
  for (const id of Object.keys(receipt.nodes).sort()) {
    const fresh = compute(id, new Set());
    if (fresh === undefined || fresh !== receipt.nodes[id].fingerprint) stale.push(id);
  }
  return { stale, missingDependencies: [...missing].sort() };
}
