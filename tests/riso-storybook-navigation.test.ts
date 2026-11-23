import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Sidebar navigation is defined by CSF meta.title, not filesystem paths. */
const studios = [
  ["riso-print-studios.stories.tsx", "video-riso-print-lab"],
  ["riso-character.stories.tsx", "video-riso-characters"],
  ["riso-rig-lab.stories.tsx", "video-riso-rig-lab"],
  ["riso-opaque-print.stories.tsx", "video-riso-opaque-lab"],
  ["riso-character-model-sheets.stories.tsx", "video-riso-character-model-sheets"],
  ["riso-artcraft-studies.stories.tsx", "video-riso-artcraft-studies"],
  ["ink-riso-press.stories.tsx", "video-riso-ink-press"],
] as const;
const read = (file: string) => readFileSync(join(process.cwd(), "src/video", file), "utf8");

describe("Risograph Storybook navigation contract", () => {
  it.each(studios)("%s belongs to one folder with a stable CSF ID", (file, id) => {
    const source = read(file);
    expect(source).toMatch(/title:\s*["']Video production\/Film Looks\/Risograph["']/);
    expect(source).toMatch(new RegExp(String.raw`id\s*:\s*["']${id}["']`));
    expect(source).toContain("export default meta");
  });

  it("has unique component IDs across the combined Risograph suite", () => {
    expect(new Set(studios.map(([, id]) => id)).size).toBe(studios.length);
  });

  it("separates all four print stories from photographic Film Looks", () => {
    const print = read("riso-print-studios.stories.tsx");
    for (const name of ["RisographTwoInk", "RisographFilm", "RisographSheetFeed", "RisographOverprint"]) {
      expect(print).toContain("export const " + name);
    }
    expect(read("film-looks.stories.tsx")).not.toContain("export const Risograph");
  });
});
