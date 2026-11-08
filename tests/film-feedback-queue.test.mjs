import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildFeedbackQueue } from "../scripts/film-feedback-queue.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const digest = value => createHash("sha256").update(value).digest("hex");

function fixture(dir) {
  const film = {
    schemaVersion: 1, id: "feedback-film", fps: { num: 30, den: 1 },
    outputs: [{ id: "landscape", preset: "youtube" }],
    scenes: [{ id: "cause", recipeId: "cause-effect", durationFrames: 120,
      cueFrames: [25, 55, 90], content: { initial: "A state", event: "A change",
        links: ["Input affects output"], outcome: "A new state",
        qualification: "Illustrative example" } }],
  };
  const filmBytes = JSON.stringify(film);
  const map = {
    schemaVersion: "kumiki.reference-film-map.v1",
    status: "editorial-anchor-plan-not-a-visual-match",
    provenance: { referenceVideoSha256: "a".repeat(64),
      authoredFilmSha256: digest(filmBytes) },
    film: { id: film.id, fps: film.fps, durationFrames: 120 },
    anchors: [{ id: "focus-01", relationship: "inspired-by",
      note: "Compare camera stability through the explanation.",
      source: { sourcePts: 99000, seconds: { numerator: 11, denominator: 10 } },
      film: { sceneId: "cause", frameOffset: 25, frame: 25,
        seconds: { numerator: 5, denominator: 6 } }, reviewStatus: "not-reviewed" }],
  };
  const mapBytes = JSON.stringify(map);
  const pair = {
    id: "focus-01", relationship: "inspired-by", note: map.anchors[0].note,
    source: { pts: 99000, seconds: map.anchors[0].source.seconds,
      image: "source/frame-000.jpg" },
    film: { frame: 25, pts: 25, seconds: map.anchors[0].film.seconds,
      image: "film/frame-000.jpg" },
  };
  const reviewDir = join(dir, "review-bundle");
  mkdirSync(join(reviewDir, "source"), { recursive: true });
  mkdirSync(join(reviewDir, "film"));
  for (const [name, bytes] of [["index.html", "review"],
    ["source/frame-000.jpg", "reference image"], ["film/frame-000.jpg", "render image"]]) {
    writeFileSync(join(reviewDir, name), bytes);
  }
  const files = ["index.html", "source/frame-000.jpg", "film/frame-000.jpg"].map(path =>
    ({ path, sha256: digest(readFileSync(join(reviewDir, path))) }));
  const review = {
    schemaVersion: "kumiki.film-map-review.v1", status: "verified-pts-paired-stills",
    qualityVerdict: "not-performed", settings: {
      pairedIdentities: [pair], reviewMapSha256: digest(mapBytes),
      filmDocumentSha256: digest(filmBytes), referenceVideoSha256: "a".repeat(64),
      renderVideoSha256: "b".repeat(64),
    }, pairs: [pair], files,
  };
  const reviewBytes = JSON.stringify(review);
  const feedback = {
    schemaVersion: "kumiki.film-map-feedback.v1", reviewStatus: "draft",
    evidence: { reviewManifestSha256: digest(reviewBytes),
      referenceVideoSha256: "a".repeat(64), renderVideoSha256: "b".repeat(64),
      anchors: [{ id: "focus-01", sourcePts: 99000, filmFrame: 25,
        sourceImage: "source/frame-000.jpg", sourceImageSha256: files[1].sha256,
        filmImage: "film/frame-000.jpg", filmImageSha256: files[2].sha256 }] },
    reviewer: { kind: "human", id: "editor-1", modelId: null },
    findings: [{ id: "finding-camera-angle", anchorId: "focus-01", category: "camera",
      severity: "significant", observation: "Camera angle obscures the main subject.",
      suggestedChange: "Raise the camera and preserve the original subject." }],
  };
  const feedbackBytes = JSON.stringify(feedback);
  const paths = { map: join(dir, "reference-film-map.json"),
    review: join(reviewDir, "film-map-review.json"),
    feedback: join(dir, "film-map-feedback.json"), film: join(dir, "film.json") };
  for (const [key, value] of Object.entries({ map: mapBytes, review: reviewBytes,
    feedback: feedbackBytes, film: filmBytes })) writeFileSync(paths[key], value);
  return { film, map, review, feedback, paths, hashes: {
    film: digest(filmBytes), map: digest(mapBytes), review: digest(reviewBytes),
    feedback: digest(feedbackBytes),
  } };
}

test("converts a verified finding to the actual authored FD1 scene, without editing the film", () => {
  const dir = mkdtempSync(join(tmpdir(), "kumiki-feedback-"));
  try {
    const { film, map, review, feedback, hashes } = fixture(dir);
    const result = buildFeedbackQueue(map, review, feedback, film, hashes);
    assert.equal(result.status, "evidence-bound-edit-tasks-not-applied");
    assert.equal(result.artisticApproval, "not-granted");
    assert.equal(result.tasks.length, 1);
    assert.equal(result.tasks[0].sceneId, "cause");
    assert.equal(result.tasks[0].filmFrame, 25);
    assert.equal(result.tasks[0].referenceSourcePts, 99000);
    assert.equal(result.tasks[0].category, "camera");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("rejects fabricated anchors, stale film, fake feedback approvals and missing corrections", () => {
  const dir = mkdtempSync(join(tmpdir(), "kumiki-feedback-"));
  try {
    const f = fixture(dir);
    f.map.anchors[0].film.frameOffset = 30;
    assert.throws(() => buildFeedbackQueue(f.map, f.review, f.feedback, f.film, f.hashes), /offset/);
    f.map.anchors[0].film.frameOffset = 25;
    f.feedback.reviewStatus = "approved";
    assert.throws(() => buildFeedbackQueue(f.map, f.review, f.feedback, f.film, f.hashes), /not a draft/);
    f.feedback.reviewStatus = "draft";
    f.map.anchors[0].film.seconds = { numerator: 1, denominator: 1 };
    f.review.pairs[0].film.seconds = { numerator: 1, denominator: 1 };
    assert.throws(() => buildFeedbackQueue(f.map, f.review, f.feedback, f.film, f.hashes), /offset/);
    f.map.anchors[0].film.seconds = { numerator: 5, denominator: 6 };
    f.review.pairs[0].film.seconds = { numerator: 5, denominator: 6 };
    f.feedback.findings[0].suggestedChange = null;
    assert.throws(() => buildFeedbackQueue(f.map, f.review, f.feedback, f.film, f.hashes), /malformed/);
    f.feedback.findings[0].suggestedChange = "Reframe the subject.";
    f.feedback.evidence.anchors[0].filmImageSha256 = "f".repeat(64);
    assert.throws(() => buildFeedbackQueue(f.map, f.review, f.feedback, f.film, f.hashes), /provenance/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("CLI validates current FD1, JPEG hashes and write-once edit queue", () => {
  const dir = mkdtempSync(join(tmpdir(), "kumiki-feedback-"));
  try {
    const { paths } = fixture(dir);
    const script = join(root, "scripts/film-feedback-queue.mjs");
    const out = join(dir, "edit-queue.json");
    const args = [...Object.values(paths), `--out=${out}`];
    const execute = () => spawnSync(process.execPath, [script, ...args],
      { cwd: root, encoding: "utf8", timeout: 120000 });
    const first = execute();
    assert.equal(first.status, 0, first.stderr);
    assert.ok(existsSync(out), `CLI did not publish the queue: ${first.stdout} ${first.stderr}`);
    assert.equal(JSON.parse(readFileSync(out, "utf8")).tasks.length, 1);
    assert.equal(execute().status, 0);
    const forbidden = spawnSync(process.execPath,
      [script, ...Object.values(paths), `--out=${join(dirname(paths.review), "queue.json")}`],
      { cwd: root, encoding: "utf8", timeout: 120000 });
    assert.equal(forbidden.status, 1);
    assert.match(forbidden.stderr, /immutable review bundle/);
    writeFileSync(join(dirname(paths.review), "film/frame-000.jpg"), "tampered");
    const tampered = execute();
    assert.equal(tampered.status, 1);
    assert.match(tampered.stderr, /modified/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
