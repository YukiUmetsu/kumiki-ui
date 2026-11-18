/** A worker of the selective colour file pipeline: the spatial, stateless part of each frame (colour mask, matte
 * clean-up, feathering). The main thread smooths the masks in frame order and composites. */
import { parentPort, workerData } from "node:worker_threads";

const engine = await import(workerData.engine);
const { config } = engine.resolveSelectiveColorConfig(workerData.config);
parentPort.on("message", ({ id, width, height, buffer }) => {
  try {
    const frame = { width, height, data: new Uint8ClampedArray(buffer) };
    const mask = engine.cleanAndFeather(engine.colorMask(frame, config), frame, config);
    parentPort.postMessage({ id, buffer, mask: mask.buffer }, [buffer, mask.buffer]);
  } catch (error) {
    parentPort.postMessage({ id, error: String(error?.stack ?? error) });
  }
});
parentPort.postMessage({ ready: true });
