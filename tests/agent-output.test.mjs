/** What an agent reads by default stays small, and says what it left out. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { API_BUDGET, compactApi, summary } from "../scripts/catalog-compact.mjs";
import { checkBudgets, digest, findDocs, sections } from "../scripts/docs-context.mjs";
import { problemLines } from "../scripts/film-frame-core.mjs";

const run = (script, ...args) => {
  const result = spawnSync(process.execPath, ["scripts/" + script, ...args], { encoding: "utf8", timeout: 120_000 });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};
const fake = count => ({ id: "pack:sample", exports: Array.from({ length: count }, (_, index) => ({
  name: "thing" + index, kind: "function", signatures: [{ parameters: [{ name: "input", type: "x".repeat(400), required: true }], returns: "void" }] })) });

for (const id of ["button", "film-document", "human-anatomy"]) test(`catalog:api --id=${id} stays within its budget in both formats`, () => {
  assert.ok(Buffer.byteLength(run("catalog-api.mjs", "--id=" + id)) <= API_BUDGET);
  const json = run("catalog-api.mjs", "--id=" + id, "--format=json");
  assert.ok(Buffer.byteLength(json) <= API_BUDGET);
  assert.equal(JSON.parse(json).status, "verified");
});

test("compact API keeps verified defaults, required marks and a choice of exports", () => {
  const button = run("catalog-api.mjs", "--id=button", "--export=Button,ButtonVariant");
  assert.match(button, /isLoading\?: boolean = false/);
  assert.match(button, /type ButtonVariant = "primary" \|/);
  assert.match(run("catalog-api.mjs", "--id=film-document", "--export=FilmStage"), /^ {2}film: CompiledFilm/m);
});

test("every export a compact API drops is counted", () => {
  const api = compactApi(fake(300));
  assert.equal(api.exports.length + api.omittedCount, 300);
  assert.ok(api.omitted.length <= api.omittedCount);
  assert.deepEqual(compactApi(fake(3)).omitted, []);
});

test("a search returns short rows, and one entry stays complete", () => {
  const search = JSON.parse(run("catalog.mjs", "--query=rain", "--format=json"));
  assert.ok(search.matching > search.results.length && search.results.length === 10);
  assert.ok(JSON.stringify(search).length < 4000);
  const [entry] = JSON.parse(run("catalog.mjs", "--id=" + search.results[0].id, "--format=json")).results;
  assert.ok(entry.installOrder.length && entry.files.length);
  assert.ok(summary("word ".repeat(200)).length <= 160);
});

test("film fields answer for a recipe and a type without the schema", () => {
  assert.match(run("film-fields.mjs", "--recipe=cause-effect"), /initial: string; event: string/);
  assert.ok(run("film-fields.mjs", "--type=FilmTransition").length <= 4000);
  assert.match(run("film-fields.mjs", "--query=caption"), /FilmDocument/);
});

test("sections ignore headings in code and end where the next equal heading starts", () => {
  const found = sections("# A\n\nintro\n\n## B\n```\n# not a heading\n```\n### C\n\n## D\nend");
  assert.deepEqual(found.map(item => [item.heading, item.line, item.end]), [["A", 1, 12], ["B", 5, 10], ["C", 9, 10], ["D", 11, 12]]);
  assert.equal(digest("# T\n\n## Digest\n" + "word ".repeat(20) + "\n## Next\nother"), "word ".repeat(20).trim());
  assert.match(digest("# T\n\nshort\n\n## S\n\n" + "para ".repeat(20)), /^para/);
});

test("a task finds its skill before its history", () => {
  for (const [task, file] of [["dog running", "skills/kumiki-animal-anatomy/SKILL.md"], ["draw a walking person", "skills/kumiki-motion/SKILL.md"],
    ["boiled egg", "skills/kumiki-food/SKILL.md"], ["chart morph", "docs/component-specs/chart-morph.md"]])
    assert.equal(findDocs(task, 1)[0].file, file);
});

test("repeated frame problems become one line with their frames", () => {
  const problem = { severity: "warning", code: "text-small", text: "Tiny" };
  const lines = problemLines([10, 20, 30].map(frame => ({ frame, sceneId: "s", problems: [problem] }))
    .concat({ frame: 40, sceneId: "s", problems: [{ severity: "error", code: "text-collision", text: "A", other: "B" }] }));
  assert.deepEqual(lines, ['ERROR [text-collision] "s": A / B — f40', 'WARNING [text-small] "s": Tiny — f10, f20, f30']);
});

test("the committed instructions and docs are within their budgets", () => assert.deepEqual(checkBudgets(), []));
