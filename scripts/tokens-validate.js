// Validate the canonical DTCG token source without writing any output.
import { loadTokens, validateTokens, tokenFile, repoRoot } from "./tokens.js";
import path from "node:path";

try {
  const tokens = loadTokens(tokenFile);
  validateTokens(tokens);
  console.log(`tokens:validate OK — ${path.relative(repoRoot, tokenFile)} is valid.`);
} catch (error) {
  console.error(`tokens:validate FAILED — ${error.message}`);
  process.exit(1);
}
