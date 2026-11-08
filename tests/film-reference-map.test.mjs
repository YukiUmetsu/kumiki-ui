import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildReferenceMap } from "../scripts/film-reference-map.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hashes = { handoff: "a".repeat(64), film: "b".repeat(64), anchors: "c".repeat(64) };

function inputs() {
  return {
    handoff: {
      schemaVersion: "kumiki.film-handoff.v1",
      status: "candidate-drafting-evidence-not-an-executable-film",
      study: { sourceSha256: "d".repeat(64), manifestSha256: "e".repeat(64) },
      target: { repository: "YukiUmetsu/kumiki-ui", executableDocument: false,
        installedCapabilitiesVerified: false },
      timing: { videoSourceTimebase: { numerator: 1, denominator: 90000 },
        audioVideoClockRelation: "not-independently-synchronized" },
      interiorWindows: [{
        id: "candidate-interval-001", startCutCandidatePts: 90000,
        endCutCandidatePts: 180000, sourceStartSeconds: { numerator: 1, denominator: 1 },
        sourceEndSeconds: { numerator: 2, denominator: 1 },
        sourceDurationSeconds: { numerator: 1, denominator: 1 },
        sceneRecipeId: null, sceneContent: null,
        reviewStatus: "not-reviewed",
      }],
    },
    film: { schemaVersion: 1, id: "example", fps: { num: 30000, den: 1001 },
      scenes: [{ id: "hook", durationFrames: 120 }, { id: "explain", durationFrames: 240 }] },
    alignment: { schemaVersion: "kumiki.reference-anchors.v1", sourceSha256: "d".repeat(64),
      anchors: [{ id: "mechanism", sourceWindowId: "candidate-interval-001",
        sourcePts: 99000, filmSceneId: "explain", filmFrameOffset: 15,
        relationship: "inspired-by", note: "The separately authored sequence echoes the source motion." }] },
  };
}

test("maps an explicitly authored source PTS to an FD1 scene frame using exact rational time", () => {
  const { handoff, film, alignment } = inputs();
  const result = buildReferenceMap(handoff, film, alignment, hashes);
  assert.equal(result.status, "editorial-anchor-plan-not-a-visual-match");
  assert.equal(result.anchors[0].source.sourcePts, 99000);
  assert.deepEqual(result.anchors[0].source.seconds, { numerator: 11, denominator: 10 });
  assert.equal(result.anchors[0].film.frame, 135);
  assert.deepEqual(result.anchors[0].film.seconds, { numerator: 9009, denominator: 2000 });
  assert.equal(result.anchors[0].reviewStatus, "not-reviewed");
  assert.equal(result.anchors[0].relationship, "inspired-by");
  assert.equal(result.film.durationFrames, 360);
  assert.equal(result.provenance.authoredFilmSha256, hashes.film);
  assert.equal(JSON.stringify(result), JSON.stringify(buildReferenceMap(handoff, film, alignment, hashes)));
});

test("cannot infer scenes or map censored source boundaries", () => {
  const inputs_ = inputs();
  inputs_.handoff.interiorWindows = [];
  assert.throws(() => buildReferenceMap(...Object.values(inputs_), hashes), /unknown or censored/);
  inputs_.handoff.interiorWindows = inputs().handoff.interiorWindows;
  inputs_.alignment.anchors[0].sourcePts = 180000;
  assert.throws(() => buildReferenceMap(...Object.values(inputs_), hashes), /inside the interior interval/);
  inputs_.alignment.anchors[0].sourcePts = 89999;
  assert.throws(() => buildReferenceMap(...Object.values(inputs_), hashes), /inside the interior interval/);
});

test("rejects unknown scene, out-of-scene offset, duplicate ids and missing editorial notes", () => {
  const data = inputs();
  data.alignment.anchors[0].filmSceneId = "fabricated-scene";
  assert.throws(() => buildReferenceMap(...Object.values(data), hashes), /unknown film scene/);
  data.alignment.anchors[0].filmSceneId = "explain";
  data.alignment.anchors[0].filmFrameOffset = 240;
  assert.throws(() => buildReferenceMap(...Object.values(data), hashes), /inside the authored scene/);
  data.alignment.anchors[0].filmFrameOffset = 15;
  data.alignment.anchors[0].note = "guess";
  assert.throws(() => buildReferenceMap(...Object.values(data), hashes), /explanation required/);
  data.alignment.anchors[0].note = "This is a separately authored visual analogy.";
  data.alignment.anchors.push({ ...data.alignment.anchors[0] });
  assert.throws(() => buildReferenceMap(...Object.values(data), hashes), /duplicate or malformed/);
});

test("refuses fabricated temporal sync, modified handoff slots and mismatched video identity", () => {
  const data = inputs();
  data.handoff.timing.audioVideoClockRelation = "guessed";
  assert.throws(() => buildReferenceMap(...Object.values(data), hashes), /non-executable/);
  data.handoff.timing.audioVideoClockRelation = "not-independently-synchronized";
  data.handoff.interiorWindows[0].sceneRecipeId = "cause-effect";
  assert.throws(() => buildReferenceMap(...Object.values(data), hashes), /invalid source intervals/);
  data.handoff.interiorWindows[0].sceneRecipeId = null;
  data.alignment.sourceSha256 = "f".repeat(64);
  assert.throws(() => buildReferenceMap(...Object.values(data), hashes), /different source video hash/);
});

test("rejects unsafe timestamps before constructing an invalid comparison plan", () => {
  const data = inputs();
  data.handoff.interiorWindows[0].endCutCandidatePts = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => buildReferenceMap(...Object.values(data), hashes), /invalid source intervals/);
  data.handoff.interiorWindows[0].endCutCandidatePts = 180000;
  data.handoff.timing.videoSourceTimebase.denominator = 0;
  assert.throws(() => buildReferenceMap(...Object.values(data), hashes), /valid rational/);
});

test("rejects PTS/timebase inconsistencies in tampered handoff data", () => {
  const data = inputs();
  data.handoff.interiorWindows[0].sourceStartSeconds = { numerator: 11, denominator: 10 };
  assert.throws(() => buildReferenceMap(...Object.values(data), hashes), /invalid source intervals/);
  data.handoff.interiorWindows[0].sourceStartSeconds = { numerator: 1, denominator: 1 };
  data.handoff.interiorWindows[0].sourceDurationSeconds = { numerator: 3, denominator: 2 };
  assert.throws(() => buildReferenceMap(...Object.values(data), hashes), /invalid source intervals/);
});

test("CLI checks against the real FD1 compiler and writes one immutable map", () => {
  const folder = mkdtempSync(join(tmpdir(), "kumiki-fd1-map-"));
  try {
    const data = inputs();
    // Use a portable recipe: the larger billing-gap fixture needs an accent
    // kit and image assets next to its document.
    data.film = {
      schemaVersion: 1, id: "reference-map-test", fps: { num: 30, den: 1 },
      outputs: [{ id: "landscape", preset: "youtube" }],
      scenes: [{ id: "cause", recipeId: "cause-effect", durationFrames: 120,
        cueFrames: [25, 55, 90],
        content: { initial: "A state", event: "A change", links: ["Input affects output"],
          outcome: "A new state", qualification: "Illustrative example" } }],
    };
    data.alignment.anchors[0].filmSceneId = "cause";
    data.alignment.anchors[0].filmFrameOffset = 25;
    const paths = ["handoff.json", "film.json", "anchors.json"].map(name => join(folder, name));
    [data.handoff, data.film, data.alignment].forEach((value, i) => writeFileSync(paths[i], JSON.stringify(value)));
    const report = join(folder, "review-map.json");
    const cli = join(root, "scripts/film-reference-map.mjs");
    const command = [...paths, `--out=${report}`];
    execFileSync(process.execPath, [cli, ...command], { cwd: root, timeout: 120000 });
    const contents = readFileSync(report, "utf8");
    assert.equal(JSON.parse(contents).anchors[0].film.frame, 25);
    execFileSync(process.execPath, [cli, ...command], { cwd: root, timeout: 120000 });
    assert.equal(readFileSync(report, "utf8"), contents);

    // A changed authored selection must not silently replace an approved plan.
    data.alignment.anchors[0].filmFrameOffset = 26;
    writeFileSync(paths[2], JSON.stringify(data.alignment));
    const failed = spawnSync(process.execPath, [cli, ...command], { cwd: root, encoding: "utf8", timeout: 120000 });
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /refusing to overwrite/);
    assert.equal(readFileSync(report, "utf8"), contents);

    // A payload that looks like FD1 by version but has no installed recipe
    // must fail the real compiler before a review map is created.
    data.film.scenes[0].recipeId = "made-up-recipe";
    writeFileSync(paths[1], JSON.stringify(data.film));
    const invalidFilmReport = join(folder, "invalid-film-report.json");
    const invalidFilm = spawnSync(process.execPath,
      [cli, ...paths, `--out=${invalidFilmReport}`],
      { cwd: root, encoding: "utf8", timeout: 120000 });
    assert.equal(invalidFilm.status, 1);
    assert.match(invalidFilm.stderr, /Command failed.*film\.mjs check/s);
    assert.equal(existsSync(invalidFilmReport), false);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});
