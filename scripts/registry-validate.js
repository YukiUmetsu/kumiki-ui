// Validate registry.json against the repository.
import { loadManifest, validateManifest, repoRoot } from "./registry-lib.js";
import path from "node:path";

try {
  const manifest = loadManifest();
  const { errors, warnings } = validateManifest(manifest);
  for (const warning of warnings) console.warn(`registry:validate warning — ${warning}`);
  if (errors.length) {
    console.error(
      `registry:validate FAILED — ${errors.length} problem(s) in ${path.relative(repoRoot, "registry.json")}:\n  - ${errors.join("\n  - ")}`
    );
    process.exit(1);
  }
  console.log(`registry:validate OK — ${manifest.items.length} item(s) valid.`);
} catch (error) {
  console.error(`registry:validate FAILED — ${error.message}`);
  process.exit(1);
}
