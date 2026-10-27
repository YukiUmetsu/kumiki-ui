import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CharacterPresenter } from "../registry/character/character-presenter-react";
import { showcaseCues } from "../src/character/character-presenter-demo";
import { doctorQuillAssetFiles, doctorQuillCharacter } from "../src/character/fixtures/doctor-quill";
import { pipAssetFiles, pipCharacter } from "../src/character/fixtures/pip";
import type { CharacterInstance } from "../registry/character/definition";

function imageUrls(files: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(files).map(([uri, file]) => [
    uri, `data:image/png;base64,${readFileSync(resolve("src/character/fixtures", file)).toString("base64")}`,
  ]));
}

/** Optional browser-free review SVGs: CHARACTER_QA_DIR=/tmp/character-qa npx vitest run ... */
describe("Character Presenter story rendering", () => {
  it("renders representative talking, walking and gesture poses with all image layers resolved", () => {
    const outputDir = process.env.CHARACTER_QA_DIR;
    if (outputDir) mkdirSync(outputDir, { recursive: true });
    const cases = [
      { key: "quill" as const, definition: doctorQuillCharacter, instance: { instanceId: "owl", characterId: "doctor-quill", revision: "r2", seed: 11, reducedMotion: true } satisfies CharacterInstance, files: doctorQuillAssetFiles, frames: [30, 85, 155, 202] },
      { key: "pip" as const, definition: pipCharacter, instance: { instanceId: "squirrel", characterId: "pip", revision: "r1", seed: 27, reducedMotion: true } satisfies CharacterInstance, files: pipAssetFiles, frames: [35, 100, 164, 205] },
    ];
    for (const { key, definition, instance, files, frames } of cases) {
      const cues = showcaseCues(definition, key);
      const assetUrls = imageUrls(files);
      for (const frame of frames) {
        const markup = renderToStaticMarkup(createElement(CharacterPresenter, {
          assetUrls, definition, instance, cues, frame, label: `${key} frame ${frame}`,
        }));
        expect(markup).toContain('data-km-character-presenter=""');
        expect(markup).toContain("data:image/png;base64,");
        expect(markup).toContain('data-diagnostics="0"');
        if (!outputDir) continue;
        const svg = markup.slice(markup.indexOf("<svg"), markup.indexOf("</svg>") + 6)
          .replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" width="${definition.design.width}" height="${definition.design.height}" `);
        writeFileSync(join(outputDir, `${key}-${frame}.svg`), svg);
      }
    }
  });
});
