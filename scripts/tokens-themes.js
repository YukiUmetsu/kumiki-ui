// Validate and compile every example theme through the real token pipeline.
//
// Each file in examples/themes/*.tokens.json must satisfy the same DTCG shape
// the canonical theme uses (foundation + semantic.light + semantic.dark +
// density) and must survive `tokensToCss` unchanged. Dependency-free so it can
// run in CI on a clean checkout.
import fs from "node:fs";
import path from "node:path";
import { loadTokens, validateTokens, tokensToCss, repoRoot } from "./tokens.js";

const themesDir = path.join(repoRoot, "examples/themes");

function themeFiles() {
  if (!fs.existsSync(themesDir)) return [];
  return fs
    .readdirSync(themesDir)
    .filter((name) => name.endsWith(".tokens.json"))
    .sort()
    .map((name) => path.join(themesDir, name));
}

try {
  const files = themeFiles();
  for (const file of files) {
    const tokens = loadTokens(file);
    validateTokens(tokens);
    const css = tokensToCss(tokens);
    const variables = css.match(/--km-[\w-]+:/g)?.length ?? 0;
    console.log(
      `  - ${path.relative(repoRoot, file)} (${variables} custom properties)`
    );
  }
  console.log(`tokens:themes OK — ${files.length} theme(s)`);
} catch (error) {
  console.error(`tokens:themes FAILED — ${error.message}`);
  process.exit(1);
}
