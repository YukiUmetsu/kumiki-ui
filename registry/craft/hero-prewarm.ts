/** Keep the main thread responsive: sculpt hero assets in a Web Worker before they mount.
 *
 *   await prewarmHeroAssets(["bull-market", "bank"]);   // then create/mount instantly
 *   const ready = useHeroAssetsReady(["bull-market"]);    // React: render a placeholder until true
 *
 * Without workers (tests, SSR, old bundlers) this resolves immediately and assets
 * simply sculpt on first use. For zero sculpting at runtime, ship a baked cache
 * (`npm run hero:bake`) and load it with `loadBakedSculpts(url)`.
 */
import { useEffect, useState } from "react";
import { deserializeSculptCache, importSculptCache } from "./sdf-sculpt";
import type { SculptMesh } from "./sdf-sculpt";

const done = new Set<string>();
const pending = new Map<string, Promise<void>>();

export function prewarmHeroAssets(kinds: readonly string[], finishes?: Record<string, string>): Promise<void> {
  const key = (k: string) => k + ":" + (finishes?.[k] ?? "");
  const todo = kinds.filter(k => !done.has(key(k)));
  if (!todo.length) return Promise.resolve();
  if (typeof Worker === "undefined") return Promise.resolve();
  const id = todo.map(key).join(",");
  const existing = pending.get(id);
  if (existing) return existing;
  const job = new Promise<void>(resolve => {
    let worker: Worker;
    try { worker = new Worker(new URL("./hero-prewarm.worker.ts", import.meta.url), { type: "module" }); }
    catch { resolve(); return; }
    worker.onmessage = (event: MessageEvent<{ entries: Array<[string, SculptMesh]>; errors: string[] }>) => {
      importSculptCache(event.data.entries);
      for (const k of todo) done.add(key(k));
      if (event.data.errors.length) console.warn("Hero prewarm:", event.data.errors.join("; "));
      worker.terminate(); pending.delete(id); resolve();
    };
    worker.onerror = () => { worker.terminate(); pending.delete(id); resolve(); };
    worker.postMessage({ kinds: todo, finishes });
  });
  pending.set(id, job);
  return job;
}

/** React hook: true once the given assets are sculpted (immediately if already cached). */
export function useHeroAssetsReady(kinds: readonly string[], finishes?: Record<string, string>): boolean {
  const signature = JSON.stringify([kinds, finishes ?? null]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    setReady(false);
    prewarmHeroAssets(kinds, finishes).then(() => { if (live) setReady(true); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signature captures kinds and finishes.
  }, [signature]);
  return ready;
}

/** Load a baked sculpt cache produced by `npm run hero:bake`. Resolves false when absent or stale. */
export async function loadBakedSculpts(url: string, expectedVersion?: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    return deserializeSculptCache(await response.arrayBuffer(), expectedVersion);
  } catch { return false; }
}
