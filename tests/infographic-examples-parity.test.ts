import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { InfographicSource } from "../src/infographic";
import {
  CHEAT_SHEET,
  LINKEDIN_CAROUSEL,
  PHASE2_EXAMPLES,
  PINTEREST_INFOGRAPHIC,
  TECHNICAL_DIAGRAM,
} from "../src/infographic/fixtures";
import { validateSource } from "../src/infographic/validate";

/**
 * Parity between the checked-in JSON example documents
 * (`examples/infographic/*.json`) and the typed fixtures the gallery and the
 * test suite build from (`src/infographic/fixtures.ts`).
 *
 * The JSON copies are the hand-editable showcase documents; the fixtures are
 * what the application actually imports. Nothing links them mechanically, so
 * they can drift without anyone noticing. These tests read both, prove the JSON
 * still validates, and assert the two copies describe the same document — a
 * drift failure names the example file and the exact JSON paths that disagree,
 * so the mismatch can be resolved deliberately instead of silently.
 *
 * The suite reads files and calls the pure validator, so it needs no DOM — it
 * runs in the repo's default jsdom environment only because the shared
 * `tests/setup.ts` installs a canvas stub that assumes a DOM.
 */

interface ExampleCase {
  /** File name under `examples/infographic/`. */
  file: string;
  /** The fixture export the file must match. */
  fixture: InfographicSource;
}

const EXAMPLES: readonly ExampleCase[] = [
  { file: "linkedin-carousel.json", fixture: LINKEDIN_CAROUSEL },
  { file: "pinterest-infographic.json", fixture: PINTEREST_INFOGRAPHIC },
  { file: "educational-cheat-sheet.json", fixture: CHEAT_SHEET },
  { file: "technical-diagram.json", fixture: TECHNICAL_DIAGRAM },
];

function readExample(file: string): unknown {
  const filePath = path.join(process.cwd(), "examples", "infographic", file);
  return JSON.parse(readFileSync(filePath, "utf8"));
}

/** Stable, JSON-pointer-ish paths where `actual` diverges from `expected`. */
function diffPaths(expected: unknown, actual: unknown, path = ""): string[] {
  if (expected === actual) return [];
  if (
    typeof expected !== "object" ||
    expected === null ||
    typeof actual !== "object" ||
    actual === null
  ) {
    return [
      `${path || "/"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    ];
  }
  if (Array.isArray(expected) !== Array.isArray(actual)) {
    return [`${path || "/"}: shape differs (array vs object)`];
  }
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const diffs: string[] = [];
    if (expected.length !== actual.length) {
      diffs.push(`${path || "/"}: length ${expected.length} vs ${actual.length}`);
    }
    const length = Math.max(expected.length, actual.length);
    for (let index = 0; index < length; index += 1) {
      diffs.push(...diffPaths(expected[index], actual[index], `${path}/${index}`));
    }
    return diffs;
  }
  const expectedRecord = expected as Record<string, unknown>;
  const actualRecord = actual as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(expectedRecord), ...Object.keys(actualRecord)])].sort();
  const diffs: string[] = [];
  for (const key of keys) {
    const next = `${path}/${key}`;
    if (!(key in expectedRecord)) {
      diffs.push(`${next}: unexpected key`);
    } else if (!(key in actualRecord)) {
      diffs.push(`${next}: missing key`);
    } else {
      diffs.push(...diffPaths(expectedRecord[key], actualRecord[key], next));
    }
  }
  return diffs;
}

function describeDiagnostics(
  diagnostics: readonly { severity: string; code: string; message: string }[]
): string {
  if (diagnostics.length === 0) return "none";
  return diagnostics
    .map((diagnostic) => `${diagnostic.severity}:${diagnostic.code} — ${diagnostic.message}`)
    .join("; ");
}

describe("infographic example documents — JSON/fixture parity", () => {
  const examplesById = new Map(PHASE2_EXAMPLES.map((example) => [example.source.id, example]));

  for (const { file, fixture } of EXAMPLES) {
    describe(file, () => {
      const json = readExample(file);

      it("validates as an infographic source", () => {
        const result = validateSource(json);
        expect(
          result.ok,
          `${file}: validateSource(json).ok must be true — diagnostics: ${describeDiagnostics(result.diagnostics)}`
        ).toBe(true);
      });

      it("deep-equals its typed fixture", () => {
        const diffs = diffPaths(fixture, json);
        expect(
          diffs,
          `${file}: JSON and fixture diverge at — ${diffs.join("; ")}`
        ).toEqual([]);
        expect(json, `${file}: JSON must deep-equal the typed fixture`).toEqual(fixture);
      });

      it("is linked into PHASE2_EXAMPLES by source id", () => {
        const example = examplesById.get(fixture.id);
        expect(
          example,
          `${file}: no PHASE2_EXAMPLES entry has source.id "${fixture.id}"`
        ).toBeDefined();
        expect(
          example?.source,
          `${file}: PHASE2_EXAMPLES entry "${fixture.id}" must reference the same fixture object`
        ).toBe(fixture);
      });
    });
  }
});
