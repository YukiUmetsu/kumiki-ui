#!/usr/bin/env node
/**
 * Fail fast on malformed TSX or missing local imports in video Storybook modules.
 * Vite commonly surfaces a syntax/resolve error only as:
 * "Failed to fetch dynamically imported module: <story>.stories.tsx".
 * TypeScript's parser provides a precise source location before Storybook starts.
 */
import ts from "typescript";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, extname, relative } from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_PATHS = [
  "src/components/video",
  "registry/video",
  "registry/character",
  "registry/craft",
  ".storybook",
];

function sourceFiles(root, directories) {
  const paths = [];
  for (const directory of directories) {
    const start = resolve(root, directory);
    if (!existsSync(start)) continue;
    const pending = [start];
    while (pending.length) {
      const current = pending.pop();
      for (const item of readdirSync(current, { withFileTypes: true })) {
        if (item.name === "node_modules" || item.name === "dist") continue;
        const path = resolve(current, item.name);
        if (item.isDirectory()) pending.push(path);
        else if (item.isFile() && /\.[cm]?[jt]sx?$/.test(item.name)) paths.push(path);
      }
    }
  }
  return paths.sort();
}
function localImportExists(from, name) {
  const cleaned = name.split(/[?#]/, 1)[0];
  const base = resolve(dirname(from), cleaned);
  const candidates = [base];
  if (/\.[cm]?jsx?$/.test(base)) {
    const stem = base.replace(/\.[cm]?jsx?$/, "");
    candidates.push(stem + ".ts", stem + ".tsx", stem + ".mts");
  }
  for (const suffix of [".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs", ".json", ".css",
    ".svg", ".png", ".webp", ".mdx", "/index.ts", "/index.tsx", "/index.js"]) {
    candidates.push(base + suffix);
  }
  return candidates.some(p => existsSync(p) && statSync(p).isFile());
}

/** Root paths can be overridden by tests without involving the real repository. */
export function reviewStorybookSyntax(root = process.cwd(), paths = DEFAULT_PATHS) {
  const issues = [];
  const files = sourceFiles(root, paths);
  for (const path of files) {
    const kind = path.endsWith(".tsx") || path.endsWith(".jsx")
      ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const source = ts.createSourceFile(path, readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest, true, kind);
    for (const diagnostic of source.parseDiagnostics) {
      const location = source.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      issues.push({
        file: relative(root, path), line: location.line + 1,
        column: location.character + 1, message,
      });
    }
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
      const moduleSpecifier = statement.moduleSpecifier;
      if (!moduleSpecifier || !ts.isStringLiteral(moduleSpecifier)) continue;
      if (!moduleSpecifier.text.startsWith(".")) continue;
      if (localImportExists(path, moduleSpecifier.text)) continue;
      const location = source.getLineAndCharacterOfPosition(moduleSpecifier.getStart(source));
      issues.push({
        file: relative(root, path), line: location.line + 1,
        column: location.character + 1,
        message: `Unresolved local import "${moduleSpecifier.text}"`,
      });
    }
  }
  return { files, issues };
}

function run() {
  const result = reviewStorybookSyntax();
  if (result.issues.length) {
    console.error(`Storybook source preflight failed (${result.issues.length} error(s)):\n`);
    for (const item of result.issues) {
      console.error(`  ${item.file}:${item.line}:${item.column}  ${item.message}`);
    }
    console.error("\nFix these source errors before starting Storybook.");
    process.exitCode = 1;
    return;
  }
  console.log(`Storybook source preflight passed: ${result.files.length} TS/TSX modules parsed; relative imports found.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) run();
