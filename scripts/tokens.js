// Shared DTCG token loading, validation and CSS generation for Kumiki UI.
// Kept dependency-free so it can run in CI and on a clean checkout.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALIAS_RE = /^\{([^{}]+)\}$/;

/** Absolute path to the repository root (this file lives in <root>/scripts). */
export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Read and JSON-parsed the canonical token file. */
export function loadTokens(file) {
  const raw = fs.readFileSync(file, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Token file is not valid JSON (${file}): ${error.message}`);
  }
}

/** Dotted-path lookup used to resolve DTCG aliases such as {foundation.color.neutral.0}. */
function getByPath(root, dotted) {
  return dotted.split(".").reduce((node, key) => {
    if (node == null || typeof node !== "object" || !(key in node)) {
      throw new Error(`Unresolvable token alias: {${dotted}}`);
    }
    return node[key];
  }, root);
}

/** Collect every { "$value": ... } leaf with its dotted path. */
function collectLeaves(node, prefix, out) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && "$value" in value) {
      out.push({ path: next, token: value });
    } else if (value && typeof value === "object") {
      collectLeaves(value, next, out);
    }
  }
  return out;
}

/** Format a single DTCG leaf value as a CSS value string. */
function formatValue(token, root) {
  const { $value } = token;

  if (typeof $value === "string") {
    const match = ALIAS_RE.exec($value.trim());
    if (match) {
      const target = getByPath(root, match[1]);
      if (!target || typeof target !== "object" || !("$value" in target)) {
        throw new Error(`Alias {${match[1]}} does not point at a token`);
      }
      return formatValue(target, root);
    }
    return $value;
  }

  if ($value && typeof $value === "object") {
    if ("components" in $value) {
      const components = $value.components;
      if (!Array.isArray(components) || components.length < 3) {
        throw new Error("Color token components must be an array of at least 3 numbers");
      }
      const [r, g, b] = components.slice(0, 3).map((c) => Math.round(Number(c) * 255));
      const alpha = $value.alpha;
      return alpha == null || alpha === 1
        ? `rgb(${r} ${g} ${b})`
        : `rgb(${r} ${g} ${b} / ${alpha})`;
    }
    if ("value" in $value && "unit" in $value) {
      return `${$value.value}${$value.unit}`;
    }
    if ("value" in $value) {
      return String($value.value);
    }
  }

  if (typeof $value === "number" || typeof $value === "boolean") {
    return String($value);
  }

  throw new Error("Unsupported token value shape");
}

/** Resolve a subtree into a map of cssVariableName -> cssValue. */
function resolveGroup(root, group, options = {}) {
  const { stripPrefix = "", varPrefix = "--km-", rename = {} } = options;
  const map = new Map();
  for (const { path: dotted, token } of collectLeaves(group, "", [])) {
    let local = dotted;
    if (stripPrefix && local.startsWith(stripPrefix + ".")) {
      local = local.slice(stripPrefix.length + 1);
    }
    const name = rename[local] ?? local;
    const cssVar = `${varPrefix}${name.split(".").join("-")}`;
    map.set(cssVar, formatValue(token, root));
  }
  return map;
}

function componentToHex(components) {
  const [r, g, b] = components.slice(0, 3).map((c) => Math.round(Number(c) * 255));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Verify that every color token's hex value matches its components. */
function validateColorHex(tokens, errors) {
  function walk(node, prefix) {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith("$")) continue;
      const next = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && "$value" in value) {
        if (value.$type === "color") {
          const v = value.$value;
          if (v && typeof v === "object" && "components" in v && "hex" in v) {
            const expected = componentToHex(v.components);
            const actual = v.hex.toLowerCase();
            if (actual !== expected) {
              errors.push(
                `color token "${next}" hex ${actual} does not match components ${expected}`
              );
            }
          }
        }
      } else if (value && typeof value === "object") {
        walk(value, next);
      }
    }
  }
  walk(tokens, "");
}

/** Validate the token document shape. Throws with a descriptive message. */
export function validateTokens(tokens) {
  const errors = [];
  if (!tokens || typeof tokens !== "object") {
    throw new Error("Token document must be an object");
  }
  if (!tokens.foundation) errors.push("missing `foundation` group");
  if (!tokens.semantic || !tokens.semantic.light || !tokens.semantic.dark) {
    errors.push("`semantic` must contain both `light` and `dark` groups");
  }
  if (!tokens.density) errors.push("missing `density` group");

  if (tokens.semantic?.light && tokens.semantic?.dark) {
    const lightKeys = new Set(
      collectLeaves(tokens.semantic.light, "", []).map((l) => l.path)
    );
    for (const { path: dotted } of collectLeaves(tokens.semantic.dark, "", [])) {
      if (!lightKeys.has(dotted)) {
        errors.push(`semantic.dark defines "${dotted}" which is missing from semantic.light`);
      }
    }
  }

  // Ensure every alias resolves.
  try {
    for (const group of [
      tokens.foundation,
      tokens.semantic?.light,
      tokens.semantic?.dark,
      tokens.component,
      tokens.density,
    ]) {
      if (group) resolveGroup(tokens, group);
    }
  } catch (error) {
    errors.push(error.message);
  }

  validateColorHex(tokens, errors);

  if (errors.length) {
    throw new Error(`Token validation failed:\n  - ${errors.join("\n  - ")}`);
  }
  return true;
}

const DENSITY_VARS = {
  spacing: "--spacing",
  "control.height": "--km-control-height",
  "control.space-x": "--km-control-space-x",
  "control.font": "--km-control-font",
};

const HEADER = `/* AUTO-GENERATED by scripts/tokens-build.js from foundations/tokens/kumiki.tokens.json.\n   Do not edit by hand — edit the DTCG source and run \`npm run tokens:build\`. */\n`;

function renderBlock(selector, map) {
  const lines = [...map.entries()].map(([name, value]) => `  ${name}: ${value};`);
  return `${selector} {\n${lines.join("\n")}\n}`;
}

/** Produce the resolved CSS custom-property stylesheet. */
export function tokensToCss(tokens) {
  validateTokens(tokens);

  const foundation = resolveGroup(tokens, tokens.foundation);
  const light = resolveGroup(tokens, tokens.semantic.light);
  const dark = resolveGroup(tokens, tokens.semantic.dark);
  const component = resolveGroup(tokens, tokens.component);

  const blocks = [
    renderBlock(":root", new Map([...foundation, ...component, ...light])),
    renderBlock('[data-km-appearance="light"]', light),
    renderBlock('[data-km-appearance="dark"]', dark),
  ];

  for (const [name, group] of Object.entries(tokens.density)) {
    if (name === "comfortable") continue; // comfortable is the :root default
    const map = new Map();
    for (const { path: dotted, token } of collectLeaves(group, "", [])) {
      const cssVar = DENSITY_VARS[dotted];
      if (!cssVar) throw new Error(`Unknown density token "${dotted}"`);
      map.set(cssVar, formatValue(token, tokens));
    }
    blocks.push(renderBlock(`[data-km-density="${name}"]`, map));
  }

  return `${HEADER}\n${blocks.join("\n\n")}\n`;
}

export const tokenFile = path.join(repoRoot, "foundations/tokens/kumiki.tokens.json");
