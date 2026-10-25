import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildVisualReceipt, canonicalJson, diffVisualReceipts, verifyVisualReceipt } from "../src/video/visual-receipt";
import type { ReceiptNodeInput, VisualReceipt } from "../src/video/visual-receipt";
import { k2ReceiptNodes } from "../src/video/visual-receipt-k2";
import type { K2ReceiptSources } from "../src/video/visual-receipt-k2";
import { EXPLANATION_PROFILES } from "../src/video/clip-explanation-layout";

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
const sha256File = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const footagePath = resolve(process.cwd(), "src/video/assets/conveyor-1080p.webm");
const footageHash = existsSync(footagePath) ? sha256File(footagePath) : sha256("conveyor-fixture");
// The exporter's own source: editing it re-proves everything it rendered.
const exporterFiles = ["scripts/export-video.mjs", "scripts/video-export-core.mjs"].map(file => resolve(process.cwd(), file));
const exporterHash = exporterFiles.every(file => existsSync(file)) ? sha256(exporterFiles.map(file => sha256File(file)).join(":")) : sha256("exporter");

const base = (overrides: Partial<K2ReceiptSources> = {}): K2ReceiptSources => ({
  footage: { file: "conveyor-1080p.webm", sha256: footageHash, licenseRef: "In-house footage" },
  renderer: { browser: "Chromium 156.0.8078.4 (bundled)", ffmpeg: "9.0.2", exporter: "scripts/export-video.mjs", exporterSha256: exporterHash },
  profile: EXPLANATION_PROFILES["youtube-shorts"],
  music: { file: "bed.wav", sha256: sha256("bed-v1") },
  proofs: [{ shot: "scan", frame: 90, sha256: sha256("proof-scan-90") }, { shot: "payoff", frame: 300, sha256: sha256("proof-payoff-300") }],
  ...overrides,
});
const build = (nodes: ReceiptNodeInput[], review?: VisualReceipt["review"], structural?: Record<string, unknown>) =>
  buildVisualReceipt("k2-receipt", nodes, sha256, review, structural);
const edit = (nodes: ReceiptNodeInput[], id: string, change: (node: ReceiptNodeInput) => ReceiptNodeInput) =>
  nodes.map(node => node.id === id ? change(node) : node);

describe("canonical JSON", () => {
  it("does not depend on key order", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3] } })).toBe(canonicalJson({ a: { c: [3], d: 2 }, b: 1 }));
  });
});

describe("K5 two-version scenarios", () => {
  const v1 = build(k2ReceiptNodes(base()));

  it("identical inputs change nothing", () => {
    const diff = diffVisualReceipts(v1, build(k2ReceiptNodes(base())));
    expect(diff.affectedVisual).toEqual([]);
    expect(diff.changedNonVisual).toEqual([]);
  });

  it("changing only the background music invalidates no visual proof", () => {
    const v2 = build(k2ReceiptNodes(base({ music: { file: "bed.wav", sha256: sha256("bed-v2") } })));
    const diff = diffVisualReceipts(v1, v2);
    expect(diff.affectedVisual).toEqual([]);
    expect(diff.changedNonVisual).toEqual(["music"]);
    expect(diff.unchangedVisual).toEqual(expect.arrayContaining(["footage", "profile", "scan-shot", "payoff-shot", "boundary", "proof-scan-90"]));
  });

  it("replacing the footage re-proves the footage's shot and the cut, but not the chart shot", () => {
    const v2 = build(k2ReceiptNodes(base({ footage: { file: "conveyor-v2.webm", sha256: sha256("footage-v2"), licenseRef: "In-house footage" } })));
    const diff = diffVisualReceipts(v1, v2);
    expect(diff.affectedVisual).toEqual(expect.arrayContaining(["footage", "scan-shot", "boundary", "proof-scan-90"]));
    expect(diff.affectedVisual).not.toEqual(expect.arrayContaining(["payoff-shot", "chart-spec", "profile", "proof-payoff-300"]));
  });

  it("editing a chart value re-proves the chart shot and the cut, but not the footage shot", () => {
    const nodes = edit(k2ReceiptNodes(base()), "chart-spec", node => ({ ...node, inputs: { ...(node.inputs as object), revised: "value 3" } }));
    const diff = diffVisualReceipts(v1, build(nodes));
    expect(diff.affectedVisual).toEqual(expect.arrayContaining(["chart-spec", "payoff-shot", "boundary", "proof-payoff-300"]));
    expect(diff.affectedVisual).not.toEqual(expect.arrayContaining(["footage", "scan-shot", "proof-scan-90"]));
  });

  it("a renderer or decoder change re-proves everything rendered, but not the source files or audio", () => {
    const v2 = build(k2ReceiptNodes(base({ renderer: { browser: "Chrome 157", ffmpeg: "9.0.2", exporter: "scripts/export-video.mjs", exporterSha256: exporterHash } })));
    const diff = diffVisualReceipts(v1, v2);
    expect(diff.affectedVisual).toEqual(expect.arrayContaining(["renderer", "scan-shot", "payoff-shot", "boundary", "proof-scan-90", "proof-payoff-300"]));
    expect(diff.affectedVisual).not.toEqual(expect.arrayContaining(["footage", "profile", "chart-spec"]));
    expect(diff.changedNonVisual).toEqual([]);
  });

  it("changing the framing of a profile re-proves every shot in it", () => {
    const profile = { ...EXPLANATION_PROFILES["youtube-shorts"], framing: { fit: "cover" as const, focus: { x: 0.5, y: 0.5 } } };
    const diff = diffVisualReceipts(v1, build(k2ReceiptNodes(base({ profile }))));
    expect(diff.affectedVisual).toEqual(expect.arrayContaining(["profile", "scan-shot", "payoff-shot", "boundary", "proof-scan-90", "proof-payoff-300"]));
    expect(diff.affectedVisual).not.toEqual(expect.arrayContaining(["footage", "chart-spec", "music"]));
  });

  it("a single changed proof frame affects only that proof", () => {
    const v2 = build(k2ReceiptNodes(base({ proofs: [{ shot: "scan", frame: 90, sha256: sha256("proof-scan-90-changed") }, { shot: "payoff", frame: 300, sha256: sha256("proof-payoff-300") }] })));
    expect(diffVisualReceipts(v1, v2).affectedVisual).toEqual(["proof-scan-90"]);
  });

  it("editing the exporter's source re-proves everything it rendered", () => {
    const v2 = build(k2ReceiptNodes(base({ renderer: { browser: "Chromium 156.0.8078.4 (bundled)", ffmpeg: "9.0.2", exporter: "scripts/export-video.mjs", exporterSha256: sha256("edited exporter") } })));
    const diff = diffVisualReceipts(v1, v2);
    expect(diff.affectedVisual).toEqual(expect.arrayContaining(["renderer", "scan-shot", "payoff-shot", "boundary"]));
    expect(diff.changedNonVisual).toEqual([]);
  });

  it("structural results are recorded but do not change any fingerprint", () => {
    const withResults = build(k2ReceiptNodes(base()), undefined, { decodedFrames: 360 });
    expect(withResults.structural).toEqual({ decodedFrames: 360 });
    expect(diffVisualReceipts(v1, withResults).affectedVisual).toEqual([]);
  });

  it("the review record is kept apart from the structural fingerprints", () => {
    const reviewed = build(k2ReceiptNodes(base()), { status: "accepted", reviewer: "owner", date: "2026-10-24" });
    expect(reviewed.review.status).toBe("accepted");
    expect(diffVisualReceipts(v1, reviewed).affectedVisual).toEqual([]);
  });

  it("the receipt verifies clean, and carries no absolute paths", () => {
    expect(verifyVisualReceipt(v1, sha256)).toEqual({ stale: [], missingDependencies: [] });
    expect(JSON.stringify(v1)).not.toMatch(/\/Users\/|\/private\//);
  });

  it("optionally writes the receipt for a real export (K5_RECEIPT_OUT, K5_PROOFS JSON)", () => {
    const out = process.env.K5_RECEIPT_OUT;
    if (!out) return;
    const proofs = process.env.K5_PROOFS ? JSON.parse(readFileSync(process.env.K5_PROOFS, "utf8")) : [];
    const structural = process.env.K5_STRUCTURAL ? JSON.parse(readFileSync(process.env.K5_STRUCTURAL, "utf8")) : undefined;
    const review = process.env.K5_REVIEW_JSON ? JSON.parse(readFileSync(process.env.K5_REVIEW_JSON, "utf8")) : { status: "not-reviewed" };
    writeFileSync(out, JSON.stringify(build(k2ReceiptNodes(base({ proofs })), review, structural), null, 2));
  });
});

describe("K5 stale, corrupt and invalid receipts", () => {
  const v1 = build(k2ReceiptNodes(base()));

  it("editing a node's inputs without re-proving marks it and everything downstream stale", () => {
    const tampered: VisualReceipt = { ...v1, nodes: { ...v1.nodes, "scan-shot": { ...v1.nodes["scan-shot"], inputs: { ...(v1.nodes["scan-shot"].inputs as object), freezeAt: 60 } } } };
    const { stale } = verifyVisualReceipt(tampered, sha256);
    expect(stale).toEqual(expect.arrayContaining(["scan-shot", "boundary", "proof-scan-90"]));
    expect(stale).not.toContain("payoff-shot");
  });

  it("a damaged stored fingerprint is flagged on that node alone", () => {
    const tampered: VisualReceipt = { ...v1, nodes: { ...v1.nodes, footage: { ...v1.nodes.footage, fingerprint: "0".repeat(64) } } };
    expect(verifyVisualReceipt(tampered, sha256).stale).toEqual(["footage"]);
  });

  it("refuses a dependency on an unknown node", () => {
    expect(() => build([{ id: "a", kind: "shot", visual: true, dependsOn: ["missing"], inputs: {} }])).toThrow(/unknown node missing/);
  });

  it("refuses a cycle", () => {
    expect(() => build([
      { id: "a", kind: "shot", visual: true, dependsOn: ["b"], inputs: {} },
      { id: "b", kind: "shot", visual: true, dependsOn: ["a"], inputs: {} },
    ])).toThrow(/cycle/);
  });

  it("refuses duplicate ids", () => {
    expect(() => build([{ id: "a", kind: "asset", visual: true, dependsOn: [], inputs: 1 }, { id: "a", kind: "asset", visual: true, dependsOn: [], inputs: 2 }])).toThrow(/unique/);
  });
});
