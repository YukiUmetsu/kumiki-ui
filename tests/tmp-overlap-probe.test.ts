import { appendFileSync, rmSync } from "node:fs";

import { describe, it } from "vitest";

import { PHASE2_EXAMPLES, GALLERY_ART_DIRECTIONS, GALLERY_PROFILES } from "../src/infographic/fixtures";
import { buildInfographic, buildInfographicPages } from "../src/infographic/layout";
import { overlapArea } from "../src/infographic/primitives";
import type { ArtDirectionId, InfographicLayout, OutputProfileId } from "../src/infographic";

const OUT = "/private/var/folders/kn/148pypnd47n11h_vmhs6sjtw0000gn/T/opencode/overlap-probe.txt";
rmSync(OUT, { force: true });
const log = (line: string) => appendFileSync(OUT, line + "\n");

type Rect = { x: number; y: number; width: number; height: number; id?: string; kind?: string };

function stats(layout: InfographicLayout) {
  const errs = layout.diagnostics.filter((d) => d.severity === "error");
  const texts = layout.primitives.filter((p) => p.kind === "text") as unknown as Rect[];
  const zero = layout.sections.filter((f) => f.height <= 0.5).map((f) => f.id);
  let pairs = 0;
  let worst = 0;
  for (let a = 0; a < texts.length; a += 1) {
    for (let b = a + 1; b < texts.length; b += 1) {
      const area = overlapArea(texts[a] as never, texts[b] as never);
      if (area > 8) {
        pairs += 1;
        worst = Math.max(worst, area);
      }
    }
  }
  return { errs, errCodes: errs.map((e) => e.code), texts: texts.length, pairs, worst: Math.round(worst), zero };
}

function line(label: string, layout: InfographicLayout) {
  const s = stats(layout);
  log(
    `${label}: errors=${s.errs.length} texts=${s.texts} overlapPairs=${s.pairs} worstOverlap=${s.worst} zeroHeightFrames=[${s.zero.join(",")}]`
  );
  for (const e of s.errs.slice(0, 4)) log(`    ${e.code}: ${e.message}`);
}

describe("probe v2: gallery-accurate specimens", () => {
  it("art-direction matrix (LinkedIn carousel, auto template, social-portrait)", () => {
    for (const artDirection of GALLERY_ART_DIRECTIONS) {
      line(`art:${artDirection}`, buildInfographic(PHASE2_EXAMPLES[0].source, { artDirection, profile: "social-portrait" }));
    }
  });

  it("output-profile matrix (cheat sheet, visual-cheat-sheet, editorial)", () => {
    for (const profile of GALLERY_PROFILES) {
      const pages = buildInfographicPages(PHASE2_EXAMPLES[2].source, {
        template: "visual-cheat-sheet",
        artDirection: "editorial",
        profile,
      });
      line(`profile:${profile}`, pages[0]);
    }
  });

  it("each example across all six output profiles", () => {
    const profiles: OutputProfileId[] = [
      "youtube-landscape",
      "short-portrait",
      "social-square",
      "social-portrait",
      "pinterest-vertical",
      "article-inline",
    ];
    for (const ex of PHASE2_EXAMPLES) {
      for (const profile of profiles) {
        const pages = buildInfographicPages(ex.source, { template: ex.template, artDirection: ex.artDirection, profile });
        const errs = pages.flatMap((p) => p.diagnostics.filter((d) => d.severity === "error"));
        const worst = Math.max(...pages.map((p) => stats(p).pairs));
        log(`example:${ex.id} profile=${profile} pages=${pages.length} errors=${errs.length} worstPageOverlapPairs=${worst}`);
      }
    }
  });

  it("layered-architecture frame allocation detail", () => {
    const layout = buildInfographic(PHASE2_EXAMPLES[3].source, { artDirection: "scientific", profile: "youtube-landscape" });
    for (const f of layout.sections) {
      log(
        `section kind=${f.kind} id=${f.id} y=${Math.round(f.y)} h=${Math.round(f.height)} w=${Math.round(f.width)}`
      );
    }
  });

  it("art direction sanity: does any art direction introduce the clip", () => {
    const arts: ArtDirectionId[] = ["editorial", "illustrated", "sketch"];
    for (const a of arts) {
      const l = buildInfographic(PHASE2_EXAMPLES[0].source, { artDirection: a, profile: "social-portrait" });
      log(`artcheck:${a} canvas=${l.canvas.width}x${l.canvas.height} frames=${l.sections.length} primitives=${l.primitives.length}`);
    }
  });
});
