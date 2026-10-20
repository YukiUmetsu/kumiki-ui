/// <reference lib="webworker" />
/** Sculpts hero assets off the main thread. The asset builders run here exactly as on
 * the main thread (textures fall back to placeholders: no DOM), filling this worker's
 * sculpt cache, which is then transferred back. Message: { kinds: string[] }. */
import { exportSculptCache } from "./sdf-sculpt";
import { heroCatalogEntry } from "../domains/hero-catalog";

self.onmessage = (event: MessageEvent<{ kinds: string[]; finishes?: Record<string, string> }>) => {
  const errors: string[] = [];
  for (const kind of event.data.kinds) {
    try {
      const finish = event.data.finishes?.[kind] as never;
      heroCatalogEntry(kind).create({ id: "prewarm-" + kind, finish }).dispose();
    } catch (cause) { errors.push(`${kind}: ${cause instanceof Error ? cause.message : String(cause)}`); }
  }
  const entries = exportSculptCache();
  const transfer = entries.flatMap(([, m]) => [m.positions.buffer, m.normals.buffer, m.occlusion.buffer, m.curvature.buffer, m.indices.buffer]);
  (self as unknown as Worker).postMessage({ entries, errors }, [...new Set(transfer)] as Transferable[]);
};
