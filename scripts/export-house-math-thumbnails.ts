/**
 * Deterministic SVG artboard export used to review the three House Math examples
 * without browser, screenshot recognition or external image URLs.
 *
 * Bundle with the existing esbuild binary and dataurl loaders (see docs).
 * This file is example-only and never included in the generic media registry.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { documentToSvg } from "../registry/media/svg-export";
import { inspectThumbnail } from "../registry/media/thumbnail-preflight";
import { editorialShowcaseCases } from "../src/media/thumbnail-editorial-fixtures";
import antonFont from "../src/media/thumbnail-examples/Anton-Regular.ttf?inline";

const fontCss = `@font-face { font-family: "Anton"; src: url("${antonFont}") format("truetype"); font-style: normal; font-weight: 400; }`;

const outputDirectory = process.argv[2] ?? "/tmp/kumiki-house-math-thumbnails";
await mkdir(outputDirectory, { recursive: true });
for (const entry of editorialShowcaseCases) {
  const exported = documentToSvg(entry.result.document, {
    fontCss,
    attributes: { "xmlns:xlink": "http://www.w3.org/1999/xlink" },
    resolveAssetHref: (_assetId, uri) => uri,
  });
  const svgPath = join(outputDirectory, `${entry.id}.svg`);
  await writeFile(svgPath, exported.svg, "utf8");
  // documentToSvg already ran export preflight with the inlining resolver.
  // inspectThumbnail calls its own resolver-free export preflight, whose
  // asset-not-inlined warnings would be false positives for this SVG.
  const thumbnailIssues = inspectThumbnail(entry.result, entry.inspection)
    .filter((issue) => issue.code.startsWith("thumbnail-"));
  const diagnostics = [...exported.diagnostics, ...thumbnailIssues];
  await writeFile(join(outputDirectory, `${entry.id}.diagnostics.json`),
    JSON.stringify(diagnostics, null, 2), "utf8");
  process.stdout.write(`${svgPath} — ${exported.svg.length} chars, ` +
    `${diagnostics.filter((item) => item.severity === "error").length} error(s)\n`);
}
