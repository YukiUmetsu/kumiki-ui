import { writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import { buildInfographicPages, chooseTemplate } from "../src/infographic/index";
import { FIXTURE_SOURCES, GALLERY_ART_DIRECTIONS, GALLERY_PROFILES } from "../src/infographic/fixtures";

describe("smoke", () => {
  it("reports diagnostics", () => {
    const lines: string[] = [];
    for (const source of FIXTURE_SOURCES) {
      for (const artDirection of GALLERY_ART_DIRECTIONS.slice(0, 1)) {
        for (const profile of GALLERY_PROFILES) {
          const pages = buildInfographicPages(source, { artDirection, profile });
          const all = pages.flatMap((page) =>
            page.diagnostics.map(
              (d) => `${page.pages}:${d.severity}:${d.code}:${d.sectionId ?? ""}:${d.targetId ?? ""}:${d.message.slice(0, 90)}`,
            ),
          );
          lines.push(`${source.id} ${artDirection} ${profile} primitives=${pages[0].primitives.length}`);
          for (const line of all) lines.push("    " + line);
        }
      }
      lines.push(
        `${source.id} template=${chooseTemplate(source).template}`,
        JSON.stringify(chooseTemplate(source).candidates.map((c) => `${c.template}:${c.score.toFixed(2)}:${c.feasible}`)),
      );
    }
    writeFileSync("/tmp/infographic-smoke.txt", lines.join("\n"));
  });
});
