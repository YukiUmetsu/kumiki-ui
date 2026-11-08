#!/usr/bin/env node
/** Turn provenance-checked Reference Lab notes into FD1 scene-linked edit tasks.
 *
 * This does not rewrite the authored film or certify that a correction is good.
 * A human or agent must implement each task and rerender/review the new movie.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const fail = (condition, message) => { if (!condition) throw Error(message); };
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const integer = Number.isSafeInteger;
const shaPattern = /^[a-f0-9]{64}$/;
const anchorPattern = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}$/;
const findingPattern = /^finding-[a-z0-9][a-z0-9-]{0,63}$/;
const severityOrder = { blocking: 0, significant: 1, polish: 2, observation: 3 };
const categories = new Set(["composition", "camera", "lighting", "material", "animation",
  "readability", "story-clarity", "attention", "continuity", "timing", "sound", "other"]);
const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value) ?
  Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const equal = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const keys = (value, required) => object(value) && equal(Object.keys(value).sort(), required.slice().sort());
const rationalEquals = (value, numerator, denominator) => object(value) &&
  integer(value.numerator) && integer(value.denominator) && value.denominator > 0 &&
  BigInt(value.numerator) * denominator === numerator * BigInt(value.denominator);

function load(path, limit) {
  const info = lstatSync(path);
  fail(info.isFile() && !info.isSymbolicLink() && info.size <= limit,
    `Input is not a bounded regular file: ${path}`);
  const bytes = readFileSync(path);
  fail(bytes.length <= limit, `Input exceeded size limit: ${path}`);
  return { data: JSON.parse(bytes.toString("utf8")), hash: sha(bytes) };
}

function exactClock(film, map) {
  fail(object(film) && film.schemaVersion === 1 && object(film.fps) &&
    integer(film.fps.num) && film.fps.num > 0 && integer(film.fps.den) &&
    film.fps.den > 0 && film.id === map.film?.id && equal(film.fps, map.film?.fps) &&
    Array.isArray(film.scenes), "Authored film identity/FPS disagrees with reference map");
  const scenes = new Map();
  let start = 0;
  for (const scene of film.scenes) {
    fail(object(scene) && typeof scene.id === "string" && scene.id &&
      !scenes.has(scene.id) && integer(scene.durationFrames) && scene.durationFrames > 0 &&
      Number.isSafeInteger(start + scene.durationFrames), "Invalid FD1 scene timing");
    scenes.set(scene.id, { start, length: scene.durationFrames });
    start += scene.durationFrames;
  }
  fail(start === map.film.durationFrames, "Authored film frame budget changed");
  return scenes;
}

/** Pure semantic verifier; file hashes must be computed by the CLI boundary. */
export function buildFeedbackQueue(map, review, feedback, film, hashes) {
  fail(object(map) && map.schemaVersion === "kumiki.reference-film-map.v1" &&
    map.status === "editorial-anchor-plan-not-a-visual-match" &&
    object(map.provenance) && Array.isArray(map.anchors) &&
    map.anchors.length > 0 && map.anchors.length <= 12,
  "Expected a bounded, explicitly authored reference-to-FD1 map");
  fail(object(hashes) && ["map", "review", "feedback", "film"].every(k =>
    typeof hashes[k] === "string" && shaPattern.test(hashes[k])),
    "File provenance hashes are required");
  fail(object(review) && review.schemaVersion === "kumiki.film-map-review.v1" &&
    review.status === "verified-pts-paired-stills" && review.qualityVerdict === "not-performed" &&
    object(review.settings) && Array.isArray(review.pairs) &&
    equal(review.settings.pairedIdentities, review.pairs) &&
    review.settings.reviewMapSha256 === hashes.map &&
    review.settings.filmDocumentSha256 === hashes.film &&
    map.provenance.authoredFilmSha256 === hashes.film &&
    map.provenance.referenceVideoSha256 === review.settings.referenceVideoSha256 &&
    shaPattern.test(review.settings.renderVideoSha256),
  "Review evidence disagrees with immutable map or authored film");
  const scenes = exactClock(film, map);
  const anchors = new Map();
  fail(review.pairs.length === map.anchors.length, "Review paired-anchor count changed");
  for (let i = 0; i < map.anchors.length; i++) {
    const anchor = map.anchors[i], pair = review.pairs[i];
    const point = anchor?.film, source = anchor?.source;
    const scene = scenes.get(point?.sceneId);
    fail(typeof anchor?.id === "string" && anchorPattern.test(anchor.id) &&
      !anchors.has(anchor.id) && scene && integer(point.frameOffset) &&
      point.frameOffset >= 0 && point.frameOffset < scene.length &&
      point.frame === scene.start + point.frameOffset &&
      rationalEquals(point.seconds, BigInt(point.frame) * BigInt(film.fps.den),
        BigInt(film.fps.num)) &&
      integer(source?.sourcePts) && pair?.id === anchor.id &&
      pair.relationship === anchor.relationship && pair.note === anchor.note &&
      pair.source?.pts === source.sourcePts && pair.film?.frame === point.frame &&
      equal(pair.source?.seconds, source.seconds) && equal(pair.film?.seconds, point.seconds),
    "Review anchor disagrees with source evidence or authored FD1 scene offset");
    anchors.set(anchor.id, { anchor, pair });
  }
  fail(object(feedback) && feedback.schemaVersion === "kumiki.film-map-feedback.v1" &&
    feedback.reviewStatus === "draft" && object(feedback.evidence) &&
    feedback.evidence.reviewManifestSha256 === hashes.review &&
    feedback.evidence.referenceVideoSha256 === review.settings.referenceVideoSha256 &&
    feedback.evidence.renderVideoSha256 === review.settings.renderVideoSha256 &&
    Array.isArray(feedback.evidence.anchors) &&
    feedback.evidence.anchors.length === anchors.size &&
    Array.isArray(feedback.findings) && feedback.findings.length <= 48,
  "Feedback is stale, not a draft, or mismatches its reviewed video evidence");
  fail(keys(feedback.reviewer, ["kind", "id", "modelId"]) &&
    ["ai", "human"].includes(feedback.reviewer.kind) &&
    typeof feedback.reviewer.id === "string" && anchorPattern.test(feedback.reviewer.id) &&
    (feedback.reviewer.kind === "human" ? feedback.reviewer.modelId === null :
      typeof feedback.reviewer.modelId === "string" &&
      feedback.reviewer.modelId.length > 0 && feedback.reviewer.modelId.length <= 256),
  "Feedback reviewer metadata is invalid");
  const fileHashes = new Map(review.files?.map(row => [row.path, row.sha256]));
  for (const [i, [id, { pair }]] of [...anchors.entries()].entries()) {
    const row = feedback.evidence.anchors[i];
    const src = `source/frame-${String(i).padStart(3, "0")}.jpg`;
    const dst = `film/frame-${String(i).padStart(3, "0")}.jpg`;
    fail(keys(row, ["id", "sourcePts", "filmFrame", "sourceImage", "sourceImageSha256",
      "filmImage", "filmImageSha256"]) && row.id === id &&
      row.sourcePts === pair.source.pts && row.filmFrame === pair.film.frame &&
      row.sourceImage === src && row.filmImage === dst &&
      row.sourceImageSha256 === fileHashes.get(src) &&
      row.filmImageSha256 === fileHashes.get(dst),
    "Feedback anchor or paired JPEG provenance has changed");
  }
  const ids = new Set(), tasks = [];
  for (const row of feedback.findings) {
    fail(keys(row, ["id", "anchorId", "category", "severity", "observation", "suggestedChange"]) &&
      typeof row.id === "string" && findingPattern.test(row.id) && !ids.has(row.id) &&
      typeof row.anchorId === "string" && anchors.has(row.anchorId) &&
      categories.has(row.category) && Object.hasOwn(severityOrder, row.severity) &&
      typeof row.observation === "string" && row.observation.trim().length > 0 &&
      row.observation.length <= 2000 &&
      (row.severity === "observation" ? row.suggestedChange === null ||
        typeof row.suggestedChange === "string" && row.suggestedChange.trim().length > 0 &&
        row.suggestedChange.length <= 2000 :
        typeof row.suggestedChange === "string" && row.suggestedChange.trim().length > 0 &&
        row.suggestedChange.length <= 2000),
    "Feedback contains a malformed, unanchored or duplicate correction");
    ids.add(row.id);
    const { anchor } = anchors.get(row.anchorId);
    tasks.push({ id: row.id, anchorId: row.anchorId, sceneId: anchor.film.sceneId,
      filmFrame: anchor.film.frame, sceneFrameOffset: anchor.film.frameOffset,
      referenceSourcePts: anchor.source.sourcePts, category: row.category,
      severity: row.severity, observation: row.observation, suggestedChange: row.suggestedChange });
  }
  tasks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] ||
    a.filmFrame - b.filmFrame || a.id.localeCompare(b.id));
  return {
    schemaVersion: "kumiki.film-feedback-queue.v1",
    status: "evidence-bound-edit-tasks-not-applied",
    artisticApproval: "not-granted",
    provenance: {
      referenceMapSha256: hashes.map, reviewManifestSha256: hashes.review,
      feedbackSha256: hashes.feedback, authoredFilmSha256: hashes.film,
      referenceVideoSha256: review.settings.referenceVideoSha256,
      renderedVideoSha256: review.settings.renderVideoSha256,
    },
    film: { id: film.id, fps: film.fps, durationFrames: map.film.durationFrames },
    tasks, gates: [
      "Inspect the actual source and rendered video before accepting the author's finding.",
      "Resolve scene recipes and APIs against the live catalog before changing FD1.",
      "Apply approved revisions manually or with a supervised coding agent; do not modify the original film automatically.",
      "Validate and rerender the revised film, then regenerate evidence and review it at full speed.",
    ],
  };
}

function verifyBundle(reviewPath, review) {
  const root = dirname(reviewPath);
  fail(reviewPath.endsWith(`${sep}film-map-review.json`) &&
    !lstatSync(root).isSymbolicLink() && Array.isArray(review?.pairs) &&
    review.pairs.length > 0 && review.pairs.length <= 12 &&
    equal(readdirSync(root).sort(), ["film", "film-map-review.json", "index.html", "source"]),
  "Review bundle has extra or missing entries");
  for (const dir of ["film", "source"]) {
    const folder = join(root, dir), info = lstatSync(folder);
    fail(info.isDirectory() && !info.isSymbolicLink(),
      "Review bundle includes a symlink or missing image directory");
  }
  const expected = new Set(["index.html"]);
  for (let i = 0; i < review.pairs.length; i++) {
    expected.add(`source/frame-${String(i).padStart(3, "0")}.jpg`);
    expected.add(`film/frame-${String(i).padStart(3, "0")}.jpg`);
  }
  fail(Array.isArray(review.files) && review.files.length === expected.size,
    "Review bundle file inventory is incomplete");
  const seen = new Set();
  for (const row of review.files) {
    fail(object(row) && typeof row.path === "string" && expected.has(row.path) &&
      !seen.has(row.path) && shaPattern.test(row.sha256), "Invalid review image inventory");
    seen.add(row.path);
    const name = join(root, row.path);
    const info = lstatSync(name);
    fail(info.isFile() && !info.isSymbolicLink() && info.size <= 8_388_608 &&
      sha(readFileSync(name)) === row.sha256, "Review image bytes were modified");
  }
  for (const dir of ["film", "source"]) {
    const folder = join(root, dir);
    fail(readdirSync(folder).every(name => seen.has(`${dir}/${name}`)),
    "Review bundle has unexpected images or symlinks");
  }
}

function cli() {
  const args = process.argv.slice(2), files = args.filter(x => !x.startsWith("--"));
  const options = args.filter(x => x.startsWith("--"));
  fail(files.length === 4 && options.length <= 1 &&
    options.every(x => x.startsWith("--out=") && x.length > 6),
  "Usage: npm run film:feedback-queue -- <reference-film-map.json> <film-map-review.json> <film-map-feedback.json> <film.json> [--out=<json>]");
  const [mapPath, reviewPath, feedbackPath, filmPath] = files.map(x => resolve(x));
  const [map, review, feedback, film] = [
    load(mapPath, 3_000_000), load(reviewPath, 1_000_000),
    load(feedbackPath, 1_048_576), load(filmPath, 8_388_608),
  ];
  verifyBundle(reviewPath, review.data);
  // Use the current FD1 compiler, rather than copying its contract here.
  const checked = JSON.parse(execFileSync(process.execPath,
    [resolve(SCRIPT_DIR, "film.mjs"), "check", filmPath, "--format=json"],
    { encoding: "utf8", maxBuffer: 2_097_152, timeout: 120_000 }));
  fail(checked.ok === true, "Authored film did not pass current FD1 validation");
  const queue = buildFeedbackQueue(map.data, review.data, feedback.data, film.data,
    { map: map.hash, review: review.hash, feedback: feedback.hash, film: film.hash });
  const output = JSON.stringify(queue, null, 2) + "\n";
  if (options.length) {
    const out = resolve(options[0].slice("--out=".length));
    const diff = relative(dirname(reviewPath), out);
    const insideBundle = diff === "" ||
      (diff !== ".." && !diff.startsWith(`..${sep}`) && !isAbsolute(diff));
    fail(!insideBundle,
      "Do not place a revision queue inside the immutable review bundle");
    fail(![mapPath, reviewPath, feedbackPath, filmPath].includes(out),
      "Cannot overwrite an input file");
    if (existsSync(out)) {
      fail(readFileSync(out, "utf8") === output, "Output exists with different content");
    } else {
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, output, { flag: "wx" });
    }
    console.log(`Wrote ${out} with ${queue.tasks.length} scene-linked correction(s).`);
  } else process.stdout.write(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { cli(); } catch (error) { console.error(`Feedback queue failed: ${error.message}`); process.exitCode = 1; }
}
