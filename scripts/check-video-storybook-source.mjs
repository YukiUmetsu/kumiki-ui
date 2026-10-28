#!/usr/bin/env node
/**
 * Fail fast on malformed TypeScript/JSX and missing local imports reachable
 * from video Storybook entrypoints. Errors include the real module and line
 * instead of Vite's generic "Failed to fetch dynamically imported module".
 * Unrelated source files are intentionally not treated as Storybook blockers.
 */
import ts from "typescript";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, extname, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_PATHS = ["src/components/video"];
const SCRIPT = /\.[cm]?[jt]sx?$/;
const STORY = /\.stories\.[cm]?[jt]sx?$/;
const CANDIDATE_SUFFIXES = [
  ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".css", ".svg", ".png", ".webp", ".jpg", ".jpeg",
  ".mp4", ".webm", ".mdx", "/index.ts", "/index.tsx", "/index.js",
];

function collectEntrypoints(root, directories) {
  const entries = [];
  for (const directory of directories) {
    const start = resolve(root, directory);
    if (!existsSync(start)) continue;
    const pending = [start];
    while (pending.length) {
      const folder = pending.pop();
      for (const item of readdirSync(folder, {withFileTypes:true})) {
        if (item.name === "node_modules" || item.name === "dist") continue;
        const path = resolve(folder, item.name);
        if (item.isDirectory()) pending.push(path);
        else if (item.isFile() && STORY.test(item.name)) entries.push(path);
      }
    }
  }
  return entries.sort();
}
function existingLocalImport(from, specifier) {
  const name = specifier.split(/[?#]/, 1)[0];
  const base = resolve(dirname(from), name);
  const options = [base];
  if (/\.[cm]?jsx?$/.test(base)) {
    const stem = base.replace(/\.[cm]?jsx?$/, "");
    options.push(stem+".ts",stem+".tsx",stem+".mts",stem+".cts");
  }
  options.push(...CANDIDATE_SUFFIXES.map(suffix=>base+suffix));
  return options.find(path=>existsSync(path) && statSync(path).isFile()) ?? null;
}
function scriptKind(path) {
  if (/\.[cm]?tsx$|\.jsx$/.test(path)) return ts.ScriptKind.TSX;
  if (/\.[cm]?jsx?$/.test(path)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/** Targets source dependencies that can actually break a video story import.
 * The argument list is overridable so regression tests use tiny isolated repos.
 */
export function reviewStorybookSyntax(root = process.cwd(), paths = DEFAULT_PATHS) {
  const issues = [], files = [], seen = new Set();
  const base = resolve(root);
  const pending = collectEntrypoints(base, paths);
  while (pending.length) {
    const path = pending.pop();
    if (seen.has(path)) continue;
    seen.add(path);
    files.push(path);
    const source = ts.createSourceFile(path,readFileSync(path,"utf8"),
      ts.ScriptTarget.Latest,true,scriptKind(path));
    for(const diagnostic of source.parseDiagnostics){
      const location=source.getLineAndCharacterOfPosition(diagnostic.start??0);
      issues.push({
        file:relative(base,path),line:location.line+1,column:location.character+1,
        message:ts.flattenDiagnosticMessageText(diagnostic.messageText,"\n"),
      });
    }
    for(const statement of source.statements){
      if(!ts.isImportDeclaration(statement)&&!ts.isExportDeclaration(statement))continue;
      const target=statement.moduleSpecifier;
      if(!target||!ts.isStringLiteral(target)||!target.text.startsWith("."))continue;
      const found=existingLocalImport(path,target.text);
      if(!found){
        const location=source.getLineAndCharacterOfPosition(target.getStart(source));
        issues.push({file:relative(base,path),line:location.line+1,
          column:location.character+1,
          message:`Unresolved local import "${target.text}"`});
        continue;
      }
      const inside=found.startsWith(base+sep);
      if(inside&&SCRIPT.test(extname(found)))pending.push(found);
    }
  }
  return {files:files.sort(),issues};
}
function run(){
  const result=reviewStorybookSyntax();
  if(result.issues.length){
    console.error(`Video Storybook source preflight failed (${result.issues.length} error(s)):\n`);
    for(const {file,line,column,message} of result.issues)
      console.error(`  ${file}:${line}:${column}  ${message}`);
    console.error("\nFix the source errors before starting Storybook.");
    process.exitCode=1;
    return;
  }
  console.log(`Video Storybook source preflight passed: ${result.files.length} reachable modules parsed.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)run();
