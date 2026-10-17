// Shared registry manifest helpers for the validate/smoke scripts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Item (and per-file) types this registry accepts. */
export const ITEM_TYPES = ["registry:ui", "registry:block"];

/** shadcn-style namespaced specifier, e.g. "@shadcn/button". */
const NAMESPACED = /^@[a-z0-9][a-z0-9-]*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Classify a single `registryDependencies` entry without touching the network:
 * - "sibling": bare kebab-case name resolved against the manifest's items
 * - "external": URL or `@scope/name` specifier, validated for shape only
 * - "invalid": malformed entry
 */
export function classifyRegistryDependency(entry) {
  if (typeof entry !== "string" || entry.length === 0) return "invalid";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(entry)) {
    try {
      new URL(entry);
      return "external";
    } catch {
      return "invalid";
    }
  }
  if (entry.startsWith("@")) return NAMESPACED.test(entry) ? "external" : "invalid";
  if (KEBAB.test(entry)) return "sibling";
  return "invalid";
}

/**
 * Resolve `registryDependencies` to sibling items transitively. Returns the
 * closure in dependency-first order (a dependency is listed before the item
 * that requires it) with cycles and duplicates removed. Non-string entries and
 * external specifiers are ignored here; validateManifest reports those.
 */
export function resolveRegistryDependencies(manifest, names) {
  const items = Array.isArray(manifest?.items) ? manifest.items : [];
  const byName = new Map(items.map((item) => [item?.name, item]));
  const requested = Array.isArray(names) ? names : [names];
  const ordered = [];
  const visiting = new Set();
  const visited = new Set();

  const visit = (name) => {
    if (visited.has(name) || visiting.has(name)) return;
    const item = byName.get(name);
    if (!item) return;
    visiting.add(name);
    for (const entry of item.registryDependencies ?? []) {
      if (typeof entry === "string" && byName.has(entry)) visit(entry);
    }
    visiting.delete(name);
    visited.add(name);
    ordered.push(item);
  };

  for (const name of requested) visit(name);
  return ordered;
}

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
  const itemNames = new Set(
    manifest.items.map((item) => item?.name).filter((name) => typeof name === "string")
  );
  for (const item of manifest.items) {
    const id = item?.name ?? "<unnamed>";
    if (!item?.name || !KEBAB.test(item.name)) {
      errors.push(`item "${id}" must have a kebab-case \`name\``);
    }
    if (seen.has(item?.name)) errors.push(`duplicate item name "${item?.name}"`);
    seen.add(item?.name);

    if (!ITEM_TYPES.includes(item?.type)) {
      errors.push(`item "${id}" must declare \`type: "registry:ui"\` or \`type: "registry:block"\``);
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
      if (file.type !== undefined && !ITEM_TYPES.includes(file.type)) {
        errors.push(
          `item "${id}" file "${file.path}" must declare \`type: "registry:ui"\` or \`type: "registry:block"\``
        );
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

    if (item?.registryDependencies !== undefined) {
      if (!Array.isArray(item.registryDependencies)) {
        errors.push(`item "${id}" \`registryDependencies\` must be an array of strings`);
      } else {
        for (const entry of item.registryDependencies) {
          const kind = classifyRegistryDependency(entry);
          if (kind === "sibling") {
            if (!itemNames.has(entry)) {
              errors.push(
                `item "${id}" declares registryDependencies "${entry}" which is not a sibling item name (use a URL or @scope/name for external items)`
              );
            }
          } else if (kind === "invalid") {
            errors.push(
              `item "${id}" declares malformed registryDependencies entry ${JSON.stringify(entry)} (expected a sibling name, a URL, or @scope/name)`
            );
          }
        }
      }
    }
  }

  return { errors, warnings };
}
