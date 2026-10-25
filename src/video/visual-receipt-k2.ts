/** K5 receipt nodes for the K2/K3 clip explanation: which footage, profile, chart spec and cut each visual part depends on.
 * Pure: the caller supplies the file hashes and the decoded proof-frame hashes. Data-only imports, so it runs in node tests.
 */
import type { ReceiptNodeInput } from "./visual-receipt";
import { EXPLANATION_CHART, EXPLANATION_FPS, EXPLANATION_IDS, EXPLANATION_TIMING } from "./clip-explanation-data";
import type { ExplanationProfile } from "./clip-explanation-layout";

export interface K2ReceiptSources {
  /** Footage file name (not its path), its SHA-256 and its rights reference from the clip record. */
  footage: { file: string; sha256: string; licenseRef: string };
  /** Renderer and decoder identity. Any change here re-proves every visual node. */
  renderer: { browser: string; ffmpeg: string; exporter: string; /** SHA-256 of the exporter's source files, so editing them re-proves the output. */ exporterSha256: string };
  profile: ExplanationProfile;
  /** Background music. Absent means no music track. */
  music?: { file: string; sha256: string };
  /** Decoded proof frames from an export: SHA-256 of the raw RGB frame, keyed by shot and output frame. */
  proofs?: { shot: "scan" | "payoff"; frame: number; sha256: string }[];
}

/** Nodes for one profile. The chart spec and timing are part of the shots' inputs, so editing them invalidates exactly those shots. */
export function k2ReceiptNodes(sources: K2ReceiptSources): ReceiptNodeInput[] {
  const { profile } = sources;
  const shotId = { scan: EXPLANATION_IDS.scanShot, payoff: EXPLANATION_IDS.payoffShot } as const;
  const nodes: ReceiptNodeInput[] = [
    { id: "renderer", kind: "asset", visual: true, dependsOn: [], inputs: sources.renderer },
    { id: "footage", kind: "asset", visual: true, dependsOn: [],
      inputs: { file: sources.footage.file, sha256: sources.footage.sha256, licenseRef: sources.footage.licenseRef } },
    { id: "profile", kind: "profile", visual: true, dependsOn: [],
      inputs: { id: profile.id, preset: profile.preset, width: profile.width, height: profile.height, fps: EXPLANATION_FPS,
        safe: profile.safe, framing: profile.framing, typography: profile.typography } },
    { id: "chart-spec", kind: "asset", visual: true, dependsOn: [], inputs: EXPLANATION_CHART },
    { id: "scan-shot", kind: "shot", visual: true, dependsOn: ["renderer", "footage", "profile"],
      inputs: { shot: shotId.scan, frames: EXPLANATION_TIMING.scanFrames, trimIn: 45, freezeAt: EXPLANATION_TIMING.freezeAt,
        freezeFrames: EXPLANATION_TIMING.freezeFrames, calloutsAt: EXPLANATION_TIMING.calloutsAt,
        subjects: [EXPLANATION_IDS.subject, EXPLANATION_IDS.scanner] } },
    { id: "payoff-shot", kind: "shot", visual: true, dependsOn: ["renderer", "chart-spec", "profile"],
      inputs: { shot: shotId.payoff, frames: EXPLANATION_TIMING.payoffFrames, chart: EXPLANATION_IDS.chart } },
    { id: "boundary", kind: "boundary", visual: true, dependsOn: ["scan-shot", "payoff-shot"],
      inputs: { dissolveFrames: EXPLANATION_TIMING.dissolveFrames } },
    { id: "music", kind: "audio", visual: false, dependsOn: [],
      inputs: sources.music ? { file: sources.music.file, sha256: sources.music.sha256 } : { file: "none" } },
  ];
  for (const proof of sources.proofs ?? []) {
    nodes.push({ id: "proof-" + proof.shot + "-" + proof.frame, kind: "proof", visual: true,
      dependsOn: [proof.shot === "scan" ? "scan-shot" : "payoff-shot"],
      inputs: { frame: proof.frame, sha256: proof.sha256 } });
  }
  return nodes;
}
