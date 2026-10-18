/** Reproducible CPU-only camera compilation/seek measurement; no GPU claims. */
import { createServer } from "vite";
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom" });
try {
  const { createCameraReference } = await server.ssrLoadModule("/src/motion/cinematic-camera-scene.ts");
  const { evaluateCameraPose3D } = await server.ssrLoadModule("/registry/motion/camera-pose-3d.ts");
  const { evaluateMotionDirector } = await server.ssrLoadModule("/registry/motion/motion-director.ts");
  const measurements = [];
  for (const aspect of ["landscape", "portrait", "square"]) {
    const result = createCameraReference(aspect);
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    const plan = result.plan;
    // Prime evaluator caches before measuring seek cost.
    evaluateCameraPose3D(plan.timeline, 0);
    const start = performance.now(); let checksum = 0;
    for (let i = 0; i < 9000; i++) checksum += evaluateCameraPose3D(plan.timeline, (i * 137) % 900).position[0];
    const poseMs = performance.now() - start;
    const sharedStart = performance.now();
    for (let i = 0; i < 900; i++) {
      const frame = (i * 137) % 900, state = evaluateMotionDirector(result.director, frame);
      checksum += evaluateCameraPose3D(plan.timeline, frame, "camera3d", state.evaluation).position[0];
    }
    measurements.push({ aspect, compileMs: +result.compilationMs.toFixed(2), cameraSeekMsPerFrame: +(poseMs / 9000).toFixed(4),
      sharedDirectorSeekMsPerFrame: +((performance.now() - sharedStart) / 900).toFixed(4), timelineBytes: Buffer.byteLength(JSON.stringify(plan.timeline)),
      stats: plan.stats, diagnostics: result.diagnostics.map(d => d.code), checksum: +checksum.toFixed(2) });
  }
  console.log(JSON.stringify({ runtime: process.version, measurements, scope: "CPU only; warm MG1 evaluation, no WebGL render timing or allocation profiler" }, null, 2));
} finally { await server.close(); }
