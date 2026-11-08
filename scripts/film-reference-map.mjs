#!/usr/bin/env node
/**
 * Build an explicitly authored reference-to-FD1 frame review map. The handoff
 * is measurement evidence, not scene instructions or a synchronized soundtrack.
 *
 * npm run film:reference-map -- <film-handoff.json> <film.json> <anchors.json> [--out=<file>]
 *
 * This command runs the real FD1 checker before accepting a film. It does not
 * infer cuts, synthesize scene content, compare pixels or approve visual quality.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const requireValue = (condition, message) => { if (!condition) throw Error(message); };

function multiplyRationalByInteger(value, factor, label) {
  requireValue(isObject(value) && integer(value.numerator) && integer(value.denominator) &&
    value.denominator > 0 && integer(factor), `${label} must be a valid rational and safe integer`);
  const numerator = BigInt(value.numerator) * BigInt(factor);
  const denominator = BigInt(value.denominator);
  const gcd = (a, b) => b === 0n ? a : gcd(b, a % b);
  const divisor = gcd(numerator < 0n ? -numerator : numerator, denominator);
  const n = numerator / divisor, d = denominator / divisor;
  requireValue(n >= BigInt(Number.MIN_SAFE_INTEGER) && n <= BigInt(Number.MAX_SAFE_INTEGER),
    `${label} resulting time exceeds safe integer range`);
  return { numerator: Number(n), denominator: Number(d) };
}

function rationalEquals(left, right) {
  return isObject(left) && isObject(right) &&
    integer(left.numerator) && integer(left.denominator) && left.denominator > 0 &&
    integer(right.numerator) && integer(right.denominator) && right.denominator > 0 &&
    BigInt(left.numerator) * BigInt(right.denominator) ===
      BigInt(right.numerator) * BigInt(left.denominator);
}

/** Pure, safe, exact-time review plan. The author supplies every comparison anchor. */
export function buildReferenceMap(handoff, film, alignment, hashes) {
  requireValue(isObject(handoff) && handoff.schemaVersion === "kumiki.film-handoff.v1" &&
    handoff.status === "candidate-drafting-evidence-not-an-executable-film" &&
    handoff.target?.repository === "YukiUmetsu/kumiki-ui" &&
    handoff.target?.executableDocument === false &&
    handoff.target?.installedCapabilitiesVerified === false &&
    handoff.timing?.audioVideoClockRelation === "not-independently-synchronized",
  "Expected unmodified, non-executable reference-lab film handoff v1");
  requireValue(isObject(handoff.study) && /^[a-f0-9]{64}$/.test(handoff.study.sourceSha256) &&
    /^[a-f0-9]{64}$/.test(handoff.study.manifestSha256), "Handoff requires source and study hashes");
  requireValue(isObject(film) && film.schemaVersion === 1 && typeof film.id === "string" &&
    film.id.length > 0 && isObject(film.fps) && integer(film.fps.num) && film.fps.num > 0 &&
    integer(film.fps.den) && film.fps.den > 0 && Array.isArray(film.scenes),
  "Expected an authored FD1 film with rational FPS and scenes");
  requireValue(isObject(alignment) && alignment.schemaVersion === "kumiki.reference-anchors.v1" &&
    Array.isArray(alignment.anchors) && alignment.anchors.length > 0 &&
    alignment.anchors.length <= 10000, "Expected an author-selected, non-empty anchors v1 document");
  requireValue(isObject(handoff.timing.videoSourceTimebase), "Missing source video timebase");
  requireValue(Array.isArray(handoff.interiorWindows), "Missing bounded source cut intervals");
  requireValue(alignment.sourceSha256 === handoff.study.sourceSha256,
    "Anchors target a different source video hash");

  const windows = new Map();
  for (const window of handoff.interiorWindows) {
    requireValue(isObject(window) && typeof window.id === "string" && !windows.has(window.id) &&
      integer(window.startCutCandidatePts) && integer(window.endCutCandidatePts) &&
      window.startCutCandidatePts < window.endCutCandidatePts &&
      rationalEquals(window.sourceStartSeconds,
        multiplyRationalByInteger(handoff.timing.videoSourceTimebase, window.startCutCandidatePts, window.id)) &&
      rationalEquals(window.sourceEndSeconds,
        multiplyRationalByInteger(handoff.timing.videoSourceTimebase, window.endCutCandidatePts, window.id)) &&
      rationalEquals(window.sourceDurationSeconds,
        multiplyRationalByInteger(handoff.timing.videoSourceTimebase,
          window.endCutCandidatePts - window.startCutCandidatePts, window.id)) &&
      window.sceneRecipeId === null && window.sceneContent === null &&
      window.reviewStatus === "not-reviewed", "Handoff has duplicate or invalid source intervals");
    windows.set(window.id, window);
  }
  const scenes = new Map();
  let accumulatedFrames = 0;
  for (const scene of film.scenes) {
    requireValue(isObject(scene) && typeof scene.id === "string" && scene.id.length > 0 &&
      !scenes.has(scene.id) && integer(scene.durationFrames) && scene.durationFrames > 0 &&
      Number.isSafeInteger(accumulatedFrames + scene.durationFrames),
    "Film has duplicate or invalid scene ids/durations");
    scenes.set(scene.id, { ...scene, startFrame: accumulatedFrames });
    accumulatedFrames += scene.durationFrames;
  }
  const seenIds = new Set();
  const anchors = alignment.anchors.map((anchor, index) => {
    const at = `anchors[${index}]`;
    requireValue(isObject(anchor) && typeof anchor.id === "string" &&
      /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(anchor.id) && !seenIds.has(anchor.id),
    `${at}: id missing, duplicate or malformed`);
    seenIds.add(anchor.id);
    requireValue(["inspired-by", "visual-analogy", "intended-match"].includes(anchor.relationship) &&
      typeof anchor.note === "string" && anchor.note.trim().length >= 8 &&
      anchor.note.length <= 500, `${at}: authored relationship and explanation required`);
    const window = windows.get(anchor.sourceWindowId);
    const scene = scenes.get(anchor.filmSceneId);
    requireValue(window, `${at}: unknown or censored source interval`);
    requireValue(scene, `${at}: unknown film scene`);
    requireValue(integer(anchor.sourcePts) && anchor.sourcePts >= window.startCutCandidatePts &&
      anchor.sourcePts < window.endCutCandidatePts, `${at}: source PTS must lie inside the interior interval`);
    requireValue(integer(anchor.filmFrameOffset) && anchor.filmFrameOffset >= 0 &&
      anchor.filmFrameOffset < scene.durationFrames, `${at}: offset must lie inside the authored scene`);
    const filmFrame = scene.startFrame + anchor.filmFrameOffset;
    return {
      id: anchor.id,
      relationship: anchor.relationship,
      note: anchor.note.trim(),
      source: {
        windowId: window.id,
        sourcePts: anchor.sourcePts,
        seconds: multiplyRationalByInteger(handoff.timing.videoSourceTimebase, anchor.sourcePts, at),
      },
      film: {
        sceneId: scene.id,
        frameOffset: anchor.filmFrameOffset,
        frame: filmFrame,
        seconds: multiplyRationalByInteger({ numerator: film.fps.den, denominator: film.fps.num }, filmFrame, at),
      },
      reviewStatus: "not-reviewed",
    };
  });
  requireValue(isObject(hashes) && /^[0-9a-f]{64}$/.test(hashes.handoff) &&
    /^[0-9a-f]{64}$/.test(hashes.film) && /^[0-9a-f]{64}$/.test(hashes.anchors),
  "Source file digests are required");
  return {
    schemaVersion: "kumiki.reference-film-map.v1",
    status: "editorial-anchor-plan-not-a-visual-match",
    provenance: {
      referenceVideoSha256: handoff.study.sourceSha256,
      studyManifestSha256: handoff.study.manifestSha256,
      handoffSha256: hashes.handoff,
      authoredFilmSha256: hashes.film,
      authoredAnchorsSha256: hashes.anchors,
    },
    film: { id: film.id, fps: film.fps, durationFrames: accumulatedFrames },
    anchors,
    gates: [
      "Verify the original source-video and study bundle against their hashes.",
      "Render the authored film and extract source/render stills at these separate time anchors.",
      "Compare visible geometry, typography, teaching clarity and full-motion timing manually.",
      "No pixel score or catalog promotion without rendered evidence and human sign-off.",
    ],
  };
}

function parseFile(path, maxBytes) {
  const stat = statSync(path);
  requireValue(stat.isFile() && stat.size <= maxBytes, `${path} exceeds input size limit or is not a file`);
  const bytes = readFileSync(path);
  requireValue(bytes.length <= maxBytes, `${path} exceeds input size limit`);
  return { value: JSON.parse(bytes.toString("utf8")), hash: sha256(bytes) };
}

function runCli() {
  const arguments_ = process.argv.slice(2), paths = arguments_.filter(a => !a.startsWith("--"));
  const opts = arguments_.filter(a => a.startsWith("--"));
  requireValue(paths.length === 3 && opts.every(a => a.startsWith("--out=") && a.length > 6) && opts.length <= 1,
    "Usage: npm run film:reference-map -- <film-handoff.json> <film.json> <anchors.json> [--out=<file>]");
  const [handoffPath, filmPath, anchorsPath] = paths.map(p => resolve(p));
  const handoff = parseFile(handoffPath, 8_388_608), film = parseFile(filmPath, 8_388_608), anchors = parseFile(anchorsPath, 2_097_152);
  // The live FD1 compiler, not a duplicate contract maintained in this bridge.
  const check = JSON.parse(execFileSync(process.execPath,
    [resolve(SCRIPT_DIR, "film.mjs"), "check", filmPath, "--format=json"],
    { encoding: "utf8", maxBuffer: 2_097_152, timeout: 120_000 }));
  requireValue(check.ok === true, "Live FD1 film:check rejected the film");
  const map = buildReferenceMap(handoff.value, film.value, anchors.value,
    { handoff: handoff.hash, film: film.hash, anchors: anchors.hash });
  const output = JSON.stringify(map, null, 2) + "\n";
  if (opts.length) {
    const path = resolve(opts[0].slice("--out=".length));
    requireValue(![handoffPath, filmPath, anchorsPath].includes(path), "Refusing to overwrite an input document");
    if (existsSync(path)) {
      requireValue(readFileSync(path, "utf8") === output, "Output exists with different content; refusing to overwrite");
    } else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, output, { flag: "wx" });
    }
    console.log(`Wrote ${path} with ${map.anchors.length} author-selected anchor(s).`);
  } else process.stdout.write(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { runCli(); } catch (error) { console.error(`Reference map failed: ${error.message}`); process.exitCode = 1; }
}
