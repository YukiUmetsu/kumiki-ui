// Regenerate src/styles/tokens.css from the canonical DTCG token source.
import fs from "node:fs";
import path from "node:path";
import { loadTokens, tokensToCss, tokenFile, repoRoot } from "./tokens.js";

const outFile = path.join(repoRoot, "src/styles/tokens.css");

try {
  const tokens = loadTokens(tokenFile);
  const css = tokensToCss(tokens);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, css, "utf8");
  const variables = css.match(/--km-[\w-]+:/g)?.length ?? 0;
  console.log(`tokens:build OK — wrote ${path.relative(repoRoot, outFile)} (${variables} custom properties).`);
} catch (error) {
  console.error(`tokens:build FAILED — ${error.message}`);
  process.exit(1);
}
