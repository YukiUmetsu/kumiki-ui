// Dependency-free WCAG 2.x contrast regression guard for Kumiki UI themes.
//
// Runs the real token pipeline (loadTokens -> validateTokens -> tokensToCss) for
// the canonical theme and every examples/themes/*.tokens.json, then computes
// contrast ratios from the RESOLVED CSS custom properties for BOTH the light
// and dark appearance blocks. Nothing is sampled from the source palette: the
// ratios come from exactly what components would receive at runtime.
//
// Usage:
//   node scripts/contrast-audit.js                       # canonical + examples
//   node scripts/contrast-audit.js --only=<file>         # a single token file
//
// Exits non-zero (and lists every offending pair with both colours and the
// measured ratio) if ANY pair misses its target.
import fs from "node:fs";
import path from "node:path";
import { loadTokens, validateTokens, tokensToCss, tokenFile, repoRoot } from "./tokens.js";

const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3;

/**
 * Pairs that must reach the WCAG 1.4.3 normal-text target.
 *
 * Every pair is a text/surface combination the components actually produce.
 * `text.inverse` is deliberately not paired with `action.*`: no v0.1 component
 * places that role on a filled action and there is no inverse-surface role yet,
 * so there is no realisable pair to enforce.
 */
const TEXT_PAIRS = [
  ["text.primary", "surface.canvas"],
  ["text.primary", "surface.default"],
  ["text.muted", "surface.canvas"],
  ["text.muted", "surface.default"],
  ["text.muted", "surface.subtle"],
  ["text.danger", "surface.default"],
  // Status text is rendered on the subtle surface by status badges, chips and
  // inline summaries; `surface.subtle` is the lightest neutral the light theme
  // paints, so it is the worst case for this pair. The broader `status.*` roles
  // cannot be enforced yet: the example themes in examples/themes do not define
  // the `status` group at all, so those variables resolve to nothing there.
  ["text.danger", "surface.subtle"],
  ["action.primary-fg", "action.primary"],
  ["action.secondary-fg", "action.secondary"],
  ["action.subtle-fg", "action.subtle"],
  ["action.destructive-fg", "action.destructive"],
  ["action.checked-fg", "action.checked"],
];

/**
 * Pairs that must reach the WCAG 1.4.11 non-text target.
 *
 * 1.4.11 covers the visual information required to *identify* a control and its
 * states: the form-control / outline-button boundary (`border.strong`, rendered
 * through `--color-input`) and the `focus.ring`.
 */
const NON_TEXT_PAIRS = [
  ["border.strong", "surface.default"],
  ["border.strong", "surface.canvas"],
  ["focus.ring", "surface.canvas"],
  ["focus.ring", "surface.default"],
];

/**
 * Measured and printed for transparency, but NOT enforced.
 *
 * `border.subtle` is the decorative divider/panel token (`--color-border`:
 * section panels and the dialog panel, which also carry a shadow/overlay). WCAG
 * 1.4.11 exempts purely decorative boundaries, and in the canonical scale
 * `border.subtle` is intentionally lighter than `border.strong`; requiring a
 * 3:1 floor here would collapse the two roles into one value.
 * `text.inverse` has no component pairing in v0.1 (see TEXT_PAIRS).
 */
const DECORATIVE_PAIRS = [
  ["border.subtle", "surface.default"],
  ["text.inverse", "action.primary"],
];

const PAIRS = [
  ...TEXT_PAIRS.map(([fg, bg]) => ({ fg, bg, min: TEXT_MIN, required: true })),
  ...NON_TEXT_PAIRS.map(([fg, bg]) => ({ fg, bg, min: NON_TEXT_MIN, required: true })),
  ...DECORATIVE_PAIRS.map(([fg, bg]) => ({ fg, bg, min: null, required: false })),
];

function cssVar(tokenPath) {
  return `--km-${tokenPath.split(".").join("-")}`;
}

/** Parse the `rgb(r g b)` / `rgb(r g b / a)` output of the token pipeline (hex tolerated). */
function parseColor(value) {
  const text = value.trim();
  const rgb = text.match(/^rgb\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)$/);
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }
  const hex = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1].split("").map((c) => c + c).join("")
        : hex[1];
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: 1,
    };
  }
  throw new Error(`Unsupported colour value: ${value}`);
}

/** Alpha-composite a (possibly translucent) foreground over an opaque backdrop. */
function composite(foreground, background) {
  const a = foreground.a;
  return {
    r: foreground.r * a + background.r * (1 - a),
    g: foreground.g * a + background.g * (1 - a),
    b: foreground.b * a + background.b * (1 - a),
    a: 1,
  };
}

function relativeLuminance({ r, g, b }) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(foreground, background) {
  const fg = foreground.a < 1 ? composite(foreground, background) : foreground;
  const fgLum = relativeLuminance(fg);
  const bgLum = relativeLuminance(background);
  return (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
}

/** Extract the resolved custom properties of the light and dark appearance blocks. */
function appearanceBlocks(css) {
  const blocks = {};
  for (const appearance of ["light", "dark"]) {
    const match = css.match(
      new RegExp(`\\[data-km-appearance="${appearance}"\\]\\s*\\{([^}]*)\\}`)
    );
    if (!match) {
      throw new Error(`Generated CSS has no "${appearance}" appearance block`);
    }
    const map = new Map();
    for (const declaration of match[1].split(";")) {
      const entry = declaration.match(/--km-([\w-]+)\s*:\s*(.+)/);
      if (entry) map.set(`--km-${entry[1]}`, entry[2].trim());
    }
    blocks[appearance] = map;
  }
  return blocks;
}

function discoverThemes(only) {
  if (only) {
    const file = path.isAbsolute(only) ? only : path.resolve(process.cwd(), only);
    return [{ label: path.basename(file).replace(/\.tokens\.json$/, ""), file }];
  }
  const themes = [{ label: "kumiki (canonical)", file: tokenFile }];
  const dir = path.join(repoRoot, "examples/themes");
  if (fs.existsSync(dir)) {
    const names = fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".tokens.json"))
      .sort();
    for (const name of names) {
      themes.push({
        label: name.replace(/\.tokens\.json$/, ""),
        file: path.join(dir, name),
      });
    }
  }
  return themes;
}

try {
  const onlyArg = process.argv.slice(2).find((arg) => arg.startsWith("--only="));
  const only = onlyArg ? onlyArg.slice("--only=".length) : undefined;
  const themes = discoverThemes(only);

  const failures = [];
  for (const theme of themes) {
    const tokens = loadTokens(theme.file);
    validateTokens(tokens);
    const blocks = appearanceBlocks(tokensToCss(tokens));

    console.log(
      `\nTheme: ${theme.label} — ${path.relative(repoRoot, theme.file)}`
    );
    for (const appearance of ["light", "dark"]) {
      const block = blocks[appearance];
      for (const pair of PAIRS) {
        const fgName = cssVar(pair.fg);
        const bgName = cssVar(pair.bg);
        const fgRaw = block.get(fgName);
        const bgRaw = block.get(bgName);
        const where = `[${theme.label} · ${appearance}] ${pair.fg} on ${pair.bg}`;

        if (!fgRaw || !bgRaw) {
          // A missing token is a real defect regardless of the pair's role:
          // consumers cannot resolve a variable that does not exist.
          failures.push({
            where,
            detail: `missing token (${!fgRaw ? fgName : bgName})`,
            min: pair.min ?? NON_TEXT_MIN,
          });
          console.log(`  ${appearance.padEnd(5)} ${pair.fg} on ${pair.bg}  —  MISSING  FAIL`);
          continue;
        }

        const ratio = contrastRatio(parseColor(fgRaw), parseColor(bgRaw));
        if (!pair.required) {
          console.log(
            `  ${appearance.padEnd(5)} ${pair.fg} on ${pair.bg}  ${ratio
              .toFixed(2)
              .padStart(6)}:1  (info — decorative, not enforced)`
          );
          continue;
        }
        const ok = ratio >= pair.min;
        console.log(
          `  ${appearance.padEnd(5)} ${pair.fg} on ${pair.bg}  ${ratio
            .toFixed(2)
            .padStart(6)}:1  (≥${pair.min})  ${ok ? "OK" : "FAIL"}`
        );
        if (!ok) {
          failures.push({
            where,
            detail: `fg ${fgRaw}, bg ${bgRaw}`,
            ratio,
            min: pair.min,
          });
        }
      }
    }
  }

  if (failures.length > 0) {
    console.error(
      `\ncontrast:audit FAILED — ${failures.length} pair(s) below target:`
    );
    for (const failure of failures) {
      const measured =
        failure.ratio === undefined
          ? failure.detail
          : `${failure.detail} = ${failure.ratio.toFixed(3)}:1`;
      console.error(`  - ${failure.where} — ${measured} (needs ≥${failure.min})`);
    }
    process.exit(1);
  }

  const requiredCount = TEXT_PAIRS.length + NON_TEXT_PAIRS.length;
  console.log(
    `\ncontrast:audit OK — ${requiredCount} enforced pair(s) (+${DECORATIVE_PAIRS.length} informational), ${themes.length} theme(s)`
  );
} catch (error) {
  console.error(`contrast:audit FAILED — ${error.message}`);
  process.exit(1);
}
