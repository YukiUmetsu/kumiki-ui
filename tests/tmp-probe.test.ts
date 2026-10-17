import { writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import {
  getOutputProfile,
  insetRect,
  planTemplate,
  resolveStyle,
  sectionChrome,
  layoutTextForRole,
  createIdFactory,
  round,
} from "../src/infographic/index";
import type { SectionRenderContext, InfographicSection } from "../src/infographic/index";
import { RAG_EXPLAINER } from "../src/infographic/fixtures";

describe("probe", () => {
  it("frame budget", () => {
    const lines: string[] = [];
    for (const profile of ["youtube-landscape", "short-portrait"] as const) {
      const style = resolveStyle("editorial");
      const output = getOutputProfile(profile);
      const inset = Math.round(Math.min(output.width, output.height) * output.safeInset);
      const canvas = {
        width: output.width,
        height: output.height,
        profile,
        background: style.color.canvas,
        safeRegion: inset,
      };
      const safe = insetRect({ x: 0, y: 0, width: output.width, height: output.height }, inset);
      const sections = RAG_EXPLAINER.sections as InfographicSection[];
      const context = { style, canvas, safe, sections };
      const plan = planTemplate(profile === "youtube-landscape" ? "editorial-overview" : "process-journey", context);
      lines.push(`--- ${profile} template=${profile === "youtube-landscape" ? "editorial-overview" : "process-journey"} header=${JSON.stringify(plan.header)} pages=${plan.pages}`);
      let n = 0;
      const idFactory = createIdFactory("probe");
      const ctx: SectionRenderContext = {
        style,
        language: "en",
        evidence: new Map(),
        evidenceLabel: () => undefined,
        id: idFactory,
        report: () => {},
      };
      for (const frame of plan.frames) {
        const section = sections.find((entry) => entry.id === frame.sectionId);
        if (!section) continue;
        const chrome = sectionChrome(section, frame.frame, ctx, { accent: true });
        let required: number | null = null;
        if (section.kind === "text") {
          const text = section.paragraphs.join("\n");
          const result = layoutTextForRole(
            {
              text,
              box: chrome.content,
              color: style.color.ink,
              typeRole: "body",
              language: "en",
            },
            ctx
          );
          required = round(result.requiredHeight);
        }
        n += 1;
        lines.push(
          `  ${frame.slot} ${section.kind} frame=${frame.frame.width}x${frame.frame.height} @y${frame.frame.y} content=${chrome.content.height} required=${required}`
        );
      }
      lines.push(`  frames=${n}`);
    }
    writeFileSync("/tmp/infographic-probe.txt", lines.join("\n"));
  });
});
