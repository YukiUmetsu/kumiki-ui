#!/usr/bin/env node
/** Find the right part of the docs, and know its token cost, before reading. No dependencies, network or model.
 *   npm run -s docs:find -- --query="walking person"        which specs, skills and docs, and which lines of each
 *   npm run -s docs:sections -- docs/08-motion-graphics.md  a digest and the line range of each section
 *   npm run -s docs:check                                   the size limits that keep the instructions cheap
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIMITS = { agents: 8192, skill: 16_000, largeDoc: 20_000, section: 32_000, digestWords: 15 };
const read = file => readFileSync(path.join(ROOT, file), "utf8");
const bytes = text => Buffer.byteLength(text);
/** About four bytes a token. An estimate to compare files with, not a count. */
const tokens = size => size < 4000 ? `~${Math.max(10, Math.round(size / 40) * 10)} tok` : `~${(size / 4000).toFixed(1)}k tok`;
const clip = (text, max) => text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "…";

function walk(folder, keep) {
  return readdirSync(path.join(ROOT, folder), { withFileTypes: true }).flatMap(item => {
    const file = folder + "/" + item.name;
    return item.isDirectory() ? walk(file, keep) : keep(file) ? [file] : [];
  });
}
export const documents = () => [...walk("docs", file => file.endsWith(".md")), ...walk("skills", file => file.endsWith("/SKILL.md"))];

/** Headings outside code fences, with the lines and bytes up to the next heading of the same or a higher level. */
export function sections(text) {
  const lines = text.split("\n"), found = [];
  let fence = false;
  lines.forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const match = !fence && /^(#{1,4}) +(.+?)\s*$/.exec(line);
    if (match) found.push({ level: match[1].length, heading: match[2].replace(/[`*]/g, ""), line: index + 1 });
  });
  return found.map((item, index) => {
    const next = found.slice(index + 1).find(other => other.level <= item.level);
    const own = found[index + 1]?.line ?? lines.length + 1, end = next ? next.line - 1 : lines.length;
    return { ...item, end, bytes: bytes(lines.slice(item.line - 1, end).join("\n")),
      ownBytes: bytes(lines.slice(item.line - 1, own - 1).join("\n")) };
  });
}

/** What the document says about itself: a `## Digest` if it has one, else its opening, else its first paragraph. */
export function digest(text, max = 120) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, "");
  const words = part => part.replace(/^#.*$/gm, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").split(/\s+/).filter(Boolean);
  const written = /^## Digest\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(body)?.[1];
  const opening = body.split(/^## /m)[0];
  let found = words(written ?? opening);
  if (found.length < LIMITS.digestWords)
    found = words(body.split(/\n\s*\n/).find(part => !/^(#|\||```|<|!)/.test(part.trim()) && words(part).length >= LIMITS.digestWords) ?? opening);
  return found.length > max ? found.slice(0, max).join(" ") + " …" : found.join(" ");
}

const STOP = new Set("a an and are be by do for from how in into is it make need of on or that the this to use used using want what when where which with".split(" "));
const stem = word => /^(people|person|human)s?$/.test(word) ? "human" : word.length > 4
  ? word.replace(/(ing|ers|ies|es|s|e)$/, "").replace(/([bdgmnprt])\1$/, "$1") : word;
const terms = query => [...new Set((query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(word => !STOP.has(word)).map(stem))];
const starts = (text, term) => new RegExp("(^|[^\\p{L}\\p{N}])" + term, "u").test(text);
/** Evidence and history answer fewer tasks than a spec or a skill does. */
const weight = file => file.startsWith("skills/") ? 2 : /^docs\/(component-specs\/|\d\d|[a-z-]+\.md)/.test(file) ? 1
  : file.startsWith("docs/research/") ? .6 : .4;
const GENERATED = new Set(["docs/component-status.md", "docs/INDEX.md", "docs/02-component-catalog.md"]);

export function findDocs(query, limit = 6) {
  const wanted = terms(query);
  if (!wanted.length) throw Error("Give --query words that describe the task.");
  const pages = documents().filter(file => !GENERATED.has(file)).map(file => ({ file, text: read(file) }));
  const lower = new Map(pages.map(page => [page.file, page.text.toLowerCase()]));
  // A rare word says more about the task than a common one.
  const rarity = new Map(wanted.map(term => [term,
    Math.log(1 + pages.length / (1 + pages.filter(page => lower.get(page.file).includes(term)).length))]));
  return pages.map(({ file, text }) => {
    const parts = sections(text), title = parts[0]?.heading ?? file;
    const trigger = /^---\n[\s\S]*?^description: *(.+)$/m.exec(text)?.[1] ?? "";
    const name = (file + " " + title + " " + trigger).toLowerCase(), intro = digest(text).toLowerCase(), body = lower.get(file);
    let score = 0, covered = 0;
    for (const term of wanted) {
      const points = (starts(name, term) ? 8 : 0) + (starts(intro, term) ? 4 : 0) +
        (parts.some(part => starts(part.heading.toLowerCase(), term)) ? 3 : 0) + (body.includes(term) ? body.split(term).length > 6 ? 2 : 1 : 0);
      if (points) covered += rarity.get(term);
      score += points * rarity.get(term);
    }
    const all = [...rarity.values()].reduce((sum, value) => sum + value, 0);
    const best = parts.filter(part => part.level > 1).map(part => ({ part, hits: wanted.reduce((sum, term) =>
      sum + (starts(part.heading.toLowerCase(), term) ? rarity.get(term) : 0), 0) })).sort((a, b) => b.hits - a.hits)[0];
    return { file, title, bytes: bytes(text), score: score * (covered / all) * weight(file),
      section: best?.hits ? best.part : undefined };
  }).filter(row => row.score > 0).sort((a, b) => b.score - a.score || a.file.localeCompare(b.file, "en")).slice(0, limit);
}

export function checkBudgets() {
  const problems = [];
  const agents = bytes(read("AGENTS.md"));
  if (agents > LIMITS.agents) problems.push(`AGENTS.md is ${agents} bytes; at most ${LIMITS.agents}. Every session and subagent loads it. Move detail to a skill or a spec.`);
  for (const file of documents()) {
    const text = read(file), size = bytes(text);
    if (file.startsWith("skills/") && size > LIMITS.skill) problems.push(`${file} is ${size} bytes; at most ${LIMITS.skill}. Move detail to the spec.`);
    if (size < LIMITS.largeDoc || file.startsWith("skills/") || GENERATED.has(file)) continue;
    if (digest(text).split(" ").length < LIMITS.digestWords) problems.push(`${file} (${size} bytes) has no opening paragraph. Say in 15–120 words what it decides.`);
    const longest = sections(text).sort((a, b) => b.ownBytes - a.ownBytes)[0];
    if (!longest) problems.push(`${file} (${size} bytes) has no headings.`);
    else if (longest.ownBytes > LIMITS.section) problems.push(`${file}:${longest.line} "${longest.heading}" is ${longest.ownBytes} bytes without a heading; at most ${LIMITS.section}. Split it.`);
  }
  return problems;
}

function printSections(file, match) {
  const text = read(file);
  let rows = sections(text).filter(part => part.level > 1);
  if (match) rows = rows.filter(part => terms(match).some(term => starts(part.heading.toLowerCase(), term)));
  else if (rows.length > 40) rows = rows.filter(part => part.level === 2);
  console.log(`${file}: ${tokens(bytes(text))}, ${text.split("\n").length} lines\n${digest(text)}\n`);
  for (const part of rows.slice(0, 40))
    console.log(`${part.line}-${part.end}  ${tokens(part.bytes)}  ${"  ".repeat(part.level - 2)}${clip(part.heading, 90)}`);
  if (rows.length > 40) console.log(`${rows.length - 40} more: narrow with --match="words".`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, ...rest] = process.argv.slice(2);
  const option = name => rest.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const file = rest.find(arg => !arg.startsWith("--"));
  if (command === "find") {
    for (const row of findDocs(option("query") ?? file ?? "", Number(option("limit") ?? 6)))
      console.log(`${row.file}  ${tokens(row.bytes)}  ${clip(row.title, 80)}` + (row.section && row.bytes > 8000
        ? `\n  ${row.section.line}-${row.section.end}  ${tokens(row.section.bytes)}  ${clip(row.section.heading, 80)}` : ""));
  } else if (command === "sections") {
    if (!file) throw Error("Give a file: npm run -s docs:sections -- docs/08-motion-graphics.md");
    printSections(path.relative(ROOT, path.resolve(file)), option("match"));
  } else if (command === "check") {
    const problems = checkBudgets();
    for (const problem of problems) console.log(problem);
    console.log(problems.length ? `${problems.length} context budget problem(s).` : `Context budgets OK: AGENTS.md ${statSync(path.join(ROOT, "AGENTS.md")).size} of ${LIMITS.agents} bytes.`);
    process.exitCode = problems.length ? 1 : 0;
  } else throw Error("Use find, sections or check.");
}
