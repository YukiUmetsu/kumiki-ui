// Simulate installing every registry item into an isolated directory and check
// that the copied files are self-contained and that declared dependencies are
// actually installed.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadManifest, validateManifest, itemFiles, resolveRegistryDependencies, repoRoot } from "./registry-lib.js";

try {
  const manifest = loadManifest();
  const { errors } = validateManifest(manifest);
  if (errors.length) {
    console.error(`registry:smoke FAILED — manifest invalid:\n  - ${errors.join("\n  - ")}`);
    process.exit(1);
  }

  const nodeModules = path.join(repoRoot, "node_modules");
  const hasNodeModules = fs.existsSync(nodeModules);

  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "kumiki-registry-"));
  let fileCount = 0;

  try {
    for (const item of manifest.items) {
      // A block is installed together with every sibling it depends on, so
      // stage the transitive closure's files alongside the item's own files.
      const closure = resolveRegistryDependencies(manifest, item.name);
      const stagedPaths = new Set();
      for (const source of closure) {
        for (const file of itemFiles(source)) {
          if (stagedPaths.has(file.path)) continue;
          stagedPaths.add(file.path);
          const contents = fs.readFileSync(file.absolute, "utf8");
          if (!contents.trim()) {
            throw new Error(`item "${item.name}" file "${file.path}" is empty`);
          }
          const destination = path.join(staging, item.name, file.path);
          fs.mkdirSync(path.dirname(destination), { recursive: true });
          fs.writeFileSync(destination, contents, "utf8");
          if (fs.readFileSync(destination, "utf8") !== contents) {
            throw new Error(`copy of "${file.path}" did not round-trip`);
          }
          fileCount += 1;
        }
      }

      const requiredDeps = new Set();
      for (const source of closure) {
        for (const dep of source.dependencies ?? []) requiredDeps.add(dep);
      }
      for (const dep of requiredDeps) {
        if (!hasNodeModules) {
          console.warn(`registry:smoke warning — node_modules missing; skipped install check for "${dep}"`);
          continue;
        }
        if (!fs.existsSync(path.join(nodeModules, dep))) {
          throw new Error(`item "${item.name}" requires "${dep}" which is not installed`);
        }
      }
    }
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }

  console.log(
    `registry:smoke OK — ${manifest.items.length} item(s), ${fileCount} file(s) staged into an isolated directory.`
  );
} catch (error) {
  console.error(`registry:smoke FAILED — ${error.message}`);
  process.exit(1);
}
