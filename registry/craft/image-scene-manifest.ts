/** Serializable photographic reconstruction boundaries. No inference, renderer or I/O. */
export type ImageSceneVec3 = readonly [number, number, number];
export interface ImageSceneRights { license: string; source?: string; author?: string }
export interface ImageSceneArtifact { path: string; sha256: string; bytes: number }
export interface ImageSceneCalibration {
  width: number; height: number; fx: number; fy: number; cx: number; cy: number;
  /** Column-major, right-handed camera-to-world. Camera looks along -Z, +Y is up. */
  cameraToWorld: readonly number[];
}
export interface ImageSceneCaptureView {
  id: string; image: string; mask?: string;
  /** Metric camera-Z values, not image brightness or normalized relative depth. */
  depth?: { path: string; encoding: "camera-z-meters-f32" };
  calibration?: ImageSceneCalibration;
}
interface ImageSceneCaptureBase {
  schemaVersion: 1; id: string; rights: ImageSceneRights; shot?: ImageSceneShot;
}
export type MultiViewSceneRequest = ImageSceneCaptureBase & (
  | { mode: "camera-orbit"; segmentation?: "automatic" | "none"; views: readonly ImageSceneCaptureView[] }
  | { mode: "object-rotation"; segmentation?: "automatic"; views: readonly ImageSceneCaptureView[] }
  | { mode: "camera-orbit" | "object-rotation"; segmentation: "manual"; views: readonly (ImageSceneCaptureView & { mask: string })[] }
);
export interface ImageSceneShot {
  preset: "push-in" | "orbit" | "oblique";
  durationFrames: number; fps: { num: number; den: number }; width: number; height: number;
  yawStart?: number; yawEnd?: number; pitch?: number; exposure?: number;
}
export interface ImageSceneDiagnostic { severity: "warning" | "error"; code: string; message: string; viewId?: string }
export interface ImageSceneSourceView {
  id: string; sha256: string; width: number; height: number;
  cameraToWorld?: readonly number[];
  mask?: ImageSceneArtifact;
  depth?: ImageSceneArtifact;
}
export interface ImageSceneManifest {
  schemaVersion: 1; id: string; representation: "photographic-mesh"; lighting: "baked";
  rights: ImageSceneRights;
  scale: { kind: "relative" } | { kind: "metric"; metersPerUnit: number; evidence: string };
  /** Self-contained GLB; browser loaders must reject external buffer/image URIs. */
  model: ImageSceneArtifact;
  /** Authoritative normalized HeroAsset bounds (centered in X/Z, resting on Y=0). */
  bounds: { min: ImageSceneVec3; max: ImageSceneVec3 };
  sourceViews: readonly ImageSceneSourceView[];
  backend: { id: string; revision: string; inputsHash: string; elapsedSeconds?: number };
  /** Authored/verified motion envelope; not a claim that every triangle has observed texture. */
  cameraEnvelope: { yaw: readonly [number, number]; pitch: readonly [number, number]; minimumDistanceFactor: number; evidence: string };
  shot: ImageSceneShot;
  review: { status: "pending" } | { status: "approved"; reviewer: string; reviewedAt: string; artifactSha256: string; evidence: readonly string[] };
  diagnostics: readonly ImageSceneDiagnostic[];
}
export interface PreparationOptions {
  outputDirectory: string; cacheDirectory?: string; signal?: AbortSignal;
  onProgress?: (event: { stage: string; state: "running" | "cached" | "complete"; fraction?: number }) => void;
}
export interface PreparedImageScene { manifest: ImageSceneManifest; manifestPath: string; cacheHit: boolean }

/** Validate the complete capture before preparing files or starting an external model. */
export function validateCaptureSet(input: unknown): MultiViewSceneRequest {
  const capture = record(input, "capture");
  version(capture, "capture"); text(capture.id, "capture ID", 128); rights(capture.rights);
  if (capture.mode !== "camera-orbit" && capture.mode !== "object-rotation") fail("capture mode", "Choose camera-orbit or object-rotation explicitly.");
  const segmentation = capture.segmentation ?? "automatic";
  if (!["automatic", "manual", "none"].includes(String(segmentation))) fail("capture segmentation", "Choose automatic, manual or none.");
  if (capture.mode === "object-rotation" && segmentation === "none") fail("capture segmentation", "Object rotation requires subject masks; the stationary background cannot be aligned as part of the subject.");
  const views = array(capture.views, "capture views", 2, 4096);
  const ids = new Set<string>(), images = new Set<string>();
  for (const inputView of views) {
    const view = record(inputView, "capture view");
    const id = text(view.id, "view ID", 128), image = text(view.image, `view ${id} image`);
    if (ids.has(id) || images.has(image)) fail(`capture view ${id}`, "Provide distinct view IDs and photographs; duplicate observations do not add coverage.");
    ids.add(id); images.add(image);
    if (view.mask !== undefined) text(view.mask, `view ${id} mask`);
    if (segmentation === "manual" && !view.mask) fail(`capture view ${id}`, "Manual segmentation requires a mask for every view.");
    if (view.depth !== undefined) {
      const depth = record(view.depth, `view ${id} depth`); text(depth.path, `view ${id} depth path`);
      if (depth.encoding !== "camera-z-meters-f32") fail(`view ${id} depth`, "Use camera-z-meters-f32; relative/brightness maps cannot be interpreted as metric depth.");
    }
    if (view.calibration !== undefined) validateCalibration(view.calibration, `view ${id} calibration`);
  }
  if (capture.shot !== undefined) validateImageSceneShot(capture.shot);
  return input as MultiViewSceneRequest;
}

/** Reject contradictory ready bundles before fetching or allocating their model. */
export function parseImageSceneManifest(input: unknown): ImageSceneManifest {
  const scene = record(input, "image scene");
  version(scene, "image scene"); text(scene.id, "scene ID", 128); rights(scene.rights);
  if (scene.representation !== "photographic-mesh" || scene.lighting !== "baked") fail("scene lighting", "A photographic mesh must declare baked lighting; it is not physically relightable.");
  const scale = record(scene.scale, "scale");
  if (scale.kind === "metric") { positive(scale.metersPerUnit, "metric scale"); text(scale.evidence, "metric scale evidence"); }
  else if (scale.kind !== "relative") fail("scale", "Declare relative scale or an independently evidenced metric scale.");
  const model = validateImageSceneArtifact(scene.model, "model");
  if (!model.path.endsWith(".glb")) fail("model path", "Provide a self-contained .glb file.");
  const bounds = record(scene.bounds, "bounds"); const min = vector(bounds.min, "bounds min"), max = vector(bounds.max, "bounds max");
  if (!min.every((value, axis) => value < max[axis])) fail("bounds", "Each maximum must exceed its minimum; reconstruct a subject with real volume.");
  const sourceViews = array(scene.sourceViews, "source views", 2, 4096), ids = new Set<string>(), hashes = new Set<string>();
  for (const inputView of sourceViews) {
    const view = record(inputView, "source view"); const id = text(view.id, "source view ID", 128);
    const hash = digest(view.sha256, `source view ${id} hash`);
    if (ids.has(id) || hashes.has(hash)) fail(`source view ${id}`, "Each observation must have a unique ID and source hash.");
    ids.add(id); hashes.add(hash); dimensions(view, `source view ${id}`);
    if (view.cameraToWorld !== undefined) rigidTransform(view.cameraToWorld, `source view ${id} pose`);
    if (view.mask !== undefined) validateImageSceneArtifact(view.mask, `source view ${id} mask`);
    if (view.depth !== undefined) validateImageSceneArtifact(view.depth, `source view ${id} depth`);
  }
  const backend = record(scene.backend, "backend"); text(backend.id, "backend ID", 128); text(backend.revision, "backend revision"); digest(backend.inputsHash, "backend inputs hash");
  if (backend.elapsedSeconds !== undefined && (!finite(backend.elapsedSeconds) || backend.elapsedSeconds < 0)) fail("backend timing", "Elapsed seconds must be finite and nonnegative.");
  const envelope = record(scene.cameraEnvelope, "camera envelope");
  interval(envelope.yaw, "camera yaw", -360, 360); interval(envelope.pitch, "camera pitch", -89, 89);
  if (!finite(envelope.minimumDistanceFactor) || envelope.minimumDistanceFactor <= 1 || envelope.minimumDistanceFactor > 100) fail("camera distance", "Use a finite distance factor greater than one and at most 100.");
  text(envelope.evidence, "camera envelope evidence");
  validateImageSceneShot(scene.shot);
  const review = record(scene.review, "review");
  if (review.status === "approved") {
    text(review.reviewer, "approval reviewer"); const date = text(review.reviewedAt, "approval date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) fail("review date", "Record the actual human review date as YYYY-MM-DD.");
    if (digest(review.artifactSha256, "approval artifact hash") !== model.sha256) fail("review approval", "The reviewed artifact hash must match this exact model revision.");
    array(review.evidence, "approval evidence", 1, 32).forEach(item => text(item, "approval evidence reference"));
  } else if (review.status !== "pending") fail("review", "Use pending until an actual human approval is recorded.");
  for (const inputDiagnostic of array(scene.diagnostics, "diagnostics", 0, 256)) {
    const diagnostic = record(inputDiagnostic, "diagnostic");
    if (!["warning", "error"].includes(String(diagnostic.severity))) fail("diagnostic", "Severity must be warning or error.");
    text(diagnostic.code, "diagnostic code", 128); text(diagnostic.message, "diagnostic message");
    if (diagnostic.viewId !== undefined && !ids.has(text(diagnostic.viewId, "diagnostic view ID", 128))) fail("diagnostic view", "Reference an actual source view.");
    if (diagnostic.severity === "error") fail("scene readiness", `Resolve this preparation error before publishing a bundle: ${diagnostic.message}`);
  }
  return input as ImageSceneManifest;
}

export function validateImageSceneShot(input: unknown): ImageSceneShot {
  const shot = record(input, "shot");
  if (!["push-in", "orbit", "oblique"].includes(String(shot.preset))) fail("shot preset", "Choose push-in, orbit or oblique.");
  const fps = record(shot.fps, "fps"); integer(fps.num, "fps numerator", 1, 120000); integer(fps.den, "fps denominator", 1, 120000);
  if ((fps.num as number) / (fps.den as number) < 1 || (fps.num as number) / (fps.den as number) > 120) fail("fps", "Use a rational frame rate from 1 through 120 fps.");
  integer(shot.durationFrames, "shot timing", 2, 18000); integer(shot.width, "output width", 2, 7680); integer(shot.height, "output height", 2, 4320);
  if ((shot.width as number) % 2 || (shot.height as number) % 2) fail("output dimensions", "Video output dimensions must be even.");
  for (const key of ["yawStart", "yawEnd", "pitch"] as const) if (shot[key] !== undefined && !finite(shot[key])) fail(`shot ${key}`, "Camera angles must be finite.");
  if (shot.exposure !== undefined && (!finite(shot.exposure) || shot.exposure <= 0 || shot.exposure > 16)) fail("shot exposure", "Use a finite exposure greater than zero and at most 16.");
  return input as ImageSceneShot;
}

export function validateImageSceneArtifact(input: unknown, label = "artifact"): ImageSceneArtifact {
  const artifact = record(input, label); const path = text(artifact.path, `${label} path`, 512);
  if (!path.split("/").every(part => /^[A-Za-z0-9._-]+$/.test(part) && part !== "." && part !== "..")) fail(`${label} path`, "Use a contained relative path without encoded segments, traversal, query strings or external URLs.");
  digest(artifact.sha256, `${label} hash`); integer(artifact.bytes, `${label} bytes`, 1, 512 * 1024 * 1024);
  return input as ImageSceneArtifact;
}

function validateCalibration(input: unknown, label: string) {
  const calibration = record(input, label); dimensions(calibration, label);
  positive(calibration.fx, `${label} fx`); positive(calibration.fy, `${label} fy`);
  if (!finite(calibration.cx) || !finite(calibration.cy)) fail(label, "The calibrated principal point must be finite.");
  rigidTransform(calibration.cameraToWorld, label);
}
function rigidTransform(input: unknown, label: string) {
  if (!Array.isArray(input) || input.length !== 16 || !input.every(finite)) fail(label, "Provide a finite column-major 4×4 camera-to-world calibration transform.");
  const matrix = input as number[];
  if ([3, 7, 11].some(i => Math.abs(matrix[i]) > 1e-5) || Math.abs(matrix[15] - 1) > 1e-5) fail(label, "Camera calibration must be an affine rigid transform.");
  for (let a = 0; a < 3; a++) for (let b = a; b < 3; b++) {
    const dot = [0, 1, 2].reduce((sum, row) => sum + matrix[a * 4 + row] * matrix[b * 4 + row], 0);
    if (Math.abs(dot - (a === b ? 1 : 0)) > 1e-3) fail(label, "Camera calibration rotation must be orthonormal, without scale or shear.");
  }
  const determinant = matrix[0] * (matrix[5] * matrix[10] - matrix[9] * matrix[6]) - matrix[4] * (matrix[1] * matrix[10] - matrix[9] * matrix[2]) + matrix[8] * (matrix[1] * matrix[6] - matrix[5] * matrix[2]);
  if (determinant < 0) fail(label, "Camera calibration must be right-handed, without reflections.");
}
function rights(input: unknown) { const value = record(input, "rights"); text(value.license, "rights license"); if (value.source !== undefined) text(value.source, "rights source"); if (value.author !== undefined) text(value.author, "rights author"); }
function dimensions(value: Record<string, unknown>, label: string) { integer(value.width, `${label} width`, 2, 16384); integer(value.height, `${label} height`, 2, 16384); }
function record(input: unknown, label: string): Record<string, unknown> { if (!input || typeof input !== "object" || Array.isArray(input)) fail(label, "Provide an object."); return input as Record<string, unknown>; }
function version(input: Record<string, unknown>, label: string) { if (input.schemaVersion !== 1) fail(`${label} schema`, "Only schemaVersion 1 is supported; migrate the capture/bundle explicitly."); }
function text(input: unknown, label: string, maximum = 4096): string { if (typeof input !== "string" || !input.trim() || input.length > maximum) fail(label, `Provide nonempty text of at most ${maximum} characters.`); return input as string; }
function digest(input: unknown, label: string): string { if (typeof input !== "string" || !/^[a-f0-9]{64}$/.test(input)) fail(label, "Provide a lowercase SHA-256 digest of the actual file bytes."); return input as string; }
function array(input: unknown, label: string, minimum: number, maximum: number): unknown[] { if (!Array.isArray(input) || input.length < minimum || input.length > maximum) fail(label, `Provide ${minimum}–${maximum} entries.`); return input as unknown[]; }
function vector(input: unknown, label: string): number[] { if (!Array.isArray(input) || input.length !== 3 || !input.every(finite)) fail(label, "Provide a finite XYZ vector."); return input as number[]; }
function interval(input: unknown, label: string, minimum: number, maximum: number) { if (!Array.isArray(input) || input.length !== 2 || !input.every(finite) || input[0] > input[1] || input[0] < minimum || input[1] > maximum) fail(label, `Provide an ordered interval within ${minimum}–${maximum} degrees.`); }
function positive(input: unknown, label: string) { if (!finite(input) || input <= 0) fail(label, "Provide a positive finite value."); }
function finite(input: unknown): input is number { return typeof input === "number" && Number.isFinite(input); }
function integer(input: unknown, label: string, minimum: number, maximum: number) { if (!Number.isSafeInteger(input) || (input as number) < minimum || (input as number) > maximum) fail(label, `Provide an integer from ${minimum} through ${maximum}.`); }
function fail(label: string, remedy: string): never { throw new Error(`Image scene ${label}: ${remedy}`); }
