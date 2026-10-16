import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../src/ui/button";

interface TokensModule {
  loadTokens: (file: string) => unknown;
  validateTokens: (tokens: unknown) => boolean;
  tokensToCss: (tokens: unknown) => string;
}

/**
 * `scripts/tokens.js` is plain ESM shipped without type declarations, so it is
 * imported lazily through a non-literal specifier. Vitest resolves it through
 * the real Vite module graph; keeping the specifier dynamic also avoids
 * duplicating the pipeline types here.
 */
async function tokensPipeline(): Promise<TokensModule> {
  const specifier = "../scripts/tokens.js";
  return (await import(specifier)) as TokensModule;
}

/**
 * The suite runs under Vitest's jsdom environment, where `import.meta.url` is
 * not a `file:` URL, so `fileURLToPath` cannot resolve fixture paths. The test
 * script is always invoked from the repository root (`npm test`), which is also
 * Vite's root, so anchor the fixture paths there.
 */
const repoRoot = process.cwd();
const registryUiDir = path.join(repoRoot, "registry", "ui");
const canonicalFile = path.join(repoRoot, "foundations", "tokens", "kumiki.tokens.json");
const anonymousFile = path.join(repoRoot, "examples", "themes", "anonymous-b.tokens.json");

/** A single token-bridge bypass the registry sources must never contain. */
interface TokenRule {
  /** Human-readable description of the bypass, used in failure output. */
  label: string;
  /** Pattern matched against every source line. Must not be a global regex. */
  pattern: RegExp;
}

/**
 * Any colour that would bypass the semantic token bridge: hex, CSS colour
 * functions, or a Tailwind named-colour utility/step (e.g. `text-white`,
 * `bg-red-500`). `whitespace-nowrap` is intentionally not a match because the
 * pattern is anchored on whole words.
 */
const RAW_COLOR_RULE: TokenRule = {
  label: "raw colour literal",
  pattern:
    /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch|color-mix)\s*\(|\b(?:black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|cyan|magenta|lime|navy|teal|olive|maroon|silver|gold|beige|ivory|khaki|coral|salmon|tan|violet|indigo|aqua|fuchsia)\b/,
};

/**
 * Utilities that leave the token scale for a raw or arbitrary value. The
 * token-backed tiers (`shadow-xs|sm|md|lg`, `rounded-sm|md|lg|xl|full`, the
 * `text-xs|sm|base|lg|xl|2xl|3xl` scale) are the supported alternatives, so
 * only the bypasses that silently reintroduce magic numbers are flagged.
 */
const OFF_TOKEN_SCALE_RULES: TokenRule[] = [
  {
    label: "un-tokenized elevation (use shadow-xs|sm|md|lg)",
    pattern: /\bshadow-(?:xl|2xl)\b/,
  },
  {
    label: "arbitrary radius (use the rounded-* token scale)",
    pattern: /\brounded-[a-z0-9]*-?\[/,
  },
  {
    label: "arbitrary font size (use text-xs|sm|base|lg|xl|2xl|3xl)",
    pattern: /\btext-\[length:/,
  },
];

/**
 * Scan every `registry/ui/*.{tsx,ts,css}` source for lines matching any of the
 * given token rules. Defaults to the raw-colour rule so existing callers keep
 * their behaviour. Each offence is reported as `file:line: label: content`.
 */
function scanRegistryUi(rules: TokenRule[] = [RAW_COLOR_RULE]): string[] {
  const offences: string[] = [];
  const root = path.resolve(registryUiDir, "../..");
  for (const name of fs.readdirSync(registryUiDir).sort()) {
    if (!/\.(tsx?|css)$/.test(name)) continue;
    const file = path.join(registryUiDir, name);
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      const rule = rules.find((candidate) => candidate.pattern.test(line));
      if (rule) {
        offences.push(`${path.relative(root, file)}:${index + 1}: ${rule.label}: ${line.trim()}`);
      }
    });
  }
  return offences;
}

function varInBlock(
  css: string,
  appearance: "light" | "dark",
  name: string
): string | undefined {
  const block = css.match(
    new RegExp(`\\[data-km-appearance="${appearance}"\\]\\s*\\{([^}]*)\\}`)
  );
  if (!block) return undefined;
  const declaration = block[1].match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return declaration ? declaration[1].trim() : undefined;
}

describe("theme token pipeline", () => {
  it("keeps registry component sources free of hardcoded colours", () => {
    expect(scanRegistryUi()).toEqual([]);
  });

  it("keeps registry component sources on the token scale", () => {
    const offences = scanRegistryUi(OFF_TOKEN_SCALE_RULES);
    expect(
      offences,
      [
        "Registry sources must not bypass the token scale. Replace each offending",
        "utility with its token-backed equivalent:",
        "  shadow-xl / shadow-2xl        -> shadow-xs | shadow-sm | shadow-md | shadow-lg",
        "  rounded-[...] / rounded-t-[...] -> rounded-sm | rounded-md | rounded-lg | rounded-xl | rounded-full",
        "  text-[length:...]            -> text-xs | text-sm | text-base | text-lg | text-xl | text-2xl | text-3xl",
        "",
        ...offences,
      ].join("\n")
    ).toEqual([]);
  });

  it("compiles the anonymous theme with distinct semantic values in both appearances", async () => {
    const { loadTokens, validateTokens, tokensToCss } = await tokensPipeline();

    const anonymousTokens = loadTokens(anonymousFile);
    expect(validateTokens(anonymousTokens)).toBe(true);
    const anonymousCss = tokensToCss(anonymousTokens);
    const canonicalCss = tokensToCss(loadTokens(canonicalFile));

    const required = ["--km-action-primary", "--km-text-danger", "--km-border-strong"];
    for (const appearance of ["light", "dark"] as const) {
      for (const name of required) {
        expect(
          varInBlock(anonymousCss, appearance, name),
          `${appearance} block should declare ${name}`
        ).toBeTruthy();
      }
    }

    for (const appearance of ["light", "dark"] as const) {
      expect(
        varInBlock(anonymousCss, appearance, "--km-action-primary"),
        `${appearance} action colour must differ from the canonical theme`
      ).not.toBe(varInBlock(canonicalCss, appearance, "--km-action-primary"));
    }
  });

  it("renders Button through the token bridge without a raw colour", () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole("button", { name: "Primary" });

    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("text-primary-foreground");
    expect(button.className).not.toMatch(RAW_COLOR_RULE.pattern);
  });
});
