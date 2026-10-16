// Shared registry manifest helpers for the validate/smoke scripts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function manifestPath() {
  return path.join(repoRoot, "registry.json");
}

export function loadManifest() {
  const file = manifestPath();
  const raw = fs.readFileSync(file, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`registry.json is not valid JSON: ${error.message}`);
  }
}

export function loadPackageJson() {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
}

/** Resolve every file entry of an item to absolute paths. */
export function itemFiles(item) {
  const files = Array.isArray(item.files) ? item.files : [];
  return files.map((entry) => ({
    ...entry,
    absolute: path.join(repoRoot, entry.path),
  }));
}

/**
 * Validate the manifest shape and cross-check declarations against the
 * repository. Returns { errors, warnings }.
 */
export function validateManifest(manifest) {
  const errors = [];
  const warnings = [];

  if (typeof manifest !== "object" || manifest === null) {
    return { errors: ["registry.json must contain an object"], warnings };
  }
  if (!manifest.name || typeof manifest.name !== "string") {
    errors.push("missing `name`");
  }
  if (!Array.isArray(manifest.items) || manifest.items.length === 0) {
    errors.push("`items` must be a non-empty array");
    return { errors, warnings };
  }

  const pkg = loadPackageJson();
  const declared = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);

  const seen = new Set();
  for (const item of manifest.items) {
    const id = item?.name ?? "<unnamed>";
    if (!item?.name || !KEBAB.test(item.name)) {
      errors.push(`item "${id}" must have a kebab-case \`name\``);
    }
    if (seen.has(item?.name)) errors.push(`duplicate item name "${item?.name}"`);
    seen.add(item?.name);

    if (item?.type !== "registry:ui") {
      errors.push(`item "${id}" must declare \`type: "registry:ui"\``);
    }
    if (!Array.isArray(item?.files) || item.files.length === 0) {
      errors.push(`item "${id}" must declare at least one file`);
      continue;
    }
    for (const file of itemFiles(item)) {
      if (!file.path || !file.target) {
        errors.push(`item "${id}" has a file missing \`path\` or \`target\``);
        continue;
      }
      if (path.isAbsolute(file.path) || file.path.includes("..")) {
        errors.push(`item "${id}" file path "${file.path}" must be repo-relative without ".."`);
      }
      if (!fs.existsSync(file.absolute)) {
        errors.push(`item "${id}" references missing file "${file.path}"`);
      }
      const contents = fs.existsSync(file.absolute) ? fs.readFileSync(file.absolute, "utf8") : "";
      if (/from\s+["'][^"']*(?:\/src\/|\.\.\/\.\.\/src)/.test(contents)) {
        errors.push(`item "${id}" file "${file.path}" imports from the private src/ workspace`);
      }
    }

    const deps = Array.isArray(item?.dependencies) ? item.dependencies : [];
    for (const dep of deps) {
      if (!declared.has(dep)) {
        errors.push(`item "${id}" declares dependency "${dep}" that is not in package.json`);
      }
    }
    for (const dep of ["class-variance-authority", "@base-ui/react"]) {
      const usesDep = itemFiles(item).some(
        (file) => fs.existsSync(file.absolute) && fs.readFileSync(file.absolute, "utf8").includes(`"${dep}"`)
      );
      if (usesDep && !deps.includes(dep)) {
        errors.push(`item "${id}" uses "${dep}" but does not declare it in \`dependencies\``);
      }
    }
  }

  return { errors, warnings };
}
