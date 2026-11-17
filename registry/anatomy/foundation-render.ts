/**
 * Heavy CPU renders (portraits, hands, skin, material swatches, skies, seas) off the page's thread, and cached.
 *
 * - **Workers.** Each pack names a pool: a module worker that serves its render jobs (`serveRenderJobs`) and the same
 *   jobs for the page's own thread (used when workers are unavailable, as in tests or server rendering). A pool runs
 *   up to four workers at once (one less than the machine's cores), so a page of portraits fills in in parallel.
 * - **Order.** Jobs run by priority (a preview before a full render, what is on screen before what is not), then in
 *   the order asked. A job nobody waits for any more (its view changed or unmounted) is dropped before it starts.
 * - **Affinity.** A job may name an affinity (for a portrait, its hair): it goes to the worker that last ran that
 *   affinity when that worker is free, so the worker's own caches (a groomed head of hair) are reused.
 * - **Caches.** Finished renders are kept in memory (least recently used first out, about 256 MB) and in the browser's
 *   IndexedDB (`kumiki-render-cache`, the 600 most recent), so revisiting a page or reloading it draws at once. Keys
 *   hold `RENDER_CACHE_VERSION`: a build may define `__KUMIKI_RENDER_VERSION__` (Storybook hashes the renderers' source
 *   at start-up), so changed renderers never draw stale pictures. `clearRenderCache()` empties both caches.
 */
import { enqueueRender } from "./foundation-queue";

/** A finished render: sRGB pixels, row by row, and anything else the job returns for captions (`meta`). */
export interface RenderOutput { width: number; height: number; rgba: Uint8ClampedArray; ms: number; meta?: Record<string, unknown> }
/** One kind of render job: plain, structured-cloneable arguments in, a `RenderOutput` out. */
export type RenderRunner = (args: never) => RenderOutput | Promise<RenderOutput>;
export type RenderRunners = Record<string, RenderRunner>;
/** A pack's render jobs: its worker (a module worker serving them) and the same jobs for the page's thread. */
export interface RenderPool { id: string; worker?: () => Worker; runners: () => Promise<RenderRunners> }
export interface RenderRequest {
  pool: RenderPool; kind: string; args: unknown;
  /** Lower runs sooner. Previews use 0, full renders 1 (2 when off screen). */
  priority?: number;
  /** Stop waiting: the job is dropped if it has not started and nobody else waits for it. */
  signal?: AbortSignal;
  /** Jobs with the same affinity prefer the worker that ran the last one. */
  affinity?: string;
  /** Keep the result in IndexedDB (default true). */
  persist?: boolean;
}

declare const __KUMIKI_RENDER_VERSION__: string | undefined;
/** Part of every cache key; a build can define `__KUMIKI_RENDER_VERSION__` (a hash of the renderers). */
export const RENDER_CACHE_VERSION: string = typeof __KUMIKI_RENDER_VERSION__ === "string" ? __KUMIKI_RENDER_VERSION__ : "anat1-2026-11-17";

export const renderKey = (r: Pick<RenderRequest, "pool" | "kind" | "args">): string => `${RENDER_CACHE_VERSION}|${r.pool.id}|${r.kind}|${JSON.stringify(r.args)}`;

// ---- memory cache (least recently used out first) ----
const MEM_BUDGET = 256e6;
const mem = new Map<string, RenderOutput>();
let memBytes = 0;
function remember(k: string, r: RenderOutput) {
  const old = mem.get(k);
  if (old) { mem.delete(k); memBytes -= old.rgba.byteLength; }
  mem.set(k, r); memBytes += r.rgba.byteLength;
  for (const [ok, ov] of mem) { if (memBytes <= MEM_BUDGET || mem.size <= 1) break; mem.delete(ok); memBytes -= ov.rgba.byteLength; }
}
function recall(k: string): RenderOutput | undefined {
  const r = mem.get(k);
  if (r) { mem.delete(k); mem.set(k, r); }
  return r;
}

// ---- IndexedDB cache ----
const DB = "kumiki-render-cache", STORE = "renders", KEEP = 600;
let dbp: Promise<IDBDatabase | null> | null = null;
function openDb(): Promise<IDBDatabase | null> {
  if (!dbp) dbp = new Promise(resolve => {
    try {
      if (typeof indexedDB === "undefined") { resolve(null); return; }
      const q = indexedDB.open(DB, 1);
      q.onupgradeneeded = () => { const s = q.result.createObjectStore(STORE, { keyPath: "k" }); s.createIndex("t", "t"); };
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => resolve(null);
      q.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbp;
}
interface Stored { k: string; t: number; width: number; height: number; ms: number; rgba: Uint8ClampedArray; meta?: Record<string, unknown> }
async function dbGet(k: string): Promise<RenderOutput | undefined> {
  const d = await openDb();
  if (!d) return undefined;
  return new Promise(resolve => {
    try {
      const q = d.transaction(STORE, "readonly").objectStore(STORE).get(k);
      q.onsuccess = () => { const v = q.result as Stored | undefined; resolve(v ? { width: v.width, height: v.height, ms: v.ms, rgba: v.rgba, meta: v.meta } : undefined); };
      q.onerror = () => resolve(undefined);
    } catch { resolve(undefined); }
  });
}
let puts = 0;
async function dbPut(k: string, r: RenderOutput) {
  const d = await openDb();
  if (!d) return;
  try {
    const tx = d.transaction(STORE, "readwrite"), s = tx.objectStore(STORE);
    s.put({ k, t: Date.now(), width: r.width, height: r.height, ms: r.ms, rgba: r.rgba, meta: r.meta } satisfies Stored);
    if (++puts % 25 === 0) {
      const c = s.count();
      c.onsuccess = () => {
        let extra = c.result - KEEP;
        if (extra <= 0) return;
        const cur = s.index("t").openCursor();
        cur.onsuccess = () => { const x = cur.result; if (x && extra-- > 0) { x.delete(); x.continue(); } };
      };
    }
  } catch { /* a full or unavailable store only costs a re-render */ }
}

/** Empty the memory and IndexedDB caches. */
export async function clearRenderCache(): Promise<void> {
  mem.clear(); memBytes = 0;
  const d = await openDb();
  if (!d) return;
  await new Promise<void>(resolve => { try { const q = d.transaction(STORE, "readwrite").objectStore(STORE).clear(); q.onsuccess = () => resolve(); q.onerror = () => resolve(); } catch { resolve(); } });
}

// ---- pools ----
interface Job { key: string; req: RenderRequest; priority: number; seq: number; interest: number; started: boolean; done: Promise<RenderOutput>; resolve: (r: RenderOutput) => void; reject: (e: unknown) => void }
interface Slot { w: Worker; job: Job | null; affinity?: string }
interface PoolState { slots: Slot[]; queue: Job[]; broken: boolean; mainBusy: boolean }
const pools = new Map<string, PoolState>();
let seq = 0, msgId = 0;
const abortError = () => Object.assign(new Error("Render no longer needed"), { name: "AbortError" });

function poolState(p: RenderPool): PoolState {
  let s = pools.get(p.id);
  if (!s) { s = { slots: [], queue: [], broken: !p.worker || typeof Worker === "undefined", mainBusy: false }; pools.set(p.id, s); }
  return s;
}
const maxWorkers = () => Math.max(1, Math.min(4, ((typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4) - 1));

function finish(slot: Slot | null, job: Job, out: RenderOutput | null, err?: unknown) {
  if (slot) slot.job = null;
  if (out) job.resolve(out); else job.reject(err);
}

function spawn(p: RenderPool, st: PoolState): Slot | null {
  try {
    const w = p.worker!();
    const slot: Slot = { w, job: null };
    w.onmessage = (e: MessageEvent<{ id: number; out?: RenderOutput; error?: string }>) => {
      const job = slot.job;
      if (!job) return;
      if (e.data.out) finish(slot, job, e.data.out); else finish(slot, job, null, new Error(e.data.error ?? "Render failed"));
      pump(p, st);
    };
    w.onerror = ev => {
      // A worker that cannot load (no module workers, a blocked URL): run everything on the page's thread instead.
      ev.preventDefault?.();
      st.broken = true;
      for (const s of st.slots) { if (s.job) { s.job.started = false; st.queue.push(s.job); s.job = null; } s.w.terminate(); }
      st.slots = [];
      pump(p, st);
    };
    st.slots.push(slot);
    return slot;
  } catch { st.broken = true; return null; }
}

function next(st: PoolState): Job | undefined {
  st.queue = st.queue.filter(j => j.interest > 0);
  st.queue.sort((a, b) => a.priority - b.priority || a.seq - b.seq);
  return st.queue.shift();
}

function pump(p: RenderPool, st: PoolState) {
  if (st.broken) {
    if (st.mainBusy || !st.queue.length) return;
    const job = next(st);
    if (!job) return;
    st.mainBusy = true; job.started = true;
    void enqueueRender(() => {}).then(async () => {
      try { const run = (await p.runners())[job.req.kind] as (a: unknown) => RenderOutput | Promise<RenderOutput>; finish(null, job, await run(job.req.args)); }
      catch (e) { finish(null, job, null, e); }
      st.mainBusy = false;
      pump(p, st);
    });
    return;
  }
  for (;;) {
    if (!st.queue.length) return;
    let slot = st.slots.find(s => !s.job);
    if (!slot && st.slots.length < maxWorkers()) slot = spawn(p, st) ?? undefined;
    if (st.broken) { pump(p, st); return; }
    if (!slot) return;
    const job = next(st);
    if (!job) return;
    if (job.req.affinity) {
      // prefer a free worker that already holds this affinity
      const warm = st.slots.find(s => !s.job && s.affinity === job.req.affinity);
      if (warm) slot = warm;
      slot.affinity = job.req.affinity;
    }
    slot.job = job; job.started = true;
    slot.w.postMessage({ id: ++msgId, kind: job.req.kind, args: job.req.args });
  }
}

const inflight = new Map<string, Job>();

function schedule(req: RenderRequest, key: string): Promise<RenderOutput> {
  const p = req.pool, st = poolState(p), priority = req.priority ?? 1;
  let job = inflight.get(key);
  if (job) {
    job.interest++;
    if (!job.started && priority < job.priority) job.priority = priority;
  } else {
    let resolve!: (r: RenderOutput) => void, reject!: (e: unknown) => void;
    const done = new Promise<RenderOutput>((a, b) => { resolve = a; reject = b; });
    job = { key, req, priority, seq: ++seq, interest: 1, started: false, resolve, reject, done };
    inflight.set(key, job);
    done.then(out => { remember(key, out); if (req.persist !== false) void dbPut(key, out); }, () => {}).finally(() => inflight.delete(key));
    st.queue.push(job);
    pump(p, st);
  }
  const j = job;
  if (!req.signal) return j.done;
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      j.interest--;
      if (j.interest <= 0 && !j.started) { st.queue = st.queue.filter(x => x !== j); inflight.delete(key); j.reject(abortError()); }
      reject(abortError());
    };
    if (req.signal!.aborted) { onAbort(); return; }
    req.signal!.addEventListener("abort", onAbort, { once: true });
    j.done.then(v => { req.signal!.removeEventListener("abort", onAbort); resolve(v); }, e => { req.signal!.removeEventListener("abort", onAbort); reject(e); });
  });
}

/** The render if it is already in memory (for drawing at once, with no flash). */
export const peekRender = (req: Pick<RenderRequest, "pool" | "kind" | "args">): RenderOutput | undefined => recall(renderKey(req));

/** The render from memory or IndexedDB, without computing it. */
export async function cachedRender(req: Pick<RenderRequest, "pool" | "kind" | "args" | "persist">): Promise<RenderOutput | undefined> {
  const key = renderKey(req), hit = recall(key);
  if (hit || req.persist === false) return hit;
  const d = await dbGet(key);
  if (d) remember(key, d);
  return d;
}

/** Render (or fetch from a cache) one job. Rejects with an `AbortError` when its signal aborts first. */
export async function requestRender(req: RenderRequest): Promise<RenderOutput> {
  const key = renderKey(req), hit = recall(key);
  if (hit) return hit;
  if (req.persist !== false && !inflight.has(key)) {
    const d = await dbGet(key);
    if (d) { remember(key, d); return d; }
    if (req.signal?.aborted) throw abortError();
  }
  return schedule(req, key);
}

/** Inside a pack's worker module: serve its render jobs (pixels are transferred, not copied). */
export function serveRenderJobs(runners: RenderRunners): void {
  const scope = globalThis as unknown as { onmessage: ((e: MessageEvent<{ id: number; kind: string; args: unknown }>) => void) | null; postMessage: (m: unknown, t?: Transferable[]) => void };
  scope.onmessage = async e => {
    const { id, kind, args } = e.data;
    try {
      const run = runners[kind] as ((a: unknown) => RenderOutput | Promise<RenderOutput>) | undefined;
      if (!run) throw new Error(`Unknown render job: ${kind}`);
      const r = await run(args);
      const out: RenderOutput = { width: r.width, height: r.height, rgba: r.rgba, ms: r.ms, meta: r.meta };
      scope.postMessage({ id, out }, [out.rgba.buffer]);
    } catch (err) { scope.postMessage({ id, error: String((err as Error)?.message ?? err) }); }
  };
}
