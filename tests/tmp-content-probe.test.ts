import { appendFileSync, writeFileSync } from "node:fs";

import { describe, it } from "vitest";

import type {
  ArtDirectionId,
  InfographicSource,
  OutputProfileId,
  TemplateId,
} from "../src/infographic";
import { buildInfographic, buildInfographicPages } from "../src/infographic/layout";
import {
  estimateSectionHeight,
  getOutputProfile,
  insetRect,
  planTemplate,
  resolveStyle,
  safeInset,
} from "../src/infographic";
import {
  CHEAT_SHEET,
  GALLERY_ART_DIRECTIONS,
  GALLERY_PROFILES,
  LINKEDIN_CAROUSEL,
  PHASE2_EXAMPLES,
} from "../src/infographic/fixtures";

const OUT = "/private/var/folders/kn/148pypnd47n11h_vmhs6sjtw0000gn/T/opencode/content-probe.txt";
writeFileSync(OUT, "");
function log(text: string) {
  appendFileSync(OUT, `${text}\n`);
}

function report(label: string, pages: ReturnType<typeof buildInfographicPages>) {
  const lines: string[] = [];
  lines.push(`=== ${label}: ${pages.length} page(s) ===`);
  pages.forEach((page, index) => {
    lines.push(
      `  page ${index + 1}: diag=${page.diagnostics.length} frames=[${page.sections
        .map((s) => s.id)
        .join(", ")}]`
    );
    for (const d of page.diagnostics) {
      lines.push(`    - [${d.severity}] ${d.code}: ${d.message}`);
    }
  });
  log(lines.join("\n"));
}

const HEADER_RATIO: Record<string, number> = {
  "editorial-overview": 0.2,
  "bento-summary": 0.18,
  "process-journey": 0.18,
  "data-story": 0.16,
  "educational-carousel": 0.5,
  "visual-cheat-sheet": 0.12,
  "layered-architecture": 0.16,
};

describe("content probe", () => {
  it("phase2 examples", () => {
    for (const example of PHASE2_EXAMPLES) {
      const pages = buildInfographicPages(example.source, {
        template: example.template,
        artDirection: example.artDirection,
        profile: example.output,
      });
      report(`${example.id} (${example.template}/${example.artDirection}/${example.output})`, pages);
    }
  });

  it("art direction matrix", () => {
    for (const artDirection of GALLERY_ART_DIRECTIONS) {
      const layout = buildInfographic(LINKEDIN_CAROUSEL, {
        artDirection,
        profile: "social-portrait",
      });
      log(`=== artDirection ${artDirection}: diag=${layout.diagnostics.length} template=${layout.template} ===`);
      for (const d of layout.diagnostics) {
        log(`    - [${d.severity}] ${d.code}: ${d.message}`);
      }
    }
  });

  it("output profile matrix", () => {
    for (const profile of GALLERY_PROFILES) {
      const pages = buildInfographicPages(CHEAT_SHEET, {
        template: "visual-cheat-sheet" as TemplateId,
        artDirection: "editorial" as ArtDirectionId,
        profile: profile as OutputProfileId,
      });
      report(`cheat-sheet/${profile}`, pages);
    }
  });

  it("editorial overview overflow guide", () => {
    const source = PHASE2_EXAMPLES.find((e) => e.id === "pinterest-infographic")!.source;
    for (const profile of ["youtube-landscape", "pinterest-vertical"] as OutputProfileId[]) {
      const layout = buildInfographic(source, {
        template: "editorial-overview",
        artDirection: "illustrated",
        profile,
      });
      log(
        `=== editorial-overview ${profile}: pages=${layout.pages} frames=[${layout.sections
          .map((s) => s.id)
          .join(", ")}] diag=${layout.diagnostics.length}`
      );
      for (const d of layout.diagnostics) log(`    - [${d.severity}] ${d.code}: ${d.message}`);
    }
  });

  it("chart drop hypothesis", () => {
    const source = PHASE2_EXAMPLES.find((e) => e.id === "pinterest-infographic")!.source;
    const layout = buildInfographic(source, {
      template: "editorial-overview",
      artDirection: "illustrated",
      profile: "pinterest-vertical",
      size: { width: 2000, height: 5000 },
    });
    log(
      `=== chart-drop: size 2000x5000 frames=[${layout.sections.map((s) => s.id).join(", ")}] diag=${layout.diagnostics.length}`
    );
    for (const d of layout.diagnostics) log(`    - [${d.severity}] ${d.code}: ${d.message}`);
  });

  it("geometry + section minimums", () => {
    for (const example of PHASE2_EXAMPLES) {
      const style = resolveStyle(example.artDirection);
      const profile = getOutputProfile(example.output);
      const inset = safeInset(profile);
      const safe = insetRect(
        { x: 0, y: 0, width: profile.width, height: profile.height },
        inset
      );
      const ratio = HEADER_RATIO[example.template];
      const headerHeight = Math.round(safe.height * ratio);
      const gap = style.spacing[4];
      const restHeight = Math.round(safe.height - headerHeight - gap);
      log(
        `\n### ${example.id} ${example.output} ${profile.width}x${profile.height} inset=${inset} safe=${safe.width}x${safe.height} header=${headerHeight} restHeight=${restHeight} gap=${gap}`
      );
      log(`  spacing=[${style.spacing.join(",")}] type=${JSON.stringify(style.type)}`);
      const width = example.template === "visual-cheat-sheet" ? Math.round((safe.width - 2 * style.spacing[2]) / 3) : safe.width;
      for (const section of example.source.sections) {
        const req = estimateSectionHeight(section, Math.round(width), style);
        log(`  ${section.id} (${section.kind}) @${Math.round(width)}: min=${req.minHeight} pref=${req.preferredHeight}`);
      }
    }
  });

  it("technical diagram trim experiments", () => {
    const base = PHASE2_EXAMPLES.find((e) => e.id === "technical-diagram")!.source;

    const trimNotes = (source: InfographicSource, dropEvidence: boolean) => {
      for (const section of source.sections) {
        if (section.kind === "text") {
          section.paragraphs = ["Read the diagram left to right and follow each downward edge."];
          delete section.bullets;
        }
        if (section.kind === "quote") {
          section.data.quote = "A layer may call the layer below it, never the one beside it.";
        }
        if (dropEvidence) delete (section as { evidenceRefs?: unknown }).evidenceRefs;
      }
    };
    const setLayers = (source: InfographicSource, layers: number) => {
      const diagram = source.sections.find((s) => s.kind === "diagram");
      if (!diagram || diagram.kind !== "diagram") return;
      const nodes = [
        { id: "n-client", label: "Client request", group: "entry", importance: "hero" as const },
        { id: "n-boundary", label: "Request boundary", group: "boundary", importance: "hero" as const },
        { id: "n-query", label: "Query service", group: "service" },
        { id: "n-store", label: "Object store", group: "store" },
      ];
      const edges = [
        { id: "e-client", from: "n-client", to: "n-boundary" },
        { id: "e-query", from: "n-boundary", to: "n-query" },
        { id: "e-store", from: "n-query", to: "n-store" },
      ];
      diagram.diagram.nodes = nodes.slice(0, layers + 1) as typeof diagram.diagram.nodes;
      diagram.diagram.edges = edges.slice(0, layers) as typeof diagram.diagram.edges;
    };

    for (const layers of [4, 3, 2]) {
      for (const dropEvidence of [false, true]) {
        for (const keep of [5, 4, 3]) {
          const variant = structuredClone(base) as InfographicSource;
          trimNotes(variant, dropEvidence);
          setLayers(variant, layers);
          variant.sections = variant.sections.slice(0, keep);
          const layout = buildInfographic(variant, {
            template: "layered-architecture",
            artDirection: "scientific",
            profile: "youtube-landscape",
          });
          const errs = layout.diagnostics.filter((d) => d.severity === "error");
          log(
            `### layers=${layers} dropEvidence=${dropEvidence} keep=${keep}: pages=${layout.pages} frames=[${layout.sections
              .map((s) => s.id)
              .join(", ")}] errors=${errs.length}`
          );
          for (const d of errs) log(`    - ${d.code}: ${d.message}`);
        }
      }
    }
  });

  it("pinterest editorial-overview subset probe", () => {
    const base = PHASE2_EXAMPLES.find((e) => e.id === "pinterest-infographic")!.source;
    const sections = base.sections;
    const style = resolveStyle("illustrated");
    const profile = getOutputProfile("pinterest-vertical");
    const canvas = {
      width: profile.width,
      height: profile.height,
      profile: profile.id,
      background: style.color.canvas,
      safeRegion: safeInset(profile),
    };
    const safe = insetRect({ x: 0, y: 0, width: canvas.width, height: canvas.height }, canvas.safeRegion);
    const contexts = {
      style,
      canvas,
      safe,
      columns: undefined,
      density: undefined,
      emphasis: undefined,
      orientation: undefined,
    };
    // mins at the actual grid column widths (880 - 2*24 = 832; weights 2:2:3)
    const avail = 832;
    const widths = [Math.round((avail * 2) / 7), Math.round((avail * 2) / 7), Math.round((avail * 3) / 7)];
    log(`\npinterest cell widths = ${widths.join(",")}`);
    for (const section of sections) {
      const reqs = widths.map((w) => estimateSectionHeight(section, w, style).minHeight);
      log(`  ${section.id} (${section.kind}) mins@cells=[${reqs.join(",")}] @880=${estimateSectionHeight(section, 880, style).minHeight}`);
    }
    for (let n = 1; n <= sections.length; n += 1) {
      const subset = sections.slice(0, n);
      const plan = planTemplate("editorial-overview", { ...contexts, sections: subset });
      log(
        `  subset n=${n} [${subset.map((s) => s.id).join(",")}] pages=${plan.pages} frames=[${plan.frames
          .map((f) => `${f.sectionId}:${Math.round(f.frame.width)}x${Math.round(f.frame.height)}@${Math.round(f.frame.y)}`)
          .join(" ")}] rejected=[${plan.rejected.map((r) => `${r.sectionId}:${r.overflow}`).join(",")}]`
      );
    }
  });

  it("plan details", () => {
    for (const example of PHASE2_EXAMPLES) {
      const style = resolveStyle(example.artDirection);
      const profile = getOutputProfile(example.output);
      const canvas = {
        width: profile.width,
        height: profile.height,
        profile: profile.id,
        background: style.color.canvas,
        safeRegion: safeInset(profile),
      };
      const safe = insetRect(
        { x: 0, y: 0, width: canvas.width, height: canvas.height },
        canvas.safeRegion
      );
      const plan = planTemplate(example.template, {
        style,
        canvas,
        safe,
        sections: example.source.sections ?? [],
      });
      log(`=== PLAN ${example.id} pages=${plan.pages} unplaced=[${plan.unplaced.join(", ")}] rejected=[${plan.rejected.map((r) => `${r.sectionId}:${r.overflow}`).join(", ")}]`);
      for (const frame of plan.frames) {
        log(`  frame p${frame.page} ${frame.sectionId} slot=${frame.slot} ${Math.round(frame.frame.width)}x${Math.round(frame.frame.height)}`);
      }
    }
  });
});
