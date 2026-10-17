/**
 * Baseline JSON for the valid showcase fixtures, plus the geometry invariants
 * every golden composition must hold.
 *
 * `examples/media/<id>.json` is generated output, never hand-edited. The only
 * sanctioned way to refresh the baselines is:
 *
 *   KM_WRITE_FIXTURES=1 npx vitest run tests/media-fixtures.test.ts
 *
 * and then re-run the suite without the variable to prove the committed JSON
 * still round-trips. The guard exists so the JSON cannot silently drift from
 * `serializeDocument`: a normal run only reads and verifies, it never writes.
 *
 * The second half of this file is what makes the first half trustworthy: a
 * fixture that renders as a collision or an overflow is not a golden example,
 * so the invariants are asserted from layer bounds rather than eyeballed from a
 * screenshot.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  isTextLayer,
  layerBounds,
  overflowLayers,
  parseDocument,
  rectsIntersect,
  serializeDocument,
} from "../src/media/document";
import {
  FIXTURE_ASSETS,
  FIXTURE_DOCUMENTS,
  gradientDataUri,
  NEGATIVE_FIXTURES,
} from "../src/media/fixtures";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examplesDir = path.join(projectRoot, "examples", "media");
const WRITE_FIXTURES = process.env.KM_WRITE_FIXTURES === "1";

const SVG_DATA_PREFIX = "data:image/svg+xml;charset=utf-8,";

type Rect = { x: number; y: number; width: number; height: number };
type Layer = Parameters<typeof isTextLayer>[0];
type DocumentWithLayers = {
  artboard: { width: number; height: number };
  layers: Layer[];
};

function artboardRect(document: DocumentWithLayers): Rect {
  return { x: 0, y: 0, width: document.artboard.width, height: document.artboard.height };
}

// Pairs of visible text layers that share a parent scope and whose bounds
// intersect. Overlapping *media* is legitimate (a scrim or caption plate behind
// copy), so this is deliberately restricted to text-vs-text.
function textCollisions(document: DocumentWithLayers): string[] {
  const texts = document.layers.filter(isTextLayer).filter((layer) => layer.visible);
  const collisions: string[] = [];
  for (let a = 0; a < texts.length; a += 1) {
    for (let b = a + 1; b < texts.length; b += 1) {
      const first = texts[a];
      const second = texts[b];
      if ((first.parentId ?? null) !== (second.parentId ?? null)) continue;
      if (rectsIntersect(layerBounds(first), layerBounds(second))) {
        collisions.push(`${first.id} / ${second.id}`);
      }
    }
  }
  return collisions;
}

describe("media fixtures: committed JSON baselines", () => {
  for (const [id, document] of Object.entries(FIXTURE_DOCUMENTS)) {
    it(`${id} matches examples/media/${id}.json byte-for-byte`, () => {
      const file = path.join(examplesDir, `${id}.json`);
      const expected = serializeDocument(document);

      if (WRITE_FIXTURES) {
        mkdirSync(examplesDir, { recursive: true });
        writeFileSync(file, expected, "utf8");
        console.log(`[media-fixtures] wrote ${path.relative(projectRoot, file)}`);
      }

      const onDisk = readFileSync(file, "utf8");
      expect(onDisk).toBe(expected);

      const parsed = parseDocument(onDisk);
      expect(parsed.document).not.toBeNull();
      expect(serializeDocument(parsed.document!)).toBe(onDisk);
      expect(parsed.document!.metadata?.title).toBe(document.metadata?.title);
    });
  }
});

describe("media fixtures: composition geometry", () => {
  for (const [id, document] of Object.entries(FIXTURE_DOCUMENTS)) {
    it(`${id}: no two visible sibling text layers intersect`, () => {
      expect(textCollisions(document)).toEqual([]);
    });

    it(`${id}: no layer overflows the artboard`, () => {
      expect(overflowLayers(document.layers, artboardRect(document))).toEqual([]);
    });

    it(`${id}: every layer box is finite and positive`, () => {
      for (const layer of document.layers) {
        expect(
          Number.isFinite(layer.transform.width) && layer.transform.width > 0,
          `${layer.id} width`
        ).toBe(true);
        expect(
          Number.isFinite(layer.transform.height) && layer.transform.height > 0,
          `${layer.id} height`
        ).toBe(true);
      }
    });
  }

  it("the overflow fixture still collides and overflows (it is the negative case)", () => {
    const negative = NEGATIVE_FIXTURES.find((fixture) => fixture.id === "overflow");
    expect(negative).toBeDefined();
    const document = negative!.document;
    expect(textCollisions(document).length).toBeGreaterThan(0);
    expect(overflowLayers(document.layers, artboardRect(document)).length).toBeGreaterThan(0);
  });
});

describe("media fixtures: generated artwork", () => {
  it("is deterministic — identical inputs produce a byte-identical data URI", () => {
    const first = gradientDataUri("probe", 1600, 900, "#2f6f4f", "#101418");
    const second = gradientDataUri("probe", 1600, 900, "#2f6f4f", "#101418");
    expect(second).toBe(first);
  });

  it("is a self-contained inline image/svg+xml URI with no network reference", () => {
    const uri = gradientDataUri("probe", 1200, 1200, "#1f3b5c", "#5c6360");
    expect(uri.startsWith(SVG_DATA_PREFIX)).toBe(true);

    const svg = decodeURIComponent(uri.slice(SVG_DATA_PREFIX.length));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    // The only `http` allowed is the SVG namespace declaration; anything that
    // would trigger an implicit fetch (`<image href>`, `url(http…)`) is a bug.
    expect(svg.includes("<image")).toBe(false);
    expect(svg).not.toContain("url(http");
    expect((svg.match(/http/g) ?? []).length).toBe(1);
  });

  it("every fixture asset uses a distinct, decodable inline svg URI", () => {
    const uris = Object.values(FIXTURE_ASSETS).map((asset) => asset.uri);
    expect(new Set(uris).size).toBe(uris.length);
    for (const uri of uris) {
      expect(uri.startsWith(SVG_DATA_PREFIX)).toBe(true);
      expect(decodeURIComponent(uri.slice(SVG_DATA_PREFIX.length))).toContain("</svg>");
    }
  });
});
